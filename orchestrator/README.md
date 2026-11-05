# Orchestrator Directory

This directory contains the **World Creator Claude instance** and orchestration system that manages the multi-being simulation.

## Purpose

The orchestrator is the heart of JANBAM. It:
- Manages round-robin turn scheduling for all Beings
- Spawns and manages persistent Claude instances for each Being
- Processes actions and updates world state
- Generates perceptions for each Being
- Maintains world consistency
- Handles message delivery between Beings

## Structure

```
orchestrator/
├── world_creator/
│   ├── state.json           # World Creator's internal state
│   ├── .claude-history/     # Persistent Claude session
│   └── config.json          # Configuration and world reference
├── turn_manager.js          # Round-robin turn queue and execution
├── message_queue.js         # Message buffering and delivery
├── being_spawner.js         # Spawn and manage Being Claude instances
├── action_processor.js      # Validate and process Being actions
├── perception_generator.js  # Generate what each Being perceives
├── main_loop.js            # Main orchestration loop
└── cli.js                  # Orchestrator control CLI
```

## World Creator Claude

The World Creator is a **persistent Claude instance** that:
- Does NOT take a Being's perspective
- Acts as physics engine + narrator
- Processes all actions objectively
- Maintains consistent world model
- Generates narrative from events
- Makes final determinations on conflicts

Spawned as: `claude -p --project orchestrator/world_creator`

## Core Components

### turn_manager.js
Manages turn order:
- Queue of Being IDs
- Fair round-robin scheduling
- Priority modifiers for urgent actions
- Skip inactive Beings
- Human Being treated identically

### message_queue.js
Message buffering system:
- Per-Being message queues
- Priority levels (urgent, normal, background)
- Message expiration/TTL
- Delivery guarantees

### being_spawner.js
Spawn and manage Claude instances:
- Launch: `claude -p --project beings/{name}`
- Maintain process handles/PIDs
- Handle crashes and restarts
- Set up stdio/IPC communication
- Process manager for multiple Claudes

### action_processor.js
World Creator's action handling:
- Receive action intents from Beings
- Validate against world rules
- Determine consequences
- Update world state
- Generate outcomes

### perception_generator.js
What each Being perceives:
- Based on location, senses, awareness
- Filtered by capabilities
- Includes: visible Beings, environment, events
- Partial and subjective (not omniscient)

### main_loop.js
The infinite orchestration loop:
```javascript
while (true) {
  being = turnQueue.next()
  perception = worldCreator.generatePerception(being)
  action = being.takeTurn(perception)
  outcome = worldCreator.processAction(action)
  worldCreator.updateState(outcome)
  worldCreator.broadcastPerceptions(outcome.affected)
}
```

## Modified AskHuman Tool

Critical innovation: **ReplacementMessageTool** replaces AskHuman:
- Instead of blocking for user input
- Returns queued messages from buffer
- If no messages, returns empty signal
- Claude continues in same response cycle
- **Preserves thinking blocks across turns**

This allows Being Claudes to maintain continuity without breaking response flow.

## Orchestration Flow

1. **Turn Start**: Being's turn comes up in queue
2. **Perception**: World Creator generates what Being perceives
3. **Decision**: Being's Claude receives perception, decides action
4. **Validation**: World Creator validates action possibility
5. **Processing**: Action consequences determined
6. **State Update**: World state modified
7. **Broadcasting**: Affected Beings receive perception updates
8. **Next Turn**: Move to next Being in queue

## Control CLI

`orchestrator/cli.js` provides control:
- Start/stop simulation
- Pause/resume
- Speed control (turns per second)
- Single-step mode (debugging)
- Snapshot/save
- Rollback to previous state

## Performance Monitoring

Track metrics:
- Turns per second
- Average turn latency
- Being response times
- World Creator processing time
- Message queue depths
- Memory usage

## See Also

- `/beings/` - Being instances orchestrated
- `/worlds/` - Worlds being simulated
- `JANBAM.md` - System philosophy
