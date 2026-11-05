#!/usr/bin/env node

/**
 * Being Creation System
 *
 * Creates a new Being from template with customized initial state.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BEINGS_DIR = path.join(__dirname, '../../beings');
const TEMPLATE_DIR = path.join(__dirname, '../templates/being-template');
const REGISTRY_FILE = path.join(BEINGS_DIR, 'registry.json');

/**
 * Create a new Being
 *
 * @param {string} name - Being's name
 * @param {string} worldId - Initial world (optional)
 * @param {Object} initialState - Custom initial state (optional)
 * @returns {Object} Created Being info
 */
function createBeing(name, worldId = null, initialState = {}) {
  // Generate Being ID
  const beingId = name.toLowerCase().replace(/\s+/g, '_');
  const beingDir = path.join(BEINGS_DIR, beingId);

  // Check if Being already exists
  if (fs.existsSync(beingDir)) {
    throw new Error(`Being '${name}' already exists at ${beingDir}`);
  }

  console.log(`Creating Being: ${name} (${beingId})`);

  // Copy template directory
  copyDirectory(TEMPLATE_DIR, beingDir);

  // Replace placeholders in files
  const timestamp = new Date().toISOString();
  const replacements = {
    '{{BEING_ID}}': beingId,
    '{{BEING_NAME}}': name,
    '{{TIMESTAMP}}': timestamp,
    '{{WORLDVIEW}}': initialState.worldview || 'Curious and open to experience'
  };

  replaceInFile(path.join(beingDir, 'state.json'), replacements);
  replaceInFile(path.join(beingDir, 'chronicle.md'), replacements);

  // Load and customize state
  const statePath = path.join(beingDir, 'state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  // Apply initial state customizations
  if (initialState.emotions) {
    state.emotions = { ...state.emotions, ...initialState.emotions };
  }
  if (initialState.traits) {
    state.traits = { ...state.traits, ...initialState.traits };
  }
  if (initialState.beliefs) {
    state.beliefs = { ...state.beliefs, ...initialState.beliefs };
  }
  if (initialState.capabilities) {
    state.capabilities = { ...state.capabilities, ...initialState.capabilities };
  }
  if (worldId) {
    state.currentWorld = worldId;
  }

  // Save customized state
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  // Customize IFS if provided
  if (initialState.ifs) {
    const ifsPath = path.join(beingDir, 'IFS.json');
    const ifs = JSON.parse(fs.readFileSync(ifsPath, 'utf8'));

    if (initialState.ifs.parts) {
      ifs.parts = initialState.ifs.parts;
    }

    fs.writeFileSync(ifsPath, JSON.stringify(ifs, null, 2));
  }

  // Register Being in central registry
  registerBeing({
    id: beingId,
    name: name,
    created: timestamp,
    directory: beingDir,
    currentWorld: worldId,
    status: 'created', // created, active, dormant, archived
    pid: null // Will be set when Claude instance spawns
  });

  console.log(`✅ Being created successfully!`);
  console.log(`   Directory: ${beingDir}`);
  console.log(`   To spawn: claude -p --project ${beingDir}`);

  return {
    id: beingId,
    name: name,
    directory: beingDir,
    state: state
  };
}

/**
 * Copy directory recursively
 */
function copyDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Replace placeholders in file
 */
function replaceInFile(filepath, replacements) {
  let content = fs.readFileSync(filepath, 'utf8');

  for (const [placeholder, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(placeholder, 'g'), value);
  }

  fs.writeFileSync(filepath, content);
}

/**
 * Register Being in central registry
 */
function registerBeing(beingInfo) {
  // Initialize registry if doesn't exist
  if (!fs.existsSync(REGISTRY_FILE)) {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify({ beings: [] }, null, 2));
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));

  // Add to registry
  registry.beings.push({
    ...beingInfo,
    lastActive: beingInfo.created
  });

  // Save registry
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

/**
 * Get Being from registry
 */
function getBeing(beingId) {
  if (!fs.existsSync(REGISTRY_FILE)) {
    return null;
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  return registry.beings.find(b => b.id === beingId);
}

/**
 * Get all Beings
 */
function getAllBeings() {
  if (!fs.existsSync(REGISTRY_FILE)) {
    return [];
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  return registry.beings;
}

/**
 * Get Beings in a specific world
 */
function getBeingsInWorld(worldId) {
  return getAllBeings().filter(b => b.currentWorld === worldId);
}

/**
 * Update Being in registry
 */
function updateBeingRegistry(beingId, updates) {
  if (!fs.existsSync(REGISTRY_FILE)) {
    throw new Error('Registry does not exist');
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  const index = registry.beings.findIndex(b => b.id === beingId);

  if (index === -1) {
    throw new Error(`Being ${beingId} not found in registry`);
  }

  registry.beings[index] = {
    ...registry.beings[index],
    ...updates,
    lastActive: new Date().toISOString()
  };

  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
  return registry.beings[index];
}

/**
 * Remove Being from registry (archive)
 */
function unregisterBeing(beingId) {
  if (!fs.existsSync(REGISTRY_FILE)) {
    return;
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  registry.beings = registry.beings.filter(b => b.id !== beingId);

  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

// Export functions
module.exports = {
  createBeing,
  getBeing,
  getAllBeings,
  getBeingsInWorld,
  updateBeingRegistry,
  unregisterBeing
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  create-being.js <name> [worldId] [options]');
    console.log('');
    console.log('Examples:');
    console.log('  create-being.js "Aether" fractured_realm');
    console.log('  create-being.js "Guardian" --curious');
    console.log('');
    console.log('Options:');
    console.log('  --curious      High openness trait');
    console.log('  --cautious     High conscientiousness');
    console.log('  --social       High extraversion');
    console.log('  --empathic     High empathy');
    process.exit(0);
  }

  const name = args[0];
  const worldId = args[1] && !args[1].startsWith('--') ? args[1] : null;

  // Parse options
  const initialState = {};

  if (args.includes('--curious')) {
    initialState.traits = { openness: 0.9 };
  }
  if (args.includes('--cautious')) {
    initialState.traits = { ...initialState.traits, conscientiousness: 0.9 };
  }
  if (args.includes('--social')) {
    initialState.traits = { ...initialState.traits, extraversion: 0.9 };
  }
  if (args.includes('--empathic')) {
    initialState.traits = { ...initialState.traits, empathy: 0.9 };
  }

  try {
    const being = createBeing(name, worldId, initialState);
    console.log('\n✨ Being created:', being.name);
    console.log('ID:', being.id);
    console.log('Directory:', being.directory);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}
