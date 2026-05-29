import type { Messages } from "../i18n";
import type { RecoveryDraft } from "../features/document/draft";

interface RecoveryDialogProps {
  labels: Messages;
  draft: RecoveryDraft;
  onDiscard(): void;
  onRestore(): void;
}

export function RecoveryDialog({ labels, draft, onDiscard, onRestore }: RecoveryDialogProps) {
  return (
    <div className="dialog-backdrop">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
        <h2 id="recovery-title">{labels.restoreDraftTitle}</h2>
        <p>{labels.restoreDraftBody.replace("{time}", new Date(draft.updatedAt).toLocaleString())}</p>
        <div className="dialog-actions">
          <button type="button" onClick={onDiscard}>{labels.discard}</button>
          <button className="primary" type="button" onClick={onRestore}>{labels.restore}</button>
        </div>
      </section>
    </div>
  );
}
