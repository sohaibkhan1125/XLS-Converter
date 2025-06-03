
"use client";

import Link from 'next/link';
import { LayoutDashboard, Settings, Megaphone, Palette, SearchCheck, MessageSquarePlus, CreditCard, Bot, Construction } from 'lucide-react'; // Added CreditCard
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/general-settings', label: 'General Settings', icon: Settings },
  { href: '/admin/ads-management', label: 'Ads Management', icon: Megaphone },
  { href: '/admin/color-scheme-settings', label: 'Color Scheme', icon: Palette },
  { href: '/admin/seo-settings', label: 'SEO Settings', icon: SearchCheck }, 
  { href: '/admin/popup-manager', label: 'Popup Manager', icon: MessageSquarePlus },
  { href: '/admin/payment-gateways', label: 'Payment Gateways', icon: CreditCard }, // New item
  // Example for future: { href: '/admin/ai-content-rules', label: 'AI Content Rules', icon: Bot },
];

export function AdminNavigationLinks({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-2">
      {adminNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onLinkClick}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted text-base md:text-sm", // Ensure text size is appropriate
            pathname === item.href && "bg-muted text-primary font-medium"
          )}
        >
          <item.icon className="h-5 w-5 md:h-4 md:w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export default function AdminSidebar() {
  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] w-64 border-r bg-background p-4 hidden md:block">
      <AdminNavigationLinks />
    </aside>
  );
}
