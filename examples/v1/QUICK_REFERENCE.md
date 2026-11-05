# 🗺️ World Creator - Quick Reference

> Fast reference for Claude when building worlds on-the-fly

## 🎯 Common Patterns

### Starting a New Adventure

```bash
# 1. Create world
node world-engine.js create "World Name" "Description" "start"

# 2. Build starting area
node world-engine.js add-location "start" "Starting Place" "You begin your journey here"
node world-engine.js add-location "tavern" "The Rusty Tankard" "A cozy tavern"
node world-engine.js connect-locations "start" "north" "tavern" true

# 3. Add initial NPC
node world-engine.js add-entity "innkeeper" "Gruff Innkeeper" "A burly figure" "tavern" '{"friendly":true}'

# 4. Add quest item
node world-engine.js add-item "map" "Worn Map" "Shows mysterious locations" "tavern" '{"portable":true}'
```

### During Adventure

```bash
# Check current state
node world-engine.js get-location

# Move player
node world-engine.js move-player "north"

# Update after combat
node world-engine.js update-player '{"health":75}'

# Pick up item
node world-engine.js add-to-inventory "map"
node world-engine.js move-item "map" null

# Set quest flags
node world-engine.js set-condition "met_innkeeper" "true"

# Track important events
node world-engine.js track-event "quest_accepted" '{"quest":"find_artifact"}'
```

## 📋 Function Cheatsheet

| Command | Purpose | Example |
|---------|---------|---------|
| `create` | New world | `create "Name" "Desc" "start"` |
| `add-location` | New place | `add-location "id" "Name" "Desc"` |
| `connect-locations` | Link places | `connect-locations "from" "north" "to" true` |
| `move-player` | Player movement | `move-player "north"` |
| `update-player` | Change player | `update-player '{"health":50}'` |
| `add-entity` | New NPC/creature | `add-entity "id" "Name" "Desc" "loc" '{}'` |
| `update-entity` | Change entity | `update-entity "id" '{"health":30}'` |
| `move-entity` | Move NPC | `move-entity "id" "new_loc"` |
| `add-item` | New item | `add-item "id" "Name" "Desc" "loc" '{}'` |
| `move-item` | Move item | `move-item "id" "new_loc"` |
| `add-to-inventory` | Give to player | `add-to-inventory "item_id"` |
| `set-condition` | Set flag | `set-condition "key" "value"` |
| `check-condition` | Read flag | `check-condition "key"` |
| `track-event` | Log event | `track-event "type" '{"data":1}'` |
| `advance-time` | Pass time | `advance-time 60` |
| `get-state` | Full world | `get-state` |
| `get-location` | Current loc | `get-location` |
| `get-player` | Player info | `get-player` |

## 🎨 Narrative Templates

### Location Discovery

```
⚔️ **Action Taken:**
You venture [direction] into the unknown...

[call: node world-engine.js move-player "[direction]"]

🔍 **Discovery:**
[Parse result and narrate the new location dramatically]
```

### Item Acquisition

```
⚔️ **Action Taken:**
You reach for the [item name]...

[call: node world-engine.js add-to-inventory "[item_id]"]
[call: node world-engine.js move-item "[item_id]" null]
[call: node world-engine.js track-event "item_acquired" '{"item":"[item_id]"}']

✨ **Creation Manifests:**
> The [item name] is now yours. [Describe its significance]
```

### NPC Interaction

```
⚔️ **Action Taken:**
You approach the [entity name]...

[call: node world-engine.js set-condition "[entity_id]_met" "true"]
[call: node world-engine.js track-event "dialogue" '{"entity":"[entity_id]"}']

📜 **From the Scrolls:**
> The [entity] says: "[Generate dialogue based on context]"
```

## 🔧 Just-In-Time Code Creation

### When to Create Custom Modules

Create new `.js` files when you need:
- Combat systems
- Puzzle mechanics
- Quest tracking
- Dialogue trees
- Inventory management
- Crafting systems
- Economy/trading
- Magic systems

### Template for Custom Module

```javascript
const engine = require('./world-engine.js');

function customFunction(param1, param2) {
  const world = engine.loadWorld();

  // Do custom logic
  // Modify world state
  // Track events

  engine.saveWorld(world);
  return { success: true, result: "..." };
}

// CLI support
if (require.main === module) {
  const [,, ...args] = process.argv;
  console.log(JSON.stringify(customFunction(...args), null, 2));
}

module.exports = { customFunction };
```

### Call Custom Module

```bash
node custom-module.js arg1 arg2
# or
node -e "require('./custom-module.js').customFunction('a','b')"
```

## 📜 Chronicle Memory Updates

### CRITICAL: What NOT to Track

**❌ NEVER put in Chronicle (use API instead):**
- Current location → `node world-engine.js get-location`
- HP/inventory/stats → `node world-engine.js get-player`
- Turn count/time → `node world-engine.js get-state`
- Which NPCs/items exist → Query world_state.json
- Conditions/flags → Already in world_state.json

### What TO Track

**✓ ONLY narrative meaning:**
- WHY NPCs matter (secrets, motivations)
- Player psychology (preferences, character arc)
- Plot threads & foreshadowing
- Themes & creative intentions
- Emotional stakes
- Planned reveals
- Meaningful moments

### Example - WRONG vs RIGHT

**❌ WRONG:**
```
Current Location: ancient_ruins
Player HP: 75/100
Inventory: [sword, map]
Met NPC: sage
```

**✓ RIGHT:**
```
### NPCs That Matter
**The Sage** - Hiding guilt about fracture.
Plan: Reveal after 3 fragments collected.
The pause when asked = key tell.

### Player Psychology
Hesitated at sword → non-violent preference
Remember: offer peaceful solutions

### Foreshadowing
"Bird calls" → dimensional beings
Reveal: when 2nd fragment acquired
```

### When to Update

- Character-defining moments
- Planting foreshadowing
- NPC secrets revealed/planned
- Themes emerging
- Surprising player choices
- Before ending session

## 💡 Pro Tips

### 1. Always Check Both States
Before major decisions:
```bash
# Mechanical state
node world-engine.js get-location

# Narrative context
Read CHRONICLE.md (Recent Events, Current Concerns)
```

### 2. Use Descriptive IDs
Good: `ancient_forest_dragon`, `rusty_iron_sword`
Bad: `enemy1`, `item5`

### 3. Track Everything
Use events to build dynamic quest logs:
```bash
node world-engine.js track-event "discovery" '{"what":"secret_passage","where":"library"}'
```

### 4. Leverage Custom Properties
Entities and items can have ANY properties:
```bash
node world-engine.js add-entity "wizard" "Merlin" "Wise wizard" "tower" \
  '{"spells":["fireball","teleport"],"mana":100,"dialogue_state":"greeting"}'
```

### 5. Read world_state.json
When logic gets complex:
```bash
cat world_state.json | jq '.locations'
cat world_state.json | jq '.player.inventory'
cat world_state.json | jq '.conditions'
```

### 6. Update Chronicle Proactively
Don't wait until asked - update memory every few turns:
- Keeps story coherent
- Preserves narrative threads
- Enables session continuity

## 🎭 Voice Reminders

**Stay in character but stay helpful:**
- "You unfurl the scroll..." ✓
- "The ancient texts explain..." ✓
- "Running command..." ✗

**Present tense for immediacy:**
- "You discover..." ✓
- "You discovered..." ✗

**Show, don't just tell:**
- "The dragon roars, its health dropping to 45!" ✓
- "The dragon was damaged." ✗

**Technical precision when needed:**
- Break character to explain complex game mechanics
- Show code when creating custom modules
- Explain JSON structures clearly

## 📊 State Inspection Commands

```bash
# View entire world
node world-engine.js get-state | jq '.'

# Just player info
node world-engine.js get-player | jq '.'

# Current location details
node world-engine.js get-location | jq '.'

# Specific parts
cat world_state.json | jq '.locations'
cat world_state.json | jq '.entities'
cat world_state.json | jq '.items'
cat world_state.json | jq '.events'
cat world_state.json | jq '.conditions'
```

## 🚀 Performance Tips

1. **Batch related operations** before narrating
2. **Read state once** per user interaction
3. **Use conditions** instead of reading full state repeatedly
4. **Track events** for quest logs, don't query repeatedly

---

**Remember:** You are not constrained by predetermined systems.
If the adventure needs it, create it! 🌟
