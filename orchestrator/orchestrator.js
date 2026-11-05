#!/usr/bin/env node

/**
 * JANBAM Orchestrator - Main Loop
 *
 * Coordinates all Beings in round-robin fashion:
 * 1. Get next Being from turn queue
 * 2. Send perception (via message buffer)
 * 3. Being makes decision (via their Claude instance)
 * 4. Receive action
 * 5. World Creator processes action
 * 6. Update world state
 * 7. Broadcast outcomes to affected Beings
 * 8. Repeat
 */

const EventEmitter = require('events');
const { spawn } = require('child_process');
const { TurnManager } = require('./turn_manager.js');
const { sendMessageToBeing, broadcastMessage, getMessageBuffer } = require('./replacement_message_tool.js');
const { readJSON, writeJSON } = require('../shared/utilities/persistence.js');
const { getBeing } = require('../shared/utilities/create-being.js');
const { spawnBeingWithSDK } = require('../shared/sdk/sdk-being-spawner.js');
const path = require('path');

class Orchestrator extends EventEmitter {
  /**
   * @param {string} worldId - World to orchestrate
   * @param {Object} options - Configuration
   */
  constructor(worldId, options = {}) {
    super();

    this.worldId = worldId;
    this.worldPath = path.join(__dirname, '../worlds', worldId);
    this.turnManager = new TurnManager(worldId, options.turnManager);
    this.messageBuffer = getMessageBuffer();

    // State
    this.running = false;
    this.paused = false;
    this.worldState = null;
    this.beingInstances = new Map(); // beingId → Claude process (future)
    this.worldCreator = null; // World Creator process
    this.worldCreatorReady = false;
    this.pendingActions = new Map(); // action_id → resolve callback

    // Configuration
    this.turnsPerSecond = options.turnsPerSecond || 1;
    this.turnDelay = Math.floor(1000 / this.turnsPerSecond);

    // Stats
    this.stats = {
      totalTurns: 0,
      successfulTurns: 0,
      skippedTurns: 0,
      startTime: null,
      lastTurnTime: null
    };

    // Listen to turn manager events
    this.turnManager.on('turn-start', (data) => {
      this.emit('turn-start', data);
    });

    this.turnManager.on('turn-skipped', (data) => {
      this.stats.skippedTurns++;
      this.emit('turn-skipped', data);
    });

    this.turnManager.on('turn-success', (data) => {
      this.stats.successfulTurns++;
    });
  }

  /**
   * Initialize orchestrator (load world state)
   */
  async initialize() {
    console.log(`Initializing orchestrator for world: ${this.worldId}`);

    // Load world state
    const worldStatePath = path.join(this.worldPath, 'world_state.json');
    try {
      this.worldState = await readJSON(worldStatePath);
      console.log(`✅ Loaded world state: ${this.worldState.name || this.worldId}`);
    } catch (error) {
      throw new Error(`Failed to load world state from ${worldStatePath}: ${error.message}`);
    }

    // Spawn World Creator
    await this._spawnWorldCreator();

    // Refresh turn queue
    this.turnManager.refreshQueue();

    console.log(`✅ Turn queue initialized with ${this.turnManager.queue.length} Beings`);

    this.emit('initialized', { worldId: this.worldId });
  }

  /**
   * Spawn World Creator instance
   */
  async _spawnWorldCreator() {
    return new Promise((resolve, reject) => {
      console.log('🌍 Spawning World Creator...');

      const creatorPath = path.join(__dirname, 'world_creator', 'init.js');
      this.worldCreator = spawn('node', [creatorPath, this.worldId]);

      let stdoutBuffer = '';

      // Handle messages from World Creator
      this.worldCreator.stdout.on('data', (data) => {
        stdoutBuffer += data.toString();
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop(); // Keep incomplete line

        lines.forEach(line => {
          if (!line.trim()) return;

          try {
            const msg = JSON.parse(line);
            this._handleWorldCreatorMessage(msg);
          } catch (e) {
            // Not JSON, probably console.log from World Creator
            console.log(`   [World Creator] ${line}`);
          }
        });
      });

      this.worldCreator.stderr.on('data', (data) => {
        console.error(`[World Creator Error] ${data}`);
      });

      this.worldCreator.on('close', (code) => {
        console.log(`⚠️  World Creator exited with code ${code}`);
        this.worldCreatorReady = false;
      });

      // Wait for READY signal
      const readyHandler = (msg) => {
        if (msg.type === 'WORLD_CREATOR_READY') {
          this.worldCreatorReady = true;
          console.log('✅ World Creator ready');
          resolve();
        }
      };

      this.once('world-creator-ready', readyHandler);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this.worldCreatorReady) {
          reject(new Error('World Creator failed to start within 5 seconds'));
        }
      }, 5000);
    });
  }

  /**
   * Handle messages from World Creator
   */
  _handleWorldCreatorMessage(msg) {
    switch (msg.type) {
      case 'WORLD_CREATOR_READY':
        this.emit('world-creator-ready', msg);
        break;

      case 'ACTION_RESULT':
        // Resolve pending action
        const callback = this.pendingActions.get(msg.action_id);
        if (callback) {
          callback(msg);
          this.pendingActions.delete(msg.action_id);
        }
        break;

      case 'WORLD_STATE':
        this.emit('world-state-update', msg.state);
        break;

      case 'ERROR':
        console.error('World Creator error:', msg.error);
        break;

      default:
        console.warn('Unknown World Creator message type:', msg.type);
    }
  }

  /**
   * Send message to World Creator
   */
  _sendToWorldCreator(msg) {
    if (!this.worldCreator || !this.worldCreatorReady) {
      throw new Error('World Creator not ready');
    }

    this.worldCreator.stdin.write(JSON.stringify(msg) + '\n');
  }

  /**
   * Start orchestration loop
   */
  async start() {
    if (this.running) {
      console.warn('Orchestrator already running');
      return;
    }

    this.running = true;
    this.stats.startTime = new Date();

    console.log(`\n🌍 Starting JANBAM orchestration for ${this.worldId}...`);
    console.log(`   Turn delay: ${this.turnDelay}ms (${this.turnsPerSecond} turns/sec)\n`);

    this.emit('started');

    // Main loop
    await this._runLoop();
  }

  /**
   * Main orchestration loop
   */
  async _runLoop() {
    while (this.running) {
      // Check if paused
      if (this.paused) {
        await this._sleep(100);
        continue;
      }

      // Get next Being
      const beingId = this.turnManager.next();

      if (!beingId) {
        console.log('⚠️  No Beings in queue, waiting...');
        await this._sleep(1000);
        this.turnManager.refreshQueue(); // Try to refresh
        continue;
      }

      // Execute turn
      try {
        await this._executeTurn(beingId);
        this.stats.totalTurns++;
        this.stats.lastTurnTime = new Date();
      } catch (error) {
        console.error(`❌ Error during ${beingId}'s turn:`, error.message);
        this.turnManager.skip(beingId, 'error');
      }

      // Delay between turns
      await this._sleep(this.turnDelay);
    }

    this.emit('stopped');
  }

  /**
   * Execute single Being's turn
   */
  async _executeTurn(beingId) {
    const being = getBeing(beingId);

    if (!being) {
      throw new Error(`Being ${beingId} not found in registry`);
    }

    console.log(`\n--- Turn ${this.turnManager.turnNumber}: ${being.name} (${beingId}) ---`);

    // Step 1: Generate perception for Being
    const perception = await this._generatePerception(beingId);

    // Step 2: Send perception to Being via message buffer
    sendMessageToBeing(beingId, {
      type: 'perception',
      turn: this.turnManager.turnNumber,
      ...perception
    }, 'high');

    // Step 3: Being processes via SDK Claude instance
    console.log(`   Waiting for ${being.name} to decide action...`);

    // Step 4: Receive action from Being's SDK Claude instance
    const action = await this._waitForAction(beingId, perception);

    // Step 5: Process action with World Creator
    const outcome = await this._processAction(beingId, action);

    // Step 6: Update world state
    await this._updateWorldState(outcome);

    // Step 7: Broadcast outcomes to affected Beings
    await this._broadcastOutcome(outcome);

    // Mark success
    this.turnManager.success(beingId);

    this.emit('turn-complete', { being: beingId, turn: this.turnManager.turnNumber });
  }

  /**
   * Generate perception for Being based on world state
   *
   * Note: This is a placeholder. Full perception will come from
   * World Creator's ACTION_RESULT (includes perception for affected Beings).
   * This initial perception is just to start the Being's turn.
   */
  async _generatePerception(beingId) {
    // Load Being's state to know their location
    const beingPath = path.join(__dirname, '../beings', beingId, 'state.json');
    const beingState = await readJSON(beingPath);

    // Find Being's current location in world state
    const locationId = beingState.location || 'unknown';
    const location = this.worldState.locations?.[locationId];

    // Build rich perception
    const perception = {
      location: location?.name || locationId || 'Unknown Location',
      time: location?.environment?.time || this.worldState.world?.time?.elapsed || 'unknown',
      environment: location?.description || 'You are in an unfamiliar place.',
      beings: location?.beings?.filter(id => id !== beingId) || [],
      objects: location?.items || [],
      events: this.worldState.events || [],
      message: 'Your turn begins. What do you do?'
    };

    return perception;
  }

  /**
   * Wait for Being to respond with action via SDK
   */
  async _waitForAction(beingId, perception) {
    // Spawn Being's Claude instance via SDK
    const result = await spawnBeingWithSDK(beingId, perception, {
      timeout: 120000  // 2 minute timeout per turn
    });

    console.log(`   ${beingId} action: ${result.action.action} - ${result.action.details}`);

    // Return action in format expected by World Creator
    return {
      type: result.action.action,
      target: result.action.target,
      details: result.action.details
    };
  }

  /**
   * Process action with World Creator
   */
  async _processAction(beingId, action) {
    return new Promise((resolve, reject) => {
      const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log(`   ${beingId} action: ${action.type} - ${action.details}`);

      // Send action to World Creator
      this._sendToWorldCreator({
        type: 'PROCESS_ACTION',
        action: {
          id: actionId,
          being_id: beingId,
          action_type: action.type,
          target: action.target || null,
          details: action.details || ''
        }
      });

      // Store callback for when result arrives
      this.pendingActions.set(actionId, (result) => {
        // Convert World Creator result to orchestrator outcome format
        const outcome = {
          beingId,
          action,
          success: result.success,
          narrative: result.narrative || `${beingId} ${action.details}.`,
          affectedBeings: result.perceptions?.map(p => p.being_id) || [],
          perceptions: result.perceptions || [],
          worldChanges: result.world_state_updated ? {} : {} // World Creator handles state
        };

        resolve(outcome);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingActions.has(actionId)) {
          this.pendingActions.delete(actionId);
          reject(new Error(`World Creator action timeout for ${actionId}`));
        }
      }, 10000);
    });
  }

  /**
   * Update world state based on action outcome
   */
  async _updateWorldState(outcome) {
    if (Object.keys(outcome.worldChanges).length > 0) {
      // Apply changes to world state
      Object.assign(this.worldState, outcome.worldChanges);

      // Save world state
      const worldStatePath = path.join(this.worldPath, 'world_state.json');
      await writeJSON(worldStatePath, this.worldState);
    }
  }

  /**
   * Broadcast outcome to affected Beings
   */
  async _broadcastOutcome(outcome) {
    // Send perception updates to each affected Being
    if (outcome.perceptions && outcome.perceptions.length > 0) {
      outcome.perceptions.forEach(perceptionData => {
        sendMessageToBeing(perceptionData.being_id, {
          type: 'perception',
          turn: this.turnManager.turnNumber,
          ...perceptionData.perception,
          narrative: outcome.narrative
        }, 'high');
      });
    }
  }

  /**
   * Pause orchestration
   */
  pause() {
    this.paused = true;
    this.emit('paused');
    console.log('\n⏸️  Orchestration paused');
  }

  /**
   * Resume orchestration
   */
  resume() {
    this.paused = false;
    this.emit('resumed');
    console.log('\n▶️  Orchestration resumed');
  }

  /**
   * Stop orchestration
   */
  stop() {
    this.running = false;

    // Shutdown World Creator gracefully
    if (this.worldCreator) {
      this.worldCreator.kill('SIGINT');
    }

    console.log('\n⏹️  Orchestration stopped');
  }

  /**
   * Get orchestrator status
   */
  getStatus() {
    return {
      worldId: this.worldId,
      running: this.running,
      paused: this.paused,
      turnManager: this.turnManager.status(),
      stats: {
        ...this.stats,
        uptime: this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0,
        turnsPerMinute: this._calculateTurnsPerMinute()
      }
    };
  }

  /**
   * Calculate actual turns per minute
   */
  _calculateTurnsPerMinute() {
    if (!this.stats.startTime) return 0;

    const elapsed = (Date.now() - this.stats.startTime.getTime()) / 1000 / 60;
    return elapsed > 0 ? Math.round(this.stats.totalTurns / elapsed) : 0;
  }

  /**
   * Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = {
  Orchestrator
};

// CLI interface
if (require.main === module) {
  const worldId = process.argv[2] || 'test-world';

  const orchestrator = new Orchestrator(worldId, {
    turnsPerSecond: 0.5 // Slow for demo
  });

  // Event logging
  orchestrator.on('turn-start', (data) => {
    // Already logged in _executeTurn
  });

  orchestrator.on('turn-complete', (data) => {
    console.log(`   ✅ Turn complete\n`);
  });

  // Initialize and start
  (async () => {
    try {
      await orchestrator.initialize();

      // Run for a few turns then stop
      orchestrator.start();

      setTimeout(() => {
        console.log('\n📊 Status:', JSON.stringify(orchestrator.getStatus(), null, 2));
        orchestrator.stop();

        setTimeout(() => process.exit(0), 1000);
      }, 60000); // Let it run for 60 seconds (enough for 2-3 SDK turns)

    } catch (error) {
      console.error('❌ Orchestrator error:', error.message);
      process.exit(1);
    }
  })();

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Interrupt received, stopping orchestrator...');
    orchestrator.stop();
    setTimeout(() => process.exit(0), 1000);
  });
}
