import { describe, expect, it } from "vitest";
import { run } from "./index.js";

function capture(args: string[]) {
  let out = "";
  let err = "";
  const code = run(args, {
    out: (text) => (out += text),
    err: (text) => (err += text),
  });
  return { code, out, err };
}

describe("agentfiles", () => {
  it("runs doctor", () => {
    expect(capture(["doctor"])).toEqual({
      code: 0,
      out: "nothing to check yet\n",
      err: "",
    });
  });

  it("runs doctor --fix", () => {
    expect(capture(["doctor", "--fix"]).code).toBe(0);
  });

  it("prints help and exits 0", () => {
    const { code, out } = capture(["--help"]);
    expect(code).toBe(0);
    expect(out).toContain("doctor");
  });

  it("exits 2 on a usage error", () => {
    expect(capture([]).code).toBe(2);
    expect(capture(["nope"]).code).toBe(2);
    expect(capture(["doctor", "--nope"]).code).toBe(2);
  });
});
