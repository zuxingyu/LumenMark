import { Check, Eye, Trash2, X } from "lucide-react";
import type { Messages } from "../i18n";
import type { ImportedTheme } from "../types";
import { OFFICIAL_THEMES, type ThemePreference } from "../features/theme/theme";

interface SettingsDialogProps {
  labels: Messages;
  localeLabel: string;
  activeTheme: ThemePreference;
  previewTheme: ThemePreference | null;
  importedThemes: ImportedTheme[];
  onClose(): void;
  onToggleLocale(): void;
  onImportTheme(): void;
  onSelectTheme(theme: ThemePreference): void;
  onPreviewTheme(theme: ThemePreference): void;
  onCancelPreview(): void;
  onDeleteTheme(themeId: string): void;
}

export function SettingsDialog({
  labels,
  localeLabel,
  activeTheme,
  previewTheme,
  importedThemes,
  onClose,
  onToggleLocale,
  onImportTheme,
  onSelectTheme,
  onPreviewTheme,
  onCancelPreview,
  onDeleteTheme,
}: SettingsDialogProps) {
  const activeOrPreview = previewTheme ?? activeTheme;
  const builtInThemes: Array<{ id: ThemePreference; label: string }> = [
    { id: "system", label: labels.followSystemTheme },
    { id: "system-light", label: labels.lightTheme },
    { id: "system-dark", label: labels.darkTheme },
  ];

  return (
    <div className="dialog-backdrop">
      <section className="dialog settings-dialog" role="dialog" aria-modal="true" aria-label={labels.settings}>
        <header>
          <h2>{labels.settings}</h2>
          <button type="button" className="icon-button" aria-label={labels.closeSettings} onClick={onClose}><X size={15} /></button>
        </header>
        <div className="settings-section">
          <h3>{labels.language}</h3>
          <button type="button" className="compact-button" onClick={onToggleLocale}>{localeLabel}</button>
        </div>
        <div className="settings-section">
          <h3>{labels.builtInThemes}</h3>
          <div className="theme-list">
            {builtInThemes.map((theme) => (
              <div className={`theme-row ${activeOrPreview === theme.id ? "active" : ""}`} key={theme.id}>
                <span>{theme.label}</span>
                <button type="button" className="compact-button" onClick={() => onSelectTheme(theme.id)}>
                  {labels.applyTheme}
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="primary compact-button" onClick={onImportTheme}>{labels.importTheme}</button>
          {previewTheme ? <button type="button" className="compact-button" onClick={onCancelPreview}>{labels.cancelThemePreview}</button> : null}
        </div>
        <div className="settings-section">
          <h3>{labels.officialThemes}</h3>
          <div className="theme-list">
            {OFFICIAL_THEMES.map((theme) => {
              const themeKey = `official:${theme.id}` as const;
              return (
                <div className={`theme-row ${activeOrPreview === themeKey ? "active" : ""}`} key={theme.id}>
                  <span>{theme.name}</span>
                  <button type="button" className="compact-button" onClick={() => onSelectTheme(themeKey)}>
                    {labels.applyTheme}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="settings-section">
          <h3>{labels.importedThemes}</h3>
          {importedThemes.length ? (
            <div className="theme-list">
              {importedThemes.map((theme) => {
                const themeKey = `imported:${theme.id}` as const;
                return (
                  <div
                    key={theme.id}
                    className={`theme-row ${activeOrPreview === themeKey ? "active" : ""}`}
                    aria-label={`${theme.name} ${labels.theme}`}
                  >
                    <span>{theme.name}</span>
                    <div className="theme-row-actions">
                      <button type="button" className="icon-button" aria-label={`${labels.previewTheme} ${theme.name}`} title={labels.previewTheme} onClick={() => onPreviewTheme(themeKey)}>
                        <Eye size={14} />
                      </button>
                      <button type="button" className="icon-button" aria-label={`${labels.applyTheme} ${theme.name}`} title={labels.applyTheme} onClick={() => onSelectTheme(themeKey)}>
                        <Check size={14} />
                      </button>
                      <button type="button" className="icon-button danger" aria-label={`${labels.deleteTheme} ${theme.name}`} title={labels.deleteTheme} onClick={() => onDeleteTheme(theme.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
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
