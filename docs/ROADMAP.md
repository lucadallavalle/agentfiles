# Roadmap

In order; each step is one small PR. D-numbers refer to [ADR-001](adr/ADR-001_general-design.md). "Needs" are open questions to settle first; "Depends" are spiral-review features agentfiles waits for (D6), not works around.

## Planned work

- [x] **1. Foundations:** README, AGENTS.md, this roadmap, decision log, ADR-001; common documentation imported from spiral-review (D7); `grill` moved to `skills/`.
- [ ] **2. Packaging** (D2, D3): one user-level plugin per harness carrying the skills (later hooks and commands); replaces `install.sh` and removes the links it made.
  - Needs, verified from official docs only:
    - Claude Code: plugin and marketplace format; non-interactive install (`claude plugin …`) for `bootstrap`.
    - OpenCode: does it load `SKILL.md` skills, from where? If not: commands or `AGENTS.md` as the fallback, documented as a gap.
    - Codex: `.codex-plugin/plugin.json`, the personal marketplace `~/.agents/plugins/marketplace.json`, the shared `.agents/skills/` path, `hooks.json` and its feature flag. Sources so far are third-party blogs.
    - Equivalent of `disable-model-invocation` per harness (Codex may use `agents/openai.yaml` with `policy.allow_implicit_invocation: false`; unverified).
    - Generated or hand-written manifests; if generated, committed and checked for staleness by the gate.
    - One repo serving as marketplace for all harnesses, or a generated tree per harness.
  - Depends: spiral-review `init` installs its own plugin; the two plugins must not collide (skill and command names, hook order).
- [ ] **3. User-level config** (D3, D4): global instructions (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md` (path unverified), OpenCode's equivalent), settings, permissions, hooks and MCP servers per harness.
  - Needs: merge mechanism that never clobbers local edits (managed blocks in Markdown, owned-key tracking in JSON/TOML with a state file, or the harness's own include/import where it has one); what goes in the plugin vs in settings (Claude Code plugins can carry hooks and MCP servers); secrets as environment references only (public repo, D9); one neutral permissions model or per-harness lists.
  - Depends: spiral-review user-level config (`~/.config/spiral-review`): planned, not in its MVP.
- [ ] **4. CLI `agentfiles`** (D5, D8): TypeScript scaffold with the full gate, then:
  - `bootstrap`: one non-interactive command on a fresh or cloud machine: prerequisites, plugins (step 2), user-level config (step 3), spiral-review install and `spiral-review init` per harness it supports (Claude Code first).
  - `attach`: any repo, nothing committed (D1).
  - `scaffold`: owned repos; writes and commits `AGENTS.md`, the docs structure with the common documentation, and spiral-review repo config.
  - `doctor` / `doctor --fix`: drift between this repo and the machine or a repo, including stale copies of the common documentation in owned repos.
  - Needs: how `bootstrap` gets Node 24 for `npx` on a bare machine; pin `npx github:…#<tag>` or run `main`; what `attach` must write at all once plugins and user-level config exist; skills such as `grill` read `docs/documentation/` from the repo, which foreign repos lack (ship the common documentation in the plugin?); `doctor --fix` when an owned repo edited its copy of the common documentation (report only?); whether hosted sessions (e.g. Claude Code on the web) can run `bootstrap` at all.
  - Depends:
    - spiral-review on npm or otherwise installable without credentials (today: private repo, to be made public; version 0.0.0, not on npm).
    - spiral-review R14, scriptable and idempotent `init` with per-harness flags. Not yet in its roadmap (it ends at R12).
    - spiral-review R13, user-level config and `.git/info/exclude` for foreign repos, needed by `attach`. Not yet in its roadmap.
    - spiral-review repo config: `.spiral-review.toml` exists in its design; the instructions file name (`REVIEW.md`) is still open there. `scaffold` must get both from spiral-review, not write them itself.
- [ ] **5. More skills:** only after a step of the development process has been repeated by hand, so the skill encodes real practice.

## Later

- spiral-review consumes the common documentation from here (D7); its own copy is replaced then.
