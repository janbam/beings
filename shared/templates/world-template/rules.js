#!/usr/bin/env node

/**
 * World Rules - {{WORLD_NAME}}
 *
 * Defines the physics, mechanics, and logic specific to this world.
 * World Creator uses these rules to validate actions and determine consequences.
 */

/**
 * Physics Rules
 */
const physics = {
  gravity: true,
  dimensions: 3,
  timeFlow: 'forward', // forward, reverse, variable, nonlinear

  validate(action) {
    // Check if action violates physics
    return { valid: true };
  }
};

/**
 * Magic System (if applicable)
 */
const magic = {
  exists: false,
  type: null, // 'elemental', 'verbal', 'ritual', 'innate', etc.
  rules: {},

  canCast(being, spell) {
    if (!this.exists) return false;
    // Check if being can cast spell
    return false;
  },

  cast(being, spell, target) {
    // Resolve magic effect
    return { success: false };
  }
};

/**
 * Technology Level
 */
const technology = {
  level: 'medieval', // stone-age, medieval, industrial, modern, futuristic, post-apocalyptic
  available: [],

  canUse(being, technology) {
    return this.available.includes(technology);
  }
};

/**
 * Social Rules
 */
const social = {
  taboos: [],
  customs: [],
  laws: [],

  violates(action) {
    // Check if action violates social rules
    return { violation: false };
  }
};

/**
 * Action Validation
 * Called by World Creator to validate Being actions
 */
function validateAction(being, action, worldState) {
  const results = {
    valid: true,
    reasons: [],
    consequences: []
  };

  // Check physics
  const physicsCheck = physics.validate(action);
  if (!physicsCheck.valid) {
    results.valid = false;
    results.reasons.push(`Physics violation: ${physicsCheck.reason}`);
  }

  // Check magic (if applicable)
  if (action.type === 'cast_spell' && !magic.exists) {
    results.valid = false;
    results.reasons.push('Magic does not exist in this world');
  }

  // Check capabilities
  if (action.type === 'fly' && !being.capabilities.canFly) {
    results.valid = false;
    results.reasons.push('Being cannot fly');
  }

  // Check location
  const beingLocation = worldState.beingLocations[being.id];
  if (!beingLocation) {
    results.valid = false;
    results.reasons.push('Being not in world');
  }

  return results;
}

/**
 * Consequence Resolution
 * Determines what happens as a result of an action
 */
function resolveConsequences(being, action, worldState) {
  const consequences = {
    stateChanges: {},
    events: [],
    perceptionUpdates: []
  };

  // Implement world-specific consequence logic
  switch (action.type) {
    case 'move':
      consequences.stateChanges.beingLocation = action.destination;
      consequences.events.push({
        type: 'movement',
        being: being.id,
        from: worldState.beingLocations[being.id],
        to: action.destination
      });
      break;

    case 'speak':
      consequences.events.push({
        type: 'speech',
        being: being.id,
        message: action.message,
        audibleTo: getNearbyBeings(being, worldState)
      });
      break;

    // Add more action types as needed
  }

  return consequences;
}

/**
 * Helper: Get nearby Beings
 */
function getNearbyBeings(being, worldState) {
  const beingLocation = worldState.beingLocations[being.id];
  return Object.entries(worldState.beingLocations)
    .filter(([id, loc]) => id !== being.id && loc === beingLocation)
    .map(([id]) => id);
}

/**
 * World-Specific Rules
 * Add custom rules here
 */
const customRules = {
  // Example: Day/night cycle affects certain actions
  isDaytime(worldState) {
    const hour = parseInt(worldState.time.current.match(/Hour (\d+)/)[1]);
    return hour >= 6 && hour < 18;
  }
};

// Export
module.exports = {
  physics,
  magic,
  technology,
  social,
  validateAction,
  resolveConsequences,
  customRules
};

// CLI interface
if (require.main === module) {
  console.log('World Rules - {{WORLD_NAME}}');
  console.log('\nPhysics:', physics);
  console.log('\nMagic:', magic);
  console.log('\nTechnology:', technology);
  console.log('\nSocial:', social);
}
