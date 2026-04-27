import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(repoRoot, "appsscript.json"), "utf8"));

// The exact scope set the Marketplace listing was approved against.
// If you change this list you MUST also update, in lockstep:
//   - Google Auth platform → Data Access (in the GCP console)
//   - Workspace Marketplace SDK → App Configuration → OAuth scopes
// Mismatch is the most common Marketplace-review failure mode.
const APPROVED_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.currentonly",
  "https://www.googleapis.com/auth/script.external_request",
  "https://www.googleapis.com/auth/script.container.ui",
];

describe("appsscript.json manifest", () => {
  it("declares exactly the approved OAuth scopes", () => {
    expect([...manifest.oauthScopes].sort()).toEqual([...APPROVED_SCOPES].sort());
  });

  it("does not request the broader spreadsheets scope", () => {
    expect(manifest.oauthScopes).not.toContain("https://www.googleapis.com/auth/spreadsheets");
  });

  it("does not request any Drive scopes", () => {
    const driveScopes = manifest.oauthScopes.filter((s) => s.includes("/auth/drive"));
    expect(driveScopes).toEqual([]);
  });

  it("uses the V8 runtime", () => {
    expect(manifest.runtimeVersion).toBe("V8");
  });
});
