import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response('URL parameter required', { status: 400 });
  }

  try {
    // Fetch the HTML page
    const response = await fetch(targetUrl);
    const html = await response.text();

    // Extract Open Graph image
    const ogImageMatch = html.match(/<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
    const twitterImageMatch = html.match(/<meta[^>]*name=["\']twitter:image["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);

    let imageUrl = ogImageMatch?.[1] || twitterImageMatch?.[1];

    if (!imageUrl) {
      // Return redirect to fallback image
      return new Response(null, {
        status: 302,
        headers: {
          'Location': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200&q=80'
        }
      });
    }

    // Handle relative URLs
    if (imageUrl.startsWith('/')) {
      const baseUrl = new URL(targetUrl);
      imageUrl = `${baseUrl.protocol}//${baseUrl.host}${imageUrl}`;
    } else if (!imageUrl.startsWith('http')) {
      const baseUrl = new URL(targetUrl);
      imageUrl = `${baseUrl.protocol}//${baseUrl.host}/${imageUrl}`;
    }

    // Fetch the actual image and proxy it
    const imageResponse = await fetch(imageUrl);
    const imageData = await imageResponse.arrayBuffer();

    return new Response(imageData, {
      status: 200,
      headers: {
        'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error) {
    // Return redirect to fallback image on error
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200&q=80'
      }
    });
  }
};