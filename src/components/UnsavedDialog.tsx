import type { Messages } from "../i18n";

interface UnsavedDialogProps {
  labels: Messages;
  onSave(): void;
  onDiscard(): void;
  onCancel(): void;
}

export function UnsavedDialog({ labels, onSave, onDiscard, onCancel }: UnsavedDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="unsaved-title">
        <h2 id="unsaved-title">{labels.unsavedTitle}</h2>
        <p>{labels.unsavedBody}</p>
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>{labels.cancel}</button>
          <button type="button" onClick={onDiscard}>{labels.discard}</button>
          <button className="primary" type="button" onClick={onSave}>{labels.save}</button>
        </div>
      </section>
    </div>
  );
}
