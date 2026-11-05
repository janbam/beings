# 🚀 Installation & Setup Guide

## For Claude Code Users

### Step 1: Install the Output Style

Place the `world-creator.json` file in your Claude Code output styles directory:

```bash
# Linux/Mac
cp world-creator.json ~/.config/claude-code/output-styles/

# Windows
copy world-creator.json %APPDATA%\claude-code\output-styles\
```

### Step 2: Copy Support Files

Copy the project directory to a location where Claude can access it:

```bash
# Example location
mkdir -p ~/claude-worlds/world-creator
cp -r * ~/claude-worlds/world-creator/
```

### Step 3: Activate the Output Style

In Claude Code, activate the "World Creator" output style:

```
/style world-creator
```

Or select it from the output styles menu.

### Step 4: Initialize Your First World

Once the style is active, start your adventure:

```
Create a fantasy adventure world for me
```

Claude will:
1. Set up the world using `world-engine.js`
2. Initialize `CHRONICLE.md` with your adventure's memory
3. Begin narrating in the mystical Creator of Worlds voice

## For Developers

### Prerequisites

- Node.js (v14 or higher)
- Optional: `jq` for JSON inspection

### Setup

```bash
# Clone or download the project
cd text-adventure-output-style

# Make scripts executable
chmod +x *.js

# Run demos to verify installation
npm run demo
npm run demo:chronicle
```

### Test the World Engine

```bash
# Create a test world
node world-engine.js create "Test World" "A realm of testing" "start"

# Inspect the state
node world-engine.js get-state

# View the world state file
cat world_state.json
```

### Customize the Output Style

Edit `world-creator.json` to customize:
- System prompt and voice
- Response templates
- Visual decorators
- Narrative frameworks

## Directory Structure

After installation, you should have:

```
world-creator/
├── world-engine.js          # Core API
├── world-creator.json       # Output style definition
├── CHRONICLE.md             # Memory template
├── demo-adventure.js        # Demo script
├── chronicle-demo.js        # Memory demo
├── example-session.md       # Examples
├── QUICK_REFERENCE.md       # Command reference
├── README.md                # Full documentation
└── package.json             # Node package config
```

## Verification

### Test World Creation

```bash
node world-engine.js create "Verification Test" "Testing installation" "home"
```

Should output:
```json
{
  "meta": {
    "name": "Verification Test",
    "description": "Testing installation",
    ...
  },
  ...
}
```

### Test Chronicle

```bash
cat CHRONICLE.md
```

Should show the memory template with sections for:
- Active Quest
- Short-term Memory
- Long-term Memory
- Player Profile
- etc.

## First Adventure

Once installed, try this prompt with Claude:

```
I want to explore a mysterious ancient library.
Create the world and begin the adventure.
```

Claude will:
1. Create a world with `world-engine.js`
2. Build locations dynamically
3. Add NPCs and items as needed
4. Update the Chronicle with story progress
5. Narrate everything in the mystical World Creator voice

## Troubleshooting

### "Command not found: node"

Install Node.js from https://nodejs.org/

### "Cannot find module 'world-engine.js'"

Make sure you're in the correct directory:
```bash
cd /path/to/world-creator
```

### "Permission denied"

Make scripts executable:
```bash
chmod +x world-engine.js demo-adventure.js chronicle-demo.js
```

### Claude isn't using the style

1. Verify `world-creator.json` is in the output styles directory
2. Activate with `/style world-creator`
3. Restart Claude Code if needed

## Next Steps

- Read `README.md` for full documentation
- Review `QUICK_REFERENCE.md` for command syntax
- Run `demo-adventure.js` to see the system in action
- Check `example-session.md` for narrative examples
- Start creating your own worlds!

---

**Happy World Building!** ✨
