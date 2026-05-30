import type { Messages } from "../i18n";

interface ToolbarProps {
  labels: Messages;
}

export function Toolbar(_props: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-mark">L</span>
        <strong>LumenMark</strong>
      </div>
    </header>
  );
}
