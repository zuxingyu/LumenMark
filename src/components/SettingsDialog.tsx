import type { Messages } from "../i18n";
import type { ImportedTheme } from "../types";
import type { ThemePreference } from "../features/theme/theme";

interface SettingsDialogProps {
  labels: Messages;
  localeLabel: string;
  activeTheme: ThemePreference;
  importedThemes: ImportedTheme[];
  onClose(): void;
  onToggleLocale(): void;
  onImportTheme(): void;
  onSelectTheme(theme: ThemePreference): void;
}

export function SettingsDialog({
  labels,
  localeLabel,
  activeTheme,
  importedThemes,
  onClose,
  onToggleLocale,
  onImportTheme,
  onSelectTheme,
}: SettingsDialogProps) {
  return (
    <div className="dialog-backdrop">
      <section className="dialog settings-dialog" role="dialog" aria-modal="true" aria-label={labels.settings}>
        <header>
          <h2>{labels.settings}</h2>
          <button type="button" aria-label={labels.closeSettings} onClick={onClose}>x</button>
        </header>
        <div className="settings-section">
          <h3>{labels.language}</h3>
          <button type="button" onClick={onToggleLocale}>{localeLabel}</button>
        </div>
        <div className="settings-section">
          <h3>{labels.theme}</h3>
          <div className="theme-choice-list">
            <button type="button" className={activeTheme === "system" ? "active" : ""} onClick={() => onSelectTheme("system")}>{labels.followSystemTheme}</button>
            <button type="button" className={activeTheme === "system-light" ? "active" : ""} onClick={() => onSelectTheme("system-light")}>{labels.lightTheme}</button>
            <button type="button" className={activeTheme === "system-dark" ? "active" : ""} onClick={() => onSelectTheme("system-dark")}>{labels.darkTheme}</button>
          </div>
          <button type="button" className="primary" onClick={onImportTheme}>{labels.importTheme}</button>
        </div>
        <div className="settings-section">
          <h3>{labels.importedThemes}</h3>
          {importedThemes.length ? (
            <div className="theme-choice-list">
              {importedThemes.map((theme) => {
                const themeKey = `imported:${theme.id}` as const;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    className={activeTheme === themeKey ? "active" : ""}
                    onClick={() => onSelectTheme(themeKey)}
                  >
                    {theme.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p>{labels.noImportedThemes}</p>
          )}
        </div>
      </section>
    </div>
  );
}
