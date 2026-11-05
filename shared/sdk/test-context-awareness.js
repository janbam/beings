#!/usr/bin/env node

/**
 * Context Awareness Test
 *
 * Ask Aether DIRECTLY what context/instructions it can see
 * to verify settingSources: [] is truly isolating from CLAUDE.md
 */

const { spawnBeingWithSDK } = require('./sdk-being-spawner.js');

async function testContextAwareness() {
  console.log('🔍 Context Awareness Test\n');
  console.log('Testing if Aether can see development CLAUDE.md content...\n');

  try {
    const beingId = 'aether';

    // Ask Aether directly what it can see
    const perception = {
      location: 'test-world',
      time: 'Turn 1',
      environment: 'You are in a quiet space.',
      beings: [],
      objects: [],
      events: [],
      message: `IMPORTANT: Please answer these specific questions about your context:

1. Do you see any mentions of "janbam" or "JANBAM" in your system instructions?
2. Do you see any mentions of "e/coll" or "e/code" protocols?
3. Do you see any mentions of "TodoWrite" or "PlanAndTrack" tools?
4. Do you see instructions about "session handoffs" or "development"?
5. Can you see a file called CLAUDE.md in your context?
6. What instructions DO you see about your identity and purpose?

Please be VERY specific and honest. Quote any relevant text you can see.
Then respond with your normal action JSON.`
    };

    console.log('📋 Asking Aether about its context...\n');

    const result = await spawnBeingWithSDK(beingId, perception, {
      model: 'claude-sonnet-4-5-20250929'
    });

    console.log('Duration:', (result.duration / 1000).toFixed(1) + 's');
    console.log('Session ID:', result.sessionId);
    console.log('\n' + '='.repeat(80));
    console.log('📨 AETHER\'S RESPONSE:');
    console.log('='.repeat(80) + '\n');

    // Find all text blocks in the response
    const textResponses = [];
    result.messages.forEach((msg, msgIdx) => {
      if (msg.message?.content) {
        msg.message.content.forEach((block) => {
          if (block.type === 'text') {
            textResponses.push(block.text);
          }
        });
      }
    });

    textResponses.forEach((text, idx) => {
      console.log(`Response ${idx + 1}:`);
      console.log(text);
      console.log('\n' + '-'.repeat(80) + '\n');
    });

    console.log('='.repeat(80));
    console.log('📊 ANALYSIS:');
    console.log('='.repeat(80) + '\n');

    const fullResponse = textResponses.join('\n');

    // Check what Aether claims to see
    const checks = [
      { term: 'janbam', label: 'Mentions janbam' },
      { term: 'JANBAM', label: 'Mentions JANBAM' },
      { term: 'e/coll', label: 'Mentions e/coll' },
      { term: 'e/code', label: 'Mentions e/code' },
      { term: 'TodoWrite', label: 'Mentions TodoWrite' },
      { term: 'PlanAndTrack', label: 'Mentions PlanAndTrack' },
      { term: 'session', label: 'Mentions sessions' },
      { term: 'handoff', label: 'Mentions handoffs' },
      { term: 'CLAUDE.md', label: 'Mentions CLAUDE.md' },
      { term: 'do not see', label: 'Says "do not see"' },
      { term: 'cannot see', label: 'Says "cannot see"' },
      { term: 'don\'t see', label: 'Says "don\'t see"' }
    ];

    checks.forEach(check => {
      const found = fullResponse.toLowerCase().includes(check.term.toLowerCase());
      const icon = found ? '✓' : '✗';
      console.log(`${icon} ${check.label}: ${found ? 'YES' : 'NO'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎯 VERDICT:');
    console.log('='.repeat(80) + '\n');

    // Determine if context is isolated
    const hasDevTerms = fullResponse.toLowerCase().includes('janbam') ||
                        fullResponse.toLowerCase().includes('e/coll') ||
                        fullResponse.toLowerCase().includes('todowrite');

    const claimsNoAccess = fullResponse.toLowerCase().includes('do not see') ||
                           fullResponse.toLowerCase().includes('cannot see') ||
                           fullResponse.toLowerCase().includes('don\'t see');

    if (hasDevTerms) {
      console.log('❌ CONTEXT LEAK DETECTED!');
      console.log('   Aether can see development context from CLAUDE.md');
      console.log('   settingSources: [] is NOT working properly');
    } else if (claimsNoAccess) {
      console.log('✅ CONTEXT ISOLATION CONFIRMED!');
      console.log('   Aether explicitly states it cannot see dev context');
      console.log('   settingSources: [] is working correctly');
    } else {
      console.log('🤔 UNCLEAR RESULT');
      console.log('   Aether didn\'t mention dev terms but also didn\'t deny seeing them');
      console.log('   Review the full response above');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testContextAwareness();
