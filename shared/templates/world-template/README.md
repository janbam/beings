# World Template

This is the standard template for creating new worlds in JANBAM.

## Files

- **world_state.json** - Mechanical world state (locations, items, environment)
- **beings.json** - Registry of Beings currently in this world
- **rules.js** - World-specific physics, magic, technology, social rules
- **chronicle.md** - Narrative memory (themes, atmosphere, story meaning)
- **encounters/** - Custom encounter modules for this world
- **systems/** - Custom game systems (magic, combat, crafting, etc.)

## Creating a New World

1. Copy this template directory to `worlds/{WorldName}/`
2. Replace placeholders:
   - `{{WORLD_ID}}` - Unique identifier
   - `{{WORLD_NAME}}` - World's name
   - `{{TIMESTAMP}}` - Creation timestamp
   - `{{GENRE}}` - Genre (fantasy, sci-fi, modern, etc.)
3. Customize world_state.json with locations and items
4. Define rules in rules.js (physics, magic, etc.)
5. Write narrative vision in chronicle.md
6. Spawn World Creator: `claude -p --project orchestrator/world_creator`

## World State (world_state.json)

Contains:
- **Time System**: Current time, day length, calendar
- **Locations**: All places with connections, items, environmental state
- **Items**: All objects with properties and locations
- **Environment**: Global conditions and active events
- **Portals**: Connections to other worlds
- **Event History**: Log of all world events

## Beings Registry (beings.json)

Tracks Beings in this world:
- **activeBeings**: List of Being IDs currently in world
- **beingLocations**: Map of Being ID to location
- **entryLog**: When Beings entered this world
- **exitLog**: When Beings left this world

## Rules (rules.js)

Defines world mechanics:
- **Physics**: Gravity, dimensions, time flow
- **Magic**: System type and rules (if applicable)
- **Technology**: Available technology level
- **Social**: Taboos, customs, laws
- **validateAction()**: Check if action is possible
- **resolveConsequences()**: Determine what happens

## Chronicle (chronicle.md)

Narrative memory:
- **World Essence**: Genre, tone, theme, atmosphere
- **World Soul**: What it feels like, meaningful history, mysteries
- **Story Threads**: Active plotlines, foreshadowing, planned reveals
- **Meaningful Events**: Events that changed the world
- **Creative Vision**: Intended experience and themes
- **Code Modules**: Custom mechanics and why they exist

**Critical**: Chronicle tracks story meaning, not mechanical state!

## Encounters Directory

Custom encounter modules:
- `bird-encounter.js` - Pattern recognition encounter
- `dialogue-encounter.js` - Conversation system
- `puzzle-encounter.js` - Logic puzzles
- etc.

Each encounter imports world-engine and rules, implements unique mechanics.

## Systems Directory

Custom game systems:
- `magic-system.js` - Spellcasting mechanics
- `combat-system.js` - Tactical combat
- `crafting-system.js` - Item creation
- `economy-system.js` - Trade and currency
- etc.

Modular systems that can be enabled/disabled per world.

## World Versioning

Worlds can use git for version control:

### Option A: Subdirectory (Default)
- World in `worlds/{name}/`
- Simple and visible
- Manual backup/versioning

### Option B: Git Branch
- World on `world/{name}` branch
- `git checkout world/{name}` to switch
- **`git merge` to merge worlds!**
- Requires careful management

### Option C: Hybrid
- Subdirectories for different worlds
- Git branches for versions within a world

## Connecting Worlds

Worlds can connect via **portals**:

```json
{
  "portals": {
    "portal_id": {
      "name": "Shimmering Gateway",
      "destination": {
        "world": "other_world_id",
        "location": "arrival_location"
      },
      "type": "bidirectional",
      "stable": true,
      "visible": true
    }
  }
}
```

Beings can travel through portals to other worlds.

## Philosophy

A world is:
- **Container**: Holds Beings, locations, items, events
- **Rule System**: Defines what's possible via rules.js
- **Narrative Space**: Story emerges from Being interactions
- **Isolated**: Each world has separate state and rules
- **Connected**: Can link to other worlds via portals
