import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'bankstatementconverted.com';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const sitemapUrl = `${protocol}://${host}/sitemap.xml`;

  const content = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${sitemapUrl}
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
