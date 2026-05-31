import type { Messages } from "../../i18n";
import type { UpdateInfo, UpdateState } from "./update-service";

interface UpdateDialogProps {
  labels: Messages;
  state: UpdateState;
  onClose(): void;
  onInstall(): void;
  onRelaunch(): void;
}

function updateBody(update: UpdateInfo | null): string | null {
  if (!update?.body) return null;
  return update.body.length > 420 ? `${update.body.slice(0, 420)}...` : update.body;
}

export function UpdateDialog({ labels, state, onClose, onInstall, onRelaunch }: UpdateDialogProps) {
  const body = updateBody(state.update);
  return (
    <div className="dialog-backdrop">
      <section className="dialog update-dialog" role="dialog" aria-modal="true" aria-label={labels.updateTitle}>
        <h2>{labels.updateTitle}</h2>
        {state.kind === "checking" ? <p>{labels.checkingUpdates}</p> : null}
        {state.kind === "idle" && !state.update ? <p>{labels.updateNotAvailable}</p> : null}
        {state.kind === "available" && state.update ? (
          <>
            <p>{labels.updateAvailable.replace("{version}", state.update.version)}</p>
            {body ? <pre>{body}</pre> : null}
          </>
        ) : null}
        {state.kind === "downloading" ? <p>{labels.updateProgress.replace("{progress}", String(state.progress))}</p> : null}
        {state.kind === "ready" ? <p>{labels.updateReady}</p> : null}
        {state.kind === "error" ? <p role="alert">{labels.updateFailed.replace("{message}", state.error)}</p> : null}
        <div className="dialog-actions">
          {state.kind === "available" ? <button type="button" className="primary" onClick={onInstall}>{labels.downloadAndInstall}</button> : null}
          {state.kind === "ready" ? <button type="button" className="primary" onClick={onRelaunch}>{labels.relaunch}</button> : null}
          <button type="button" onClick={onClose}>{labels.close}</button>
        </div>
      </section>
    </div>
  );
}
