#!/usr/bin/env node

/**
 * ReplacementMessageTool - Modified AskHuman for JANBAM
 *
 * CRITICAL INNOVATION:
 * Instead of blocking for user input (breaking Claude's response cycle),
 * this tool returns queued messages from the message buffer.
 *
 * This allows Claude instances to continue in single response cycle,
 * preserving thinking blocks and maintaining Being continuity.
 *
 * Based on MCP's AskHuman tool pattern but non-blocking.
 */

const { MessageQueue } = require('./message_queue.js');

/**
 * Message buffer for all Beings
 * Maps Being ID → MessageQueue
 */
class MessageBuffer {
  constructor() {
    this.queues = new Map(); // beingId → MessageQueue
  }

  /**
   * Get or create queue for Being
   */
  getQueue(beingId) {
    if (!this.queues.has(beingId)) {
      this.queues.set(beingId, new MessageQueue());
    }
    return this.queues.get(beingId);
  }

  /**
   * Send message to Being
   *
   * @param {string} beingId - Recipient Being
   * @param {Object} message - Message content
   * @param {string} priority - Priority level
   */
  send(beingId, message, priority = 'normal') {
    const queue = this.getQueue(beingId);
    queue.enqueue(beingId, message, priority);
  }

  /**
   * Get next message for Being (non-blocking)
   *
   * @param {string} beingId - Being requesting messages
   * @returns {Object|null} Message or null if empty
   */
  receive(beingId) {
    const queue = this.getQueue(beingId);
    return queue.dequeue(beingId);
  }

  /**
   * Check if Being has pending messages
   */
  hasMessages(beingId) {
    const queue = this.getQueue(beingId);
    const stats = queue.getStats();
    return stats.pending > 0;
  }

  /**
   * Get message count for Being
   */
  messageCount(beingId) {
    const queue = this.getQueue(beingId);
    const stats = queue.getStats();
    return stats.pending;
  }

  /**
   * Broadcast message to multiple Beings
   */
  broadcast(beingIds, message, priority = 'normal') {
    for (const beingId of beingIds) {
      this.send(beingId, message, priority);
    }
  }

  /**
   * Clear all messages for Being
   */
  clear(beingId) {
    this.queues.delete(beingId);
  }
}

/**
 * Global message buffer instance
 */
const globalBuffer = new MessageBuffer();

/**
 * ReplacementMessageTool - MCP-compatible tool definition
 *
 * This replaces AskHuman in Being Claude instances.
 * Instead of blocking, it returns queued messages.
 */
const ReplacementMessageTool = {
  name: 'GetMessages',
  description: `
    Retrieve queued messages for this Being.

    NON-BLOCKING: Returns immediately with messages or empty response.

    Messages come from:
    - World Creator (perceptions, outcomes)
    - Other Beings (speech, actions directed at you)
    - System notifications

    If no messages, returns { messages: [], waiting: true }

    DO NOT wait or retry. Process available messages and continue.
  `,

  /**
   * Tool implementation
   *
   * @param {string} beingId - Being's ID (injected by orchestrator)
   * @returns {Object} Messages or waiting signal
   */
  async execute({ beingId }) {
    // Get messages from buffer
    const messages = [];
    let msg;

    // Drain all available messages (non-blocking)
    while ((msg = globalBuffer.receive(beingId)) !== null) {
      messages.push(msg.message);
    }

    if (messages.length === 0) {
      return {
        messages: [],
        waiting: true,
        note: 'No messages available. You may continue thinking or planning.'
      };
    }

    return {
      messages,
      count: messages.length,
      waiting: false
    };
  }
};

/**
 * Helper to send message to Being
 */
function sendMessageToBeing(beingId, message, priority = 'normal') {
  globalBuffer.send(beingId, message, priority);
}

/**
 * Helper to broadcast to multiple Beings
 */
function broadcastMessage(beingIds, message, priority = 'normal') {
  globalBuffer.broadcast(beingIds, message, priority);
}

/**
 * Get message buffer instance
 */
function getMessageBuffer() {
  return globalBuffer;
}

module.exports = {
  MessageBuffer,
  ReplacementMessageTool,
  sendMessageToBeing,
  broadcastMessage,
  getMessageBuffer
};

// CLI testing
if (require.main === module) {
  console.log('ReplacementMessageTool Demo\n');

  // Simulate messages being sent
  console.log('1. Sending messages to Aether...');
  sendMessageToBeing('aether', {
    type: 'perception',
    content: 'You see a mysterious sage ahead.',
    from: 'world_creator'
  });

  sendMessageToBeing('aether', {
    type: 'speech',
    content: 'Greetings, traveler!',
    from: 'sage'
  }, 'high');

  console.log('   Messages queued:', globalBuffer.messageCount('aether'));

  // Simulate Being retrieving messages
  console.log('\n2. Aether retrieving messages...');
  const result1 = ReplacementMessageTool.execute({ beingId: 'aether' });
  result1.then(res => {
    console.log('   Result:', JSON.stringify(res, null, 2));
  });

  // Try again (should be empty)
  setTimeout(() => {
    console.log('\n3. Aether retrieving again (should be empty)...');
    ReplacementMessageTool.execute({ beingId: 'aether' })
      .then(res => {
        console.log('   Result:', JSON.stringify(res, null, 2));
      });
  }, 100);

  // Broadcast demo
  setTimeout(() => {
    console.log('\n4. Broadcasting to multiple Beings...');
    broadcastMessage(['aether', 'guardian', 'seeker'], {
      type: 'event',
      content: 'The ground trembles beneath your feet!'
    });

    console.log('   Aether messages:', globalBuffer.messageCount('aether'));
    console.log('   Guardian messages:', globalBuffer.messageCount('guardian'));
  }, 200);
}
