# Pipe-Based World Connections (Future/Experimental)

This document outlines the design for connecting different worlds via named pipes, allowing Beings to cross between worlds and enabling world-to-world communication.

**Status:** Design phase - not yet implemented

## Concept

Multiple World Creator instances can run in separate processes, each managing their own world. Named pipes provide communication channels between these worlds, enabling:

- Beings traveling between worlds
- Cross-world events and interactions
- Distributed world federation
- Multi-world orchestration

## Architecture

### Separate World Creator Instances

Each world runs its own orchestrator:

```
Process 1: World Creator for "Fractured Realm"
Process 2: World Creator for "Tavern Tales"
Process 3: World Creator for "Mystery Mansion"
```

### Named Pipes for Communication

```
/tmp/janbam-pipe-fractured_realm-to-tavern_tales
/tmp/janbam-pipe-tavern_tales-to-fractured_realm
```

Each pipe is unidirectional. Bidirectional communication requires two pipes.

### Portal Mechanism

Portals in world_state.json reference pipe connections:

```json
{
  "portals": {
    "gateway_to_tavern": {
      "name": "Shimmering Gateway",
      "destination": {
        "world": "tavern_tales",
        "location": "tavern_entrance",
        "pipe": "/tmp/janbam-pipe-fractured_realm-to-tavern_tales"
      },
      "type": "bidirectional",
      "stable": true
    }
  }
}
```

## Being Transfer Protocol

When a Being crosses a portal to another world:

### Step 1: Source World

1. Being declares intent: `cross_portal "gateway_to_tavern"`
2. Source World Creator validates action
3. Source World Creator packages Being's state
4. Source World Creator sends transfer message via pipe:

```json
{
  "type": "being_transfer",
  "being": {
    "id": "aether",
    "state": {...},
    "memory": {...},
    "ifs": {...}
  },
  "destination_location": "tavern_entrance",
  "timestamp": "..."
}
```

### Step 2: Pipe Transport

Message travels through named pipe to destination World Creator.

### Step 3: Destination World

1. Destination World Creator receives transfer message
2. Creates Being directory in its world's context (or references existing)
3. Updates world's beings.json to include transferred Being
4. Places Being at destination_location
5. Sends acknowledgment back via return pipe

### Step 4: Completion

1. Source World Creator receives acknowledgment
2. Marks Being as "in_other_world" in source world
3. Being's Claude instance now communicates with destination World Creator
4. Being operates in new world

## Message Routing

### Cross-World Messages

Beings in different worlds can communicate via pipes:

```
Being1 (World A) → World Creator A → Pipe → World Creator B → Being2 (World B)
```

World Creators handle message routing between worlds.

### Event Propagation

Events in one world can affect connected worlds:

```json
{
  "type": "cross_world_event",
  "source_world": "fractured_realm",
  "event": "dimensional_rupture",
  "affects": ["tavern_tales"],
  "data": {
    "description": "Reality ripples across the threshold",
    "visible_to": ["all_near_portal"]
  }
}
```

## Implementation Requirements

### 1. Pipe Management Module

```javascript
// orchestrator/pipe_manager.js

class PipeManager {
  createPipe(worldA, worldB) { ... }
  openPipe(pipePath) { ... }
  sendMessage(pipe, message) { ... }
  receiveMessage(pipe) { ... }
  closePipe(pipe) { ... }
}
```

### 2. World Creator Pipe Interface

Extend World Creator to:
- Monitor incoming pipes for transfer requests
- Package Beings for transfer
- Receive and integrate transferred Beings
- Route cross-world messages

### 3. Being Transfer Handler

```javascript
// orchestrator/being_transfer.js

async function transferBeing(being, sourceWorld, destWorld, destLocation) {
  // Package Being data
  // Send via pipe
  // Await acknowledgment
  // Update source world state
  // Being continues in dest world
}
```

### 4. Multi-World Orchestrator (Optional)

Higher-level orchestrator managing multiple World Creators:

```
Meta-Orchestrator
├── World Creator: Fractured Realm
├── World Creator: Tavern Tales
└── World Creator: Mystery Mansion
```

Coordinates:
- World creation and shutdown
- Pipe setup and teardown
- Cross-world event propagation
- Global Being registry

## Challenges

### 1. State Consistency

Being exists in multiple worlds simultaneously - need clear ownership model:
- Being "belongs" to one world at a time
- Original world keeps historical data
- Clear handoff protocol

### 2. Performance

Each pipe message has latency. Minimize round-trips:
- Batch messages when possible
- Cache frequently accessed cross-world data
- Async message handling

### 3. Error Handling

Pipes can break, processes can crash:
- Timeout on pipe communication
- Retry logic for failed transfers
- Rollback mechanism if transfer fails
- Being recovery if destination world crashes

### 4. Security

Malicious world could:
- Inject fake Being transfers
- Corrupt Being state
- Spam pipe with messages

Mitigations:
- Validate all incoming messages
- Schema validation for Being data
- Rate limiting on pipes
- Authentication tokens for world communication

## Use Cases

### 1. Tavern as Hub World

Central tavern world connected to many adventure worlds:
- Beings gather in tavern between adventures
- Portal room with gateways to different realms
- Tavern stays running, adventure worlds spawn on demand

### 2. Parallel Timelines

Same world at different points in time:
- World A: Present day
- World B: 100 years in future
- Portal allows time travel
- Being can exist in both timelines

### 3. Distributed Load

Large simulation across multiple processes:
- Each region is a separate world/process
- Beings travel between regions
- Scales horizontally

### 4. Collaborative Worlds

Different users running separate worlds:
- Alice runs Fantasy Kingdom
- Bob runs Space Station
- Permanent portal connects them
- Beings from both worlds interact

## Future Enhancements

### Network Pipes

Replace local named pipes with TCP/WebSocket:
- Worlds on different machines
- True distributed federation
- Internet-scale JANBAM network

### World Registry Service

Central registry of all active worlds:
- Discovery mechanism
- Portal marketplace
- Global Being directory

### Cross-World Persistence

Shared database for Beings that travel:
- Being "home world" concept
- Travel history tracked
- Multi-world inventory

## Implementation Priority

**Phase:** Future/Experimental (not Phase 1-8)

**Prerequisites:**
- ✅ Core infrastructure
- ✅ Single world orchestration
- ✅ IPC system
- ⏳ Stable single-world simulation

**Recommended Approach:**
1. Implement single-world system first
2. Prove stability and performance
3. Design pipe protocol in detail
4. Prototype with two simple worlds
5. Expand if successful

## Conclusion

Pipe-based world connections are a powerful but complex feature. They enable revolutionary multi-world experiences but add significant implementation complexity.

**Recommendation:** Document design now, implement only if/when single-world system is mature and there's clear demand for multi-world capabilities.
