import { describe, expect, it } from "vitest";
import { createSession, editSession, markSaved } from "./session";

describe("document session", () => {
  it("tracks modified source until it is explicitly saved", () => {
    const opened = createSession("notes.md", "# Notes");
    const changed = editSession(opened, "# Revised");

    expect(changed.isDirty).toBe(true);
    expect(markSaved(changed)).toMatchObject({
      savedText: "# Revised",
      isDirty: false,
    });
  });
});

