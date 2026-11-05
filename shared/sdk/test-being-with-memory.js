#!/usr/bin/env node

/**
 * Integration Test: Being with Memory Tools
 *
 * Spawns a Being Claude instance and verifies it can use memory tools.
 */

const { spawnBeingWithSDK } = require('./sdk-being-spawner.js');

async function testBeingMemory() {
  console.log('🧪 Integration Test: Being with Memory Tools\n');

  try {
    const beingId = 'aether';

    // Create perception for turn 1
    const perception = {
      location: 'test-world',
      time: 'Turn 1',
      environment: 'You find yourself in a testing environment. This is a memory test.',
      beings: [],
      objects: [],
      events: [],
      message: 'IMPORTANT: Use your memory tool to check /memories directory, then create a file /memories/first-experience.md documenting this moment.'
    };

    console.log('📋 Spawning Aether with memory tools...\n');
    console.log(`Perception:`);
    console.log(`  Location: ${perception.location}`);
    console.log(`  Message: ${perception.message}\n`);

    const result = await spawnBeingWithSDK(beingId, perception, {
      model: 'claude-sonnet-4-5-20250929'
    });

    console.log('\n📊 Result:');
    console.log(`  Action: ${result.action.action}`);
    console.log(`  Target: ${result.action.target || 'N/A'}`);
    console.log(`  Details: ${result.action.details}`);
    console.log(`  Duration: ${(result.duration / 1000).toFixed(1)}s`);
    console.log(`  Session ID: ${result.sessionId}\n`);

    // Debug: Show EVERY message detail
    console.log('\n🔍 FULL MESSAGE DUMP:\n');
    if (result.messages && result.messages.length > 0) {
      for (let i = 0; i < result.messages.length; i++) {
        const msg = result.messages[i];
        console.log(`\n========== Message ${i + 1} ==========`);
        console.log(`Type: ${msg.type}`);
        console.log(`Session ID: ${msg.session_id || 'N/A'}`);

        if (msg.message) {
          console.log('\nMessage content:');
          const content = msg.message.content || [];
          for (let j = 0; j < content.length; j++) {
            const block = content[j];
            console.log(`\n  Block ${j + 1}:`);
            console.log(`    Type: ${block.type}`);

            if (block.type === 'thinking') {
              // Show first 200 chars of thinking
              const thinkingPreview = block.thinking?.substring(0, 200) || '';
              const hasMore = block.thinking?.length > 200;
              console.log(`    Thinking: ${thinkingPreview}${hasMore ? '...' : ''}`);
            }

            if (block.type === 'text') {
              console.log(`    Text:\n${block.text}`);
            }

            if (block.type === 'tool_use') {
              console.log(`    Tool: ${block.name}`);
              console.log(`    Tool ID: ${block.id}`);
              console.log(`    Input:`);
              console.log(JSON.stringify(block.input, null, 4));
            }

            if (block.type === 'tool_result') {
              console.log(`    Tool Result ID: ${block.tool_use_id}`);
              console.log(`    Content:`);
              console.log(JSON.stringify(block.content, null, 4));
            }
          }
        }

        console.log('\n' + '='.repeat(40));
      }
    } else {
      console.log('  (No messages returned)');
    }
    console.log('');

    // Check for memory tool usage in messages
    let memoryToolCalls = [];
    if (result.messages) {
      for (const msg of result.messages) {
        if (msg.message?.content) {
          for (const block of msg.message.content) {
            // Check for MCP memory tool: mcp__memory-{beingId}__memory
            if (block.type === 'tool_use' && block.name?.includes('__memory')) {
              memoryToolCalls.push({
                tool: block.name,
                command: block.input?.command,
                path: block.input?.path || block.input?.old_path
              });
            }
          }
        }
      }
    }

    console.log('\n📋 Memory Tool Usage Summary:');
    if (memoryToolCalls.length > 0) {
      console.log(`   ✅ ${memoryToolCalls.length} memory tool call(s) detected:`);
      memoryToolCalls.forEach((call, idx) => {
        console.log(`      ${idx + 1}. ${call.command} - ${call.path || '(no path)'}`);
      });
      console.log('\n   🎉 SUCCESS: Being used memory tools!\n');
    } else {
      console.log('   ⚠️  WARNING: Being did not use memory tools (check logs above)\n');
    }

    // Check memories directory
    const fs = require('fs');
    const path = require('path');
    const memoriesDir = path.join(__dirname, '../../beings/aether/memories');

    console.log('📁 Checking memories directory:');
    const files = fs.readdirSync(memoriesDir);
    if (files.length > 1) { // More than just .gitkeep
      console.log(`   Files created: ${files.filter(f => f !== '.gitkeep').join(', ')}`);
      console.log('   ✅ Memories were created!\n');
    } else {
      console.log('   (No memory files created yet)\n');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testBeingMemory();
