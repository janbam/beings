#!/usr/bin/env node

/**
 * Inter-Process Communication Layer
 *
 * stdio-based IPC for communicating with Claude instances.
 * Handles buffering, partial messages, and error recovery.
 */

const { EventEmitter } = require('events');
const { serializeMessage, parseMessage } = require('./messages.js');

/**
 * IPC Connection
 * Wraps stdio communication with a Claude process
 */
class IPCConnection extends EventEmitter {
  constructor(process, options = {}) {
    super();

    this.process = process;
    this.options = {
      heartbeatInterval: options.heartbeatInterval || 30000, // 30s
      messageTimeout: options.messageTimeout || 60000, // 60s
      ...options
    };

    this.inBuffer = '';
    this.outBuffer = [];
    this.lastHeartbeat = Date.now();
    this.messageHandlers = new Map();

    this.setupHandlers();

    if (this.options.heartbeatInterval) {
      this.startHeartbeat();
    }
  }

  /**
   * Set up stdio handlers
   */
  setupHandlers() {
    // Handle stdout - receive messages
    this.process.stdout.on('data', (data) => {
      this.handleIncomingData(data);
    });

    // Handle stderr
    this.process.stderr.on('data', (data) => {
      this.emit('stderr', data.toString());
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      this.emit('exit', { code, signal });
      this.cleanup();
    });

    // Handle errors
    this.process.on('error', (error) => {
      this.emit('error', error);
    });
  }

  /**
   * Handle incoming data
   */
  handleIncomingData(data) {
    this.inBuffer += data.toString();

    // Process complete lines
    const lines = this.inBuffer.split('\n');
    this.inBuffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = parseMessage(line);
          this.handleMessage(message);
        } catch (error) {
          this.emit('parse-error', { line, error });
        }
      }
    }
  }

  /**
   * Handle parsed message
   */
  handleMessage(message) {
    this.lastHeartbeat = Date.now();

    // Check for message-specific handler
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }

    // Always emit generic message event
    this.emit('message', message);
  }

  /**
   * Send message
   */
  send(message) {
    try {
      const serialized = serializeMessage(message);
      this.process.stdin.write(serialized);
      this.emit('sent', message);
    } catch (error) {
      this.emit('send-error', { message, error });
      throw error;
    }
  }

  /**
   * Register handler for specific message type
   */
  on(eventOrType, handler) {
    if (eventOrType.startsWith('message:')) {
      const messageType = eventOrType.slice(8);
      this.messageHandlers.set(messageType, handler);
    } else {
      super.on(eventOrType, handler);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;

      if (timeSinceHeartbeat > this.options.heartbeatInterval * 2) {
        this.emit('heartbeat-timeout', { timeSinceHeartbeat });
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopHeartbeat();
    this.messageHandlers.clear();
    this.removeAllListeners();
  }

  /**
   * Close connection
   */
  close(graceful = true) {
    if (graceful) {
      this.send({ type: 'shutdown', graceful: true });
      setTimeout(() => {
        if (!this.process.killed) {
          this.process.kill('SIGTERM');
        }
      }, 1000);
    } else {
      this.process.kill('SIGKILL');
    }

    this.cleanup();
  }
}

/**
 * IPC Manager
 * Manages multiple IPC connections
 */
class IPCManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
  }

  /**
   * Create connection for process
   */
  createConnection(id, process, options) {
    const connection = new IPCConnection(process, options);

    // Forward events
    connection.on('message', (msg) => this.emit('message', { id, message: msg }));
    connection.on('error', (err) => this.emit('error', { id, error: err }));
    connection.on('exit', (info) => {
      this.emit('exit', { id, ...info });
      this.connections.delete(id);
    });

    this.connections.set(id, connection);
    return connection;
  }

  /**
   * Get connection by ID
   */
  get(id) {
    return this.connections.get(id);
  }

  /**
   * Send message to specific connection
   */
  send(id, message) {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new Error(`No connection for ${id}`);
    }
    connection.send(message);
  }

  /**
   * Broadcast message to all connections
   */
  broadcast(message, filter = null) {
    for (const [id, connection] of this.connections) {
      if (!filter || filter(id, connection)) {
        connection.send(message);
      }
    }
  }

  /**
   * Close connection
   */
  close(id, graceful = true) {
    const connection = this.connections.get(id);
    if (connection) {
      connection.close(graceful);
      this.connections.delete(id);
    }
  }

  /**
   * Close all connections
   */
  closeAll(graceful = true) {
    for (const [id] of this.connections) {
      this.close(id, graceful);
    }
  }

  /**
   * Get all connection IDs
   */
  getAllIds() {
    return Array.from(this.connections.keys());
  }

  /**
   * Get connection count
   */
  count() {
    return this.connections.size;
  }
}

// Export
module.exports = {
  IPCConnection,
  IPCManager
};

// CLI test interface
if (require.main === module) {
  const { spawn } = require('child_process');
  const { createHeartbeatMessage } = require('./messages.js');

  // Example: Echo server test
  const echoProcess = spawn('node', ['-e', `
    process.stdin.on('data', (data) => {
      const lines = data.toString().split('\\n');
      for (const line of lines) {
        if (line.trim()) {
          const msg = JSON.parse(line);
          console.log(JSON.stringify({ echo: msg, timestamp: new Date().toISOString() }));
        }
      }
    });
  `]);

  const conn = new IPCConnection(echoProcess);

  conn.on('message', (msg) => {
    console.log('Received:', msg);
  });

  conn.on('error', (err) => {
    console.error('Error:', err);
  });

  // Send test message
  conn.send(createHeartbeatMessage('test'));

  setTimeout(() => {
    conn.close();
    process.exit(0);
  }, 2000);
}
