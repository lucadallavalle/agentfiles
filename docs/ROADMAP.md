# Roadmap

In order; each step is one small PR. D-numbers refer to [ADR-001](adr/ADR-001_general-design.md). "Needs" are open questions to settle first; "Depends" are spiral-review features agentfiles waits for (D6), not works around.

## Planned work

- [x] **1. Foundations:** README, AGENTS.md, this roadmap, decision log, ADR-001; common documentation imported from spiral-review (D7); `grill` moved to `skills/`.
- [ ] **2. Packaging** (D2, D3): one user-level plugin per harness carrying the skills (later hooks and commands); replaces the skill links of `install.sh` and removes them. This repo's git hooks are enabled by a `prepare` script in `package.json` (`pnpm install`); then `install.sh` and `.githooks/post-merge` are deleted.
  - Verified 2026-10-31 from official docs (code.claude.com, developers.openai.com, opencode.ai/v2) and the Claude Code 2.1.302 and OpenCode 2.0.32 CLIs; Codex CLI not installed here:
    - Claude Code: marketplace `.claude-plugin/marketplace.json`; a plugin may be the marketplace root (`"source": "./"`), loading root `skills/`; `.claude-plugin/plugin.json` optional (the entry is the manifest). Skills namespaced `/<plugin>:<skill>`. No `version` → version is the commit SHA; third-party marketplaces don't auto-update by default. Install: `claude plugin install <plugin> --marketplace <owner/repo> -s user`. Check: `claude plugin validate --strict`.
    - Codex: portable manifest `plugin.json` at the plugin root (Agent Plugins schema), `.codex-plugin/plugin.json` as fallback; skills from root `skills/`. Marketplaces: `.agents/plugins/marketplace.json` (repo), `~/.agents/plugins/marketplace.json` (personal), `.claude-plugin/marketplace.json` (legacy-compatible). Install: `codex plugin marketplace add <owner/repo>`, then `codex plugin add <plugin>@<marketplace>`. Hooks `hooks/hooks.json`, on by default (`[features].hooks`); each hook runs only after the user trusts it. Codex loading a Claude-only `.claude-plugin/plugin.json` is undocumented.
    - OpenCode: loads `SKILL.md` from `~/.config/opencode/skills`, `~/.claude/skills`, `~/.agents/skills`, extra `skills` config entries (paths or HTTP catalogs). Skill IDs are flat (no namespace; later source wins). Plugins are npm or git JS packages (`opencode plugin add github:<owner/repo>`); a server plugin adds skills only through code (`ctx.skill.transform`).
    - `disable-model-invocation: true`: Claude Code and OpenCode honor it (OpenCode: `@skill-id` loads it by hand); Codex needs `agents/openai.yaml` in the skill with `policy.allow_implicit_invocation: false` (`$skill` still works).
  - Decided (layout, names, versioning, OpenCode plugin, skill IDs): [decision log](decisions.md). Needs: generated or hand-written manifests; manifest validation in the gate.
  - Depends: spiral-review `init` installs its own plugin; the two plugins must not collide (skill and command names, hook order).
- [ ] **3. User-level config** (D3, D4): global instructions (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md` (path unverified), OpenCode's equivalent), settings, permissions, hooks and MCP servers per harness.
  - Needs: merge mechanism that never clobbers local edits (managed blocks in Markdown, owned-key tracking in JSON/TOML with a state file, or the harness's own include/import where it has one); what goes in the plugin vs in settings (Claude Code plugins can carry hooks and MCP servers); secrets as environment references only (public repo, D9); one neutral permissions model or per-harness lists.
  - Depends: spiral-review user-level config (`~/.config/spiral-review`): planned, not in its MVP.
- [ ] **4. CLI `agentfiles`** (D5, D8): TypeScript scaffold with the full gate, then:
  - `bootstrap`: one non-interactive command on a fresh or cloud machine: prerequisites, plugins (step 2), user-level config (step 3), spiral-review install and `spiral-review init` per harness it supports (Claude Code first).
  - `attach`: any repo, nothing committed (D1).
  - `scaffold`: owned repos; writes and commits `AGENTS.md`, the docs structure with the common documentation, and spiral-review repo config.
  - `doctor` / `doctor --fix`: drift between this repo and the machine or a repo, including stale copies of the common documentation in owned repos. Edited copies are only reported, never overwritten (D7).
  - Needs: how `bootstrap` gets Node 24 for `npx` on a bare machine; pin `npx github:…#<tag>` or run `main`; what `attach` must write at all once plugins and user-level config exist; skills such as `grill` read `docs/documentation/` from the repo, which foreign repos lack (ship the common documentation in the plugin?); whether hosted sessions (e.g. Claude Code on the web) can run `bootstrap` at all.
  - Depends:
    - spiral-review on npm or otherwise installable without credentials (today: private repo, to be made public; version 0.0.0, not on npm).
    - spiral-review R14, scriptable and idempotent `init` with per-harness flags. Not yet in its roadmap (it ends at R12).
    - spiral-review R13, user-level config and `.git/info/exclude` for foreign repos, needed by `attach`. Not yet in its roadmap.
    - spiral-review repo config: `.spiral-review.toml` exists in its design; the instructions file name (`REVIEW.md`) is still open there. `scaffold` must get both from spiral-review, not write them itself.
- [ ] **5. More skills:** only after a step of the development process has been repeated by hand, so the skill encodes real practice.

## Later

- spiral-review consumes the common documentation from here (D7); its own copy is replaced then.
