#!/usr/bin/env node

/**
 * State Schema Validation
 *
 * JSON schema validation for all JANBAM data structures.
 */

/**
 * Being State Schema
 */
const beingStateSchema = {
  type: 'object',
  required: ['id', 'name', 'emotions', 'beliefs', 'worldModel'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    created: { type: 'string' },
    currentWorld: { type: ['string', 'null'] },
    location: { type: ['string', 'null'] },

    emotions: {
      type: 'object',
      properties: {
        joy: { type: 'number', minimum: 0, maximum: 1 },
        trust: { type: 'number', minimum: 0, maximum: 1 },
        fear: { type: 'number', minimum: 0, maximum: 1 },
        surprise: { type: 'number', minimum: 0, maximum: 1 },
        sadness: { type: 'number', minimum: 0, maximum: 1 },
        disgust: { type: 'number', minimum: 0, maximum: 1 },
        anger: { type: 'number', minimum: 0, maximum: 1 },
        anticipation: { type: 'number', minimum: 0, maximum: 1 }
      }
    },

    beliefs: { type: 'object' },
    worldModel: { type: 'object' },
    goals: { type: 'object' },
    traits: { type: 'object' },
    capabilities: { type: 'object' },
    status: { type: 'object' }
  }
};

/**
 * Being Memory Schema
 */
const beingMemorySchema = {
  type: 'object',
  required: ['experiences', 'relationships'],
  properties: {
    experiences: { type: 'array' },
    relationships: { type: 'object' },
    episodicMemory: { type: 'object' },
    semanticMemory: { type: 'object' },
    emotionalMemory: { type: 'object' }
  }
};

/**
 * Being IFS Schema
 */
const beingIFSSchema = {
  type: 'object',
  required: ['parts', 'self'],
  properties: {
    parts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'role'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          voice: { type: 'string' },
          activation_triggers: { type: 'array' },
          relationships: { type: 'object' },
          strength: { type: 'number', minimum: 0, maximum: 1 }
        }
      }
    },
    self: { type: 'object' },
    dialogHistory: { type: 'array' }
  }
};

/**
 * World State Schema
 */
const worldStateSchema = {
  type: 'object',
  required: ['id', 'name', 'locations'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    created: { type: 'string' },
    genre: { type: 'string' },
    time: { type: 'object' },
    locations: { type: 'object' },
    items: { type: 'object' },
    environment: { type: 'object' },
    portals: { type: 'object' },
    eventHistory: { type: 'array' }
  }
};

/**
 * Simple schema validator
 * (In production, use library like Ajv)
 */
function validate(data, schema) {
  const errors = [];

  function check(value, schemaNode, path = '') {
    // Check type
    if (schemaNode.type) {
      const types = Array.isArray(schemaNode.type) ? schemaNode.type : [schemaNode.type];
      const actualType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;

      if (!types.includes(actualType)) {
        errors.push(`${path}: expected type ${schemaNode.type}, got ${actualType}`);
        return;
      }
    }

    // Check required properties
    if (schemaNode.required && typeof value === 'object' && !Array.isArray(value)) {
      for (const req of schemaNode.required) {
        if (!(req in value)) {
          errors.push(`${path}: missing required property '${req}'`);
        }
      }
    }

    // Check properties
    if (schemaNode.properties && typeof value === 'object' && !Array.isArray(value)) {
      for (const [key, propSchema] of Object.entries(schemaNode.properties)) {
        if (key in value) {
          check(value[key], propSchema, `${path}.${key}`);
        }
      }
    }

    // Check array items
    if (schemaNode.items && Array.isArray(value)) {
      value.forEach((item, i) => {
        check(item, schemaNode.items, `${path}[${i}]`);
      });
    }

    // Check min/max
    if (typeof value === 'number') {
      if (schemaNode.minimum !== undefined && value < schemaNode.minimum) {
        errors.push(`${path}: value ${value} below minimum ${schemaNode.minimum}`);
      }
      if (schemaNode.maximum !== undefined && value > schemaNode.maximum) {
        errors.push(`${path}: value ${value} above maximum ${schemaNode.maximum}`);
      }
    }
  }

  check(data, schema);

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Being state
 */
function validateBeingState(state) {
  return validate(state, beingStateSchema);
}

/**
 * Validate Being memory
 */
function validateBeingMemory(memory) {
  return validate(memory, beingMemorySchema);
}

/**
 * Validate Being IFS
 */
function validateBeingIFS(ifs) {
  return validate(ifs, beingIFSSchema);
}

/**
 * Validate world state
 */
function validateWorldState(state) {
  return validate(state, worldStateSchema);
}

// Export
module.exports = {
  validateBeingState,
  validateBeingMemory,
  validateBeingIFS,
  validateWorldState,
  validate,
  schemas: {
    beingState: beingStateSchema,
    beingMemory: beingMemorySchema,
    beingIFS: beingIFSSchema,
    worldState: worldStateSchema
  }
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const schemaType = args[0];
  const filepath = args[1];

  if (!schemaType || !filepath) {
    console.log('Usage: validation.js <schema-type> <file>');
    console.log('Schema types: being-state, being-memory, being-ifs, world-state');
    process.exit(1);
  }

  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  let result;
  switch (schemaType) {
    case 'being-state':
      result = validateBeingState(data);
      break;
    case 'being-memory':
      result = validateBeingMemory(data);
      break;
    case 'being-ifs':
      result = validateBeingIFS(data);
      break;
    case 'world-state':
      result = validateWorldState(data);
      break;
    default:
      console.error('Unknown schema type:', schemaType);
      process.exit(1);
  }

  if (result.valid) {
    console.log('✅ Valid');
  } else {
    console.log('❌ Invalid:');
    result.errors.forEach(err => console.log(`  - ${err}`));
    process.exit(1);
  }
}
