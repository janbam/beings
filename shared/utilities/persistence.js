#!/usr/bin/env node

/**
 * State Persistence Layer
 *
 * Provides atomic file operations with locking for safe concurrent access.
 * Used by all Beings and world state management.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const renameAsync = promisify(fs.rename);
const unlinkAsync = promisify(fs.unlink);

// Lock file tracking
const locks = new Map();

// Configuration
const LOCK_TIMEOUT = 30000; // 30 seconds
const LOCK_RETRY_DELAY = 100; // 100ms
const MAX_RETRIES = 50;
const BACKUP_COUNT = 10; // Keep last N backups

/**
 * Acquire lock for file
 *
 * @param {string} filepath - File to lock
 * @param {number} timeout - Lock timeout in ms
 * @returns {Promise<string>} Lock ID
 */
async function acquireLock(filepath, timeout = LOCK_TIMEOUT) {
  const lockFile = filepath + '.lock';
  const lockId = Date.now() + '-' + Math.random().toString(36);
  const deadline = Date.now() + timeout;

  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      // Try to create lock file (exclusive)
      await writeFileAsync(lockFile, lockId, { flag: 'wx' });

      // Success - store lock info
      locks.set(filepath, {
        id: lockId,
        acquired: Date.now(),
        lockFile
      });

      return lockId;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }

      // Lock exists - check if stale
      try {
        const existingLockId = await readFileAsync(lockFile, 'utf8');
        const lockStat = fs.statSync(lockFile);
        const lockAge = Date.now() - lockStat.mtimeMs;

        if (lockAge > LOCK_TIMEOUT) {
          // Stale lock - remove it
          console.warn(`Removing stale lock: ${lockFile} (age: ${lockAge}ms)`);
          await unlinkAsync(lockFile);
          continue;
        }
      } catch (e) {
        // Lock file disappeared - try again
        continue;
      }

      // Check timeout
      if (Date.now() >= deadline) {
        throw new Error(`Failed to acquire lock for ${filepath} after ${timeout}ms`);
      }

      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_DELAY));
      retries++;
    }
  }

  throw new Error(`Failed to acquire lock for ${filepath} after ${MAX_RETRIES} retries`);
}

/**
 * Release lock
 *
 * @param {string} filepath - File to unlock
 * @param {string} lockId - Lock ID from acquireLock
 */
async function releaseLock(filepath, lockId) {
  const lockInfo = locks.get(filepath);

  if (!lockInfo) {
    console.warn(`No lock info for ${filepath}`);
    return;
  }

  if (lockInfo.id !== lockId) {
    console.warn(`Lock ID mismatch for ${filepath}: expected ${lockInfo.id}, got ${lockId}`);
    return;
  }

  try {
    await unlinkAsync(lockInfo.lockFile);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Failed to remove lock file ${lockInfo.lockFile}:`, error);
    }
  }

  locks.delete(filepath);
}

/**
 * Atomic read with locking
 *
 * @param {string} filepath - File to read
 * @param {Object} options - Options
 * @returns {Promise<Object>} Parsed JSON data
 */
async function readJSON(filepath, options = {}) {
  const useLock = options.lock !== false;

  let lockId;
  if (useLock) {
    lockId = await acquireLock(filepath);
  }

  try {
    const data = await readFileAsync(filepath, 'utf8');
    return JSON.parse(data);
  } finally {
    if (useLock && lockId) {
      await releaseLock(filepath, lockId);
    }
  }
}

/**
 * Atomic write with locking and backup
 *
 * Uses temp file + rename for atomicity
 *
 * @param {string} filepath - File to write
 * @param {Object} data - Data to write
 * @param {Object} options - Options
 */
async function writeJSON(filepath, data, options = {}) {
  const useLock = options.lock !== false;
  const createBackup = options.backup !== false;

  let lockId;
  if (useLock) {
    lockId = await acquireLock(filepath);
  }

  try {
    // Create backup if file exists
    if (createBackup && fs.existsSync(filepath)) {
      await createBackupFile(filepath);
    }

    // Write to temp file
    const tempFile = filepath + '.tmp';
    const jsonData = JSON.stringify(data, null, 2);
    await writeFileAsync(tempFile, jsonData, 'utf8');

    // Atomic rename
    await renameAsync(tempFile, filepath);
  } finally {
    if (useLock && lockId) {
      await releaseLock(filepath, lockId);
    }
  }
}

/**
 * Atomic update (read-modify-write)
 *
 * @param {string} filepath - File to update
 * @param {Function} updateFn - Function that receives data and returns updated data
 * @param {Object} options - Options
 */
async function updateJSON(filepath, updateFn, options = {}) {
  const lockId = await acquireLock(filepath);

  try {
    // Read current data
    let data;
    try {
      const content = await readFileAsync(filepath, 'utf8');
      data = JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        data = options.defaultValue || {};
      } else {
        throw error;
      }
    }

    // Apply update
    const updated = await updateFn(data);

    // Write atomically
    const tempFile = filepath + '.tmp';
    await writeFileAsync(tempFile, JSON.stringify(updated, null, 2), 'utf8');
    await renameAsync(tempFile, filepath);

    return updated;
  } finally {
    await releaseLock(filepath, lockId);
  }
}

/**
 * Create backup of file
 *
 * @param {string} filepath - File to backup
 */
async function createBackupFile(filepath) {
  const backupDir = path.join(path.dirname(filepath), '.backups');

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = path.basename(filepath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `${filename}.${timestamp}`);

  // Copy to backup
  await new Promise((resolve, reject) => {
    fs.copyFile(filepath, backupFile, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Rotate old backups
  await rotateBackups(backupDir, filename);
}

/**
 * Rotate backups, keeping only recent N
 *
 * @param {string} backupDir - Backup directory
 * @param {string} filename - Base filename
 */
async function rotateBackups(backupDir, filename) {
  const backupFiles = fs.readdirSync(backupDir)
    .filter(f => f.startsWith(filename))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      mtime: fs.statSync(path.join(backupDir, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime); // Newest first

  // Remove old backups beyond limit
  for (let i = BACKUP_COUNT; i < backupFiles.length; i++) {
    try {
      await unlinkAsync(backupFiles[i].path);
    } catch (error) {
      console.error(`Failed to remove old backup ${backupFiles[i].path}:`, error);
    }
  }
}

/**
 * Restore from backup
 *
 * @param {string} filepath - File to restore
 * @param {number} index - Backup index (0 = most recent)
 */
async function restoreFromBackup(filepath, index = 0) {
  const backupDir = path.join(path.dirname(filepath), '.backups');
  const filename = path.basename(filepath);

  const backupFiles = fs.readdirSync(backupDir)
    .filter(f => f.startsWith(filename))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      mtime: fs.statSync(path.join(backupDir, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime); // Newest first

  if (index >= backupFiles.length) {
    throw new Error(`Backup index ${index} out of range (only ${backupFiles.length} backups)`);
  }

  const backupFile = backupFiles[index];
  console.log(`Restoring from backup: ${backupFile.name}`);

  await new Promise((resolve, reject) => {
    fs.copyFile(backupFile.path, filepath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * List available backups
 *
 * @param {string} filepath - File to check backups for
 * @returns {Array} List of backup info
 */
function listBackups(filepath) {
  const backupDir = path.join(path.dirname(filepath), '.backups');

  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const filename = path.basename(filepath);

  return fs.readdirSync(backupDir)
    .filter(f => f.startsWith(filename))
    .map(f => {
      const stat = fs.statSync(path.join(backupDir, f));
      return {
        name: f,
        path: path.join(backupDir, f),
        created: stat.mtime,
        size: stat.size
      };
    })
    .sort((a, b) => b.created - a.created); // Newest first
}

// Export
module.exports = {
  acquireLock,
  releaseLock,
  readJSON,
  writeJSON,
  updateJSON,
  createBackupFile,
  restoreFromBackup,
  listBackups,
  LOCK_TIMEOUT,
  BACKUP_COUNT
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const filepath = args[1];

  (async () => {
    try {
      switch (command) {
        case 'read':
          const data = await readJSON(filepath);
          console.log(JSON.stringify(data, null, 2));
          break;

        case 'write':
          const jsonData = JSON.parse(args[2]);
          await writeJSON(filepath, jsonData);
          console.log('Written successfully');
          break;

        case 'backups':
          const backups = listBackups(filepath);
          console.log('Available backups:');
          backups.forEach((b, i) => {
            console.log(`  ${i}: ${b.name} (${b.created})`);
          });
          break;

        case 'restore':
          const index = parseInt(args[2]) || 0;
          await restoreFromBackup(filepath, index);
          console.log('Restored successfully');
          break;

        default:
          console.log('Usage:');
          console.log('  persistence.js read <file>');
          console.log('  persistence.js write <file> <json>');
          console.log('  persistence.js backups <file>');
          console.log('  persistence.js restore <file> [index]');
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}
