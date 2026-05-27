import type { DocumentSession, SourceKind } from "../../types";

export function createUntitledSession(title: string): DocumentSession {
  return {
    path: null,
    root: null,
    title,
    sourceText: "",
    savedText: "",
    isDirty: false,
    sourceKind: "untitled",
  };
}

export function createOpenedSession(
  sourceKind: Exclude<SourceKind, "untitled">,
  root: string,
  path: string,
  sourceText: string,
): DocumentSession {
  return {
    path,
    root,
    title: path.split("/").at(-1) ?? path,
    sourceText,
    savedText: sourceText,
    isDirty: false,
    sourceKind,
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
