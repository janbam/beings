#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *  CHRONICLE DEMO - Demonstrating Memory System Updates
 * ═══════════════════════════════════════════════════════════════════
 *
 * This shows how Claude updates the Chronicle as the adventure unfolds.
 * The Chronicle maintains narrative context across sessions.
 */

const engine = require('./world-engine.js');
const fs = require('fs');
const path = require('path');

const CHRONICLE_PATH = path.join(__dirname, 'CHRONICLE.md');

function updateChronicleSection(sectionHeader, newContent) {
  let chronicle = fs.readFileSync(CHRONICLE_PATH, 'utf8');

  // Find the section
  const sectionRegex = new RegExp(`(${sectionHeader}[\\s\\S]*?)(?=\\n## |\\n---\\n|$)`, 'm');
  const match = chronicle.match(sectionRegex);

  if (match) {
    const oldSection = match[1];
    chronicle = chronicle.replace(oldSection, `${sectionHeader}\n${newContent}\n`);
    fs.writeFileSync(CHRONICLE_PATH, chronicle);
    return true;
  }
  return false;
}

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║      📜  T H E   C H R O N I C L E   D E M O N S T R A T I O N   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

console.log("This demo shows how the Chronicle memory system tracks the adventure.\n");

// Step 1: Create world
console.log("⚔️ **Creating a new world...**\n");
engine.createWorld(
  "The Shattered Isles",
  "A mysterious archipelago where reality fractures at the edges",
  "shipwreck_beach"
);

// Step 2: Build some locations
engine.addLocation(
  "shipwreck_beach",
  "Shipwreck Beach",
  "Wreckage litters the sand. Your vessel lies in ruins. The jungle beckons inland.",
  {}
);

engine.addLocation(
  "jungle_path",
  "Jungle Path",
  "Dense foliage crowds the narrow trail. Strange bird calls echo overhead.",
  {}
);

engine.addLocation(
  "ancient_ruins",
  "Ancient Ruins",
  "Crumbling stone structures emerge from the jungle. Mysterious glyphs cover the walls.",
  {}
);

engine.connectLocations("shipwreck_beach", "north", "jungle_path", true);
engine.connectLocations("jungle_path", "west", "ancient_ruins", true);

// Step 3: Add an NPC
engine.addEntity(
  "mysterious_sage",
  "The Hermit Sage",
  "An elderly figure in tattered robes. Their eyes seem to hold ancient knowledge.",
  "ancient_ruins",
  {
    friendly: true,
    dialogue: ["The islands remember what the world has forgotten...", "Seek the three fragments."],
    questGiver: true
  }
);

// Step 4: Add quest item
engine.addItem(
  "crystal_fragment",
  "Glowing Crystal Fragment",
  "A shard of crystal that pulses with inner light. One of three, perhaps?",
  "ancient_ruins",
  {
    magical: true,
    questItem: true,
    fragmentNumber: 1
  }
);

console.log("✅ World created: The Shattered Isles\n");
console.log("═══════════════════════════════════════════════════════════════════\n");

// Now demonstrate Chronicle updates
console.log("📜 **Updating the Chronicle as events unfold...**\n");

// Update 1: Initialize the adventure
console.log("➤ Chronicle Update #1: Adventure begins\n");

// In practice, Claude would use the Edit tool. Here we demonstrate the content:
const update1 = `
**Current Objective:** Survive the shipwreck and explore the mysterious island

**Status:** Quest started - exploration phase

**Next Steps:**
- Explore the shipwreck beach
- Find supplies
- Investigate the jungle
`;

console.log("   Updating ACTIVE QUEST section:");
console.log(update1);

// Update 2: After player explores
console.log("\n➤ Chronicle Update #2: Player explores jungle\n");

const update2 = `
**Last Location:** Jungle Path
**Recent Actions:**
- Moved north from shipwreck beach
- Entered dense jungle

**Active NPCs:** None currently visible
**Immediate Context:** Strange sounds in the jungle, path splits ahead

### Recent Events (Last 5 Turns)
1. Awakened on shipwreck beach
2. Explored the wreckage (found nothing salvageable)
3. Ventured north into jungle
4. Heard mysterious bird calls
5. Reached junction in path

### Current Concerns
- Unknown dangers in the jungle
- Need to find shelter before nightfall
- Strange feeling of being watched

### Items of Immediate Importance
- None yet acquired
`;

console.log("   Updating SHORT-TERM MEMORY section:");
console.log(update2);

// Update 3: After discovering ruins and NPC
console.log("\n➤ Chronicle Update #3: Major discovery - Ancient Ruins & Sage\n");

const update3 = `
**World Name:** The Shattered Isles
**Total Locations:** 3
**Total Entities:** 1 (The Hermit Sage)
**Total Items:** 1 (Crystal Fragment)
**Current Turn:** 5
**In-Game Time:** Day 1, 02:30

### Major Locations Discovered
1. **Shipwreck Beach** - Where the journey began. Vessel destroyed beyond repair.
2. **Jungle Path** - Dense tropical forest with strange wildlife
3. **Ancient Ruins** - Mysterious stone structures with glyphs. Appears to be pre-human construction.

### Key NPCs & Relationships
1. **The Hermit Sage** (ancient_ruins)
   - Status: Friendly, cryptic
   - Relationship: Neutral (just met)
   - Knowledge: Spoke of "fragments" and "forgotten memories"
   - Quest Hook: Mentioned three fragments that need collecting

### Important Items & Artifacts
1. **Glowing Crystal Fragment** (found at ancient_ruins)
   - Description: Magical shard, first of three
   - Significance: Quest item, possibly key to understanding the islands
   - Status: Not yet acquired

### Significant Events Timeline
1. Shipwrecked on mysterious island
2. Discovered jungle path leading inland
3. Found ancient ruins hidden in jungle
4. Met the Hermit Sage
5. Learned about the three fragments quest
`;

console.log("   Updating LONG-TERM MEMORY section:");
console.log(update3);

// Update 4: Creator's notes
console.log("\n➤ Chronicle Update #4: Creator's narrative planning\n");

const update4 = `
### Narrative Threads
1. **The Three Fragments**: Quest to collect crystal shards
   - Fragment 1: Found at ancient ruins
   - Fragment 2: Location TBD (planning: underwater cave?)
   - Fragment 3: Location TBD (planning: mountain peak?)

2. **Island Mystery**: What caused the shipwreck?
   - Reality "fractures" at edges - foreshadowed in world description
   - Possible reveal: Islands exist between dimensions

3. **The Hermit's Identity**: Who is this sage?
   - Knows too much to be a simple hermit
   - Possible twist: Former guardian of the fragments?

### Foreshadowing & Future Hooks
- "Strange bird calls" → Not actually birds, introduce later
- Glyphs on ruins → Will need translation, creates puzzle
- "Reality fractures" → Visual anomalies to show dimensional instability
- Hermit's tattered robes → Suggest long isolation, hint at tragedy

### Technical Notes
- Created basic world with world-engine.js
- May need custom puzzle system for glyph translation
- Consider adding day/night cycle mechanics
- Weather system could enhance atmosphere

### Improvisation Ideas
- If player tries to swim: Discover underwater fragment location
- If player examines glyphs closely: Begin translation mini-game
- If player questions sage deeply: Reveal fragments restore island stability
- Combat system: Only if player acts hostile, prefer puzzle/exploration focus
`;

console.log("   Updating CREATOR'S NOTES section:");
console.log(update4);

console.log("\n═══════════════════════════════════════════════════════════════════\n");
console.log("📊 **Chronicle System Summary:**\n");
console.log("The Chronicle maintains rich narrative context including:");
console.log("  ✓ Short-term memory (recent actions, immediate concerns)");
console.log("  ✓ Long-term memory (world state, NPCs, items, lore)");
console.log("  ✓ Quest tracking (objectives, progress)");
console.log("  ✓ Creator's notes (narrative plans, foreshadowing, ideas)\n");

console.log("Claude updates these sections proactively using the Edit tool,");
console.log("maintaining story continuity across sessions.\n");

console.log("The Chronicle is Claude's external memory - it remembers what");
console.log("matters for the narrative, while world_state.json tracks mechanics.\n");

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║         Together, they create a living, persistent world.         ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

console.log("\n📂 Files to inspect:");
console.log("   - CHRONICLE.md (narrative memory)");
console.log("   - world_state.json (mechanical state)\n");
