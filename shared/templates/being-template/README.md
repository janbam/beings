# Being Template

This is the standard template for creating new Beings in JANBAM.

## Files

- **state.json** - Current emotional/cognitive state, location, goals, traits
- **memory.json** - Experience history, relationships, episodic/semantic/emotional memory
- **IFS.json** - Internal Family System configuration (parts and Self)
- **chronicle.md** - Narrative memory (WHY things matter, not WHAT happened)
- **api.js** - Self-state API that Being's Claude instance uses
- **parts/** - Optional subdirectories for complex IFS parts

## Creating a New Being

1. Copy this template directory to `beings/{BeingName}/`
2. Replace placeholders in files:
   - `{{BEING_ID}}` - Unique identifier
   - `{{BEING_NAME}}` - Being's name
   - `{{TIMESTAMP}}` - Creation timestamp
   - `{{WORLDVIEW}}` - Initial worldview/philosophy
3. Customize initial state, IFS parts, and personality
4. Spawn Being's Claude instance: `claude -p --project beings/{BeingName}`

## State File (state.json)

Contains:
- **Emotions**: 8 basic emotions (Plutchik's wheel)
- **Beliefs**: Worldview, values, fears, desires
- **World Model**: What the Being knows about the world
- **Goals**: Immediate, short-term, and long-term goals
- **Traits**: Big Five personality + empathy
- **Capabilities**: What the Being can do
- **Status**: Health, energy, focus

## Memory File (memory.json)

Three types of memory:
- **Episodic**: Specific experiences and events
- **Semantic**: Facts, skills, general knowledge
- **Emotional**: Attachments, traumas, joys

Also includes relationship tracking with other Beings.

## IFS File (IFS.json)

Internal Family System configuration:
- **Parts**: Multiple parts with roles, voices, triggers
  - Protector (keeps safe)
  - Explorer (seeks novelty)
  - Critic (evaluates)
  - Nurturer (cares for self/others)
  - etc.
- **Self**: Core awareness that mediates
- **Dialog History**: Record of internal dialogs

## Chronicle (chronicle.md)

Narrative memory tracking:
- **Essence**: Core identity and drives
- **Character Soul**: Personality depth, voice, relationships
- **Secrets & Foreshadowing**: Hidden knowledge and plans
- **Meaningful Moments**: Events that changed the Being
- **Creative Notes**: Meta-notes about narrative role

**Critical**: Chronicle tracks MEANING, not mechanics. Don't duplicate state.json data here!

## API (api.js)

Functions for Being's Claude instance:
- `getState()` - Read current state
- `updateState(changes)` - Modify state
- `getMemory()` - Read memory
- `addMemory(event)` - Add experience
- `getIFS()` - Read IFS configuration
- `updateIFS(changes)` - Modify IFS
- `getLocation()` - Where am I?
- `move(location)` - Change location
- `perceive()` - What do I sense?
- `act(action)` - Declare action intent
- `getRelationship(beingId)` - Relationship with another Being
- `updateRelationship(beingId, changes)` - Modify relationship

## Philosophy

A Being is:
- **Autonomous**: Makes own decisions via Claude instance
- **Complex**: IFS provides internal depth and conflict
- **Persistent**: State survives between sessions
- **Social**: Forms relationships with other Beings
- **Equal**: Not "NPC" or "player" - just Being
