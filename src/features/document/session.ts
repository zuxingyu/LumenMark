import type { DocumentSession, EditorMode } from "../../types";

export function createSession(path: string, sourceText: string): DocumentSession {
  return {
    path,
    sourceText,
    savedText: sourceText,
    isDirty: false,
    mode: "preview",
  };
}

export function editSession(
  session: DocumentSession,
  sourceText: string,
): DocumentSession {
  return {
    ...session,
    sourceText,
    isDirty: sourceText !== session.savedText,
  };
}

export function markSaved(session: DocumentSession): DocumentSession {
  return {
    ...session,
    savedText: session.sourceText,
    isDirty: false,
  };
}

export function changeMode(
  session: DocumentSession,
  mode: EditorMode,
): DocumentSession {
  return { ...session, mode };
}

