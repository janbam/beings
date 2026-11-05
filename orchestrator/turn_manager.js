#!/usr/bin/env node

/**
 * Turn Management System
 *
 * Manages round-robin turn scheduling for all Beings in a world.
 * Fair scheduling, priority modifiers, skip inactive Beings.
 */

const EventEmitter = require('events');
const { getAllBeings } = require('../shared/utilities/create-being.js');
const { readJSON, writeJSON } = require('../shared/utilities/persistence.js');

class TurnManager extends EventEmitter {
  /**
   * @param {string} worldId - World to manage turns for
   * @param {Object} options - Configuration
   */
  constructor(worldId, options = {}) {
    super();

    this.worldId = worldId;
    this.currentIndex = 0;
    this.turnNumber = 0;
    this.queue = []; // Array of Being IDs
    this.skippedBeings = new Map(); // Being ID → skip count
    this.priorityQueue = []; // Beings with urgent actions

    // Configuration
    this.maxSkipCount = options.maxSkipCount || 3; // Skip Being after N failures
    this.turnTimeout = options.turnTimeout || 60000; // 60 seconds per turn

    // Initialize queue
    this.refreshQueue();
  }

  /**
   * Refresh turn queue from current Beings in world
   */
  refreshQueue() {
    const allBeings = getAllBeings();

    // Filter to Beings in this world
    this.queue = allBeings
      .filter(b => b.currentWorld === this.worldId)
      .filter(b => b.status !== 'archived')
      .map(b => b.id);

    this.emit('queue-refreshed', { count: this.queue.length, beings: this.queue });

    return this.queue;
  }

  /**
   * Get next Being for their turn
   *
   * @returns {string|null} Being ID or null if queue empty
   */
  next() {
    // Check priority queue first (urgent actions)
    if (this.priorityQueue.length > 0) {
      const urgent = this.priorityQueue.shift();
      this.emit('priority-turn', { being: urgent, turn: this.turnNumber });
      return urgent;
    }

    // Empty queue
    if (this.queue.length === 0) {
      this.emit('queue-empty');
      return null;
    }

    // Get next Being (round-robin)
    const beingId = this.queue[this.currentIndex];

    // Advance index (wrap around)
    this.currentIndex = (this.currentIndex + 1) % this.queue.length;

    // If wrapped, increment turn number
    if (this.currentIndex === 0) {
      this.turnNumber++;
      this.emit('round-complete', { turn: this.turnNumber });
    }

    this.emit('turn-start', { being: beingId, turn: this.turnNumber });

    return beingId;
  }

  /**
   * Get current Being without advancing
   */
  peek() {
    if (this.priorityQueue.length > 0) {
      return this.priorityQueue[0];
    }

    if (this.queue.length === 0) {
      return null;
    }

    return this.queue[this.currentIndex];
  }

  /**
   * Add Being to priority queue (jumps ahead)
   *
   * @param {string} beingId - Being to prioritize
   */
  prioritize(beingId) {
    if (!this.queue.includes(beingId)) {
      throw new Error(`Being ${beingId} not in queue`);
    }

    // Add to priority queue if not already there
    if (!this.priorityQueue.includes(beingId)) {
      this.priorityQueue.push(beingId);
      this.emit('being-prioritized', { being: beingId });
    }
  }

  /**
   * Skip current Being (non-responsive, dormant, etc.)
   *
   * @param {string} beingId - Being that failed to take turn
   * @param {string} reason - Why skipped
   */
  skip(beingId, reason = 'non-responsive') {
    // Track skip count
    const skipKey = beingId;
    const skipCount = (this.skippedBeings.get(skipKey) || 0) + 1;
    this.skippedBeings.set(skipKey, skipCount);

    this.emit('turn-skipped', { being: beingId, reason, skipCount });

    // Remove from queue if skipped too many times
    if (skipCount >= this.maxSkipCount) {
      this.removeBeing(beingId);
      this.emit('being-removed', { being: beingId, reason: 'max-skips-exceeded' });
    }
  }

  /**
   * Mark Being's turn as successful (reset skip count)
   */
  success(beingId) {
    this.skippedBeings.delete(beingId);
    this.emit('turn-success', { being: beingId, turn: this.turnNumber });
  }

  /**
   * Add Being to queue
   */
  addBeing(beingId) {
    if (!this.queue.includes(beingId)) {
      this.queue.push(beingId);
      this.emit('being-added', { being: beingId });
    }
  }

  /**
   * Remove Being from queue
   */
  removeBeing(beingId) {
    const index = this.queue.indexOf(beingId);
    if (index !== -1) {
      this.queue.splice(index, 1);

      // Adjust current index if needed
      if (this.currentIndex >= this.queue.length) {
        this.currentIndex = 0;
      }

      this.emit('being-removed', { being: beingId });
    }

    // Also remove from priority queue
    const pIndex = this.priorityQueue.indexOf(beingId);
    if (pIndex !== -1) {
      this.priorityQueue.splice(pIndex, 1);
    }
  }

  /**
   * Get turn queue status
   */
  status() {
    return {
      worldId: this.worldId,
      turnNumber: this.turnNumber,
      currentIndex: this.currentIndex,
      currentBeing: this.peek(),
      queueSize: this.queue.length,
      queue: [...this.queue],
      priorityQueue: [...this.priorityQueue],
      skippedCount: this.skippedBeings.size
    };
  }

  /**
   * Save turn state
   */
  async save(filepath) {
    const state = {
      worldId: this.worldId,
      turnNumber: this.turnNumber,
      currentIndex: this.currentIndex,
      queue: this.queue,
      priorityQueue: this.priorityQueue,
      skippedBeings: Array.from(this.skippedBeings.entries()),
      savedAt: new Date().toISOString()
    };

    await writeJSON(filepath, state);
  }

  /**
   * Load turn state
   */
  async load(filepath) {
    const state = await readJSON(filepath);

    this.worldId = state.worldId;
    this.turnNumber = state.turnNumber;
    this.currentIndex = state.currentIndex;
    this.queue = state.queue;
    this.priorityQueue = state.priorityQueue || [];
    this.skippedBeings = new Map(state.skippedBeings || []);

    this.emit('state-loaded', { turn: this.turnNumber });
  }
}

module.exports = {
  TurnManager
};

// CLI interface
if (require.main === module) {
  const worldId = process.argv[2] || 'test-world';

  console.log('Turn Manager Demo\n');

  const manager = new TurnManager(worldId);

  // Listen to events
  manager.on('turn-start', (data) => {
    console.log(`Turn ${data.turn}: ${data.being}'s turn`);
  });

  manager.on('round-complete', (data) => {
    console.log(`\n=== Round ${data.turn} complete ===\n`);
  });

  // Simulate turns
  console.log('Queue:', manager.queue);
  console.log('\nSimulating 10 turns:\n');

  for (let i = 0; i < 10; i++) {
    const being = manager.next();
    if (!being) {
      console.log('Queue empty!');
      break;
    }

    // Simulate successful turn
    manager.success(being);
  }

  console.log('\nStatus:', JSON.stringify(manager.status(), null, 2));
}
