function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Blend a hex color toward white at the given strength (0–1). */
function onWhite(hex: string, strength: number): string {
  const [r, g, b] = hexToRgb(hex);
  const rr = Math.round(255 - (255 - r) * strength);
  const gg = Math.round(255 - (255 - g) * strength);
  const bb = Math.round(255 - (255 - b) * strength);
  return `rgb(${rr},${gg},${bb})`;
}

/** Blend a hex color toward a dark base at the given strength. */
function onDark(hex: string, strength: number): string {
  const [r, g, b] = hexToRgb(hex);
  // base ≈ #080E14
  return `rgb(${Math.round(8 + (r - 8) * strength)},${Math.round(14 + (g - 14) * strength)},${Math.round(20 + (b - 20) * strength)})`;
}

function relativeLuminance(hex: string): number {
  const sRGB = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function contrastForeground(hex: string): string {
  return relativeLuminance(hex) > 0.35 ? "#0A0F1A" : "#FFFFFF";
}

export interface BrandTokens {
  light: Record<string, string>;
  dark: Record<string, string>;
}

/**
 * Compute full CSS variable overrides from a primary brand color and an
 * optional secondary color. Returned values are ready to inject as:
 *   body { ...light }
 *   .dark body { ...dark }
 */
export function computeBrandTokens(primary: string, secondary: string | null): BrandTokens {
  const sec = secondary ?? primary;

  const light: Record<string, string> = {
    "--color-primary":             primary,
    "--color-primary-foreground":  contrastForeground(primary),
    "--color-ring":                primary,
    // Page & card backgrounds — very subtle primary tint
    "--color-background":          onWhite(primary, 0.03),
    "--color-card":                "#FFFFFF",
    // Muted, accent, border — derive from primary
    "--color-muted":               onWhite(primary, 0.08),
    "--color-accent":              onWhite(primary, 0.16),
    "--color-border":              onWhite(primary, 0.24),
    "--color-input":               onWhite(primary, 0.24),
    // Secondary token — used for complementary highlights
    "--color-secondary":           onWhite(sec, 0.12),
    "--color-secondary-foreground": sec,
    // Raw brand vars (for sidebar, topbar, etc.)
    "--brand":                     primary,
    "--brand-secondary":           sec,
    "--brand-secondary-fg":        contrastForeground(sec),
  };

  const dark: Record<string, string> = {
    "--color-primary":             primary,
    "--color-primary-foreground":  contrastForeground(primary),
    "--color-ring":                primary,
    "--color-muted":               onDark(primary, 0.18),
    "--color-accent":              onDark(primary, 0.28),
    "--color-border":              onDark(primary, 0.22),
    "--color-input":               onDark(primary, 0.22),
    "--color-secondary":           onDark(sec, 0.22),
    "--color-secondary-foreground": sec,
    "--brand":                     primary,
    "--brand-secondary":           sec,
    "--brand-secondary-fg":        contrastForeground(sec),
  };

  return { light, dark };
}

/** Serialise a token map to a CSS rule body. */
export function tokensToCSS(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
}
