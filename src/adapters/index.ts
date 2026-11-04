import type { Adapter } from "../core/doctor.js";
import { claudeCode } from "./claude-code/config.js";
import { codex } from "./codex/config.js";
import { opencode } from "./opencode/config.js";

/** Every harness `doctor` checks, in step 2's order. */
export const adapters: readonly Adapter[] = [claudeCode, codex, opencode];
