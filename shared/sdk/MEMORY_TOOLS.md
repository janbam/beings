# Memory Tools for JANBAM Beings

## Overview

Memory Tools provide persistent storage for Being Claude instances across sessions using the **official Claude Memory Tool API**. Each Being has its own isolated `memories/` directory with a single `memory` tool supporting 6 commands.

**IMPORTANT:** Uses Zod v3 (v4 incompatible with Claude Code MCP runtime).

## Architecture

**Memory Tool API → MCP Tools → Being-scoped storage**

- Being Claude instances use memory tools (`memory_view`, `memory_create`, etc.)
- MCP server scopes all operations to `beings/[id]/memories/`
- Tools match official Memory Tool interface for Claude's natural understanding
- Complete path traversal protection

## The `memory` Tool

Single tool with 6 commands matching the **official Claude Memory Tool API**.

### Command: `view`
View directory contents or file contents with optional line range.

```javascript
{
  command: "view",
  path: "/memories",
  view_range: [start_line, end_line] // Optional
}
```

**Returns:** Directory listing or file contents with line numbers.

### Command: `create`
Create or overwrite a file.

```javascript
{
  command: "create",
  path: "/memories/experience.md",
  file_text: "Content to write..."
}
```

**Returns:** Success message.

### Command: `str_replace`
Replace text in a file.

```javascript
{
  command: "str_replace",
  path: "/memories/notes.md",
  old_str: "old text",
  new_str: "new text"
}
```

**Returns:** Success message. **Error** if old_str not found.

### Command: `insert`
Insert text at a specific line number (1-based).

```javascript
{
  command: "insert",
  path: "/memories/journal.md",
  insert_line: 5,
  insert_text: "New entry..."
}
```

**Returns:** Success message.

### Command: `delete`
Delete a file or directory.

```javascript
{
  command: "delete",
  path: "/memories/old_file.md"
}
```

**Returns:** Success message. Supports recursive directory deletion.

### Command: `rename`
Rename or move a file/directory.

```javascript
{
  command: "rename",
  old_path: "/memories/draft.md",
  new_path: "/memories/final.md"
}
```

**Returns:** Success message. Creates parent directories if needed.

## Security Features

**Path Validation (`validateMemoryPath`):**
- All paths MUST start with `/memories`
- Blocks path traversal (`../`, `..\\`, URL-encoded `%2e%2e`)
- Resolves to canonical form and verifies within Being's memories dir
- Prevents escaping to parent directories

**Testing:**
```bash
node shared/sdk/test-being-with-memory.js
```

## Implementation Notes

**Current Version:** `memory-tools-v2.js` (official API)
**Deprecated:** `memory-tools.js` (v1 - 6 separate tools)

**Key Requirements:**
- Zod v3.x (v4 incompatible)
- Agent SDK v0.1.8+
- Claude Sonnet 4.5+ (native Memory Tool training)

## Integration with SDK Spawner

**File:** `shared/sdk/sdk-being-spawner.js`

```javascript
const { createMemoryToolsServer } = require('./memory-tools-v2.js');

// Create Being-scoped memory MCP server
const memoriesDir = path.join(being.directory, 'memories');
const memoryServer = createMemoryToolsServer(being.id, memoriesDir);

// Add to SDK query options
const queryOptions = {
  // ... other options
  mcpServers: {
    [memoryServer.name]: memoryServer
  }
};
```

The SDK automatically makes memory tools available to the Being Claude instance.

## Being System Prompt

Beings receive instructions to use memory tools:

```markdown
## Your Memory System

IMPORTANT: You have persistent memory storage across sessions.

**Memory Protocol:**
1. ALWAYS check your memory directory FIRST using `memory_view` with path="/memories"
2. Read relevant memory files to recall past experiences
3. UPDATE memories as you experience and decide
4. Keep memories organized - delete outdated files, rename for clarity

ASSUME INTERRUPTION: Your context may reset at any time - anything not in memory will be lost!
```

## Directory Structure

```
beings/
└── aether/
    ├── memories/                    # Being's persistent memory storage
    │   ├── experiences.md          # Example: chronicle of experiences
    │   ├── relationships/          # Example: nested organization
    │   │   ├── human.md
    │   │   └── other_being.md
    │   └── goals.md
    ├── state.json
    ├── chronicle.md
    └── ...
```

## Usage Pattern

**Turn 1 (First encounter):**
```
Being spawns → Checks /memories (empty) → Takes action → Creates first memories
```

**Turn 2+ (Subsequent turns):**
```
Being resumes → Reads memories → Recalls context → Takes informed action → Updates memories
```

## Implementation Notes

### Why MCP Tools Instead of Official Memory Tool?

- **Agent SDK compatibility:** JANBAM uses Agent SDK, not Anthropic API SDK
- **Being-scoped isolation:** Each Being gets its own memory directory automatically
- **Same interface:** Tools match official Memory Tool API, so Claude understands them naturally
- **Flexibility:** Can customize behavior for JANBAM-specific needs

### Testing Strategy

**Unit Tests:** Verify server creation, tool registration, path validation (security)

**Integration Tests:** Actual Being turns in orchestration verify functional behavior

## Error Handling

All tools return structured errors:

```javascript
{
  content: [{
    type: 'text',
    text: 'Error: <error message>'
  }],
  isError: true
}
```

Common errors:
- File not found
- Path traversal attempt
- Missing /memories prefix
- Text not found (for str_replace)

## Future Enhancements

Potential additions:
- Memory search/query tool
- Memory statistics (size, file count)
- Auto-cleanup of old memories
- Memory compression for large files
- Semantic memory organization

## See Also

- `shared/sdk/sdk-being-spawner.js` - SDK spawner integration
- `shared/sdk/memory-tools.js` - Implementation
- `shared/sdk/test-memory-tools.js` - Unit tests
- `docs/Claude-API-Memory-Tool.md` - Official Memory Tool docs
