
export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export interface SocialLink {
  id: string; // e.g., 'facebook', 'twitter'
  name: string; // e.g., 'Facebook', 'Twitter' (for display in admin)
  iconName: keyof typeof import('lucide-react'); // Lucide icon component name
  url: string;
  enabled: boolean;
}

export interface CustomScript {
  id: string; // Unique ID for the script
  name: string; // User-friendly name for the script (e.g., "Google Analytics")
  scriptContent: string; // The actual <script>...</script> tag or JS code
  enabled: boolean; // Whether the script should be injected
}

export interface PageSEOInfo {
  title?: string;
  description?: string;
  keywords?: string; // Comma-separated string
}

export interface GeneralSiteSettings {
  siteTitle?: string;
  logoUrl?: string;
  navItems?: NavItem[];
  adLoaderScript?: string; // For primary ad network script
  socialLinks?: SocialLink[];
  customScripts?: CustomScript[]; // For multiple custom scripts like GA, etc.
  activeThemeId?: string; // ID of the currently active theme
  seoSettings?: Record<string, PageSEOInfo>; // Key is page path (e.g., "/", "/about")
  // future settings can be added here
}
