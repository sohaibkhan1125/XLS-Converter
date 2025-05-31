
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

export interface GeneralSiteSettings {
  siteTitle?: string;
  logoUrl?: string;
  navItems?: NavItem[];
  adLoaderScript?: string;
  socialLinks?: SocialLink[];
  // future settings can be added here
}

