
"use client";

import Link from 'next/link';
import { LayoutDashboard, Settings, Megaphone, Palette, SearchCheck } from 'lucide-react'; // Added SearchCheck for SEO
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/general-settings', label: 'General Settings', icon: Settings },
  { href: '/admin/ads-management', label: 'Ads Management', icon: Megaphone },
  { href: '/admin/color-scheme-settings', label: 'Color Scheme', icon: Palette },
  { href: '/admin/seo-settings', label: 'SEO Settings', icon: SearchCheck }, // New Item
  // Add more admin navigation items here
  // { href: '/admin/users', label: 'Users', icon: Users },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] w-64 border-r bg-background p-4 hidden md:block">
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
              pathname === item.href && "bg-muted text-primary font-medium"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
