import { describe, expect, it } from "vitest";
import { createOpenedSession, createUntitledSession, editSession, markSaved } from "./session";

describe("document session", () => {
  it("creates a clean untitled visual editing session at startup", () => {
    expect(createUntitledSession("未命名")).toMatchObject({
      path: null,
      root: null,
      title: "未命名",
      sourceKind: "untitled",
      sourceText: "",
      savedText: "",
      isDirty: false,
    });
  });

  it("tracks modified source until it is explicitly saved", () => {
    const opened = createOpenedSession("single-file", "/notes", "notes.md", "# Notes");
    const changed = editSession(opened, "# Revised");

    expect(changed.isDirty).toBe(true);
    expect(markSaved(changed)).toMatchObject({
      savedText: "# Revised",
      isDirty: false,
    });
  });
});
