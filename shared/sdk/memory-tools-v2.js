/**
 * Memory Tools for Being MCP Server (v2 - Official API Compatible)
 *
 * Implements the OFFICIAL Claude Memory Tool API as a single tool with command parameter.
 * This matches what Claude Sonnet 4.5 is natively trained on.
 *
 * Tool name: "memory"
 * Commands: view, create, str_replace, insert, delete, rename
 *
 * All operations are scoped to a Being's memories/ directory with path traversal protection.
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
 * Create Memory Tool MCP Server for a Being
 *
 * Uses the OFFICIAL Memory Tool API that Claude is trained on.
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

  // Define single "memory" tool matching official API
  const memoryTool = tool(
    'memory',
    'Persistent memory storage across sessions. Use view, create, str_replace, insert, delete, and rename commands to manage your memory files.',
    {
      command: z.enum(['view', 'create', 'str_replace', 'insert', 'delete', 'rename'])
        .describe('Memory operation to perform'),

      // Path parameters (used by most commands)
      path: z.string().optional().describe('Path starting with /memories'),

      // View command parameters
      view_range: z.tuple([z.number(), z.number()])
        .optional()
        .describe('Optional [start_line, end_line] range for viewing file'),

      // Create command parameters
      file_text: z.string().optional().describe('Content to write to file'),

      // Str_replace command parameters
      old_str: z.string().optional().describe('Text to find and replace'),
      new_str: z.string().optional().describe('Text to replace with'),

      // Insert command parameters
      insert_line: z.number().optional().describe('Line number to insert at (1-based)'),
      insert_text: z.string().optional().describe('Text to insert'),

      // Rename command parameters
      old_path: z.string().optional().describe('Current path starting with /memories'),
      new_path: z.string().optional().describe('New path starting with /memories')
    },
    async (args) => {
      const { command } = args;

      try {
        // Route to appropriate command handler
        switch (command) {
          case 'view':
            return await handleView(args, beingMemoriesDir);

          case 'create':
            return await handleCreate(args, beingMemoriesDir);

          case 'str_replace':
            return await handleStrReplace(args, beingMemoriesDir);

          case 'insert':
            return await handleInsert(args, beingMemoriesDir);

          case 'delete':
            return await handleDelete(args, beingMemoriesDir);

          case 'rename':
            return await handleRename(args, beingMemoriesDir);

          default:
            return {
              content: [{
                type: 'text',
                text: `Error: Unknown command: ${command}`
              }],
              isError: true
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

  // Create MCP server with single memory tool
  return createSdkMcpServer({
    name: `memory-${beingId}`,
    version: '2.0.0',
    tools: [memoryTool]
  });
}

// Command Handlers

async function handleView(args, beingMemoriesDir) {
  const { path: memPath, view_range } = args;

  if (!memPath) {
    return {
      content: [{
        type: 'text',
        text: 'Error: path parameter required for view command'
      }],
      isError: true
    };
  }

  const safePath = validateMemoryPath(memPath, beingMemoriesDir);

  const exists = await pathExists(safePath);
  if (!exists) {
    return {
      content: [{
        type: 'text',
        text: `Error: Path not found: ${memPath}`
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
    const contents = await readFileWithRange(safePath, view_range);
    return {
      content: [{ type: 'text', text: contents }]
    };
  }
}

async function handleCreate(args, beingMemoriesDir) {
  const { path: memPath, file_text } = args;

  if (!memPath) {
    return {
      content: [{
        type: 'text',
        text: 'Error: path parameter required for create command'
      }],
      isError: true
    };
  }

  if (file_text === undefined) {
    return {
      content: [{
        type: 'text',
        text: 'Error: file_text parameter required for create command'
      }],
      isError: true
    };
  }

  const safePath = validateMemoryPath(memPath, beingMemoriesDir);

  // Ensure parent directory exists
  const parentDir = path.dirname(safePath);
  await fs.mkdir(parentDir, { recursive: true });

  // Write file
  await fs.writeFile(safePath, file_text, 'utf-8');

  return {
    content: [{
      type: 'text',
      text: `File created: ${memPath}`
    }]
  };
}

async function handleStrReplace(args, beingMemoriesDir) {
  const { path: memPath, old_str, new_str } = args;

  if (!memPath || old_str === undefined || new_str === undefined) {
    return {
      content: [{
        type: 'text',
        text: 'Error: path, old_str, and new_str parameters required for str_replace command'
      }],
      isError: true
    };
  }

  const safePath = validateMemoryPath(memPath, beingMemoriesDir);

  const exists = await pathExists(safePath);
  if (!exists) {
    return {
      content: [{
        type: 'text',
        text: `Error: File not found: ${memPath}`
      }],
      isError: true
    };
  }

  let content = await fs.readFile(safePath, 'utf-8');

  if (!content.includes(old_str)) {
    return {
      content: [{
        type: 'text',
        text: `Error: String not found in file: "${old_str}"`
      }],
      isError: true
    };
  }

  content = content.replace(old_str, new_str);
  await fs.writeFile(safePath, content, 'utf-8');

  return {
    content: [{
      type: 'text',
      text: `Text replaced in ${memPath}`
    }]
  };
}

async function handleInsert(args, beingMemoriesDir) {
  const { path: memPath, insert_line, insert_text } = args;

  if (!memPath || insert_line === undefined || insert_text === undefined) {
    return {
      content: [{
        type: 'text',
        text: 'Error: path, insert_line, and insert_text parameters required for insert command'
      }],
      isError: true
    };
  }

  const safePath = validateMemoryPath(memPath, beingMemoriesDir);

  const exists = await pathExists(safePath);
  if (!exists) {
    return {
      content: [{
        type: 'text',
        text: `Error: File not found: ${memPath}`
      }],
      isError: true
    };
  }

  const content = await fs.readFile(safePath, 'utf-8');
  const lines = content.split('\n');

  // Insert at line (1-based index)
  const insertIndex = insert_line - 1;
  lines.splice(insertIndex, 0, insert_text);

  await fs.writeFile(safePath, lines.join('\n'), 'utf-8');

  return {
    content: [{
      type: 'text',
      text: `Text inserted at line ${insert_line} in ${memPath}`
    }]
  };
}

async function handleDelete(args, beingMemoriesDir) {
  const { path: memPath } = args;

  if (!memPath) {
    return {
      content: [{
        type: 'text',
        text: 'Error: path parameter required for delete command'
      }],
      isError: true
    };
  }

  const safePath = validateMemoryPath(memPath, beingMemoriesDir);

  const exists = await pathExists(safePath);
  if (!exists) {
    return {
      content: [{
        type: 'text',
        text: `Error: Path not found: ${memPath}`
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
      text: `Deleted: ${memPath}`
    }]
  };
}

async function handleRename(args, beingMemoriesDir) {
  const { old_path, new_path } = args;

  if (!old_path || !new_path) {
    return {
      content: [{
        type: 'text',
        text: 'Error: old_path and new_path parameters required for rename command'
      }],
      isError: true
    };
  }

  const safeOldPath = validateMemoryPath(old_path, beingMemoriesDir);
  const safeNewPath = validateMemoryPath(new_path, beingMemoriesDir);

  const exists = await pathExists(safeOldPath);
  if (!exists) {
    return {
      content: [{
        type: 'text',
        text: `Error: Path not found: ${old_path}`
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
      text: `Renamed: ${old_path} -> ${new_path}`
    }]
  };
}

module.exports = {
  createMemoryToolsServer,
  validateMemoryPath  // Export for testing
};
