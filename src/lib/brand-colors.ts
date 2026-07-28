// The app's UI only ever uses these six Tailwind shades (indigo-300/400/500
// for primary accents, violet-400/500/600 for gradients) — so re-theming the
// whole app just means overriding these six CSS variables at the root. No
// component files need to change.
export const BRAND_COLOR_PRESETS = {
  indigo: {
    label: "Indigo",
    swatch: "#6366f1",
    vars: {
      "--color-indigo-300": "#a5b4fc",
      "--color-indigo-400": "#818cf8",
      "--color-indigo-500": "#6366f1",
      "--color-violet-400": "#a78bfa",
      "--color-violet-500": "#8b5cf6",
      "--color-violet-600": "#7c3aed",
    },
  },
  blue: {
    label: "Blue",
    swatch: "#3b82f6",
    vars: {
      "--color-indigo-300": "#93c5fd",
      "--color-indigo-400": "#60a5fa",
      "--color-indigo-500": "#3b82f6",
      "--color-violet-400": "#22d3ee",
      "--color-violet-500": "#06b6d4",
      "--color-violet-600": "#0891b2",
    },
  },
  emerald: {
    label: "Emerald",
    swatch: "#10b981",
    vars: {
      "--color-indigo-300": "#6ee7b7",
      "--color-indigo-400": "#34d399",
      "--color-indigo-500": "#10b981",
      "--color-violet-400": "#2dd4bf",
      "--color-violet-500": "#14b8a6",
      "--color-violet-600": "#0d9488",
    },
  },
  rose: {
    label: "Rose",
    swatch: "#f43f5e",
    vars: {
      "--color-indigo-300": "#fda4af",
      "--color-indigo-400": "#fb7185",
      "--color-indigo-500": "#f43f5e",
      "--color-violet-400": "#f472b6",
      "--color-violet-500": "#ec4899",
      "--color-violet-600": "#db2777",
    },
  },
  amber: {
    label: "Amber",
    swatch: "#f59e0b",
    vars: {
      "--color-indigo-300": "#fcd34d",
      "--color-indigo-400": "#fbbf24",
      "--color-indigo-500": "#f59e0b",
      "--color-violet-400": "#fb923c",
      "--color-violet-500": "#f97316",
      "--color-violet-600": "#ea580c",
    },
  },
} as const;

export type BrandColorKey = keyof typeof BRAND_COLOR_PRESETS;

export const BRAND_COLOR_KEYS = Object.keys(BRAND_COLOR_PRESETS) as BrandColorKey[];

export function isBrandColorKey(value: string): value is BrandColorKey {
  return value in BRAND_COLOR_PRESETS;
}

export function brandColorStyle(key: string) {
  const preset = isBrandColorKey(key) ? BRAND_COLOR_PRESETS[key] : BRAND_COLOR_PRESETS.indigo;
  return Object.entries(preset.vars)
    .map(([prop, value]) => `${prop}: ${value};`)
    .join(" ");
}
