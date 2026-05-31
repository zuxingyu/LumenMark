export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

export type UpdateState =
  | { kind: "idle"; update: UpdateInfo | null; progress: number }
  | { kind: "checking"; update: null; progress: number }
  | { kind: "available"; update: UpdateInfo; progress: number }
  | { kind: "downloading"; update: UpdateInfo; progress: number }
  | { kind: "ready"; update: UpdateInfo; progress: number }
  | { kind: "error"; update: UpdateInfo | null; progress: number; error: string };

export const idleUpdateState: UpdateState = { kind: "idle", update: null, progress: 0 };
