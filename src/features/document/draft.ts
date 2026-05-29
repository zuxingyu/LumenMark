import type { DocumentSession, SourceKind } from "../../types";

export const RECOVERY_DRAFT_KEY = "lumenmark.recoveryDraft";

export interface RecoveryDraft {
  sourceKind: SourceKind;
  root: string | null;
  path: string | null;
  title: string;
  sourceText: string;
  savedText: string;
  updatedAt: string;
}

export function shouldPersistDraft(session: DocumentSession): boolean {
  return session.isDirty && session.sourceText.length > 0;
}

export function draftFromSession(session: DocumentSession, updatedAt = new Date()): RecoveryDraft {
  return {
    sourceKind: session.sourceKind,
    root: session.root,
    path: session.path,
    title: session.title,
    sourceText: session.sourceText,
    savedText: session.savedText,
    updatedAt: updatedAt.toISOString(),
  };
}

export function sessionFromDraft(draft: RecoveryDraft): DocumentSession {
  return {
    sourceKind: draft.sourceKind,
    root: draft.root,
    path: draft.path,
    title: draft.title,
    sourceText: draft.sourceText,
    savedText: draft.savedText,
    isDirty: draft.sourceText !== draft.savedText,
  };
}

export function saveDraft(session: DocumentSession): void {
  localStorage.setItem(RECOVERY_DRAFT_KEY, JSON.stringify(draftFromSession(session)));
}

export function loadDraft(): RecoveryDraft | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECOVERY_DRAFT_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.sourceText !== "string" || typeof parsed.title !== "string") return null;
    return parsed as RecoveryDraft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  localStorage.removeItem(RECOVERY_DRAFT_KEY);
}
