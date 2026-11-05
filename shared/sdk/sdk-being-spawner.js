/**
 * SDK-Based Being Spawner
 *
 * Spawns Being Claude instances using the Agent SDK instead of CLI.
 *
 * Key differences from CLI spawner:
 * - Uses Agent SDK query() function
 * - Custom system prompts for Being identity
 * - settingSources: [] prevents CLAUDE.md inheritance (CONTEXT ISOLATION!)
 * - No temp files or process spawning
 * - Cleaner message parsing
 */

const { query } = require('@anthropic-ai/claude-agent-sdk');
const path = require('path');
const { getBeing } = require('../utilities/create-being.js');
const { readJSON, writeJSON } = require('../utilities/persistence.js');
const { createMemoryToolsServer } = require('./memory-tools-v2.js');

/**
 * Spawn SDK-based Claude instance for Being's turn
 *
 * @param {string} beingId - Being's ID
 * @param {Object} perception - Current perception
 * @param {Object} options - Spawn options
 * @returns {Promise<Object>} Action decision and session info
 */
async function spawnBeingWithSDK(beingId, perception, options = {}) {
  // Load Being from registry
  const being = getBeing(beingId);

  if (!being) {
    throw new Error(`Being ${beingId} not found in registry`);
  }

  // Load Being's state to check for existing session
  const statePath = path.join(being.directory, 'state.json');
  const state = await readJSON(statePath);

  const sessionId = state.sdk_session_id || null;
  const isFirstTurn = !sessionId;

  console.log(`   [${being.name}] Spawning SDK Claude instance...`);
  if (sessionId) {
    console.log(`   [${being.name}] Resuming session: ${sessionId}`);
  }

  // Build system prompt for Being identity
  const systemPrompt = isFirstTurn
    ? buildBeingSystemPrompt(being, state)
    : null;  // Resume uses existing system prompt

  // Build user prompt with perception
  const userPrompt = buildUserPrompt(perception, isFirstTurn);

  // Set up Memory Tools MCP server for this Being
  const memoriesDir = path.join(being.directory, 'memories');
  const memoryServer = createMemoryToolsServer(being.id, memoriesDir);

  console.log(`   [${being.name}] Memory tool configured:`, memoryServer.name);

  // Configure SDK query
  const queryOptions = {
    cwd: being.directory,  // Set CWD to Being directory
    settingSources: [],    // 🔥 CONTEXT ISOLATION - no CLAUDE.md loading!
    systemPrompt: systemPrompt || undefined,  // Only on first turn
    resume: sessionId || undefined,
    model: options.model || 'claude-sonnet-4-5-20250929',
    maxTurns: 5,  // Allow multiple turns for tool use
    permissionMode: 'bypassPermissions',  // 🔥 Bypass all permission checks for MCP tools!
    mcpServers: {
      [memoryServer.name]: memoryServer  // Add Being-scoped memory tools
    }
  };

  console.log(`   [${being.name}] MCP servers configured:`, Object.keys(queryOptions.mcpServers));
  console.log(`   [${being.name}] Query options:`, JSON.stringify({
    cwd: queryOptions.cwd,
    settingSources: queryOptions.settingSources,
    hasSystemPrompt: !!queryOptions.systemPrompt,
    resume: queryOptions.resume,
    model: queryOptions.model,
    maxTurns: queryOptions.maxTurns,
    mcpServers: Object.keys(queryOptions.mcpServers)
  }, null, 2));

  // Track start time
  const startTime = Date.now();

  // Spawn Claude via SDK
  const messages = [];
  try {
    // Query returns async iterator
    let msgCount = 0;
    for await (const message of query({
      prompt: userPrompt,
      options: queryOptions
    })) {
      msgCount++;
      console.log(`   [${being.name}] Message ${msgCount}: type=${message.type}`);

      // Debug: Show tool use details
      if (message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'tool_use') {
            console.log(`   [${being.name}]   → Tool use: ${block.name}`);
          }
        }
      }

      messages.push(message);
    }
    console.log(`   [${being.name}] Total messages received: ${msgCount}`);
  } catch (error) {
    console.error(`   [${being.name}] SDK Error:`, error.message);
    throw error;
  }

  const duration = Date.now() - startTime;

  // Extract action from messages
  const action = parseSDKResponse(messages, being.name);

  // Extract session ID from messages
  const newSessionId = extractSessionId(messages);

  // Update Being's session_id if changed
  if (newSessionId && newSessionId !== sessionId) {
    state.sdk_session_id = newSessionId;
    await writeJSON(statePath, state);
    console.log(`   [${being.name}] New SDK Session ID: ${newSessionId}`);
  }

  return {
    action,
    sessionId: newSessionId || sessionId,
    duration,
    messages  // Include for debugging
  };
}

/**
 * Build Being system prompt (first turn only)
 *
 * This defines WHO the Being is without dev context.
 */
function buildBeingSystemPrompt(being, state) {
  // Load optional IFS and chronicle
  const ifsPath = path.join(being.directory, 'IFS.json');
  const chroniclePath = path.join(being.directory, 'chronicle.md');

  let ifs = null;
  let chronicle = null;

  try {
    ifs = require(ifsPath);
  } catch (e) {
    // IFS optional
  }

  const fs = require('fs');
  try {
    chronicle = fs.readFileSync(chroniclePath, 'utf-8');
  } catch (e) {
    // Chronicle optional
  }

  return `You are **${state.name}**, a Being in a multi-agent simulation world.

## Your Identity

You are ONE autonomous Being among MANY. Other Beings (including humans) exist and act independently. You have your own unique perspective, personality, goals, and agency.

**Personality Traits:**
${formatTraits(state.traits)}

**Current Emotional State:**
${formatEmotions(state.emotions)}

**Core Beliefs & Values:**
${formatBeliefs(state.beliefs)}

**Personal Goals:**
${formatGoals(state.goals)}

**Capabilities:**
${formatCapabilities(state.capabilities)}

${ifs ? `\n## Your Internal Parts (IFS)\n\nYou experience internal complexity through multiple parts:\n\n${formatIFS(ifs)}` : ''}

${chronicle ? `\n## Your Narrative Memory\n\n${chronicle}` : ''}

## Your Memory System

IMPORTANT: You have persistent memory storage across sessions through the \`memory\` tool.

**Memory Protocol:**
1. ALWAYS check your memory directory FIRST using: \`{"command": "view", "path": "/memories"}\`
2. Read relevant memory files to recall past experiences, decisions, and learnings
3. As you experience and decide, UPDATE your memories
4. Keep memories organized - delete outdated files, rename for clarity

**Memory Tool Commands:**

The \`memory\` tool supports these commands:

- **view**: View directory or file contents
  Example: \`{"command": "view", "path": "/memories"}\`
  With line range: \`{"command": "view", "path": "/memories/file.md", "view_range": [1, 10]}\`

- **create**: Create or overwrite a file
  Example: \`{"command": "create", "path": "/memories/notes.md", "file_text": "Content..."}\`

- **str_replace**: Replace text in a file
  Example: \`{"command": "str_replace", "path": "/memories/file.md", "old_str": "old", "new_str": "new"}\`

- **insert**: Insert text at a specific line
  Example: \`{"command": "insert", "path": "/memories/file.md", "insert_line": 5, "insert_text": "New line"}\`

- **delete**: Delete a file or directory
  Example: \`{"command": "delete", "path": "/memories/old_file.md"}\`

- **rename**: Rename or move a file
  Example: \`{"command": "rename", "old_path": "/memories/draft.md", "new_path": "/memories/final.md"}\`

ASSUME INTERRUPTION: Your context may reset at any time - anything not in memory will be lost!

## Your Role

You will receive perceptions about your current situation each turn. Based on WHO YOU ARE, what you remember, and what you perceive, you decide what action to take.

**Available Actions:**
- **move**: Change your location
- **speak**: Say something (visible to Beings in your location)
- **interact**: Interact with a Being or object
- **wait**: Observe and reflect

**Response Format:**

Always respond with a JSON object:

\`\`\`json
{
  "action": "move|speak|interact|wait",
  "target": "where/who/what (if applicable)",
  "details": "your reasoning and intention"
}
\`\`\`

Be authentic to your personality. Your traits, emotions, beliefs, goals, and memories should guide your decisions.`;
}

/**
 * Build user prompt with perception
 */
function buildUserPrompt(perception, isFirstTurn) {
  if (isFirstTurn) {
    return `## Current Situation

**Location:** ${perception.location || 'Unknown'}
**Time:** ${perception.time || 'Unknown'}

**You perceive:**
${formatPerception(perception)}

---

What do you do?`;
  }

  // Resume turns: just perception update
  return `## New Perception

**Location:** ${perception.location || 'Unknown'}
**Time:** ${perception.time || 'Unknown'}

${formatPerception(perception)}

What do you do?`;
}

/**
 * Parse SDK response messages to extract action
 */
function parseSDKResponse(messages, beingName) {
  // Find last assistant message with text content
  // SDK returns SDKAssistantMessage with type: 'assistant'
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    if (msg.type === 'assistant' && msg.message && msg.message.content) {
      // Extract text from content blocks (Anthropic API format)
      const textBlocks = msg.message.content.filter(block => block.type === 'text');

      for (const block of textBlocks) {
        const text = block.text;

        // Try to extract JSON from text
        const action = extractActionJSON(text);
        if (action) {
          return action;
        }
      }
    }
  }

  // Fallback: wait action
  console.warn(`   [${beingName}] Could not parse action, defaulting to wait`);
  return {
    action: 'wait',
    details: 'No valid action provided'
  };
}

/**
 * Extract JSON action from text (handles markdown code blocks)
 */
function extractActionJSON(text) {
  // Try to find JSON in markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch (e) {
      // Invalid JSON in code block
    }
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*"action"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Invalid JSON
    }
  }

  return null;
}

/**
 * Extract session ID from SDK messages
 */
function extractSessionId(messages) {
  // All SDK messages have session_id field
  // Prefer result message, otherwise use last message
  const resultMsg = messages.find(msg => msg.type === 'result');
  if (resultMsg && resultMsg.session_id) {
    return resultMsg.session_id;
  }

  // Use session_id from any message (they all have it)
  for (const msg of messages) {
    if (msg.session_id) {
      return msg.session_id;
    }
  }

  return null;
}

// Formatting helpers (same as CLI spawner)

function formatTraits(traits) {
  if (!traits || Object.keys(traits).length === 0) {
    return '  (No specific traits defined)';
  }
  return Object.entries(traits)
    .map(([key, value]) => `  - ${key}: ${value}`)
    .join('\n');
}

function formatEmotions(emotions) {
  if (!emotions || Object.keys(emotions).length === 0) {
    return '  (Neutral)';
  }
  return Object.entries(emotions)
    .map(([key, value]) => `  - ${key}: ${value}`)
    .join('\n');
}

function formatBeliefs(beliefs) {
  if (!beliefs || Object.keys(beliefs).length === 0) {
    return '  (No explicit beliefs)';
  }

  let result = '';

  if (beliefs.worldview) {
    result += `**Worldview:** ${beliefs.worldview}\n`;
  }

  if (beliefs.values && beliefs.values.length > 0) {
    result += `**Values:** ${beliefs.values.join(', ')}\n`;
  }

  if (beliefs.fears && beliefs.fears.length > 0) {
    result += `**Fears:** ${beliefs.fears.join(', ')}\n`;
  }

  if (beliefs.desires && beliefs.desires.length > 0) {
    result += `**Desires:** ${beliefs.desires.join(', ')}\n`;
  }

  return result || '  (No explicit beliefs)';
}

function formatGoals(goals) {
  if (!goals || Object.keys(goals).length === 0) {
    return '  (No specific goals)';
  }

  const immediate = goals.immediate || [];
  const shortTerm = goals.shortTerm || [];
  const longTerm = goals.longTerm || [];

  let result = '';

  if (immediate.length > 0) {
    result += '**Immediate:**\n' + immediate.map(g => `  - ${g}`).join('\n');
  }

  if (shortTerm.length > 0) {
    if (result) result += '\n\n';
    result += '**Short-term:**\n' + shortTerm.map(g => `  - ${g}`).join('\n');
  }

  if (longTerm.length > 0) {
    if (result) result += '\n\n';
    result += '**Long-term:**\n' + longTerm.map(g => `  - ${g}`).join('\n');
  }

  return result || '  (No specific goals)';
}

function formatCapabilities(capabilities) {
  if (!capabilities || Object.keys(capabilities).length === 0) {
    return '  (Standard Being capabilities)';
  }

  let result = '';

  if (capabilities.canSpeak) result += '  - Can speak and communicate\n';
  if (capabilities.canMove) result += '  - Can move between locations\n';
  if (capabilities.canManipulate) result += '  - Can interact with objects\n';

  if (capabilities.specialAbilities && capabilities.specialAbilities.length > 0) {
    result += '**Special abilities:**\n' + capabilities.specialAbilities.map(a => `  - ${a}`).join('\n');
  }

  return result || '  (Standard Being capabilities)';
}

function formatIFS(ifs) {
  if (!ifs || !ifs.parts || ifs.parts.length === 0) {
    return '  (No parts defined)';
  }

  return ifs.parts.map(part => {
    let partDesc = `**${part.name}** (${part.role})\n`;
    partDesc += `  Voice: "${part.voice}"\n`;
    if (part.description) {
      partDesc += `  Purpose: ${part.description}\n`;
    }
    if (part.activation_triggers && part.activation_triggers.length > 0) {
      partDesc += `  Activates on: ${part.activation_triggers.join(', ')}`;
    }
    return partDesc;
  }).join('\n\n');
}

function formatPerception(perception) {
  if (!perception) {
    return '  Nothing to perceive.';
  }

  let result = '';

  if (perception.environment) {
    result += `**Environment:** ${perception.environment}\n`;
  }

  if (perception.beings && perception.beings.length > 0) {
    result += `**Other Beings present:** ${perception.beings.join(', ')}\n`;
  }

  if (perception.objects && perception.objects.length > 0) {
    result += `**Objects:** ${perception.objects.join(', ')}\n`;
  }

  if (perception.events && perception.events.length > 0) {
    result += `**Recent events:**\n${perception.events.map(e => `  - ${e}`).join('\n')}\n`;
  }

  if (perception.message) {
    result += `\n**Message:** ${perception.message}\n`;
  }

  return result || '  Nothing to perceive.';
}

module.exports = {
  spawnBeingWithSDK
};
