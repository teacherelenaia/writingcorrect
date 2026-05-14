export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SB_URL = process.env.SUPABASE_URL;
    const SB_ANON = process.env.SUPABASE_ANON_KEY;

    // Get total corrections from stats table
    const res = await fetch(SB_URL + '/rest/v1/stats?id=eq.1&select=corrections_total', {
      headers: {
        'apikey': SB_ANON,
        'Authorization': 'Bearer ' + SB_ANON,
        'Accept': 'application/vnd.pgrst.object+json',
      },
    });

    let total = 0;
    if (res.ok) {
      const data = await res.json();
      total = data?.corrections_total || 0;
    }

    return new Response(JSON.stringify({ total }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ total: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
