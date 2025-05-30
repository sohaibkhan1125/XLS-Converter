
export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export interface NavbarSettings {
  siteTitle?: string;
  logoUrl?: string;
  navItems?: NavItem[];
}
