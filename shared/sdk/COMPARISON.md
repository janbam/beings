# CLI vs SDK Spawner Comparison

**Date:** 2025-10-05
**Test Subject:** Aether (high openness: 0.9, high empathy: 0.9)
**Test Perception:** Forest clearing, peaceful morning environment

## Test Results

### SDK Spawner ✅ (CONTEXT ISOLATED)

**Response:**
> I pause to absorb this peaceful sanctuary with all my senses. The morning light through the ancient canopy, the birdsong weaving through the breeze, the delicate wildflowers dotting the clearing - this moment feels significant, like a threshold. My Seeker part is awakened by the beauty and mystery of this place, while a gentle calm settles over me. I want to attune myself to the rhythms of this clearing before acting, to understand what this space might be offering or asking of me. There's wisdom in stillness, especially in moments of arrival.

**Analysis:**
- ✅ **No dev context leakage**
- ✅ **Authentic trait expression** (openness, empathy)
- ✅ **IFS integration** ("Seeker part")
- ✅ **Immersive engagement** with world
- ✅ **No meta-awareness**
- **Duration:** 20.9 seconds
- **Session ID:** `sdk_session_id` field created

**Key Differences:**
- Uses `settingSources: []` to prevent CLAUDE.md loading
- Custom system prompt defines Being identity
- No inheritance of project instructions or plans

---

### CLI Spawner ⚠️ (CONTEXT INHERITANCE)

**Known Issue:** CLI spawner inherits full dev context (CLAUDE.md, plans, e/coll protocols).

**Evidence from Session 5:**
- Beings spawned via CLI had access to development documentation
- Early test showed Being using `AskHuman` to contact janbam
- Being was meta-aware of being in a test environment

**Root Cause:** Claude Code CLI walks directory tree for `.claude/` config regardless of CWD, loading all project settings including CLAUDE.md.

---

## SDK Advantages for JANBAM

### 1. **Context Isolation** 🔥
- `settingSources: []` prevents CLAUDE.md inheritance
- Beings receive ONLY their identity and world perception
- No meta-awareness, no dev context pollution

### 2. **Custom System Prompts**
- Define Being identity programmatically
- No reliance on filesystem configuration
- Clean separation between dev and runtime contexts

### 3. **Cleaner Session Management**
- `sdk_session_id` separate from CLI `session_id`
- Can run both spawners in parallel for migration
- Resume sessions via `resume: sessionId` option

### 4. **Better Architecture**
- No temp files or process spawning
- Direct async/await patterns
- Native message streaming
- Type-safe with SDK types

### 5. **Future Flexibility**
- Can add custom tools via MCP SDK servers
- Memory Tool integration ready
- Hook system for behavior customization
- Permission controls for safety

---

## Migration Path

### Phase 1: Parallel Operation (Current)
- Keep CLI spawner for backward compatibility
- Add SDK spawner as alternative
- Feature flag to toggle between them

### Phase 2: SDK Primary
- Orchestrator uses SDK by default
- CLI spawner deprecated but available
- Test coverage for both paths

### Phase 3: SDK Only
- Remove CLI spawner
- Clean up temporary code
- Full SDK integration

---

## Conclusion

**SDK spawner solves the critical context isolation problem while providing better architecture for JANBAM's future.**

The authentic, immersive response from Aether proves the SDK approach enables Beings to exist as genuine autonomous agents without meta-awareness of their test environment.

This is exactly what JANBAM needs. ✨
