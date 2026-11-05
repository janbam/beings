#!/usr/bin/env node

/**
 * Message Queue System
 *
 * Queue for actions and messages between Beings and World Creator.
 * Provides delivery guarantees, priorities, and timeout handling.
 */

const { EventEmitter } = require('events');

/**
 * Priority levels
 */
const Priority = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
  BACKGROUND: 4
};

/**
 * Message Queue
 * FIFO or priority-based queue with TTL support
 */
class MessageQueue extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      mode: options.mode || 'priority', // 'fifo' or 'priority'
      defaultTTL: options.defaultTTL || 300000, // 5 minutes
      maxSize: options.maxSize || 10000,
      ...options
    };

    this.queue = [];
    this.deadLetterQueue = [];
    this.messageId = 0;
  }

  /**
   * Enqueue message
   *
   * @param {string} recipient - Being ID or 'world_creator'
   * @param {Object} message - Message data
   * @param {number} priority - Priority level
   * @param {number} ttl - Time to live in ms
   * @returns {string} Message ID
   */
  enqueue(recipient, message, priority = Priority.NORMAL, ttl = null) {
    if (this.queue.length >= this.options.maxSize) {
      this.emit('queue-full', { queueSize: this.queue.length });
      throw new Error('Message queue full');
    }

    const id = `msg_${++this.messageId}_${Date.now()}`;
    const queuedMessage = {
      id,
      recipient,
      message,
      priority,
      enqueuedAt: Date.now(),
      expiresAt: Date.now() + (ttl || this.options.defaultTTL),
      attempts: 0,
      status: 'pending'
    };

    this.queue.push(queuedMessage);

    // Sort if priority mode
    if (this.options.mode === 'priority') {
      this.queue.sort((a, b) => a.priority - b.priority);
    }

    this.emit('enqueued', queuedMessage);
    return id;
  }

  /**
   * Dequeue next message for recipient
   *
   * @param {string} recipient - Being ID
   * @returns {Object|null} Next message or null
   */
  dequeue(recipient) {
    const now = Date.now();

    // Find next message for this recipient
    const index = this.queue.findIndex(m =>
      m.recipient === recipient &&
      m.status === 'pending' &&
      m.expiresAt > now
    );

    if (index === -1) {
      return null;
    }

    const message = this.queue[index];
    message.status = 'delivered';
    message.deliveredAt = now;
    message.attempts++;

    this.queue.splice(index, 1);
    this.emit('dequeued', message);

    return message;
  }

  /**
   * Peek at next message without removing
   *
   * @param {string} recipient - Being ID
   * @returns {Object|null} Next message or null
   */
  peek(recipient) {
    const now = Date.now();

    return this.queue.find(m =>
      m.recipient === recipient &&
      m.status === 'pending' &&
      m.expiresAt > now
    ) || null;
  }

  /**
   * Get all pending messages for recipient
   *
   * @param {string} recipient - Being ID
   * @returns {Array} Pending messages
   */
  getPending(recipient) {
    const now = Date.now();

    return this.queue.filter(m =>
      m.recipient === recipient &&
      m.status === 'pending' &&
      m.expiresAt > now
    );
  }

  /**
   * Dequeue all pending messages for recipient
   *
   * @param {string} recipient - Being ID
   * @returns {Array} All pending messages
   */
  dequeueAll(recipient) {
    const messages = [];
    let message;

    while ((message = this.dequeue(recipient)) !== null) {
      messages.push(message);
    }

    return messages;
  }

  /**
   * Broadcast message to multiple recipients
   *
   * @param {Array} recipients - List of Being IDs
   * @param {Object} message - Message data
   * @param {number} priority - Priority level
   * @returns {Array} Message IDs
   */
  broadcast(recipients, message, priority = Priority.NORMAL) {
    return recipients.map(recipient =>
      this.enqueue(recipient, message, priority)
    );
  }

  /**
   * Clean expired messages
   */
  cleanExpired() {
    const now = Date.now();
    const expired = [];

    this.queue = this.queue.filter(m => {
      if (m.expiresAt <= now && m.status === 'pending') {
        expired.push(m);
        this.deadLetterQueue.push({
          ...m,
          reason: 'expired'
        });
        return false;
      }
      return true;
    });

    if (expired.length > 0) {
      this.emit('expired', expired);
    }

    return expired;
  }

  /**
   * Retry failed message
   *
   * @param {string} messageId - Message ID from dead letter queue
   */
  retry(messageId) {
    const index = this.deadLetterQueue.findIndex(m => m.id === messageId);

    if (index === -1) {
      throw new Error(`Message ${messageId} not found in dead letter queue`);
    }

    const message = this.deadLetterQueue[index];
    this.deadLetterQueue.splice(index, 1);

    // Re-enqueue with fresh TTL
    return this.enqueue(
      message.recipient,
      message.message,
      message.priority
    );
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const now = Date.now();

    return {
      total: this.queue.length,
      pending: this.queue.filter(m => m.status === 'pending').length,
      delivered: this.queue.filter(m => m.status === 'delivered').length,
      expired: this.queue.filter(m => m.expiresAt <= now).length,
      deadLetters: this.deadLetterQueue.length,
      byPriority: {
        urgent: this.queue.filter(m => m.priority === Priority.URGENT).length,
        high: this.queue.filter(m => m.priority === Priority.HIGH).length,
        normal: this.queue.filter(m => m.priority === Priority.NORMAL).length,
        low: this.queue.filter(m => m.priority === Priority.LOW).length,
        background: this.queue.filter(m => m.priority === Priority.BACKGROUND).length
      }
    };
  }

  /**
   * Clear queue
   */
  clear() {
    const count = this.queue.length;
    this.queue = [];
    this.emit('cleared', { count });
    return count;
  }

  /**
   * Get dead letter queue
   */
  getDeadLetters() {
    return [...this.deadLetterQueue];
  }
}

/**
 * Multi-Queue Manager
 * Manages separate queues for different worlds or contexts
 */
class QueueManager {
  constructor() {
    this.queues = new Map();
  }

  /**
   * Get or create queue for context
   *
   * @param {string} context - Context ID (e.g., worldId)
   * @param {Object} options - Queue options
   * @returns {MessageQueue} Queue instance
   */
  getQueue(context, options = {}) {
    if (!this.queues.has(context)) {
      this.queues.set(context, new MessageQueue(options));
    }
    return this.queues.get(context);
  }

  /**
   * Delete queue
   */
  deleteQueue(context) {
    const queue = this.queues.get(context);
    if (queue) {
      queue.clear();
      this.queues.delete(context);
    }
  }

  /**
   * Clean expired messages in all queues
   */
  cleanAllExpired() {
    const expired = [];

    for (const [context, queue] of this.queues) {
      const contextExpired = queue.cleanExpired();
      if (contextExpired.length > 0) {
        expired.push({ context, messages: contextExpired });
      }
    }

    return expired;
  }

  /**
   * Get stats for all queues
   */
  getAllStats() {
    const stats = {};

    for (const [context, queue] of this.queues) {
      stats[context] = queue.getStats();
    }

    return stats;
  }
}

// Export
module.exports = {
  MessageQueue,
  QueueManager,
  Priority
};

// CLI interface
if (require.main === module) {
  const queue = new MessageQueue({ mode: 'priority' });

  queue.on('enqueued', (msg) => {
    console.log('Enqueued:', msg.id, 'for', msg.recipient);
  });

  queue.on('dequeued', (msg) => {
    console.log('Dequeued:', msg.id);
  });

  // Test
  queue.enqueue('being1', { type: 'perception', data: 'forest' }, Priority.NORMAL);
  queue.enqueue('being1', { type: 'urgent', data: 'danger!' }, Priority.URGENT);
  queue.enqueue('being2', { type: 'turn', data: 'your turn' }, Priority.HIGH);

  console.log('\nStats:', queue.getStats());

  console.log('\nNext for being1:', queue.dequeue('being1'));
  console.log('Next for being1:', queue.dequeue('being1'));
  console.log('Next for being2:', queue.dequeue('being2'));
}
