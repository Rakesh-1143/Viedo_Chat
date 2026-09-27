import { createPortal } from "react-dom";
import { CheckIcon, PaletteIcon, XIcon } from "lucide-react";
import { WALLPAPER_OPTIONS } from "../lib/wallpaper";
import useEscapeKey from "../hooks/useEscapeKey";

const WallpaperPicker = ({ current, onSelect, onClose }) => {
  useEscapeKey(onClose);
  return createPortal(
    <div className="app-dialog" role="dialog" aria-modal="true" aria-label="Chat wallpaper">
      <button
        type="button"
        className="app-dialog__backdrop"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="app-dialog__box">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <PaletteIcon className="size-5 text-primary" aria-hidden="true" />
            Chat wallpaper
          </h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <XIcon aria-hidden="true" />
          </button>
        </div>

        <div className="wallpaper-picker__grid">
          {WALLPAPER_OPTIONS.map((option) => {
            const isSelected = current === option.value || (!current && !option.value);
            return (
              <button
                key={option.id}
                type="button"
                className="wallpaper-picker__swatch"
                style={{ background: option.value || "var(--color-base-200)" }}
                onClick={() => onSelect(option.value)}
                aria-label={option.label}
                title={option.label}
              >
                {isSelected && <CheckIcon aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default WallpaperPicker;
