# Git Integration Strategy for JANBAM Worlds

## Decision: Hybrid Approach (Option C)

After analysis, JANBAM will use a **hybrid approach**:

- **Subdirectories for different worlds** (primary method)
- **Git branches for world versions/timelines** (optional advanced feature)

## Rationale

### Why Subdirectories as Primary

**Pros:**
- ✅ Simple and intuitive - worlds are visible in file tree
- ✅ Easy backup - just copy directory
- ✅ Multiple worlds accessible simultaneously
- ✅ No git checkout required to see world
- ✅ Works with standard file tools
- ✅ New users can understand immediately

**Cons:**
- ❌ Merging worlds requires custom tooling
- ❌ No built-in version history per world

### Why Git Branches as Optional Feature

**Pros:**
- ✅ Revolutionary: `git merge` to merge worlds!
- ✅ Built-in version history
- ✅ Branching for "what if" scenarios
- ✅ Compare world states via git diff

**Cons:**
- ❌ Requires git expertise
- ❌ Only one branch checked out at a time
- ❌ Switching worlds = git checkout (slower)
- ❌ Risk of merge conflicts
- ❌ Steep learning curve for new users

### Hybrid Solution

**Default: Subdirectories**
```
worlds/
├── fractured_realm/
├── tavern_tales/
└── mystery_mansion/
```

Each world is a normal directory with:
- world_state.json
- beings.json
- rules.js
- chronicle.md
- .git/ (optional, per-world repo)

**Advanced: Git Branch Mode**

For users who want it:
```bash
# Enable git branch mode for a world
janbam world create --git-branches fractured_realm

# This creates world on branch world/fractured_realm
# Switching worlds = git checkout world/other_world

# Merging worlds
git checkout world/fractured_realm
git merge world/tavern_tales  # Revolutionary!
```

## Implementation Plan

### Phase 1: Subdirectories (Now)
- ✅ Implement world creation in `worlds/` subdirectories
- ✅ Standard file-based world management
- ✅ No git dependencies

### Phase 2: Per-World Git (Later)
- Each world directory can optionally be a git repo
- `worlds/fractured_realm/.git/` tracks that world's history
- Commit world changes for version control
- Independent from main JANBAM repo

### Phase 3: Git Branch Mode (Future/Optional)
- Advanced feature for power users
- Configuration flag: `useGitBranches: true`
- Requires separate implementation
- Documentation for advanced users only

## World Merging

### Subdirectory Approach (Phase 1)
Custom merge tool:
```javascript
// shared/utilities/merge-worlds.js
function mergeWorlds(world1, world2) {
  // Combine locations
  // Merge beings registries
  // Resolve rule conflicts
  // Create narrative bridge in chronicle
  // Generate merged world
}
```

### Git Branch Approach (Phase 3)
Native git merge:
```bash
git checkout world/fractured_realm
git merge world/tavern_tales

# Conflict resolution for:
# - world_state.json (locations, items)
# - rules.js (choose one or merge logic)
# - chronicle.md (narrative merge - manual)
```

## Versioning Best Practices

### For Subdirectory Worlds

**World-level git repo** (optional but recommended):
```bash
cd worlds/fractured_realm
git init
git add .
git commit -m "Initial world state"

# Save snapshots
git commit -m "After dragon encounter"
git commit -m "Before major plot twist"

# Rollback if needed
git log
git checkout <commit-hash>
```

### For Git Branch Worlds

**Branch strategy**:
```
main - metaverse (all worlds connected?)
world/fractured_realm - World 1
world/tavern_tales - World 2
world/mystery_mansion - World 3
feature/dragon-expansion - Experimental changes
```

## Migration Path

Users can upgrade their world management:

1. **Start**: Subdirectory, no git
2. **Add version control**: `cd worlds/myworld && git init`
3. **Go advanced**: Convert to git branch mode (custom migration tool)

No forced complexity - opt-in as needed.

## Final Decision

**Primary Method: Subdirectories** (`worlds/{name}/`)
- Simple, visible, reliable
- Works for 95% of use cases
- No git expertise required

**Advanced Option: Git Branches** (future feature)
- For power users who want it
- Revolutionary world merging via git
- Optional, documented separately

**Hybrid Flexibility**
- Each world can independently choose versioning strategy
- Some worlds use git, others don't
- No system-wide requirement

## Implementation Status

- ✅ Phase 1: Subdirectory structure implemented
- ⏳ Phase 2: Per-world git (planned)
- ⏳ Phase 3: Git branch mode (future/optional)

---

**Conclusion**: Start simple (subdirectories), add power features (git) as optional advanced capabilities. Best of both worlds.
