# Copilot Instructions

## Long-Term Memory Bank

Use a root-level folder named `memory-bank` as a persistent memory system for agents.

### Memory file format
- Each memory must be a Markdown file in `memory-bank/`.
- File naming format: `N_MEMORY_NAME.md`
  - `N` = numerical memory ID (integer).
  - `MEMORY_NAME` = short, uppercase, underscore-separated domain label.
- Example: `1_AUTH_FLOWS.md`, `2_BILLING_RULES.md`.

### Memory scope and size
- Each memory is scoped to a specific domain.
- Keep entries brief and high-signal to avoid unnecessary context window usage.
- Prefer concise facts, constraints, and decisions over long narrative text.

### Living document requirements
Memories are living documents and must include timestamped edits as information changes.

Use this section in each memory file:

## Edit History
- `YYYY-MM-DDTHH:mm:ssZ` - Created or updated: <short note>

When updating a memory, append a new timestamped line rather than deleting prior history unless the content is sensitive or incorrect in a way that must be removed.

### Required workflow when doing any task
1. Consult relevant `memory-bank` files for task context.
2. Verify memory contents against the actual codebase before relying on them.
3. If code and memory conflict, treat code as source of truth and update memory.
4. If you make a code change that invalidates any memory, update the affected memory file(s) in the same work session.

### Consistency expectations
- Do not leave stale memory entries after behavior, APIs, configs, or architecture changes.
- Keep memory IDs stable; create a new ID for new domain memories instead of renumbering existing files.
- Prefer additive updates and clear deprecations over silent rewrites.
