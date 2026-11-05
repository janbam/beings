#!/usr/bin/env node

/**
 * Being Self-State API
 *
 * This API allows a Being's Claude instance to read and modify its own state.
 * All operations use file-based persistence with atomic operations.
 */

const fs = require('fs');
const path = require('path');

// Get Being's directory (this script should be in the Being's directory)
const BEING_DIR = __dirname;
const STATE_FILE = path.join(BEING_DIR, 'state.json');
const MEMORY_FILE = path.join(BEING_DIR, 'memory.json');
const IFS_FILE = path.join(BEING_DIR, 'IFS.json');

// Import shared persistence utilities (once implemented)
// const persistence = require('../../../shared/utilities/persistence.js');

/**
 * Simple atomic read (will be replaced with shared/utilities/persistence.js)
 */
function readJSON(filepath) {
  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data);
}

/**
 * Simple atomic write (will be replaced with shared/utilities/persistence.js)
 */
function writeJSON(filepath, data) {
  const tempPath = filepath + '.tmp';
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
  fs.renameSync(tempPath, filepath);
}

/**
 * Get current state
 */
function getState() {
  return readJSON(STATE_FILE);
}

/**
 * Update state (partial update, merges with existing)
 */
function updateState(changes) {
  const state = getState();
  const updated = { ...state, ...changes };
  writeJSON(STATE_FILE, updated);
  return updated;
}

/**
 * Get memory
 */
function getMemory() {
  return readJSON(MEMORY_FILE);
}

/**
 * Add memory event
 */
function addMemory(event) {
  const memory = getMemory();
  const memoryEvent = {
    timestamp: new Date().toISOString(),
    ...event
  };
  memory.experiences.push(memoryEvent);

  // Keep recent memories trimmed
  if (memory.experiences.length > 1000) {
    const archived = memory.experiences.slice(0, -500);
    memory.episodicMemory.archived.push(...archived);
    memory.experiences = memory.experiences.slice(-500);
  }

  writeJSON(MEMORY_FILE, memory);
  return memoryEvent;
}

/**
 * Get IFS configuration
 */
function getIFS() {
  return readJSON(IFS_FILE);
}

/**
 * Update IFS (modify parts, relationships, etc.)
 */
function updateIFS(changes) {
  const ifs = getIFS();
  const updated = { ...ifs, ...changes };
  writeJSON(IFS_FILE, updated);
  return updated;
}

/**
 * Get current location
 */
function getLocation() {
  const state = getState();
  return state.location;
}

/**
 * Move to new location
 */
function move(newLocation) {
  return updateState({ location: newLocation });
}

/**
 * Perceive current environment (calls World Creator)
 */
function perceive() {
  // This will communicate with World Creator to get current perception
  // For now, return placeholder
  return {
    location: getLocation(),
    visibleBeings: [],
    visibleItems: [],
    environmentDescription: "Perception not yet implemented"
  };
}

/**
 * Declare action intent (sends to World Creator)
 */
function act(action) {
  // This will send action intent to World Creator via IPC
  // For now, return placeholder
  console.log(`Being declares action:`, action);
  return {
    declared: true,
    action,
    pending: true
  };
}

/**
 * Get relationship with another Being
 */
function getRelationship(beingId) {
  const memory = getMemory();
  return memory.relationships[beingId] || null;
}

/**
 * Update relationship with another Being
 */
function updateRelationship(beingId, changes) {
  const memory = getMemory();
  const existing = memory.relationships[beingId] || {
    name: changes.name || "Unknown",
    met: new Date().toISOString(),
    trust: 0.5,
    affection: 0.5,
    fear: 0.0,
    respect: 0.5,
    history: [],
    labels: []
  };

  memory.relationships[beingId] = { ...existing, ...changes };
  writeJSON(MEMORY_FILE, memory);
  return memory.relationships[beingId];
}

// Export API
module.exports = {
  getState,
  updateState,
  getMemory,
  addMemory,
  getIFS,
  updateIFS,
  getLocation,
  move,
  perceive,
  act,
  getRelationship,
  updateRelationship
};

// CLI interface if run directly
if (require.main === module) {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'get-state':
      console.log(JSON.stringify(getState(), null, 2));
      break;
    case 'get-memory':
      console.log(JSON.stringify(getMemory(), null, 2));
      break;
    case 'get-ifs':
      console.log(JSON.stringify(getIFS(), null, 2));
      break;
    case 'get-location':
      console.log(getLocation());
      break;
    default:
      console.log('Being API - Available commands:');
      console.log('  get-state     - Show current state');
      console.log('  get-memory    - Show memory');
      console.log('  get-ifs       - Show IFS configuration');
      console.log('  get-location  - Show current location');
  }
}
