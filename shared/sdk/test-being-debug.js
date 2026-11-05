#!/usr/bin/env node

/**
 * ULTRA-DEBUG: Being with Memory Tools
 *
 * Shows EVERYTHING - no truncation, complete message dumps
 */

const { spawnBeingWithSDK } = require('./sdk-being-spawner.js');
const util = require('util');

// Configure util.inspect for complete output
const inspectOptions = {
  depth: null,           // Infinite depth
  maxArrayLength: null,  // Show all array elements
  maxStringLength: null, // Show complete strings
  breakLength: 120,      // Wider output
  compact: false         // Pretty formatting
};

function fullInspect(obj) {
  return util.inspect(obj, inspectOptions);
}

async function ultraDebugTest() {
  console.log('🔬 ULTRA-DEBUG: Being Memory Tools Test\n');
  console.log('=' .repeat(80));

  try {
    const beingId = 'aether';

    const perception = {
      location: 'test-world',
      time: 'Turn 1',
      environment: 'You find yourself in a testing environment. This is a memory test.',
      beings: [],
      objects: [],
      events: [],
      message: 'IMPORTANT: Use your memory tool to check /memories directory, then create a file /memories/test.md with content "Test successful!"'
    };

    console.log('\n📋 TEST CONFIGURATION');
    console.log('Being ID:', beingId);
    console.log('Perception:', fullInspect(perception));

    console.log('\n' + '='.repeat(80));
    console.log('🚀 SPAWNING BEING...\n');

    const startTime = Date.now();
    const result = await spawnBeingWithSDK(beingId, perception, {
      model: 'claude-sonnet-4-5-20250929'
    });
    const totalDuration = Date.now() - startTime;

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULT SUMMARY');
    console.log('Duration:', totalDuration + 'ms');
    console.log('Action:', fullInspect(result.action));
    console.log('Session ID:', result.sessionId);

    console.log('\n' + '='.repeat(80));
    console.log('📨 COMPLETE MESSAGE STREAM (' + result.messages.length + ' messages)');
    console.log('='.repeat(80));

    for (let i = 0; i < result.messages.length; i++) {
      const msg = result.messages[i];

      console.log(`\n┌─ MESSAGE ${i + 1}/${result.messages.length} ${'─'.repeat(60)}`);
      console.log('│ Type:', msg.type);
      console.log('│ Session ID:', msg.session_id || 'N/A');

      // Show ALL top-level properties
      const allKeys = Object.keys(msg);
      console.log('│ All properties:', allKeys.join(', '));

      if (msg.message) {
        console.log('│');
        console.log('│ MESSAGE OBJECT:');
        console.log('│ ' + fullInspect(msg.message).split('\n').join('\n│ '));
      }

      // Show any other properties we might be missing
      const otherProps = allKeys.filter(k => k !== 'type' && k !== 'session_id' && k !== 'message');
      if (otherProps.length > 0) {
        console.log('│');
        console.log('│ OTHER PROPERTIES:');
        otherProps.forEach(prop => {
          console.log('│ ' + prop + ':', fullInspect(msg[prop]).split('\n').join('\n│ '));
        });
      }

      console.log('└' + '─'.repeat(79));
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔍 ANALYSIS');
    console.log('='.repeat(80));

    // Count message types
    const typeCounts = {};
    result.messages.forEach(m => {
      typeCounts[m.type] = (typeCounts[m.type] || 0) + 1;
    });
    console.log('\nMessage type counts:', fullInspect(typeCounts));

    // Find all tool uses
    const toolUses = [];
    const thinkingBlocks = [];
    const textBlocks = [];

    result.messages.forEach((msg, msgIdx) => {
      if (msg.message?.content) {
        msg.message.content.forEach((block, blockIdx) => {
          if (block.type === 'tool_use') {
            toolUses.push({
              messageIndex: msgIdx,
              blockIndex: blockIdx,
              tool: block.name,
              input: block.input,
              id: block.id
            });
          }
          if (block.type === 'thinking') {
            thinkingBlocks.push({
              messageIndex: msgIdx,
              blockIndex: blockIdx,
              length: block.thinking?.length || 0,
              preview: block.thinking?.substring(0, 100) + '...'
            });
          }
          if (block.type === 'text') {
            textBlocks.push({
              messageIndex: msgIdx,
              blockIndex: blockIdx,
              length: block.text?.length || 0,
              preview: block.text?.substring(0, 100) + '...'
            });
          }
        });
      }
    });

    console.log('\n📞 Tool Calls:', toolUses.length);
    if (toolUses.length > 0) {
      console.log(fullInspect(toolUses));
    }

    console.log('\n💭 Thinking Blocks:', thinkingBlocks.length);
    if (thinkingBlocks.length > 0) {
      console.log(fullInspect(thinkingBlocks));
    }

    console.log('\n📝 Text Blocks:', textBlocks.length);
    if (textBlocks.length > 0) {
      console.log(fullInspect(textBlocks));
    }

    // Check for any signs of CLAUDE.md inheritance
    console.log('\n' + '='.repeat(80));
    console.log('🔍 CLAUDE.md INHERITANCE CHECK');
    console.log('='.repeat(80));

    const suspiciousTerms = [
      'janbam',
      'JANBAM',
      'e/coll',
      'e/code',
      'TodoWrite',
      'PlanAndTrack',
      'session',
      'handoff',
      'development',
      'testing environment'  // This is OK - it's in our perception
    ];

    let foundSuspicious = false;

    result.messages.forEach((msg, msgIdx) => {
      if (msg.message?.content) {
        msg.message.content.forEach((block, blockIdx) => {
          const textToSearch = block.thinking || block.text || '';

          suspiciousTerms.forEach(term => {
            if (textToSearch.toLowerCase().includes(term.toLowerCase())) {
              if (!foundSuspicious) {
                console.log('\n⚠️  SUSPICIOUS TERMS FOUND (possible CLAUDE.md leakage):');
                foundSuspicious = true;
              }
              console.log(`  - "${term}" in message ${msgIdx}, block ${blockIdx} (${block.type})`);

              // Show context
              const termIndex = textToSearch.toLowerCase().indexOf(term.toLowerCase());
              const start = Math.max(0, termIndex - 50);
              const end = Math.min(textToSearch.length, termIndex + term.length + 50);
              const context = textToSearch.substring(start, end);
              console.log(`    Context: ...${context}...`);
            }
          });
        });
      }
    });

    if (!foundSuspicious) {
      console.log('✅ No suspicious terms found - context appears isolated!');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ULTRA-DEBUG TEST COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

ultraDebugTest();
