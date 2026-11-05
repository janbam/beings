# JANBAM SDK Module

**Agent SDK-based Being spawner for context-isolated, authentic Being instances.**

## Overview

This module provides Claude Agent SDK integration for JANBAM, solving the critical context isolation problem where Beings were inheriting development context (CLAUDE.md, plans, protocols).

### Why SDK Instead of CLI?

**Problem:** Claude Code CLI walks directory tree and loads `.claude/` settings, causing Beings to inherit the entire development context.

**Solution:** Agent SDK with `settingSources: []` provides complete context isolation.

## Files

### `sdk-being-spawner.js`
Core spawner implementation using Agent SDK.

**Key Features:**
- Custom system prompts for Being identity
- Context isolation via `settingSources: []`
- Session management with `sdk_session_id`
- Proper data structure handling for Being state

**Usage:**
```javascript
const { spawnBeingWithSDK } = require('./shared/sdk/sdk-being-spawner.js');

const result = await spawnBeingWithSDK('aether', perception, {
  timeout: 120000,
  model: 'claude-sonnet-4-5-20250929'
});

console.log(result.action);      // Action decision
console.log(result.sessionId);   // SDK session ID
console.log(result.duration);    // Response time in ms
```

### `test-sdk-spawner.js`
Test harness for verifying SDK spawner functionality.

**Tests:**
- ✅ SDK spawning works correctly
- ✅ Context isolation (no CLAUDE.md leakage)
- ✅ Authentic responses based on Being traits
- ✅ Session ID persistence

**Run:**
```bash
node shared/sdk/test-sdk-spawner.js
```

### `COMPARISON.md`
Side-by-side comparison of CLI vs SDK spawners with test results and analysis.

## Architecture

### System Prompt Structure

**First Turn:**
```
You are **[Being Name]**, a Being in a multi-agent simulation world.

## Your Identity

[Personality Traits]
[Emotional State]
[Beliefs & Values]
[Goals]
[Capabilities]
[IFS Parts]
[Chronicle]

## Your Role

[Action instructions and response format]
```

**Resume Turns:**
```
## New Perception

[Location, Time]
[Perception details]

What do you do?
```

### SDK Configuration

```javascript
{
  cwd: being.directory,           // Set CWD to Being directory
  settingSources: [],             // 🔥 Context isolation!
  systemPrompt: systemPrompt,     // Custom Being identity
  resume: sessionId,              // Continue session
  model: 'claude-sonnet-4-5-20250929',
  maxTurns: 1                     // Single turn per spawn
}
```

### Response Parsing

SDK returns `SDKMessage[]` array:
- `SDKSystemMessage` - Initialization
- `SDKAssistantMessage` - Claude responses (contains action JSON)
- `SDKResultMessage` - Final result with metadata

Extract action from last `SDKAssistantMessage.message.content` text blocks.

## Data Structure Compatibility

The spawner handles Being state structure correctly:

### Beliefs (Object)
```json
{
  "worldview": "string",
  "values": ["array"],
  "fears": ["array"],
  "desires": ["array"]
}
```

### Goals (Object)
```json
{
  "immediate": ["array"],
  "shortTerm": ["array"],
  "longTerm": ["array"]
}
```

### Capabilities (Object)
```json
{
  "canSpeak": true,
  "canMove": true,
  "canManipulate": true,
  "specialAbilities": ["array"]
}
```

### IFS (Object)
```json
{
  "parts": [
    {
      "name": "string",
      "role": "string",
      "voice": "string",
      "description": "string",
      "activation_triggers": ["array"]
    }
  ]
}
```

## Integration Status

### ✅ Complete
- [x] SDK package installation
- [x] SDK spawner implementation
- [x] System prompt design
- [x] Data structure handling
- [x] Session management
- [x] Context isolation verification
- [x] Test harness

### 🔄 In Progress
- [ ] Memory Tool integration
- [ ] Custom Being tools (world query, state, communication)
- [ ] Orchestrator integration with feature flag
- [ ] World Creator SDK migration

### ⏸️ Future
- [ ] Streaming response handling
- [ ] Performance optimization
- [ ] Remove CLI spawner
- [ ] Full SDK transition

## Migration Strategy

### Phase 1: Parallel Operation (Current)
- SDK spawner available alongside CLI spawner
- Feature flag to choose spawner type
- Both spawners maintained for compatibility

### Phase 2: SDK Primary
- Orchestrator defaults to SDK spawner
- CLI spawner deprecated but functional
- Migration guide for existing worlds

### Phase 3: SDK Only
- Remove CLI spawner code
- Clean up temporary compatibility layers
- Full SDK architecture

## Testing

Run the test suite:
```bash
node shared/sdk/test-sdk-spawner.js
```

Expected output:
- ✅ SDK spawn successful
- ✅ No context leakage detected
- ✅ Authentic trait-based responses
- ✅ Session ID created and saved

## Performance

**Test Results (Aether, Forest Clearing perception):**
- Duration: ~20 seconds
- Session creation: Successful
- Response quality: Authentic, immersive
- Context isolation: Verified

## Credits

**Session 6 (2025-10-05):** Initial SDK integration and context isolation solution.

---

**This module unblocks JANBAM by enabling truly autonomous Beings without dev context pollution.** 🌟
