#!/usr/bin/env node

/**
 * State Querying Utilities
 *
 * Helper functions for querying Being and world state across the system.
 */

const fs = require('fs');
const path = require('path');
const { readJSON } = require('./persistence.js');
const { getAllBeings } = require('./create-being.js');

const BEINGS_DIR = path.join(__dirname, '../../beings');
const WORLDS_DIR = path.join(__dirname, '../../worlds');

/**
 * Find Beings matching predicate
 *
 * @param {Function} predicate - Function that receives Being state and returns boolean
 * @returns {Promise<Array>} Matching Beings
 */
async function findBeingsWhere(predicate) {
  const allBeings = getAllBeings();
  const matches = [];

  for (const being of allBeings) {
    try {
      const statePath = path.join(being.directory, 'state.json');
      const state = await readJSON(statePath);

      if (predicate(state)) {
        matches.push({
          ...being,
          state
        });
      }
    } catch (error) {
      console.error(`Error reading state for ${being.id}:`, error.message);
    }
  }

  return matches;
}

/**
 * Get Beings by emotion above threshold
 *
 * @param {string} emotion - Emotion name
 * @param {number} threshold - Minimum value (0-1)
 * @returns {Promise<Array>} Matching Beings
 */
async function getBeingsByEmotion(emotion, threshold = 0.7) {
  return findBeingsWhere(state =>
    state.emotions && state.emotions[emotion] >= threshold
  );
}

/**
 * Get Beings by location
 *
 * @param {string} locationId - Location ID
 * @returns {Promise<Array>} Beings at location
 */
async function getBeingsByLocation(locationId) {
  return findBeingsWhere(state => state.location === locationId);
}

/**
 * Get Being relationships
 *
 * @param {string} beingId - Being's ID
 * @returns {Promise<Object>} Relationships
 */
async function getBeingRelationships(beingId) {
  const allBeings = getAllBeings();
  const being = allBeings.find(b => b.id === beingId);

  if (!being) {
    throw new Error(`Being ${beingId} not found`);
  }

  const memoryPath = path.join(being.directory, 'memory.json');
  const memory = await readJSON(memoryPath);

  return memory.relationships || {};
}

/**
 * Get world snapshot
 *
 * @param {string} worldId - World ID
 * @returns {Promise<Object>} Complete world state
 */
async function getWorldSnapshot(worldId) {
  const worldDir = path.join(WORLDS_DIR, worldId);

  if (!fs.existsSync(worldDir)) {
    throw new Error(`World ${worldId} not found`);
  }

  const worldStatePath = path.join(worldDir, 'world_state.json');
  const beingsPath = path.join(worldDir, 'beings.json');

  const [worldState, beingsRegistry] = await Promise.all([
    readJSON(worldStatePath),
    readJSON(beingsPath)
  ]);

  // Get all Beings in this world
  const beingsInWorld = [];
  for (const beingId of beingsRegistry.activeBeings || []) {
    const allBeings = getAllBeings();
    const being = allBeings.find(b => b.id === beingId);

    if (being) {
      const statePath = path.join(being.directory, 'state.json');
      const state = await readJSON(statePath);
      beingsInWorld.push({ ...being, state });
    }
  }

  return {
    world: worldState,
    beingsRegistry,
    beings: beingsInWorld
  };
}

/**
 * Get Beings with specific trait above threshold
 *
 * @param {string} trait - Trait name
 * @param {number} threshold - Minimum value
 * @returns {Promise<Array>} Matching Beings
 */
async function getBeingsByTrait(trait, threshold = 0.7) {
  return findBeingsWhere(state =>
    state.traits && state.traits[trait] >= threshold
  );
}

/**
 * Get Beings with specific goal
 *
 * @param {string} goalType - Goal type (immediate, shortTerm, longTerm)
 * @param {string|RegExp} goalMatch - Goal text or pattern
 * @returns {Promise<Array>} Matching Beings
 */
async function getBeingsWithGoal(goalType, goalMatch) {
  return findBeingsWhere(state => {
    if (!state.goals || !state.goals[goalType]) return false;

    const goals = state.goals[goalType];
    if (goalMatch instanceof RegExp) {
      return goals.some(g => goalMatch.test(g));
    } else {
      return goals.includes(goalMatch);
    }
  });
}

/**
 * Get Beings in specific world
 *
 * @param {string} worldId - World ID
 * @returns {Promise<Array>} Beings in world
 */
async function getBeingsInWorld(worldId) {
  return findBeingsWhere(state => state.currentWorld === worldId);
}

/**
 * Get Beings with relationship to another Being
 *
 * @param {string} targetBeingId - Target Being ID
 * @param {string} relationshipType - Optional relationship type filter
 * @returns {Promise<Array>} Beings with relationship
 */
async function getBeingsWithRelationshipTo(targetBeingId, relationshipType = null) {
  const allBeings = getAllBeings();
  const matches = [];

  for (const being of allBeings) {
    try {
      const memoryPath = path.join(being.directory, 'memory.json');
      const memory = await readJSON(memoryPath);

      if (memory.relationships && targetBeingId in memory.relationships) {
        const relationship = memory.relationships[targetBeingId];

        if (!relationshipType || relationship.labels?.includes(relationshipType)) {
          matches.push({
            ...being,
            relationship
          });
        }
      }
    } catch (error) {
      console.error(`Error reading memory for ${being.id}:`, error.message);
    }
  }

  return matches;
}

/**
 * Query Beings with complex conditions
 *
 * @param {Object} query - Query object
 * @returns {Promise<Array>} Matching Beings
 */
async function queryBeings(query) {
  return findBeingsWhere(state => {
    // Check emotion conditions
    if (query.emotions) {
      for (const [emotion, condition] of Object.entries(query.emotions)) {
        if (condition.min && state.emotions[emotion] < condition.min) return false;
        if (condition.max && state.emotions[emotion] > condition.max) return false;
      }
    }

    // Check trait conditions
    if (query.traits) {
      for (const [trait, condition] of Object.entries(query.traits)) {
        if (condition.min && state.traits[trait] < condition.min) return false;
        if (condition.max && state.traits[trait] > condition.max) return false;
      }
    }

    // Check location
    if (query.location && state.location !== query.location) return false;

    // Check world
    if (query.world && state.currentWorld !== query.world) return false;

    // Check status
    if (query.status) {
      for (const [key, value] of Object.entries(query.status)) {
        if (state.status[key] < value) return false;
      }
    }

    return true;
  });
}

// Export
module.exports = {
  findBeingsWhere,
  getBeingsByEmotion,
  getBeingsByLocation,
  getBeingsByTrait,
  getBeingsWithGoal,
  getBeingsInWorld,
  getBeingRelationships,
  getBeingsWithRelationshipTo,
  getWorldSnapshot,
  queryBeings
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  (async () => {
    try {
      let results;

      switch (command) {
        case 'emotion':
          results = await getBeingsByEmotion(args[1], parseFloat(args[2]) || 0.7);
          break;

        case 'location':
          results = await getBeingsByLocation(args[1]);
          break;

        case 'trait':
          results = await getBeingsByTrait(args[1], parseFloat(args[2]) || 0.7);
          break;

        case 'world':
          results = await getBeingsInWorld(args[1]);
          break;

        case 'snapshot':
          results = await getWorldSnapshot(args[1]);
          break;

        default:
          console.log('Usage:');
          console.log('  state-query.js emotion <emotion> [threshold]');
          console.log('  state-query.js location <locationId>');
          console.log('  state-query.js trait <trait> [threshold]');
          console.log('  state-query.js world <worldId>');
          console.log('  state-query.js snapshot <worldId>');
          process.exit(1);
      }

      console.log(JSON.stringify(results, null, 2));
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}
