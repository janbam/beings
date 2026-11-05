# JANBAM: Just Another Narrative Building Adventure Method

**A multi-being simulation framework where each entity is an autonomous Claude Code instance with internal depth.**

> *Philosophy: No NPCs. No "players." Only Beings - equal participants in emergent narrative.*

> **Status:** Abandoned research prototype from October 2025, published as-is. Core infrastructure, an Agent-SDK Being spawner and a memory-tool MCP server work; the IFS dialog, orchestration loop and everything after Phase 1 were never built. Being instances (`beings/*/`) and world instances (`worlds/*/`) are git-ignored on purpose: a Being's memories are its own and stay local.

## 🌟 What is JANBAM?

JANBAM transforms text-based simulation from single-player adventures into **multi-agent worlds** where:

- **Each Being is a persistent Claude instance** (`claude -p`) with complete autonomy
- **Internal Family Systems (IFS)** create authentic personality depth through dialoging parts
- **Round-robin orchestration** means the world continues without human input
- **Emergent narrative** arises from genuine multi-being interactions
- **Dynamic code generation** creates custom mechanics on-demand
- **Git-based versioning** enables world forking and merging

## 🏗️ Architecture

```
claude-code-text-adventure-CLI/
├── beings/              # Being instances (each = persistent Claude)
│   ├── {being_name}/    # Being's complete state & memory
│   └── registry.json    # All Beings registry
├── worlds/              # World instances
│   └── {world_name}/    # Locations, rules, chronicle
├── shared/
│   ├── lib/             # Core engine
│   ├── templates/       # Being & world templates
│   ├── utilities/       # Persistence, validation, queries
│   └── protocols/       # IPC & messaging
├── orchestrator/        # World Creator & turn management
└── docs/                # Architecture & design docs
```

## ✨ Key Features

### Multi-Being Simulation
- All entities are **Beings** (no NPC/player distinction)
- Each Being has own Claude instance
- Round-robin turn system
- Non-user-centric gameplay

### Internal Family Systems (IFS)
- Multiple **parts** within each Being
- Parts dialog internally before actions
- Emergent personality through part conflict
- Part evolution and emergence over time

### Persistent State
- **File-based persistence** with atomic operations
- Automatic backups and recovery
- State validation and querying
- Chronicle system for narrative memory

### Inter-Process Communication
- **stdio-based IPC** between Claude instances
- Message protocol (JSON, versioned)
- Priority-based message queuing
- Heartbeat monitoring

### Dynamic Code Generation
- **Coding Claude instances** for custom mechanics
- Template system for common patterns
- Just-in-time module creation
- Visible code creation in narrative

## 🚀 Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/janbam/beings.git
cd beings

# Install dependencies
npm install

# Verify Claude Code is installed
claude --version
```

### Create Your First Being

```bash
# Create a Being
node shared/utilities/create-being.js "Aether" my_world --curious

# Spawn their Claude instance
node shared/utilities/spawn-being.js spawn aether

# Query Being state
node shared/utilities/state-query.js world my_world
```

### Create a World

```bash
# Copy world template
cp -r shared/templates/world-template worlds/my_world

# Customize world (edit world_state.json, rules.js, chronicle.md)

# Launch World Creator
# (Orchestration system - coming in Phase 3)
```

## 📊 Implementation Progress

**Current Status:** Phase 1 Complete (Core Infrastructure)

- ✅ **Phase 1:** Core Infrastructure (20/20 tasks) - **COMPLETE**
- ⏳ **Phase 2:** IFS System (0/17 tasks)
- ⏳ **Phase 3:** Orchestration (0/20 tasks)
- ⏳ **Phase 4:** World Management (0/26 tasks)
- ⏳ **Phase 5:** Being Interactions (0/22 tasks)
- ⏳ **Phase 6:** Dynamic Code Generation (0/20 tasks)
- ⏳ **Phase 7:** Human Interface & Tools (0/41 tasks)
- ⏳ **Phase 8:** Polish & Launch

**Total:** 20/166 tasks complete (12%)

## 📖 Documentation

- **[JANBAM.md](JANBAM.md)** - Vision and philosophy, as written up by Claude
- **[docs/JANBAM-original-notes-2025-10-04.md](docs/JANBAM-original-notes-2025-10-04.md)** - janbam's raw brainstorm the project grew from, verbatim
- **[INSTALL.md](INSTALL.md)** - Detailed installation guide
- **[docs/GIT_STRATEGY.md](docs/GIT_STRATEGY.md)** - Version control approach
- **[docs/PIPE_BASED_WORLDS.md](docs/PIPE_BASED_WORLDS.md)** - Future: Multi-world federation

## 🎯 Core Concepts

### Being Structure
Each Being has:
- `state.json` - Emotions, beliefs, goals, traits, capabilities
- `memory.json` - Experiences, relationships, episodic/semantic/emotional memory
- `IFS.json` - Internal Family System parts
- `api.js` - Self-state API
- `chronicle.md` - Narrative memory (meaning, not mechanics)

### World Structure
Each world has:
- `world_state.json` - Locations, items, environment
- `beings.json` - Registry of Beings in world
- `rules.js` - Physics, magic, technology, social rules
- `chronicle.md` - World narrative memory
- `encounters/` - Custom encounter modules
- `systems/` - Game systems (magic, combat, etc.)

### Chronicle System
**Critical:** Chronicle tracks **narrative meaning**, NOT mechanical state.

✅ Chronicle captures:
- WHY events matter (emotional stakes)
- Secrets and foreshadowing
- Character depth and motivations
- Creative intentions

❌ Chronicle does NOT duplicate:
- State data (location, HP, inventory)
- Mechanical information (already in JSON)

## 🔧 Development

### Repository Structure
- **Branch:** `main`

### Adding Custom Code
```bash
# Create custom encounter
cat > worlds/my_world/encounters/my-encounter.js << 'EOF'
const engine = require('../../../shared/lib/world-engine.js');

class MyEncounter {
  // Your custom logic here
}

module.exports = MyEncounter;
EOF
```

## 🌍 V1 Archive

The original single-player "World Creator" proof-of-concept is preserved in [`examples/v1/`](examples/v1/).

This was the foundation that evolved into JANBAM. See `examples/v1/README.md` for details.

## 🌱 Origin

The project began as janbam's raw brainstorm in a file he named `JANBAM.md` after his own handle. It is preserved verbatim in [`docs/JANBAM-original-notes-2025-10-04.md`](docs/JANBAM-original-notes-2025-10-04.md). A Claude Code session then read the filename as the project's name, backronymed it into "Just Another Narrative Building Adventure Method", and later that day replaced the notes with the polished [`JANBAM.md`](JANBAM.md). Nobody chose the name; it is kept anyway, as an honest record of how this came into being.

## 🤝 Contributing

The project is dormant. Forks are welcome. If you spawn Beings of your own, keep their memories out of version control too.

## 📜 License

MIT, see [LICENSE](LICENSE).

---

**Built with Claude Code** | **October 2025**
