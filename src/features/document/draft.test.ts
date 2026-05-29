import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOpenedSession, createUntitledSession, editSession } from "./session";
import { clearDraft, loadDraft, saveDraft, shouldPersistDraft } from "./draft";

describe("local draft recovery", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("persists dirty untitled documents as recoverable drafts", () => {
    vi.setSystemTime(new Date("2026-05-29T04:00:00Z"));
    const session = editSession(createUntitledSession("未命名"), "# Draft");

    expect(shouldPersistDraft(session)).toBe(true);
    saveDraft(session);

    expect(loadDraft()).toMatchObject({
      sourceKind: "untitled",
      title: "未命名",
      sourceText: "# Draft",
      savedText: "",
      updatedAt: "2026-05-29T04:00:00.000Z",
    });
  });

  it("persists dirty opened documents with their source metadata", () => {
    const session = editSession(createOpenedSession("workspace", "/docs", "guide.md", "# Guide"), "# Changed");

    saveDraft(session);

    expect(loadDraft()).toMatchObject({
      sourceKind: "workspace",
      root: "/docs",
      path: "guide.md",
      title: "guide.md",
      sourceText: "# Changed",
      savedText: "# Guide",
    });
  });

  it("ignores clean sessions and clears the existing draft", () => {
    saveDraft(editSession(createUntitledSession("未命名"), "# Draft"));

    expect(shouldPersistDraft(createUntitledSession("未命名"))).toBe(false);
    clearDraft();

    expect(loadDraft()).toBeNull();
  });
});
