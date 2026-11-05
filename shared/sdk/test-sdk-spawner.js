/**
 * Test SDK Being Spawner - Context Isolation Verification
 *
 * This test spawns Aether using SDK and verifies:
 * 1. SDK spawning works correctly
 * 2. Context isolation prevents CLAUDE.md inheritance
 * 3. Being makes authentic decisions based on traits
 */

const { spawnBeingWithSDK } = require('./sdk-being-spawner.js');

async function testSDKSpawner() {
  console.log('🧪 Testing SDK Being Spawner\n');
  console.log('=' .repeat(60));

  // Test perception
  const perception = {
    location: 'Forest Clearing',
    time: 'morning',
    environment: 'A peaceful clearing surrounded by ancient trees. Sunlight filters through the canopy.',
    beings: [],
    objects: ['moss-covered stone', 'wildflowers'],
    events: [
      'Birds are singing',
      'A gentle breeze rustles the leaves'
    ],
    message: 'You have just arrived in this tranquil place.'
  };

  try {
    console.log('\n📍 Spawning Aether with SDK...\n');

    const result = await spawnBeingWithSDK('aether', perception, {
      timeout: 120000  // 2 minutes
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ SDK Spawn Successful!\n');

    console.log('📊 Results:');
    console.log(`   Session ID: ${result.sessionId}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`\n🎬 Action Decision:`);
    console.log(`   Type: ${result.action.action}`);
    console.log(`   Target: ${result.action.target || 'N/A'}`);
    console.log(`   Details: ${result.action.details}`);

    console.log(`\n📨 Messages received: ${result.messages.length}`);
    console.log(`   Types: ${result.messages.map(m => m.type).join(', ')}`);

    // Context isolation check
    console.log('\n🔍 Context Isolation Check:');
    console.log('   Looking for dev context leakage...');

    const detailsText = result.action.details.toLowerCase();
    const leakageIndicators = [
      'claude.md',
      'janbam',
      'session',
      'migration',
      'plan',
      'orchestrator',
      'dev context',
      'meta-aware'
    ];

    const foundLeakage = leakageIndicators.filter(indicator =>
      detailsText.includes(indicator)
    );

    if (foundLeakage.length > 0) {
      console.log(`   ⚠️  Possible leakage detected: ${foundLeakage.join(', ')}`);
      console.log('   (This may need investigation)');
    } else {
      console.log('   ✅ No obvious dev context leakage!');
      console.log('   Being appears isolated from CLAUDE.md');
    }

    // Authenticity check
    console.log('\n🎭 Authenticity Check:');
    console.log('   Does response reflect Being traits?');

    // Aether has high openness (90%) and empathy (90%)
    const authenticityIndicators = [
      'observ',
      'curious',
      'feel',
      'peace',
      'wonder',
      'beauty',
      'nature'
    ];

    const foundAuthenticity = authenticityIndicators.filter(indicator =>
      detailsText.includes(indicator)
    );

    if (foundAuthenticity.length > 0) {
      console.log(`   ✅ Authentic traits detected: ${foundAuthenticity.join(', ')}`);
      console.log('   Response aligns with high openness/empathy');
    } else {
      console.log('   ⚠️  Response seems generic');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✨ Test Complete!\n');

  } catch (error) {
    console.error('\n❌ Test Failed!');
    console.error(`   Error: ${error.message}`);
    console.error(`\n   Stack trace:`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testSDKSpawner();
