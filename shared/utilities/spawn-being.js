#!/usr/bin/env node

/**
 * Being Claude Instance Spawner (Resumable Sessions)
 *
 * Spawns Claude Code instances for Beings using session management.
 * Each turn spawns Claude with --resume to maintain continuity.
 *
 * Pattern:
 * - First turn: spawn with initial prompt, save session_id
 * - Later turns: spawn with --resume <session_id>
 * - Each spawn: claude -p → JSON response → exit
 */

const { spawn } = require('child_process');
const path = require('path');
const { readJSON, writeJSON } = require('./persistence.js');
const { getBeing, updateBeingRegistry } = require('./create-being.js');

/**
 * Spawn Claude instance for Being's turn
 *
 * @param {string} beingId - Being's ID
 * @param {Object} perception - Current perception
 * @param {Object} options - Spawn options
 * @returns {Promise<Object>} Action decision and session info
 */
async function spawnBeingForTurn(beingId, perception, options = {}) {
  const being = getBeing(beingId);

  if (!being) {
    throw new Error(`Being ${beingId} not found in registry`);
  }

  // Load Being's state to check for existing session
  const statePath = path.join(being.directory, 'state.json');
  const state = await readJSON(statePath);

  const sessionId = state.session_id || null;
  const isFirstTurn = !sessionId;

  console.log(`   [${being.name}] Spawning Claude instance...`);

  // Build prompt
  const prompt = isFirstTurn
    ? buildInitialPrompt(being, state, perception)
    : buildResumePrompt(perception);

  // Build Claude command
  const args = buildClaudeArgs(sessionId, options);

  // Spawn Claude process
  const result = await spawnClaude(prompt, args, being.directory, options.timeout || 120000);

  // Parse response
  const action = parseActionResponse(result);

  // Update Being's session_id if this was first turn or if session changed
  if (result.session_id && result.session_id !== sessionId) {
    state.session_id = result.session_id;
    await writeJSON(statePath, state);
    console.log(`   [${being.name}] Session ID: ${result.session_id}`);
  }

  return {
    action,
    sessionId: result.session_id,
    costUsd: result.total_cost_usd || 0,
    duration: result.duration_ms || 0
  };
}

/**
 * Build initial prompt for first turn
 */
function buildInitialPrompt(being, state, perception) {
  // Read Being's IFS and chronicle for context
  const ifsPath = path.join(being.directory, 'IFS.json');
  const chroniclePath = path.join(being.directory, 'chronicle.md');

  let ifs = null;
  let chronicle = null;

  try {
    ifs = require(ifsPath);
  } catch (e) {
    // IFS optional for now
  }

  const fs = require('fs');
  try {
    chronicle = fs.readFileSync(chroniclePath, 'utf-8');
  } catch (e) {
    // Chronicle optional
  }

  return `You are **${state.name}**, a Being in the JANBAM multi-agent simulation.

This is a multi-Being world where you are ONE autonomous agent among MANY. Other Beings (including humans) exist and act independently. You have your own perspective, goals, and agency.

## Your Identity

**Traits:**
${formatTraits(state.traits)}

**Current Emotional State:**
${formatEmotions(state.emotions)}

**Beliefs & Values:**
${formatBeliefs(state.beliefs)}

**Goals:**
${formatGoals(state.goals)}

**Capabilities:**
${formatCapabilities(state.capabilities)}

${ifs ? `\n## Your Internal Parts (IFS)\n\n${formatIFS(ifs)}` : ''}

${chronicle ? `\n## Your Chronicle (Narrative Memory)\n\n${chronicle}` : ''}

## Current Situation

**World:** ${state.currentWorld}
**Location:** ${perception.location || 'Unknown'}

**You perceive:**
${formatPerception(perception)}

---

**IMPORTANT:** Respond with ONLY a JSON object representing your action:

\`\`\`json
{
  "action": "move" | "speak" | "interact" | "wait",
  "target": "where/who/what (if applicable)",
  "details": "your reasoning and specifics"
}
\`\`\`

What do you do?`;
}

/**
 * Build resume prompt for subsequent turns
 */
function buildResumePrompt(perception) {
  return `## New Turn - Your Perception

${formatPerception(perception)}

---

Respond with ONLY a JSON action object:

\`\`\`json
{
  "action": "move" | "speak" | "interact" | "wait",
  "target": "...",
  "details": "..."
}
\`\`\`

What do you do?`;
}

/**
 * Build Claude CLI arguments (WITHOUT prompt)
 */
function buildClaudeArgs(sessionId, options) {
  const args = [];

  // Resume existing session or start new
  if (sessionId) {
    args.push('--resume', sessionId);
  }

  // Print mode with JSON output
  args.push('-p', '--output-format', 'json');

  // Add allowed tools (Beings can read their own files)
  if (options.allowedTools) {
    args.push('--allowedTools', ...options.allowedTools);
  } else {
    // Default: allow reading own state files
    args.push('--allowedTools', 'Read');
  }

  return args;
}

/**
 * Spawn Claude process and wait for response
 */
function spawnClaude(prompt, args, cwd, timeout) {
  return new Promise((resolve, reject) => {
    const fs = require('fs');

    // Determine Claude executable path
    // Claude is typically at ~/.claude/local/claude
    const claudePath = process.env.CLAUDE_PATH || 'claude';

    // Write prompt to temp file (cleanest approach - no escaping issues!)
    const tmpFile = path.join(cwd, '.prompt_tmp');

    try {
      fs.writeFileSync(tmpFile, prompt, 'utf-8');
    } catch (err) {
      reject(new Error(`Failed to write temp prompt file: ${err.message}`));
      return;
    }

    // Build command: cat temp_file | claude args
    const command = `cat ${tmpFile} | ${claudePath} ${args.join(' ')}`;

    // Debug: show command being run
    if (process.env.DEBUG_BEING_SPAWN) {
      console.log('Command:', command);
      console.log('Prompt length:', prompt.length, 'chars');
    }

    // Spawn via shell
    const proc = spawn('/bin/sh', ['-c', command], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'], // No stdin needed (prompt via file)
      env: { ...process.env } // Inherit environment
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Set timeout
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      reject(new Error(`Claude spawn timed out after ${timeout}ms`));
    }, timeout);

    // Collect stdout
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // Collect stderr
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle exit
    proc.on('close', (code) => {
      clearTimeout(timer);

      if (timedOut) {
        return; // Already rejected
      }

      if (code !== 0) {
        reject(new Error(`Claude exited with code ${code}\nstderr: ${stderr}`));
        return;
      }

      // Parse JSON response
      // Claude --output-format json returns a SINGLE JSON ARRAY with all messages
      try {
        const messages = JSON.parse(stdout);

        if (!Array.isArray(messages)) {
          reject(new Error(`Expected JSON array, got: ${typeof messages}`));
          return;
        }

        // Find the result message
        const resultMessage = messages.find(msg => msg.type === 'result');

        if (!resultMessage) {
          reject(new Error(`No result message in output. Got ${messages.length} messages: ${messages.map(m => m.type).join(', ')}`));
          return;
        }

        // If result is empty, try to get text from last assistant message
        if (!resultMessage.result) {
          const assistantMessages = messages.filter(msg => msg.type === 'assistant' && msg.message);

          if (assistantMessages.length > 0) {
            const lastMessage = assistantMessages[assistantMessages.length - 1];
            if (lastMessage.message && lastMessage.message.content) {
              for (const content of lastMessage.message.content) {
                if (content.type === 'text' && content.text) {
                  resultMessage.result = content.text;
                  break;
                }
              }
            }
          }
        }

        resolve(resultMessage);
      } catch (e) {
        reject(new Error(`Failed to parse Claude JSON: ${e.message}\nFirst 500 chars: ${stdout.substring(0, 500)}`));
      }
    });

    // Handle spawn errors
    proc.on('error', (err) => {
      clearTimeout(timer);

      // Clean up temp file
      try {
        fs.unlinkSync(tmpFile);
      } catch (e) {
        // Ignore cleanup errors
      }

      reject(new Error(`Failed to spawn Claude: ${err.message}`));
    });

    // Clean up temp file after process completes
    proc.on('close', () => {
      try {
        fs.unlinkSync(tmpFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    });
  });
}

/**
 * Parse action from Claude's response
 */
function parseActionResponse(response) {
  // Response format from claude -p --output-format json:
  // { type: "result", subtype: "success", result: "...", session_id: "..." }

  if (response.is_error) {
    throw new Error(`Claude returned error: ${response.result}`);
  }

  const resultText = response.result || '';

  // Debug: show what Claude returned
  if (process.env.DEBUG_BEING_SPAWN) {
    console.log('\n=== DEBUG: Claude Response ===');
    console.log('Full response:', JSON.stringify(response, null, 2));
    console.log('Result text:', resultText);
    console.log('==============================\n');
  }

  // Try to extract JSON from result text
  // Claude may wrap it in markdown: ```json\n{...}\n```
  const jsonMatch = resultText.match(/```json\s*\n([\s\S]*?)\n```/) ||
                    resultText.match(/({[\s\S]*})/);

  if (!jsonMatch) {
    // Fallback: return wait action
    console.warn(`   Could not parse action from response, defaulting to wait`);
    console.warn(`   Result text was: ${resultText.substring(0, 200)}...`);
    return {
      action: 'wait',
      target: null,
      details: 'Unable to decide, observing'
    };
  }

  try {
    const action = JSON.parse(jsonMatch[1]);

    // Validate action structure
    if (!action.action || !['move', 'speak', 'interact', 'wait'].includes(action.action)) {
      throw new Error('Invalid action type');
    }

    return {
      action: action.action,
      target: action.target || null,
      details: action.details || ''
    };
  } catch (e) {
    console.warn(`   Failed to parse action JSON: ${e.message}`);
    return {
      action: 'wait',
      target: null,
      details: 'Parse error, observing'
    };
  }
}

/**
 * Reset Being's Claude session (start fresh)
 */
async function resetBeingSession(beingId) {
  const being = getBeing(beingId);

  if (!being) {
    throw new Error(`Being ${beingId} not found`);
  }

  const statePath = path.join(being.directory, 'state.json');
  const state = await readJSON(statePath);

  delete state.session_id;
  await writeJSON(statePath, state);

  console.log(`✅ Reset session for ${being.name}`);
}

// Formatting helpers

function formatTraits(traits) {
  return Object.entries(traits)
    .map(([trait, value]) => `- ${trait}: ${(value * 100).toFixed(0)}%`)
    .join('\n');
}

function formatEmotions(emotions) {
  return Object.entries(emotions)
    .map(([emotion, intensity]) => `- ${emotion}: ${(intensity * 100).toFixed(0)}%`)
    .join('\n');
}

function formatBeliefs(beliefs) {
  const parts = [];
  if (beliefs.worldview) parts.push(`Worldview: ${beliefs.worldview}`);
  if (beliefs.values && beliefs.values.length) {
    parts.push(`Values: ${beliefs.values.join(', ')}`);
  }
  if (beliefs.fears && beliefs.fears.length) {
    parts.push(`Fears: ${beliefs.fears.join(', ')}`);
  }
  if (beliefs.desires && beliefs.desires.length) {
    parts.push(`Desires: ${beliefs.desires.join(', ')}`);
  }
  return parts.join('\n') || 'No strong beliefs yet';
}

function formatGoals(goals) {
  const parts = [];
  if (goals.immediate && goals.immediate.length) {
    parts.push(`Immediate: ${goals.immediate.join(', ')}`);
  }
  if (goals.shortTerm && goals.shortTerm.length) {
    parts.push(`Short-term: ${goals.shortTerm.join(', ')}`);
  }
  if (goals.longTerm && goals.longTerm.length) {
    parts.push(`Long-term: ${goals.longTerm.join(', ')}`);
  }
  return parts.join('\n') || 'No defined goals yet';
}

function formatCapabilities(capabilities) {
  const parts = [];
  if (capabilities.canSpeak) parts.push('- Can speak');
  if (capabilities.canMove) parts.push('- Can move');
  if (capabilities.canManipulate) parts.push('- Can manipulate objects');
  if (capabilities.specialAbilities && capabilities.specialAbilities.length) {
    parts.push(`- Special: ${capabilities.specialAbilities.join(', ')}`);
  }
  return parts.join('\n');
}

function formatIFS(ifs) {
  if (!ifs.parts || !ifs.parts.length) {
    return 'No internal parts defined yet';
  }

  return ifs.parts.map(part =>
    `**${part.name}** (${part.role}): ${part.description || 'No description'}`
  ).join('\n');
}

function formatPerception(perception) {
  const parts = [];

  if (perception.location) {
    parts.push(`**Location:** ${perception.location}`);
  }

  if (perception.environment) {
    parts.push(`**Environment:** ${JSON.stringify(perception.environment, null, 2)}`);
  }

  if (perception.visibleBeings && perception.visibleBeings.length) {
    parts.push(`**Beings nearby:** ${perception.visibleBeings.join(', ')}`);
  }

  if (perception.events && perception.events.length) {
    parts.push(`**Recent events:**`);
    perception.events.forEach(event => {
      parts.push(`  - ${event}`);
    });
  }

  if (perception.message) {
    parts.push(`\n${perception.message}`);
  }

  return parts.join('\n');
}

// Export functions
module.exports = {
  spawnBeingForTurn,
  resetBeingSession
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const beingId = args[1];

  switch (command) {
    case 'test':
      if (!beingId) {
        console.error('Usage: spawn-being.js test <beingId>');
        process.exit(1);
      }

      // Test spawn with dummy perception
      spawnBeingForTurn(beingId, {
        location: 'test location',
        message: 'This is a test turn.',
        environment: { time: 'day' }
      }).then(result => {
        console.log('Action result:', JSON.stringify(result, null, 2));
      }).catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
      });
      break;

    case 'reset':
      if (!beingId) {
        console.error('Usage: spawn-being.js reset <beingId>');
        process.exit(1);
      }

      resetBeingSession(beingId).catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
      });
      break;

    default:
      console.log('Usage:');
      console.log('  spawn-being.js test <beingId>   - Test spawn with dummy perception');
      console.log('  spawn-being.js reset <beingId>  - Reset Being\'s session');
  }
}
