
export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export interface GeneralSiteSettings {
  siteTitle?: string;
  logoUrl?: string;
  navItems?: NavItem[];
  adLoaderScript?: string;
  // future settings can be added here
}

// AdSettings is now part of GeneralSiteSettings
// export interface AdSettings {
//   adLoaderScript?: string;
// }
