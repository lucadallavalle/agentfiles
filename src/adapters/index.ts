import type { Adapter } from "../core/doctor.js";
import { claudeCode } from "./claude-code/config.js";

/** Every harness `doctor` checks, in step 2's order. */
export const adapters: readonly Adapter[] = [claudeCode];
