
export interface ThemeColors {
  background: string; // HSL string e.g., "0 0% 100%"
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  // Chart colors can also be themed if desired
  chart1?: string;
  chart2?: string;
  chart3?: string;
  chart4?: string;
  chart5?: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  isDark?: boolean;
}

export const DEFAULT_LIGHT_THEME_ID = "default-light";
export const DEFAULT_DARK_THEME_ID = "default-dark";

export const PREDEFINED_THEMES: Theme[] = [
  {
    id: DEFAULT_LIGHT_THEME_ID,
    name: "Default Light",
    isDark: false,
    colors: {
      background: "270 33% 95%",
      foreground: "240 10% 3.9%",
      card: "270 33% 95%",
      cardForeground: "240 10% 3.9%",
      popover: "270 33% 95%",
      popoverForeground: "240 10% 3.9%",
      primary: "267 38% 67%",
      primaryForeground: "0 0% 98%",
      secondary: "270 20% 90%",
      secondaryForeground: "240 10% 3.9%",
      muted: "270 15% 85%",
      mutedForeground: "240 5% 45%",
      accent: "179 31% 54%",
      accentForeground: "0 0% 98%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "0 0% 98%",
      border: "270 15% 80%",
      input: "270 15% 88%",
      ring: "267 38% 67%",
      chart1: "12 76% 61%",
      chart2: "173 58% 39%",
      chart3: "197 37% 24%",
      chart4: "43 74% 66%",
      chart5: "27 87% 67%",
    },
  },
  {
    id: DEFAULT_DARK_THEME_ID,
    name: "Default Dark",
    isDark: true,
    colors: {
      background: "240 10% 3.9%",
      foreground: "0 0% 98%",
      card: "240 10% 3.9%",
      cardForeground: "0 0% 98%",
      popover: "240 10% 3.9%",
      popoverForeground: "0 0% 98%",
      primary: "267 38% 67%",
      primaryForeground: "0 0% 98%",
      secondary: "240 3.7% 15.9%",
      secondaryForeground: "0 0% 98%",
      muted: "240 3.7% 15.9%",
      mutedForeground: "0 0% 63.9%",
      accent: "179 31% 54%",
      accentForeground: "0 0% 98%",
      destructive: "0 62.8% 30.6%",
      destructiveForeground: "0 0% 98%",
      border: "240 3.7% 15.9%",
      input: "240 3.7% 15.9%",
      ring: "267 38% 67%",
      chart1: "220 70% 50%",
      chart2: "160 60% 45%",
      chart3: "30 80% 55%",
      chart4: "280 65% 60%",
      chart5: "340 75% 55%",
    },
  },
  {
    id: "blue-theme",
    name: "Ocean Blue",
    isDark: false,
    colors: {
      background: "210 40% 96%", // Light blue-grey
      foreground: "210 20% 20%", // Dark slate blue
      card: "210 40% 98%", // Very light blue
      cardForeground: "210 20% 20%",
      popover: "210 40% 98%",
      popoverForeground: "210 20% 20%",
      primary: "211 100% 50%", // #007BFF
      primaryForeground: "0 0% 100%", // White
      secondary: "208 7% 45%", // #6C757D (Greyish blue)
      secondaryForeground: "0 0% 100%", // White
      muted: "210 30% 90%", // Light grey-blue
      mutedForeground: "210 15% 50%", // Muted slate blue
      accent: "180 60% 45%", // Teal
      accentForeground: "0 0% 100%", // White
      destructive: "0 70% 55%", // Red
      destructiveForeground: "0 0% 100%",
      border: "210 25% 85%", // Softer blue-grey border
      input: "210 30% 92%", // Light input background
      ring: "211 100% 50%",
    }
  },
  {
    id: "green-theme",
    name: "Forest Green",
    isDark: false,
    colors: {
      background: "120 20% 95%", // Pale green
      foreground: "120 25% 15%", // Dark forest green
      card: "120 20% 98%", // Very pale green
      cardForeground: "120 25% 15%",
      popover: "120 20% 98%",
      popoverForeground: "120 25% 15%",
      primary: "136 60% 40%", // #28A745
      primaryForeground: "0 0% 100%", // White
      secondary: "134 60% 33%", // #218838 (Darker green)
      secondaryForeground: "0 0% 100%",
      muted: "120 15% 88%", // Light muted green
      mutedForeground: "120 20% 40%", // Muted forest green
      accent: "45 70% 55%", // Gold/Yellow
      accentForeground: "0 0% 0%", // Black
      destructive: "0 70% 55%", // Red
      destructiveForeground: "0 0% 100%",
      border: "120 15% 80%", // Softer green border
      input: "120 15% 92%", // Light input background
      ring: "136 60% 40%",
    }
  },
  {
    id: "red-theme",
    name: "Crimson Red",
    isDark: false,
    colors: {
      background: "0 20% 96%", // Very light pink/grey
      foreground: "0 30% 20%", // Dark desaturated red
      card: "0 20% 98%", // Almost white with red hint
      cardForeground: "0 30% 20%",
      popover: "0 20% 98%",
      popoverForeground: "0 30% 20%",
      primary: "354 70% 53%", // #DC3545
      primaryForeground: "0 0% 100%", // White
      secondary: "355 69% 47%", // #C82333 (Darker red)
      secondaryForeground: "0 0% 100%",
      muted: "0 15% 90%", // Light grey-pink
      mutedForeground: "0 20% 50%", // Muted desaturated red
      accent: "25 80% 55%", // Orange
      accentForeground: "0 0% 100%", // White
      destructive: "120 60% 45%", // Green (for contrast on a red theme)
      destructiveForeground: "0 0% 100%",
      border: "0 15% 85%", // Softer pink-grey border
      input: "0 15% 92%", // Light input background
      ring: "354 70% 53%",
    }
  },
  {
    id: "purple-theme",
    name: "Royal Purple",
    isDark: true, // Example of a dark variant for a specific color
    colors: {
      background: "260 20% 15%", // Deep purple-black
      foreground: "260 15% 90%", // Light lavender grey
      card: "260 20% 20%", // Dark purple
      cardForeground: "260 15% 90%",
      popover: "260 20% 20%",
      popoverForeground: "260 15% 90%",
      primary: "258 52% 51%", // #6F42C1
      primaryForeground: "0 0% 100%", // White
      secondary: "259 53% 42%", // #5A32A3 (Darker purple)
      secondaryForeground: "0 0% 100%",
      muted: "260 15% 30%", // Muted dark purple
      mutedForeground: "260 10% 70%", // Muted lavender
      accent: "300 70% 65%", // Magenta/Pink
      accentForeground: "0 0% 0%", // Black
      destructive: "0 60% 55%", // Bright Red
      destructiveForeground: "0 0% 100%",
      border: "260 15% 25%", // Dark purple border
      input: "260 15% 22%", // Dark input background
      ring: "258 52% 51%",
    }
  },
  // Add more themes here if needed
];
