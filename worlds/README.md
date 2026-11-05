# Worlds Directory

This directory contains all **world instances** in the JANBAM system.

## Purpose

Each world is a container for Beings, locations, rules, and narrative. Worlds are isolated environments where multi-being simulations run.

## Structure

```
worlds/
├── {world_name}/
│   ├── world_state.json    # Locations, items, environmental state
│   ├── beings.json         # Registry of Beings in this world
│   ├── rules.js            # World-specific mechanics and physics
│   ├── chronicle.md        # World-level narrative memory
│   ├── encounters/         # Custom encounter modules
│   ├── systems/            # Game systems (magic, combat, etc.)
│   └── .git/               # Version control for world evolution (optional)
└── templates/              # Pre-built world templates
```

## World Types

Worlds can be organized using two approaches:

### Option A: Subdirectories (Current)
- Each world in its own subdirectory
- Simple, visible, easy to backup
- World switching = changing active world reference

### Option B: Git Branches (Experimental)
- Each world on its own git branch
- World switching = `git checkout world/{name}`
- **Revolutionary**: `git merge` to merge worlds!

### Option C: Hybrid
- Use subdirectories for separate worlds
- Use git branches for versions/timelines within a world

## World Components

### world_state.json
Mechanical state of the world:
- Locations and connections
- Items and their locations
- Environmental conditions
- Time/calendar system
- Event history

### beings.json
Registry of Beings currently in this world:
- Being ID and directory reference
- Current location in world
- Entry timestamp
- Exit timestamp (if left world)

### rules.js
World-specific logic:
- Physics (gravity, dimensions, time flow)
- Magic system (if applicable)
- Technology level and capabilities
- Social rules and taboos
- Action validation functions
- Consequence resolution

### chronicle.md
Narrative memory at world level:
- Major events and turning points
- Themes and atmosphere
- Mysteries and secrets
- Foreshadowing and planned reveals
- Creative intentions for world
- WHY things matter (not WHAT happened - that's in world_state.json)

## World Connections

Worlds can connect via **portals**:
- One-way or bidirectional
- Permanent or triggered
- Stable or unstable
- Portals defined in world_state.json
- Beings can travel between connected worlds

Advanced: **Pipe-based federation** allows separate World Creator instances to communicate.

## See Also

- `/shared/templates/world-template/` - Template for creating new worlds
- `/orchestrator/world_creator/` - The orchestrator for each world
- `JANBAM.md` - Overall system philosophy
