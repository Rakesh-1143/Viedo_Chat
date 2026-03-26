import { PaletteIcon } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";
import { THEMES } from "../constants";

const ThemeSelector = ({ isMenuItem = false }) => {
  const { theme, setTheme } = useThemeStore();

  if (isMenuItem) {
    return (
      <li>
        <details>
          <summary className="flex items-center gap-2 py-3">
            <PaletteIcon className="h-4 w-4" />
            Theme
          </summary>
          <ul className="p-2 bg-base-100 rounded-t-none max-h-60 overflow-y-auto">
            {THEMES.map((themeOption) => (
              <li key={themeOption.name}>
                <button
                  className={`${theme === themeOption.name ? "active" : ""}`}
                  onClick={() => setTheme(themeOption.name)}
                >
                  <span className="flex-1">{themeOption.label}</span>
                  <div className="flex gap-1 ml-auto">
                    {themeOption.colors.map((color, i) => (
                      <span
                        key={i}
                        className="size-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </details>
      </li>
    );
  }

  return (
    <div className="dropdown dropdown-end">
      {/* DROPDOWN TRIGGER */}
      <button tabIndex={0} className="btn btn-ghost btn-circle">
        <PaletteIcon className="size-5" />
      </button>

      <div
        tabIndex={0}
        className="dropdown-content mt-2 p-1 shadow-2xl bg-base-200 backdrop-blur-lg rounded-2xl
        w-56 border border-base-content/10 max-h-80 overflow-y-auto"
      >
        <div className="space-y-1">
          {THEMES.map((themeOption) => (
            <button
              key={themeOption.name}
              className={`
              w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-colors
              ${
                theme === themeOption.name
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-base-content/5"
              }
            `}
              onClick={() => setTheme(themeOption.name)}
            >
              <PaletteIcon className="size-4" />
              <span className="text-sm font-medium">{themeOption.label}</span>
              {/* THEME PREVIEW COLORS */}
              <div className="ml-auto flex gap-1">
                {themeOption.colors.map((color, i) => (
                  <span
                    key={i}
                    className="size-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default ThemeSelector;
