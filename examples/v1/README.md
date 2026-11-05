# V1 Proof of Concept Archive

This directory contains the original **pre-JANBAM** proof-of-concept files from Session 1 (October 3, 2025).

## Purpose

These files demonstrate the initial "World Creator" output style - a single-player text adventure system with dynamic code generation. This was the foundation that evolved into the full JANBAM multi-being simulation framework.

## Historical Files

### Demos
- **demo-adventure.js** - Original world creation demo using world-engine CLI
- **chronicle-demo.js** - Chronicle system demonstration (shows old pattern)
- **example-session.md** - First playtest narrative ("The Fractured Realm")

### Templates & State
- **CHRONICLE.md** - Original Chronicle template (now in templates/)
- **world_state.json** - Generated world state from first playtest

### Documentation
- **world-creator.json** - Original output style configuration (17KB reference)
- **QUICK_REFERENCE.md** - world-engine CLI command reference

## Evolution

**V1 → JANBAM Transition:**

| V1 (Single-Player) | JANBAM (Multi-Being) |
|-------------------|---------------------|
| One player + NPCs | All Beings equal |
| Direct API calls | Orchestrated turns |
| Simple state | IFS complexity |
| Chronicle for player | Chronicle per Being |
| world-engine CLI | Shared utilities + IPC |

## Current System

See main README.md for JANBAM multi-being simulation framework.

**Core engine location:** `/shared/lib/world-engine.js`

## Session History

- **Session 1:** V1 proof of concept and first playtest
- **Session 2:** JANBAM vision planning (166 tasks)
- **Session 3:** Phase 1 implementation (Core Infrastructure)
- **Session 3+:** Repository reorganization

---

**These files are preserved for historical reference and learning, but are not part of the active JANBAM system.**
