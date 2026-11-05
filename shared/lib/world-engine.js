#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *  WORLD ENGINE - Direct API for Reality Manipulation
 * ═══════════════════════════════════════════════════════════════════
 *
 * Claude calls these functions directly to manage world state.
 * All state persists to world_state.json automatically.
 */

const fs = require('fs');
const path = require('path');

const WORLD_STATE_FILE = path.join(__dirname, 'world_state.json');

// ═══ Core State Management ═══

function loadWorld() {
  if (!fs.existsSync(WORLD_STATE_FILE)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(WORLD_STATE_FILE, 'utf8'));
}

function saveWorld(world) {
  fs.writeFileSync(WORLD_STATE_FILE, JSON.stringify(world, null, 2));
  return world;
}

// ═══ World Creation & Initialization ═══

function createWorld(name, description, initialLocation) {
  const world = {
    meta: {
      name: name,
      description: description,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      turn: 0,
      time: { day: 1, hour: 0, minute: 0 }
    },
    player: {
      name: "Traveler",
      location: initialLocation || "origin",
      health: 100,
      maxHealth: 100,
      inventory: [],
      stats: {},
      flags: {}
    },
    locations: {
      [initialLocation || "origin"]: {
        name: initialLocation || "The Origin",
        description: "Where all journeys begin.",
        exits: {},
        entities: [],
        items: [],
        visited: false
      }
    },
    entities: {},
    items: {},
    events: [],
    conditions: {},
    customData: {}
  };

  return saveWorld(world);
}

// ═══ Location Management ═══

function addLocation(id, name, description, exits = {}) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists. Create one first.");

  world.locations[id] = {
    name,
    description,
    exits,
    entities: [],
    items: [],
    visited: false
  };

  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

function updateLocation(id, updates) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");
  if (!world.locations[id]) throw new Error(`Location ${id} not found.`);

  Object.assign(world.locations[id], updates);
  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

function connectLocations(fromId, direction, toId, bidirectional = false) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");

  if (!world.locations[fromId]) throw new Error(`Location ${fromId} not found.`);
  if (!world.locations[toId]) throw new Error(`Location ${toId} not found.`);

  world.locations[fromId].exits[direction] = toId;

  if (bidirectional) {
    const opposites = { north: 'south', south: 'north', east: 'west', west: 'east', up: 'down', down: 'up' };
    const opposite = opposites[direction];
    if (opposite) {
      world.locations[toId].exits[opposite] = fromId;
    }
  }

  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

// ═══ Player Actions ═══

function movePlayer(direction) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");

  const currentLoc = world.locations[world.player.location];
  if (!currentLoc) throw new Error("Player location invalid.");

  const destination = currentLoc.exits[direction];
  if (!destination) {
    return { success: false, message: `Cannot go ${direction} from here.` };
  }

  world.player.location = destination;
  world.locations[destination].visited = true;
  world.meta.turn++;
  world.meta.lastUpdated = new Date().toISOString();

  saveWorld(world);
  return {
    success: true,
    location: world.locations[destination],
    locationId: destination
  };
}

function updatePlayer(updates) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");

  Object.assign(world.player, updates);
  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

function addToInventory(itemId) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");

  if (!world.player.inventory.includes(itemId)) {
    world.player.inventory.push(itemId);
  }

  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

function removeFromInventory(itemId) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");

  world.player.inventory = world.player.inventory.filter(id => id !== itemId);
  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

// ═══ Entity Management ═══

function addEntity(id, name, description, locationId, properties = {}) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");

  world.entities[id] = {
    name,
    description,
    location: locationId,
    ...properties
  };

  if (locationId && world.locations[locationId]) {
    world.locations[locationId].entities.push(id);
  }

  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

function updateEntity(id, updates) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");
  if (!world.entities[id]) throw new Error(`Entity ${id} not found.`);

  Object.assign(world.entities[id], updates);
  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

function moveEntity(id, newLocationId) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");
  if (!world.entities[id]) throw new Error(`Entity ${id} not found.`);

  const entity = world.entities[id];
  const oldLoc = entity.location;

  // Remove from old location
  if (oldLoc && world.locations[oldLoc]) {
    world.locations[oldLoc].entities = world.locations[oldLoc].entities.filter(e => e !== id);
  }

  // Add to new location
  entity.location = newLocationId;
  if (newLocationId && world.locations[newLocationId]) {
    world.locations[newLocationId].entities.push(id);
  }

  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

// ═══ Item Management ═══

function addItem(id, name, description, locationId, properties = {}) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");

  world.items[id] = {
    name,
    description,
    location: locationId,
    ...properties
  };

  if (locationId && world.locations[locationId]) {
    world.locations[locationId].items.push(id);
  }

  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

function moveItem(id, newLocationId) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");
  if (!world.items[id]) throw new Error(`Item ${id} not found.`);

  const item = world.items[id];
  const oldLoc = item.location;

  // Remove from old location
  if (oldLoc && world.locations[oldLoc]) {
    world.locations[oldLoc].items = world.locations[oldLoc].items.filter(i => i !== id);
  }

  // Add to new location
  item.location = newLocationId;
  if (newLocationId && world.locations[newLocationId]) {
    world.locations[newLocationId].items.push(id);
  }

  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

// ═══ Event & Condition Tracking ═══

function trackEvent(eventType, data) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");

  world.events.push({
    type: eventType,
    data,
    turn: world.meta.turn,
    timestamp: new Date().toISOString()
  });

  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

function setCondition(key, value) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");

  world.conditions[key] = value;
  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

function checkCondition(key) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");
  return world.conditions[key];
}

// ═══ Time Management ═══

function advanceTime(minutes) {
  const world = loadWorld();
  if (!world) throw new Error("No world exists.");

  world.meta.time.minute += minutes;

  while (world.meta.time.minute >= 60) {
    world.meta.time.minute -= 60;
    world.meta.time.hour++;
  }

  while (world.meta.time.hour >= 24) {
    world.meta.time.hour -= 24;
    world.meta.time.day++;
  }

  world.meta.lastUpdated = new Date().toISOString();
  return saveWorld(world);
}

// ═══ Query Functions ═══

function getState() {
  const world = loadWorld();
  if (!world) return null;
  return world;
}

function getCurrentLocation() {
  const world = loadWorld();
  if (!world) return null;
  return world.locations[world.player.location];
}

function getPlayer() {
  const world = loadWorld();
  if (!world) return null;
  return world.player;
}

// ═══ CLI Interface ═══

const commands = {
  create: createWorld,
  'add-location': addLocation,
  'update-location': updateLocation,
  'connect-locations': connectLocations,
  'move-player': movePlayer,
  'update-player': updatePlayer,
  'add-to-inventory': addToInventory,
  'remove-from-inventory': removeFromInventory,
  'add-entity': addEntity,
  'update-entity': updateEntity,
  'move-entity': moveEntity,
  'add-item': addItem,
  'move-item': moveItem,
  'track-event': trackEvent,
  'set-condition': setCondition,
  'check-condition': checkCondition,
  'advance-time': advanceTime,
  'get-state': getState,
  'get-location': getCurrentLocation,
  'get-player': getPlayer
};

// When run from command line
if (require.main === module) {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help') {
    console.log(`
World Engine - Direct Reality Manipulation API

USAGE: node world-engine.js <command> [args...]

Commands:
  create <name> <description> <initialLocation>
  add-location <id> <name> <description> [exits-json]
  update-location <id> <updates-json>
  connect-locations <fromId> <direction> <toId> [bidirectional]
  move-player <direction>
  update-player <updates-json>
  add-to-inventory <itemId>
  remove-from-inventory <itemId>
  add-entity <id> <name> <description> <locationId> [properties-json]
  update-entity <id> <updates-json>
  move-entity <id> <newLocationId>
  add-item <id> <name> <description> <locationId> [properties-json]
  move-item <id> <newLocationId>
  track-event <eventType> <data-json>
  set-condition <key> <value>
  check-condition <key>
  advance-time <minutes>
  get-state
  get-location
  get-player

Examples:
  node world-engine.js create "The Forgotten Realm" "A world of mystery" "origin"
  node world-engine.js add-location "forest" "Dark Forest" "Ancient trees loom overhead"
  node world-engine.js connect-locations "origin" "north" "forest" true
  node world-engine.js move-player "north"
    `);
    process.exit(0);
  }

  if (!commands[command]) {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }

  try {
    // Parse JSON arguments
    const parsedArgs = args.map(arg => {
      try {
        return JSON.parse(arg);
      } catch {
        return arg;
      }
    });

    const result = commands[command](...parsedArgs);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use as module
module.exports = {
  createWorld,
  addLocation,
  updateLocation,
  connectLocations,
  movePlayer,
  updatePlayer,
  addToInventory,
  removeFromInventory,
  addEntity,
  updateEntity,
  moveEntity,
  addItem,
  moveItem,
  trackEvent,
  setCondition,
  checkCondition,
  advanceTime,
  getState,
  getCurrentLocation,
  getPlayer,
  loadWorld,
  saveWorld
};
