
import { getGeneralSettings } from '@/lib/firebase-settings-service';
import type { NextRequest } from 'next/server';

const DEFAULT_ROBOTS_CONTENT = `User-agent: *
Allow: /
# Default robots.txt - configure in admin panel
`;

export async function GET(request: NextRequest) {
  try {
    const settings = await getGeneralSettings();
    const content = settings?.robotsTxtContent || DEFAULT_ROBOTS_CONTENT;
    
    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain',
        // Cache for 1 hour, but search engines might cache longer
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', 
      },
    });
  } catch (error) {
    console.error("Error generating robots.txt:", error);
    return new Response(DEFAULT_ROBOTS_CONTENT, { // Serve default on error
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}
