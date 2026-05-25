interface UnsavedDialogProps {
  onSave(): void;
  onDiscard(): void;
  onCancel(): void;
}

export function UnsavedDialog({ onSave, onDiscard, onCancel }: UnsavedDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="unsaved-title">
        <h2 id="unsaved-title">Save your changes?</h2>
        <p>This document contains changes that have not been saved.</p>
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={onDiscard}>Discard</button>
          <button className="primary" type="button" onClick={onSave}>Save</button>
        </div>
      </section>
    </div>
  );
}
