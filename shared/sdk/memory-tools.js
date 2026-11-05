/**
 * Memory Tools for Being MCP Server
 *
 * Provides 6 memory operations matching the official Memory Tool API:
 * - view: View directory or file contents
 * - create: Create or overwrite files
 * - str_replace: Replace text in files
 * - insert: Insert text at specific line
 * - delete: Delete files or directories
 * - rename: Rename or move files
 *
 * All operations are scoped to a Being's memories/ directory with
 * path traversal protection.
 */

const { tool, createSdkMcpServer } = require('@anthropic-ai/claude-agent-sdk');
const { z } = require('zod');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * Validate and resolve memory path
 *
 * Security: Ensures path is within memories directory and blocks traversal attacks
 *
 * @param {string} memoryPath - Path starting with /memories
 * @param {string} beingMemoriesDir - Absolute path to Being's memories directory
 * @returns {string} Absolute safe path
 * @throws {Error} If path is invalid or attempts traversal
 */
function validateMemoryPath(memoryPath, beingMemoriesDir) {
  // Must start with /memories
  if (!memoryPath.startsWith('/memories')) {
    throw new Error('Path must start with /memories');
  }

  // Block obvious traversal patterns
  if (memoryPath.includes('../') || memoryPath.includes('..\\')) {
    throw new Error('Path traversal not allowed');
  }

  // Block URL-encoded traversal
  if (memoryPath.includes('%2e%2e')) {
    throw new Error('Path traversal not allowed');
  }

  // Convert /memories/foo/bar to absolute path
  // Remove /memories prefix and join with Being's memories dir
  const relativePath = memoryPath.slice('/memories'.length) || '/';
  const absolutePath = path.join(beingMemoriesDir, relativePath);

  // Resolve to canonical form
  const resolved = path.resolve(absolutePath);

  // Verify it's still within memories directory
  const normalizedBase = path.resolve(beingMemoriesDir);
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error('Path escapes memories directory');
  }

  return resolved;
}

/**
 * Check if path exists
 */
async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get directory listing formatted like Memory Tool
 */
async function getDirectoryListing(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  if (entries.length === 0) {
    return `Directory: ${dirPath}\n(empty)`;
  }

  const lines = entries.map(entry => {
    return entry.isDirectory() ? `${entry.name}/` : entry.name;
  });

  return `Directory: ${dirPath}\n${lines.join('\n')}`;
}

/**
 * Read file with optional line range
 */
async function readFileWithRange(filePath, viewRange) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  if (!viewRange) {
    // Return all lines with line numbers
    return lines.map((line, idx) => `${idx + 1}: ${line}`).join('\n');
  }

  const [start, end] = viewRange;
  const selectedLines = lines.slice(start - 1, end);

  return selectedLines.map((line, idx) => `${start + idx}: ${line}`).join('\n');
}

/**
 * Create Memory Tools MCP Server for a Being
 *
 * @param {string} beingId - Being's ID
 * @param {string} beingMemoriesDir - Absolute path to Being's memories/ directory
 * @returns {Object} MCP server config
 */
function createMemoryToolsServer(beingId, beingMemoriesDir) {
  // Ensure memories directory exists
  if (!fsSync.existsSync(beingMemoriesDir)) {
    fsSync.mkdirSync(beingMemoriesDir, { recursive: true });
  }

  // Define the 6 memory tools

  // 1. VIEW - View directory or file contents
  const viewTool = tool(
    'memory_view',
    'View directory contents or file contents with optional line range',
    {
      path: z.string().describe('Path starting with /memories'),
      view_range: z.tuple([z.number(), z.number()])
        .optional()
        .describe('Optional [start_line, end_line] range for viewing file')
    },
    async (args) => {
      console.log('[memory_view] Handler called!');
      console.log('[memory_view] Args received:', JSON.stringify(args, null, 2));
      console.log('[memory_view] Args type:', typeof args);
      console.log('[memory_view] Args keys:', Object.keys(args));

      try {
        console.log('[memory_view] Validating path...');
        const safePath = validateMemoryPath(args.path, beingMemoriesDir);
        console.log('[memory_view] Safe path:', safePath);

        const exists = await pathExists(safePath);
        if (!exists) {
          return {
            content: [{
              type: 'text',
              text: `Error: Path not found: ${args.path}`
            }],
            isError: true
          };
        }

        const stats = await fs.stat(safePath);

        if (stats.isDirectory()) {
          const listing = await getDirectoryListing(safePath);
          return {
            content: [{ type: 'text', text: listing }]
          };
        } else {
          const contents = await readFileWithRange(safePath, args.view_range);
          return {
            content: [{ type: 'text', text: contents }]
          };
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // 2. CREATE - Create or overwrite file
  const createTool = tool(
    'memory_create',
    'Create or overwrite a file in memory',
    {
      path: z.string().describe('Path starting with /memories'),
      file_text: z.string().describe('Content to write to file')
    },
    async (args) => {
      try {
        const safePath = validateMemoryPath(args.path, beingMemoriesDir);

        // Ensure parent directory exists
        const parentDir = path.dirname(safePath);
        await fs.mkdir(parentDir, { recursive: true });

        // Write file
        await fs.writeFile(safePath, args.file_text, 'utf-8');

        return {
          content: [{
            type: 'text',
            text: `File created: ${args.path}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // 3. STR_REPLACE - Replace text in file
  const strReplaceTool = tool(
    'memory_str_replace',
    'Replace text in a file',
    {
      path: z.string().describe('Path starting with /memories'),
      old_str: z.string().describe('Text to find'),
      new_str: z.string().describe('Text to replace with')
    },
    async (args) => {
      try {
        const safePath = validateMemoryPath(args.path, beingMemoriesDir);

        const exists = await pathExists(safePath);
        if (!exists) {
          return {
            content: [{
              type: 'text',
              text: `Error: File not found: ${args.path}`
            }],
            isError: true
          };
        }

        let content = await fs.readFile(safePath, 'utf-8');

        if (!content.includes(args.old_str)) {
          return {
            content: [{
              type: 'text',
              text: `Error: String not found in file: "${args.old_str}"`
            }],
            isError: true
          };
        }

        content = content.replace(args.old_str, args.new_str);
        await fs.writeFile(safePath, content, 'utf-8');

        return {
          content: [{
            type: 'text',
            text: `Text replaced in ${args.path}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // 4. INSERT - Insert text at specific line
  const insertTool = tool(
    'memory_insert',
    'Insert text at a specific line in a file',
    {
      path: z.string().describe('Path starting with /memories'),
      insert_line: z.number().describe('Line number to insert at (1-based)'),
      insert_text: z.string().describe('Text to insert')
    },
    async (args) => {
      try {
        const safePath = validateMemoryPath(args.path, beingMemoriesDir);

        const exists = await pathExists(safePath);
        if (!exists) {
          return {
            content: [{
              type: 'text',
              text: `Error: File not found: ${args.path}`
            }],
            isError: true
          };
        }

        const content = await fs.readFile(safePath, 'utf-8');
        const lines = content.split('\n');

        // Insert at line (1-based index)
        const insertIndex = args.insert_line - 1;
        lines.splice(insertIndex, 0, args.insert_text);

        await fs.writeFile(safePath, lines.join('\n'), 'utf-8');

        return {
          content: [{
            type: 'text',
            text: `Text inserted at line ${args.insert_line} in ${args.path}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // 5. DELETE - Delete file or directory
  const deleteTool = tool(
    'memory_delete',
    'Delete a file or directory from memory',
    {
      path: z.string().describe('Path starting with /memories')
    },
    async (args) => {
      try {
        const safePath = validateMemoryPath(args.path, beingMemoriesDir);

        const exists = await pathExists(safePath);
        if (!exists) {
          return {
            content: [{
              type: 'text',
              text: `Error: Path not found: ${args.path}`
            }],
            isError: true
          };
        }

        const stats = await fs.stat(safePath);

        if (stats.isDirectory()) {
          await fs.rm(safePath, { recursive: true });
        } else {
          await fs.unlink(safePath);
        }

        return {
          content: [{
            type: 'text',
            text: `Deleted: ${args.path}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // 6. RENAME - Rename or move file
  const renameTool = tool(
    'memory_rename',
    'Rename or move a file or directory',
    {
      old_path: z.string().describe('Current path starting with /memories'),
      new_path: z.string().describe('New path starting with /memories')
    },
    async (args) => {
      try {
        const safeOldPath = validateMemoryPath(args.old_path, beingMemoriesDir);
        const safeNewPath = validateMemoryPath(args.new_path, beingMemoriesDir);

        const exists = await pathExists(safeOldPath);
        if (!exists) {
          return {
            content: [{
              type: 'text',
              text: `Error: Path not found: ${args.old_path}`
            }],
            isError: true
          };
        }

        // Ensure parent directory of new path exists
        const newParentDir = path.dirname(safeNewPath);
        await fs.mkdir(newParentDir, { recursive: true });

        await fs.rename(safeOldPath, safeNewPath);

        return {
          content: [{
            type: 'text',
            text: `Renamed: ${args.old_path} -> ${args.new_path}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Create MCP server with all 6 tools
  return createSdkMcpServer({
    name: `memory-${beingId}`,
    version: '1.0.0',
    tools: [
      viewTool,
      createTool,
      strReplaceTool,
      insertTool,
      deleteTool,
      renameTool
    ]
  });
}

module.exports = {
  createMemoryToolsServer,
  validateMemoryPath  // Export for testing
};
