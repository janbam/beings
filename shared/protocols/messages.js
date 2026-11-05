#!/usr/bin/env node

/**
 * Message Protocol
 *
 * Defines message formats for Being <-> World Creator communication.
 * All messages are JSON-based, line-delimited for stdio transport.
 */

/**
 * Message Types
 */
const MessageTypes = {
  // Being -> World Creator
  ACTION: 'action',
  ACTION_RESPONSE: 'action_response',
  QUERY: 'query',

  // World Creator -> Being
  PERCEPTION: 'perception',
  STATE_UPDATE: 'state_update',
  TURN_START: 'turn_start',
  TURN_END: 'turn_end',

  // Bidirectional
  MESSAGE: 'message',
  BROADCAST: 'broadcast',

  // System
  HEARTBEAT: 'heartbeat',
  SHUTDOWN: 'shutdown',
  ERROR: 'error'
};

/**
 * Message Protocol Version
 */
const PROTOCOL_VERSION = '1.0.0';

/**
 * Create base message structure
 */
function createMessage(type, data = {}, metadata = {}) {
  return {
    protocol: PROTOCOL_VERSION,
    type,
    timestamp: new Date().toISOString(),
    ...metadata,
    data
  };
}

/**
 * Action Request Message
 * Being declares intent to perform action
 */
function createActionMessage(beingId, action, context = {}) {
  return createMessage(MessageTypes.ACTION, {
    being: beingId,
    action,
    context
  });
}

/**
 * Perception Update Message
 * World Creator tells Being what they perceive
 */
function createPerceptionMessage(beingId, perception) {
  return createMessage(MessageTypes.PERCEPTION, {
    being: beingId,
    location: perception.location,
    visibleBeings: perception.visibleBeings || [],
    visibleItems: perception.visibleItems || [],
    events: perception.events || [],
    environment: perception.environment || {},
    sounds: perception.sounds || [],
    scents: perception.scents || []
  });
}

/**
 * State Update Message
 * World Creator tells Being about state changes
 */
function createStateUpdateMessage(beingId, changes) {
  return createMessage(MessageTypes.STATE_UPDATE, {
    being: beingId,
    changes
  });
}

/**
 * Turn Start Message
 * World Creator signals it's Being's turn
 */
function createTurnStartMessage(beingId, turnNumber, context = {}) {
  return createMessage(MessageTypes.TURN_START, {
    being: beingId,
    turn: turnNumber,
    context
  });
}

/**
 * Turn End Message
 * World Creator signals turn is over
 */
function createTurnEndMessage(beingId, turnNumber, outcome = {}) {
  return createMessage(MessageTypes.TURN_END, {
    being: beingId,
    turn: turnNumber,
    outcome
  });
}

/**
 * Communication Message
 * Being to Being communication (via World Creator)
 */
function createCommunicationMessage(fromBeing, toBeing, content, channel = 'speech') {
  return createMessage(MessageTypes.MESSAGE, {
    from: fromBeing,
    to: toBeing,
    content,
    channel // speech, whisper, telepathy, gesture, etc.
  });
}

/**
 * Broadcast Message
 * Message to multiple Beings
 */
function createBroadcastMessage(source, recipients, content, scope = 'location') {
  return createMessage(MessageTypes.BROADCAST, {
    source,
    recipients, // array of Being IDs, or 'all', 'location', etc.
    content,
    scope
  });
}

/**
 * Query Message
 * Being asks World Creator for information
 */
function createQueryMessage(beingId, query) {
  return createMessage(MessageTypes.QUERY, {
    being: beingId,
    query
  });
}

/**
 * Heartbeat Message
 * Keep-alive ping
 */
function createHeartbeatMessage(source) {
  return createMessage(MessageTypes.HEARTBEAT, {
    source,
    status: 'alive'
  });
}

/**
 * Shutdown Message
 * Graceful shutdown signal
 */
function createShutdownMessage(reason = 'shutdown requested') {
  return createMessage(MessageTypes.SHUTDOWN, {
    reason
  });
}

/**
 * Error Message
 * Report error condition
 */
function createErrorMessage(source, error, context = {}) {
  return createMessage(MessageTypes.ERROR, {
    source,
    error: typeof error === 'string' ? error : error.message,
    stack: error.stack,
    context
  });
}

/**
 * Serialize message for transport (line-delimited JSON)
 */
function serializeMessage(message) {
  return JSON.stringify(message) + '\n';
}

/**
 * Parse message from transport
 */
function parseMessage(line) {
  try {
    const message = JSON.parse(line);

    // Validate protocol version
    if (message.protocol !== PROTOCOL_VERSION) {
      console.warn(`Protocol version mismatch: expected ${PROTOCOL_VERSION}, got ${message.protocol}`);
    }

    return message;
  } catch (error) {
    throw new Error(`Failed to parse message: ${error.message}`);
  }
}

/**
 * Validate message structure
 */
function validateMessage(message) {
  const errors = [];

  if (!message.protocol) {
    errors.push('Missing protocol version');
  }
  if (!message.type) {
    errors.push('Missing message type');
  }
  if (!message.timestamp) {
    errors.push('Missing timestamp');
  }
  if (!message.data) {
    errors.push('Missing data');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Export
module.exports = {
  MessageTypes,
  PROTOCOL_VERSION,
  createMessage,
  createActionMessage,
  createPerceptionMessage,
  createStateUpdateMessage,
  createTurnStartMessage,
  createTurnEndMessage,
  createCommunicationMessage,
  createBroadcastMessage,
  createQueryMessage,
  createHeartbeatMessage,
  createShutdownMessage,
  createErrorMessage,
  serializeMessage,
  parseMessage,
  validateMessage
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const messageType = args[0];

  let message;

  switch (messageType) {
    case 'action':
      message = createActionMessage('being1', { type: 'move', destination: 'forest' });
      break;
    case 'perception':
      message = createPerceptionMessage('being1', {
        location: 'forest',
        visibleBeings: ['being2'],
        events: ['A bird chirps in the distance']
      });
      break;
    case 'heartbeat':
      message = createHeartbeatMessage('orchestrator');
      break;
    default:
      console.log('Usage: messages.js <type>');
      console.log('Types: action, perception, heartbeat');
      process.exit(1);
  }

  console.log('Message:');
  console.log(JSON.stringify(message, null, 2));
  console.log('\nSerialized:');
  console.log(serializeMessage(message));
}
