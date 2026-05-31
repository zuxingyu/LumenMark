import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("updater release configuration", () => {
  it("enables signed updater artifacts without committing private key material", () => {
    const tauriConfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
    const workflow = readFileSync(".github/workflows/release.yml", "utf8");

    expect(tauriConfig.bundle.createUpdaterArtifacts).toBe(true);
    expect(tauriConfig.plugins.updater.pubkey).toMatch(/^dW50cnVzdGVk/);
    expect(tauriConfig.plugins.updater.endpoints).toEqual([
      "https://github.com/zuxingyu/LumenMark/releases/latest/download/latest.json",
    ]);
    expect(workflow).toContain("TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}");
    expect(workflow).toContain("--target aarch64-apple-darwin --bundles app,dmg");
    expect(workflow).not.toContain("PRIVATE KEY-----");
  });
});
