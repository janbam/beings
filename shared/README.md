# Shared Directory

This directory contains **common utilities, templates, and libraries** used throughout the JANBAM system.

## Purpose

Shared code and resources that don't belong to a specific Being or world. This includes:
- Templates for creating new Beings and worlds
- Utility functions and helpers
- Common game mechanics modules
- Persistence and state management utilities
- Communication protocols

## Structure

```
shared/
├── templates/
│   ├── being-template/      # Template for new Being directories
│   ├── world-template/      # Template for new world directories
│   ├── encounter-templates/ # Common encounter types
│   └── system-templates/    # Game system templates
├── utilities/
│   ├── persistence.js       # Atomic file operations, locking
│   ├── state-query.js       # Helper functions for querying state
│   ├── validation.js        # JSON schema validation
│   └── logging.js           # Centralized logging utilities
├── protocols/
│   ├── messages.js          # Message format definitions
│   ├── ipc.js              # Inter-process communication helpers
│   └── actions.js          # Action protocol definitions
└── lib/
    ├── world-engine.js      # Core world engine (move here from root)
    └── module-loader.js     # Dynamic module loading system
```

## Key Components

### Templates
Starter structures for creating new entities:
- **being-template**: Complete Being directory structure
- **world-template**: Complete world directory structure
- **encounter-templates**: Dialogue, puzzle, combat, mystery templates
- **system-templates**: Magic, crafting, economy, reputation templates

### Utilities
Core functionality used across the system:
- **persistence.js**: Safe file operations with locking, atomic writes, backups
- **state-query.js**: Convenience functions for finding Beings, querying state
- **validation.js**: JSON schema validation for all data structures
- **logging.js**: Structured logging with correlation IDs

### Protocols
Communication standards:
- **messages.js**: Message format for Being ↔ World Creator communication
- **ipc.js**: Inter-process communication layer (stdio-based)
- **actions.js**: Standard action request/response format

### Libraries
Core game engine code:
- **world-engine.js**: The main game engine (currently in root)
- **module-loader.js**: Dynamic loading of custom modules

## Usage

Import shared utilities in Being/world code:

```javascript
const persistence = require('../../../shared/utilities/persistence.js');
const worldEngine = require('../../../shared/lib/world-engine.js');
```

Load templates when creating new entities:

```javascript
const beingTemplate = require('../shared/templates/being-template');
// Copy template to beings/{name}/
```

## Design Principles

- **Stateless**: Shared code should not maintain state
- **Pure Functions**: Utilities should be deterministic
- **Well-Documented**: Inline docs and examples
- **Tested**: Unit tests for all utilities
- **Minimal Dependencies**: Avoid external packages when possible

## See Also

- `/beings/` - Being instances
- `/worlds/` - World instances
- `/orchestrator/` - Orchestration system
