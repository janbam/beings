#!/usr/bin/env node

/**
 * World Creator Instance Initialization
 *
 * This script initializes the World Creator Claude instance and sets up
 * IPC communication with the orchestrator.
 *
 * Usage: node init.js <world_name>
 */

const path = require('path');
const readline = require('readline');
const { readJSON, writeJSON } = require('../../shared/utilities/persistence.js');
const { queryState } = require('../../shared/utilities/state-query.js');
const { validateJSON } = require('../../shared/utilities/validation.js');

class WorldCreator {
  constructor(worldName) {
    this.worldName = worldName;
    this.worldPath = path.join(__dirname, '../../worlds', worldName);
    this.worldState = null;
    this.rules = null;

    // Performance tracking
    this.stats = {
      actionsProcessed: 0,
      averageProcessingTime: 0,
      startTime: Date.now()
    };
  }

  async initialize() {
    try {
      // Load world state
      this.worldState = await readJSON(
        path.join(this.worldPath, 'world_state.json')
      );

      // Load world rules
      const rulesPath = path.join(this.worldPath, 'rules.js');
      try {
        this.rules = require(rulesPath);
      } catch (err) {
        console.error(`Warning: Could not load rules.js: ${err.message}`);
        this.rules = this.getDefaultRules();
      }

      // Set up stdio handlers
      this.setupStdioHandlers();

      // Send READY signal
      this.send({
        type: 'WORLD_CREATOR_READY',
        world: this.worldName,
        timestamp: Date.now()
      });

      console.error(`🌍 World Creator initialized for world: ${this.worldName}`);
      console.error(`   Locations: ${Object.keys(this.worldState.locations || {}).length}`);
      console.error(`   Beings: ${Object.keys(this.worldState.beings || {}).length}`);

    } catch (error) {
      console.error(`❌ Failed to initialize World Creator: ${error.message}`);
      process.exit(1);
    }
  }

  setupStdioHandlers() {
    // Read from stdin (line-delimited JSON)
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      try {
        const msg = JSON.parse(line);
        await this.handleMessage(msg);
      } catch (error) {
        console.error(`Error handling message: ${error.message}`);
        this.send({
          type: 'ERROR',
          error: error.message,
          original_message: line
        });
      }
    });

    rl.on('close', () => {
      console.error('World Creator stdin closed, exiting...');
      process.exit(0);
    });
  }

  /**
   * Send message to orchestrator via stdout
   */
  send(msg) {
    console.log(JSON.stringify(msg));
  }

  async handleMessage(msg) {
    const startTime = Date.now();

    switch (msg.type) {
      case 'PROCESS_ACTION':
        await this.processAction(msg.action);
        break;

      case 'GET_WORLD_STATE':
        this.send({
          type: 'WORLD_STATE',
          state: this.worldState
        });
        break;

      case 'QUERY_STATE':
        const results = queryState(this.worldState, msg.query);
        this.send({
          type: 'QUERY_RESULT',
          results
        });
        break;

      case 'UPDATE_WORLD':
        await this.updateWorld(msg.updates);
        break;

      case 'ADD_BEING':
        await this.addBeing(msg.being);
        break;

      case 'REMOVE_BEING':
        await this.removeBeing(msg.being_id);
        break;

      case 'PING':
        this.send({ type: 'PONG', timestamp: Date.now() });
        break;

      default:
        console.warn(`Unknown message type: ${msg.type}`);
    }

    // Update stats
    const processingTime = Date.now() - startTime;
    this.stats.actionsProcessed++;
    this.stats.averageProcessingTime =
      (this.stats.averageProcessingTime * (this.stats.actionsProcessed - 1) + processingTime)
      / this.stats.actionsProcessed;
  }

  async processAction(action) {
    /**
     * Core action processing pipeline:
     * 1. Validate action
     * 2. Determine consequences
     * 3. Update world state
     * 4. Generate perception
     * 5. Return results
     */

    // 1. Validate
    let validation = null;
    if (this.rules.validateAction) {
      validation = this.rules.validateAction(action, this.worldState);
    }

    // If rules don't provide validation (return null), use default
    if (!validation) {
      validation = this.defaultValidateAction(action);
    }

    if (!validation.valid) {
      this.send({
        type: 'ACTION_RESULT',
        action_id: action.id,
        success: false,
        reason: validation.reason,
        perceptions: this.generateFailurePerception(action.being_id, validation.reason)
      });
      return;
    }

    // 2. Process action and get consequences
    let result = null;
    if (this.rules.processAction) {
      result = await this.rules.processAction(action, this.worldState);
    }

    // If rules don't provide processing (return null), use default
    if (!result) {
      result = await this.defaultProcessAction(action);
    }

    // 3. Update world state
    this.worldState = result.worldState;
    await writeJSON(
      path.join(this.worldPath, 'world_state.json'),
      this.worldState
    );

    // 4. Generate perception for affected Beings
    const affectedBeings = this.getAffectedBeings(action, result);
    const perceptions = affectedBeings.map(beingId =>
      this.generatePerception(beingId, result.changes)
    );

    // 5. Return results
    this.send({
      type: 'ACTION_RESULT',
      action_id: action.id,
      success: true,
      world_state_updated: true,
      perceptions,
      narrative: result.narrative || null,
      timestamp: Date.now()
    });
  }

  defaultValidateAction(action) {
    // Basic validation
    const being = this.worldState.beings?.[action.being_id];

    if (!being) {
      return { valid: false, reason: `Being '${action.being_id}' does not exist` };
    }

    if (!action.action_type) {
      return { valid: false, reason: 'No action type specified' };
    }

    return { valid: true };
  }

  async defaultProcessAction(action) {
    /**
     * Default action processing for common action types.
     * World-specific rules.js can override this.
     */

    const being = this.worldState.beings[action.being_id];
    const changes = [];

    switch (action.action_type) {
      case 'move':
        return await this.processMove(action, being);

      case 'speak':
        return await this.processSpeak(action, being);

      case 'interact':
        return await this.processInteract(action, being);

      case 'wait':
        return await this.processWait(action, being);

      default:
        return {
          worldState: this.worldState,
          changes: [{ type: 'unknown_action', action: action.action_type }],
          narrative: null
        };
    }
  }

  async processMove(action, being) {
    const fromLocation = this.worldState.locations[being.location];
    const direction = action.target;
    const toLocationId = fromLocation.connections?.[direction];

    if (!toLocationId) {
      return {
        worldState: this.worldState,
        changes: [{ type: 'move_failed', reason: 'No path in that direction' }],
        narrative: null
      };
    }

    const toLocation = this.worldState.locations[toLocationId];

    // Update world state
    fromLocation.beings = (fromLocation.beings || []).filter(id => id !== action.being_id);
    toLocation.beings = (toLocation.beings || []).concat(action.being_id);
    being.location = toLocationId;

    return {
      worldState: this.worldState,
      changes: [
        {
          type: 'movement',
          being: action.being_id,
          from: being.location,
          to: toLocationId,
          direction
        }
      ],
      narrative: `${being.name} moves ${direction}`
    };
  }

  async processSpeak(action, being) {
    const location = this.worldState.locations[being.location];

    // Add event to world state
    if (!this.worldState.events) {
      this.worldState.events = [];
    }

    this.worldState.events.push({
      type: 'speech',
      being: action.being_id,
      location: being.location,
      message: action.details,
      timestamp: this.worldState.world.time.turn
    });

    return {
      worldState: this.worldState,
      changes: [
        {
          type: 'speech',
          being: action.being_id,
          location: being.location,
          message: action.details
        }
      ],
      narrative: `${being.name} says: "${action.details}"`
    };
  }

  async processInteract(action, being) {
    // Default interact - attempt to take/use target
    const location = this.worldState.locations[being.location];
    const target = action.target;

    // Check if target is an item in location
    if (location.items?.includes(target)) {
      // Add to inventory, remove from location
      being.inventory = (being.inventory || []).concat(target);
      location.items = location.items.filter(id => id !== target);

      return {
        worldState: this.worldState,
        changes: [
          {
            type: 'item_taken',
            being: action.being_id,
            item: target,
            location: being.location
          }
        ],
        narrative: `${being.name} takes ${this.worldState.items[target]?.name || target}`
      };
    }

    // Check if target is another Being
    if (this.worldState.beings[target]) {
      return {
        worldState: this.worldState,
        changes: [
          {
            type: 'being_interaction',
            being: action.being_id,
            target,
            details: action.details
          }
        ],
        narrative: `${being.name} interacts with ${this.worldState.beings[target].name}`
      };
    }

    return {
      worldState: this.worldState,
      changes: [{ type: 'interact_failed', reason: 'Target not found' }],
      narrative: null
    };
  }

  async processWait(action, being) {
    // Waiting does nothing but advances time
    this.advanceTime(1); // 1 minute per wait action

    return {
      worldState: this.worldState,
      changes: [{ type: 'wait', being: action.being_id }],
      narrative: `${being.name} waits, observing`
    };
  }

  /**
   * Advance world time
   * @param {number} minutes - Minutes to advance
   */
  advanceTime(minutes = 1) {
    if (!this.worldState.world) {
      this.worldState.world = { time: { elapsed: 0, turn: 0 } };
    }

    if (!this.worldState.world.time) {
      this.worldState.world.time = { elapsed: 0, turn: 0 };
    }

    this.worldState.world.time.elapsed += minutes;
    this.worldState.world.time.turn += 1;

    // Trigger time-based events
    this.checkTimeEvents();
  }

  /**
   * Check for time-based events (day/night cycles, NPC schedules, etc.)
   */
  checkTimeEvents() {
    const elapsed = this.worldState.world.time.elapsed;

    // Hour passed
    if (elapsed % 60 === 0) {
      this.onHourPassed();
    }

    // Day passed (assuming 24-hour days)
    if (elapsed % 1440 === 0) {
      this.onDayPassed();
    }
  }

  onHourPassed() {
    // Placeholder for hourly events
    // Could trigger: weather changes, NPC movements, etc.
  }

  onDayPassed() {
    // Placeholder for daily events
    // Could trigger: shop restocking, quest updates, etc.
  }

  /**
   * Get current time of day
   * @returns {string} - 'dawn', 'morning', 'afternoon', 'evening', 'night'
   */
  getTimeOfDay() {
    const elapsed = this.worldState.world?.time?.elapsed || 0;
    const minutesInDay = 1440; // 24 hours
    const timeInDay = elapsed % minutesInDay;
    const hour = Math.floor(timeInDay / 60);

    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 20) return 'evening';
    return 'night';
  }

  getAffectedBeings(action, result) {
    /**
     * Determine which Beings need perception updates based on action.
     * Returns array of being IDs.
     */

    const affectedBeings = new Set();
    const actingBeing = this.worldState.beings[action.being_id];

    // Always include acting Being
    affectedBeings.add(action.being_id);

    // Include all Beings in same location
    const location = this.worldState.locations[actingBeing.location];
    (location.beings || []).forEach(id => affectedBeings.add(id));

    // If Being moved, include Beings in destination
    const moveChange = result.changes?.find(c => c.type === 'movement');
    if (moveChange) {
      const destLocation = this.worldState.locations[moveChange.to];
      (destLocation.beings || []).forEach(id => affectedBeings.add(id));
    }

    return Array.from(affectedBeings);
  }

  generatePerception(beingId, changes) {
    /**
     * Generate perception for a specific Being.
     * Perception is subjective based on Being's location and capabilities.
     */

    const being = this.worldState.beings[beingId];
    const location = this.worldState.locations[being.location];

    // Use custom perception generation if available
    if (this.rules.generatePerception) {
      return {
        being_id: beingId,
        perception: this.rules.generatePerception(being, this.worldState, changes)
      };
    }

    // Default perception
    const visibleBeings = (location.beings || [])
      .filter(id => id !== beingId)
      .map(id => ({
        id,
        name: this.worldState.beings[id].name,
        appearance: this.worldState.beings[id].appearance || 'a figure'
      }));

    const events = changes.map(change => this.changeToEvent(change, being));

    return {
      being_id: beingId,
      perception: {
        location: {
          name: location.name,
          description: location.description,
          visible_beings: visibleBeings,
          available_items: (location.items || []).map(id => this.worldState.items?.[id] || { id }),
          connections: location.connections || {},
          environment: location.environment || {}
        },
        events: events.filter(e => e !== null),
        changes: {}
      }
    };
  }

  changeToEvent(change, observingBeing) {
    /**
     * Convert a world state change into a narrative event
     * from the perspective of the observing Being.
     */

    switch (change.type) {
      case 'movement':
        const movingBeing = this.worldState.beings[change.being];
        if (change.being === observingBeing.id) {
          return `You move ${change.direction}`;
        } else if (change.to === observingBeing.location) {
          return `${movingBeing.name} arrives from the ${this.oppositeDirection(change.direction)}`;
        } else if (change.from === observingBeing.location) {
          return `${movingBeing.name} departs to the ${change.direction}`;
        }
        return null;

      case 'speech':
        const speakingBeing = this.worldState.beings[change.being];
        if (change.location === observingBeing.location) {
          return `${speakingBeing.name} says: "${change.message}"`;
        }
        return null;

      case 'item_taken':
        const takingBeing = this.worldState.beings[change.being];
        const item = this.worldState.items[change.item];
        if (change.location === observingBeing.location) {
          return `${takingBeing.name} takes ${item?.name || change.item}`;
        }
        return null;

      case 'wait':
        return null; // Waiting is invisible

      default:
        return null;
    }
  }

  oppositeDirection(direction) {
    const opposites = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'up': 'down',
      'down': 'up'
    };
    return opposites[direction] || direction;
  }

  generateFailurePerception(beingId, reason) {
    return [{
      being_id: beingId,
      perception: {
        events: [reason]
      }
    }];
  }

  async updateWorld(updates) {
    // Direct world state modifications
    Object.assign(this.worldState, updates);
    await writeJSON(
      path.join(this.worldPath, 'world_state.json'),
      this.worldState
    );

    this.send({
      type: 'WORLD_UPDATED',
      timestamp: Date.now()
    });
  }

  async addBeing(being) {
    if (!this.worldState.beings) {
      this.worldState.beings = {};
    }

    this.worldState.beings[being.id] = being;

    // Add to location if specified
    if (being.location && this.worldState.locations[being.location]) {
      const location = this.worldState.locations[being.location];
      location.beings = (location.beings || []).concat(being.id);
    }

    await writeJSON(
      path.join(this.worldPath, 'world_state.json'),
      this.worldState
    );

    this.send({
      type: 'BEING_ADDED',
      being_id: being.id
    });
  }

  async removeBeing(beingId) {
    const being = this.worldState.beings?.[beingId];

    if (being) {
      // Remove from location
      const location = this.worldState.locations[being.location];
      if (location) {
        location.beings = (location.beings || []).filter(id => id !== beingId);
      }

      // Remove from beings registry
      delete this.worldState.beings[beingId];

      await writeJSON(
        path.join(this.worldPath, 'world_state.json'),
        this.worldState
      );
    }

    this.send({
      type: 'BEING_REMOVED',
      being_id: beingId
    });
  }

  /**
   * Resolve conflict between simultaneous actions
   *
   * Called when multiple actions affect the same resource/state
   */
  resolveConflict(actions) {
    /**
     * Default conflict resolution:
     * 1. Sort by action type priority (defensive > offensive > neutral)
     * 2. If same priority, use timestamp (earlier wins)
     * 3. If same timestamp, random resolution
     */

    const actionPriority = {
      'flee': 3,        // Defensive actions first
      'defend': 3,
      'move': 2,        // Movement actions
      'interact': 1,    // Interaction actions
      'attack': 1,
      'speak': 0,       // Communication last
      'wait': -1        // Passive actions last
    };

    return actions.sort((a, b) => {
      // Priority first
      const priorityA = actionPriority[a.action_type] || 0;
      const priorityB = actionPriority[b.action_type] || 0;
      if (priorityA !== priorityB) return priorityB - priorityA;

      // Timestamp second
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      if (timeA !== timeB) return timeA - timeB;

      // Random third
      return Math.random() - 0.5;
    });
  }

  /**
   * Check if two actions conflict (affect same resource/state)
   */
  actionsConflict(actionA, actionB) {
    // Same target
    if (actionA.target && actionA.target === actionB.target) {
      return true;
    }

    // Both Beings in same location doing physical actions
    const beingA = this.worldState.beings[actionA.being_id];
    const beingB = this.worldState.beings[actionB.being_id];

    if (beingA && beingB && beingA.location === beingB.location) {
      const physicalActions = ['attack', 'interact', 'take', 'move'];
      if (physicalActions.includes(actionA.action_type) &&
          physicalActions.includes(actionB.action_type)) {
        return true;
      }
    }

    return false;
  }

  getDefaultRules() {
    return {
      validateAction: null,
      processAction: null,
      generatePerception: null,
      resolveConflict: null // Can be overridden by world rules
    };
  }
}

// Main execution
if (require.main === module) {
  const worldName = process.argv[2];

  if (!worldName) {
    console.error('Usage: node init.js <world_name>');
    process.exit(1);
  }

  const creator = new WorldCreator(worldName);
  creator.initialize();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.error('\n🌍 World Creator shutting down...');
    console.error(`   Actions processed: ${creator.stats.actionsProcessed}`);
    console.error(`   Average processing time: ${creator.stats.averageProcessingTime.toFixed(2)}ms`);
    process.exit(0);
  });
}

module.exports = WorldCreator;
