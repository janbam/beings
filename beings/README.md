# Beings Directory

This directory contains all **Being instances** in the JANBAM system.

## Purpose

Each Being is a persistent Claude Code instance living in its own subdirectory. Beings are autonomous agents with:
- Complete internal state (emotions, beliefs, world model)
- Memory of experiences and relationships
- Internal Family Systems (IFS) for personality depth
- Their own persistent Claude instance (`claude -p`)

## Structure

```
beings/
├── {BeingName}/
│   ├── state.json          # Current emotional/cognitive state
│   ├── memory.json         # Experience history
│   ├── IFS.json           # Internal Family System configuration
│   ├── parts/             # Subdirectories for IFS parts (optional)
│   ├── api.js             # Self-state API for this Being
│   ├── chronicle.md       # Narrative memory (NOT mechanical state)
│   └── .claude-history/   # Persistent Claude session data
└── registry.json          # Central registry of all Beings
```

## Philosophy

**Beings are not NPCs.** There are no "players" and "non-player characters" in JANBAM. All entities are Beings - autonomous, equal participants in the world. The human user is just one Being among many.

## Key Concepts

- **Persistence**: Each Being's directory IS their persistent state
- **Autonomy**: Each Being has their own Claude instance making decisions
- **Equality**: Human Being treated identically to other Beings
- **IFS Depth**: Internal complexity through multiple parts creates authentic personality

## Registry

`registry.json` tracks all active Beings:
- Being ID
- Process PID (Claude instance)
- Current world
- Last active timestamp
- Status (active/dormant/archived)

## See Also

- `/shared/templates/being-template/` - Template for creating new Beings
- `/orchestrator/` - The World Creator that coordinates all Beings
- `JANBAM.md` - Overall system philosophy
