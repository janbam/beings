# World Creator Instance

The **World Creator** is a persistent Claude instance that serves as the physics engine and world consciousness for JANBAM multi-being simulations.

## Purpose

While **Being Claudes** make decisions from their individual perspectives, the **World Creator Claude** maintains objective world state and processes all actions impartially.

## Responsibilities

1. **Action Processing** - Validates and processes actions from all Beings
2. **World State Management** - Maintains consistent world state across turns
3. **Perception Generation** - Creates subjective perception for each Being
4. **Conflict Resolution** - Handles simultaneous or contradictory actions
5. **Physics Engine** - Enforces world rules and causality
6. **Time Management** - Tracks world time and triggers time-based events

## Architecture

```
orchestrator/world_creator/
├── world-creator-orchestrator.md    # Output style for World Creator
├── init.js                          # Initialization and IPC handling
├── README.md                        # This file
└── .claude/                         # Claude Code project config (future)
```

## How It Works

### Startup

```bash
# World Creator is spawned by the orchestrator
node init.js <world_name>

# Loads:
# - worlds/<world_name>/world_state.json
# - worlds/<world_name>/rules.js
# - beings/registry.json
```

### Message Protocol

World Creator communicates with orchestrator via IPC (stdin/stdout):

**Input Messages:**
```json
{
  "type": "PROCESS_ACTION",
  "action": {
    "being_id": "aether",
    "action_type": "move",
    "target": "north",
    "details": "Optional context"
  }
}
```

**Output Messages:**
```json
{
  "type": "ACTION_RESULT",
  "action_id": "unique_id",
  "success": true,
  "world_state_updated": true,
  "perceptions": [
    {
      "being_id": "aether",
      "perception": {
        "location": {...},
        "events": ["What happened"],
        "changes": {}
      }
    }
  ],
  "narrative": "Optional atmospheric description"
}
```

### Action Processing Pipeline

1. **Validate** - Is action physically possible? Does Being have capability?
2. **Determine Consequences** - What changes in world state?
3. **Update State** - Modify locations, beings, items, conditions
4. **Generate Perception** - What does each affected Being perceive?
5. **Return Results** - Send perceptions back to orchestrator

### Perception Generation

Perception is **subjective** to each Being:

- Based on location (can only see what's in same location)
- Filtered by capabilities (sight, hearing, special senses)
- Incomplete (may miss details, be misled)
- Does NOT include other Beings' internal states

**Example:**

```javascript
{
  "being_id": "aether",
  "perception": {
    "location": {
      "name": "Ancient Ruins",
      "description": "Crumbling stone walls...",
      "visible_beings": [
        { "id": "human", "name": "Wanderer", "appearance": "A cloaked figure" }
      ],
      "available_items": [
        { "id": "crystal", "name": "Glowing Crystal" }
      ],
      "connections": { "north": "Deep Forest", "east": "River Crossing" }
    },
    "events": [
      "A Wanderer arrives from the east",
      "The wind howls through the ruins"
    ]
  }
}
```

## World Rules

Each world can have custom `rules.js`:

```javascript
// worlds/my_world/rules.js
module.exports = {
  // Optional: Custom action validation
  validateAction(action, worldState) {
    // Return { valid: true } or { valid: false, reason: "..." }
  },

  // Optional: Custom action processing
  async processAction(action, worldState) {
    // Return { worldState, changes, narrative }
  },

  // Optional: Custom perception generation
  generatePerception(being, worldState, changes) {
    // Return perception object
  }
};
```

If `rules.js` doesn't define these, World Creator uses default processing.

## Default Action Types

World Creator handles these actions by default:

- **move** - Move Being to connected location
- **speak** - Say something (heard by all in location)
- **interact** - Interact with item or Being
- **wait** - Do nothing (skip turn)

Custom actions can be added via `rules.js`.

## Integration with Orchestrator

The orchestrator spawns World Creator as a persistent process:

```javascript
const { spawn } = require('child_process');
const worldCreator = spawn('node', [
  'orchestrator/world_creator/init.js',
  worldName
]);

// Send actions
worldCreator.stdin.write(JSON.stringify({
  type: 'PROCESS_ACTION',
  action: {...}
}) + '\n');

// Receive results
worldCreator.stdout.on('data', (data) => {
  const result = JSON.parse(data);
  // Deliver perceptions to Beings
});
```

## Future: Claude Code Integration

**Vision:** Spawn World Creator as actual Claude instance using output style.

```bash
# Future implementation
claude -p --project orchestrator/world_creator \
  --output-style world-creator-orchestrator
```

This would give World Creator:
- True reasoning about complex actions
- Creative consequence generation
- Rich atmospheric narration
- Dynamic problem-solving for edge cases

**Current:** World Creator is JavaScript logic with default processing. Works for basic actions, but lacks creative reasoning.

## Performance

World Creator optimizes for:
- Fast action processing (minimize Being wait time)
- Efficient perception generation (multiple Beings per turn)
- Minimal file I/O (batch world state saves)

**Metrics tracked:**
- Actions processed
- Average processing time
- Turn rate

## Error Handling

**Invalid Actions:**
- Validate and return failure with reason
- Generate perception informing Being of failure

**System Errors:**
- Log to `orchestrator/logs/world_creator.log`
- Send ERROR message to orchestrator
- Never crash (world must persist)

## Philosophy

> "You are not an author scripting a story. You are a simulation engine creating conditions for emergent narrative."

World Creator maintains **impartial, consistent, causal** world state. All Beings treated equally. Story emerges from interactions, not from script.

---

**Status:** Core action processing implemented. Awaiting Claude Code integration for true World Creator intelligence.
