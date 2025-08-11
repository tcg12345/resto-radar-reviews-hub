// Secure Google Photo Proxy Edge Function
// Streams Google Place Photos using a server-side API key with CORS and caching

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const photoRef = url.searchParams.get('photoreference') || url.searchParams.get('photo_reference') || url.searchParams.get('ref');
    const maxwidth = url.searchParams.get('maxwidth') || '400';
    const maxheight = url.searchParams.get('maxheight');

    if (!photoRef) {
      return errorResponse(400, 'Missing photoreference parameter');
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return errorResponse(500, 'Missing GOOGLE_PLACES_API_KEY');
    }

    const googleUrl = new URL('https://maps.googleapis.com/maps/api/place/photo');
    googleUrl.searchParams.set('photoreference', photoRef);
    if (maxheight) {
      googleUrl.searchParams.set('maxheight', maxheight);
    } else {
      googleUrl.searchParams.set('maxwidth', maxwidth);
    }
    googleUrl.searchParams.set('key', apiKey);

    const upstream = await fetch(googleUrl.toString());

    if (!upstream.ok) {
      const text = await upstream.text();
      return errorResponse(upstream.status, `Upstream error: ${text}`);
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';

    const resp = new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': contentType,
        // Cache for a day on client and CDN
        'cache-control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });

    return resp;
  } catch (err) {
    console.error('Photo proxy error', err);
    return errorResponse(500, 'Internal error');
  }
});
