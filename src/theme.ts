export const theme = {
  colors: {
    ink: "#24312f",
    muted: "#67736f",
    softText: "#87908d",
    background: "#17211f",
    backgroundSoft: "#21302b",
    surface: "#fffaf0",
    surfaceAlt: "#edf5e9",
    line: "#d9cfbd",
    primary: "#4f8b67",
    primaryDark: "#2f6246",
    mint: "#d9eddf",
    peach: "#f8d6bd",
    apricot: "#f0a868",
    rose: "#e78382",
    blue: "#8eb7c8",
    lavender: "#b7a9cf",
    yellow: "#efd273",
    white: "#ffffff"
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 18,
    pill: 999
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28
  }
};

export type KuraThemeKey = "classic" | "light" | "natural" | "night" | "cielo" | "durazno";
export type KuraLogoVariant = "white" | "dark";

export type KuraTheme = typeof theme & {
  key: KuraThemeKey;
  label: string;
  logoVariant: KuraLogoVariant;
};

export const DEFAULT_KURA_THEME_KEY: KuraThemeKey = "classic";

export const appThemes: Record<KuraThemeKey, KuraTheme> = {
  classic: {
    ...theme,
    key: "classic",
    label: "Clásico",
    logoVariant: "white",
    colors: {
      ...theme.colors
    }
  },
  light: {
    ...theme,
    key: "light",
    label: "Claro",
    logoVariant: "dark",
    colors: {
      ...theme.colors,
      ink: "#24312f",
      muted: "#67736f",
      softText: "#87908d",
      background: "#fffaf0",
      backgroundSoft: "#edf5e9",
      surface: "#ffffff",
      surfaceAlt: "#edf5e9",
      line: "#d9cfbd",
      primary: "#4f8b67",
      primaryDark: "#2f6246",
      mint: "#d9eddf",
      white: "#ffffff"
    }
  },
  natural: {
    ...theme,
    key: "natural",
    label: "Natural",
    logoVariant: "dark",
    colors: {
      ...theme.colors,
      ink: "#24312f",
      muted: "#64736b",
      softText: "#819088",
      background: "#edf5e9",
      backgroundSoft: "#d9eddf",
      surface: "#fffaf0",
      surfaceAlt: "#ffffff",
      line: "#cbd9c8",
      primary: "#4f8b67",
      primaryDark: "#2f6246",
      mint: "#d9eddf",
      white: "#ffffff"
    }
  },
  cielo: {
    ...theme,
    key: "cielo",
    label: "Cielo",
    logoVariant: "dark",
    colors: {
      ...theme.colors,
      ink: "#20333d",
      muted: "#5f7580",
      softText: "#7f949d",
      background: "#eef8fb",
      backgroundSoft: "#dceff5",
      surface: "#ffffff",
      surfaceAlt: "#e2f1f6",
      line: "#c7dce4",
      primary: "#3e7fa8",
      primaryDark: "#24516c",
      mint: "#d9edf4",
      apricot: "#f2c9aa",
      rose: "#e79a9a",
      lavender: "#aab9d8",
      yellow: "#efd273",
      white: "#ffffff"
    }
  },
  durazno: {
    ...theme,
    key: "durazno",
    label: "Durazno",
    logoVariant: "dark",
    colors: {
      ...theme.colors,
      ink: "#3d3028",
      muted: "#7a6557",
      softText: "#9b8575",
      background: "#fff6ea",
      backgroundSoft: "#f8e7d2",
      surface: "#fffaf0",
      surfaceAlt: "#f7ead8",
      line: "#e4cdb5",
      primary: "#c76f4e",
      primaryDark: "#74402f",
      mint: "#dbeadd",
      apricot: "#f0b27a",
      rose: "#df8c8c",
      lavender: "#c3add0",
      yellow: "#efd273",
      white: "#ffffff"
    }
  },
  night: {
    ...theme,
    key: "night",
    label: "Noche",
    logoVariant: "white",
    colors: {
      ...theme.colors,
      ink: "#eff8f2",
      muted: "#c5d1cc",
      softText: "#a8b6b0",
      background: "#0f1715",
      backgroundSoft: "#17211f",
      surface: "#1d2b27",
      surfaceAlt: "#243631",
      line: "#345046",
      primary: "#54b683",
      primaryDark: "#d9eddf",
      mint: "#254237",
      white: "#ffffff"
    }
  }
};
