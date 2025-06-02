
import { getGeneralSettings } from '@/lib/firebase-settings-service';
import type { NextRequest } from 'next/server';

const DEFAULT_SITEMAP_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>PLEASE_CONFIGURE_YOUR_DOMAIN_IN_ADMIN_SETTINGS/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

export async function GET(request: NextRequest) {
  try {
    const settings = await getGeneralSettings();
    let content = settings?.sitemapXmlContent || DEFAULT_SITEMAP_CONTENT;

    // Basic placeholder replacement if admin hasn't set a domain in sitemap yet
    // More robust solution would involve a dedicated site URL setting
    if (content.includes('REPLACE_THIS_WITH_YOUR_DOMAIN')) {
        const host = request.headers.get('host') || 'yourdomain.com';
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        content = content.replace(/REPLACE_THIS_WITH_YOUR_DOMAIN/g, `${protocol}://${host}`);
    }
     if (content.includes('YYYY-MM-DD')) {
        content = content.replace(/YYYY-MM-DD/g, new Date().toISOString().split('T')[0]);
    }


    return new Response(content, {
      headers: {
        'Content-Type': 'application/xml',
         // Cache for 1 hour, but search engines might cache longer
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error("Error generating sitemap.xml:", error);
    return new Response(DEFAULT_SITEMAP_CONTENT.replace(/YYYY-MM-DD/g, new Date().toISOString().split('T')[0]), { // Serve default on error
      status: 500,
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
}
