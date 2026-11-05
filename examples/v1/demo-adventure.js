#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *  DEMO ADVENTURE - Example of Claude Using the World Engine
 * ═══════════════════════════════════════════════════════════════════
 *
 * This demonstrates how Claude would orchestrate a text adventure
 * by calling world-engine functions directly.
 */

const engine = require('./world-engine.js');

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║      ✨  T H E   W O R L D   B U I L D E R   A W A K E N S  ✨    ║
║                                                                   ║
║  A demonstration of dynamic world creation...                     ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

// Step 1: Create the world
console.log("⚔️ **Creating the world...**\n");
engine.createWorld(
  "The Forgotten Realm",
  "A mysterious land where ancient magic still lingers",
  "village_square"
);

// Step 2: Build initial locations
console.log("🏗️ **Weaving locations into existence...**\n");

engine.addLocation(
  "village_square",
  "Village Square",
  "The heart of a small village. A weathered fountain stands at the center, and cobblestone paths lead in all directions.",
  {}
);

engine.addLocation(
  "old_library",
  "The Old Library",
  "Dusty tomes line the walls from floor to ceiling. Shafts of light pierce through gaps in the boarded windows, illuminating dancing motes of dust.",
  {}
);

engine.addLocation(
  "forest_path",
  "Forest Path",
  "Ancient trees create a natural archway over the winding path. You hear the distant call of strange birds.",
  {}
);

engine.addLocation(
  "mysterious_cave",
  "Mysterious Cave",
  "The cave mouth yawns before you like the maw of some great beast. Strange glyphs glow faintly on the walls.",
  {}
);

// Step 3: Connect locations
console.log("🔗 **Connecting the paths of possibility...**\n");
engine.connectLocations("village_square", "north", "old_library", true);
engine.connectLocations("village_square", "east", "forest_path", true);
engine.connectLocations("forest_path", "northeast", "mysterious_cave", true);

// Step 4: Add entities
console.log("👥 **Breathing life into entities...**\n");
engine.addEntity(
  "old_librarian",
  "Ancient Librarian",
  "A wizened figure with eyes that seem to hold the weight of centuries. They regard you with quiet curiosity.",
  "old_library",
  {
    dialogue: ["Welcome, seeker of knowledge...", "The books here hold secrets beyond counting."],
    questGiver: true,
    friendly: true
  }
);

engine.addEntity(
  "glowing_spirit",
  "Glowing Spirit",
  "An ethereal being made of pure light, hovering silently near the cave entrance.",
  "mysterious_cave",
  {
    hostile: false,
    magical: true,
    guardian: true
  }
);

// Step 5: Add items
console.log("✨ **Manifesting treasures...**\n");
engine.addItem(
  "ancient_tome",
  "Ancient Tome",
  "A leather-bound book with strange symbols on the cover. It pulses with latent power.",
  "old_library",
  {
    magical: true,
    portable: true,
    power: "reveals_hidden_paths"
  }
);

engine.addItem(
  "crystal_shard",
  "Crystal Shard",
  "A shard of pure crystal that glows with an inner light.",
  "mysterious_cave",
  {
    magical: true,
    portable: true,
    value: 100
  }
);

// Step 6: Set initial conditions
console.log("🎯 **Establishing the fabric of reality...**\n");
engine.setCondition("library_visited", false);
engine.setCondition("librarian_talked", false);
engine.setCondition("tome_acquired", false);

// Step 7: Update player
engine.updatePlayer({
  name: "Seeker",
  stats: {
    wisdom: 10,
    courage: 8,
    magic: 5
  }
});

// Display current state
console.log("═══════════════════════════════════════════════════════════════════\n");
console.log("📊 **World State Summary:**\n");

const world = engine.getState();
const player = engine.getPlayer();
const location = engine.getCurrentLocation();

console.log(`**World:** ${world.meta.name}`);
console.log(`**Description:** ${world.meta.description}`);
console.log(`**Locations:** ${Object.keys(world.locations).length}`);
console.log(`**Entities:** ${Object.keys(world.entities).length}`);
console.log(`**Items:** ${Object.keys(world.items).length}\n`);

console.log(`**Player:** ${player.name}`);
console.log(`**Current Location:** ${location.name}`);
console.log(`**Health:** ${player.health}/${player.maxHealth}`);
console.log(`**Inventory:** ${player.inventory.length} items\n`);

console.log("═══════════════════════════════════════════════════════════════════\n");

// Simulate some actions
console.log("🎮 **Simulating adventure actions...**\n");

console.log("➤ Moving north to the library...");
let result = engine.movePlayer("north");
if (result.success) {
  console.log(`   ✓ Arrived at: ${result.location.name}`);
  console.log(`   "${result.location.description}"\n`);
}

console.log("➤ Talking to the librarian...");
engine.setCondition("librarian_talked", true);
engine.trackEvent("dialogue", { entity: "old_librarian", dialogue_index: 0 });
console.log(`   ✓ Conversation initiated\n`);

console.log("➤ Taking the ancient tome...");
engine.moveItem("ancient_tome", null); // Remove from location
engine.addToInventory("ancient_tome");
engine.setCondition("tome_acquired", true);
engine.trackEvent("item_acquired", { item: "ancient_tome" });
console.log(`   ✓ Ancient Tome added to inventory\n`);

console.log("➤ Returning south...");
result = engine.movePlayer("south");
console.log(`   ✓ Back at: ${result.location.name}\n`);

console.log("➤ Heading east to the forest...");
result = engine.movePlayer("east");
console.log(`   ✓ Arrived at: ${result.location.name}\n`);

console.log("➤ Advancing northeast to the cave...");
result = engine.movePlayer("northeast");
console.log(`   ✓ Arrived at: ${result.location.name}\n`);

console.log("➤ Advancing time by 30 minutes...");
engine.advanceTime(30);
const updatedWorld = engine.getState();
console.log(`   ✓ Time: Day ${updatedWorld.meta.time.day}, ${updatedWorld.meta.time.hour}:${String(updatedWorld.meta.time.minute).padStart(2, '0')}\n`);

// Final state
console.log("═══════════════════════════════════════════════════════════════════\n");
console.log("📊 **Final State:**\n");

const finalPlayer = engine.getPlayer();
const finalLocation = engine.getCurrentLocation();
const finalWorld = engine.getState();

console.log(`**Turn:** ${finalWorld.meta.turn}`);
console.log(`**Player Location:** ${finalLocation.name}`);
console.log(`**Inventory:** ${finalPlayer.inventory.join(', ') || 'empty'}`);
console.log(`**Events Recorded:** ${finalWorld.events.length}`);
console.log(`**Conditions Set:** ${Object.keys(finalWorld.conditions).length}\n`);

console.log("✨ **World state saved to:** world_state.json\n");

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║         The demonstration is complete. The world lives on,        ║
║         waiting for the next command to shape its destiny...      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);
