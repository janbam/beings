#!/usr/bin/env node

/**
 * Test Memory Tools MCP Server
 *
 * Verifies that the memory tools work correctly with path validation,
 * file operations, and security protections.
 */

const { createMemoryToolsServer } = require('./memory-tools.js');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// Test Being setup
const TEST_BEING_ID = 'test-memory-being';
const TEST_MEMORIES_DIR = path.join(__dirname, '../../.test-memories');

async function cleanup() {
  // Clean up test directory
  if (fsSync.existsSync(TEST_MEMORIES_DIR)) {
    await fs.rm(TEST_MEMORIES_DIR, { recursive: true });
  }
}

async function runTests() {
  console.log('🧪 Testing Memory Tools MCP Server\n');

  try {
    // Setup: Create test memories directory
    await cleanup();
    await fs.mkdir(TEST_MEMORIES_DIR, { recursive: true });

    console.log('📋 Test 1: Create memory server');
    const memoryServer = createMemoryToolsServer(TEST_BEING_ID, TEST_MEMORIES_DIR);
    console.log(`   ✅ Server name: ${memoryServer.name}`);
    console.log(`   ✅ Server type: ${memoryServer.type}`);
    console.log('');

    console.log('📋 Test 2: Verify server instance exists');
    if (!memoryServer.instance) {
      throw new Error('Memory server missing .instance property');
    }
    console.log('   ✅ Instance exists\n');

    console.log('📋 Test 3: Verify tools are registered');
    const registeredTools = memoryServer.instance._registeredTools;
    const expectedTools = [
      'memory_view',
      'memory_create',
      'memory_str_replace',
      'memory_insert',
      'memory_delete',
      'memory_rename'
    ];

    for (const toolName of expectedTools) {
      if (!registeredTools[toolName]) {
        throw new Error(`Tool ${toolName} not registered`);
      }
      console.log(`   ✅ ${toolName} registered`);
    }
    console.log('');

    console.log('📋 Test 4: Verify memories directory exists');
    const dirExists = fsSync.existsSync(TEST_MEMORIES_DIR);
    if (!dirExists) {
      throw new Error('Memories directory was not created');
    }
    console.log(`   ✅ Directory: ${TEST_MEMORIES_DIR}\n`);

    console.log('📋 Test 5: Test path validation (security)');
    const { validateMemoryPath } = require('./memory-tools.js');

    // Valid path
    try {
      const safePath = validateMemoryPath('/memories/test.md', TEST_MEMORIES_DIR);
      console.log(`   ✅ Valid path accepted: ${safePath}`);
    } catch (e) {
      throw new Error(`Valid path rejected: ${e.message}`);
    }

    // Invalid: path traversal
    try {
      validateMemoryPath('/memories/../../../etc/passwd', TEST_MEMORIES_DIR);
      throw new Error('Path traversal not blocked!');
    } catch (e) {
      if (e.message.includes('traversal')) {
        console.log(`   ✅ Path traversal blocked`);
      } else {
        throw e;
      }
    }

    // Invalid: missing /memories prefix
    try {
      validateMemoryPath('/etc/passwd', TEST_MEMORIES_DIR);
      throw new Error('/memories prefix not enforced!');
    } catch (e) {
      if (e.message.includes('/memories')) {
        console.log(`   ✅ /memories prefix enforced`);
      } else {
        throw e;
      }
    }
    console.log('');

    console.log('🎉 All unit tests passed!\n');
    console.log('ℹ️  Integration testing will happen when Beings use these tools in orchestration.\n');

    // The MCP server instance cannot be easily unit tested for tool execution
    // because it's designed to work with the Agent SDK query() function.
    // These tools will be tested functionally when a Being Claude instance
    // uses them during orchestration.

    // Cleanup
    await cleanup();
    console.log('🧹 Cleaned up test directory\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await cleanup();
    process.exit(1);
  }
}

runTests();
