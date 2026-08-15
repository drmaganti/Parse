export const colors = {
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#FAFBFC",
  border: "#E6E8EC",
  borderStrong: "#D4D8DF",
  ink: "#15171C",
  inkSoft: "#565C67",
  inkFaint: "#68707D",
  accent: "#2C36A8",
  accentSoft: "#ECEEFA",
  accentInk: "#232A85",
  gain: "#0B8A5B",
  loss: "#C33328",
} as const;

export const fonts = {
  display: "var(--font-display)",
  body: "var(--font-body)",
  mono: "var(--font-mono)",
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
} as const;

export const radius = {
  sm: 7,
  md: 10,
  lg: 14,
  xl: 16,
} as const;

export const typeScale = {
  xs: 12,
  sm: 13.5,
  body: 15,
  lg: 17,
  h3: 21,
  h2: 28,
} as const;

export const designSystem = {
  colors,
  fonts,
  spacing,
  radius,
  typeScale,
} as const;
