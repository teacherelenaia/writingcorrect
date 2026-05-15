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
    const SB_SVC = process.env.SUPABASE_SECRET_KEY;

    // First try the stats table (singleton row with global counter)
    let total = 0;
    const statsRes = await fetch(SB_URL + '/rest/v1/stats?id=eq.1&select=corrections_total', {
      headers: {
        'apikey': SB_SVC,
        'Authorization': 'Bearer ' + SB_SVC,
        'Accept': 'application/vnd.pgrst.object+json',
      },
    });

    if (statsRes.ok) {
      const statsData = await statsRes.json();
      total = statsData?.corrections_total || 0;
    } else {
      // Fallback: sum corrections_used from all profiles
      const profilesRes = await fetch(SB_URL + '/rest/v1/profiles?select=corrections_used', {
        headers: {
          'apikey': SB_SVC,
          'Authorization': 'Bearer ' + SB_SVC,
        },
      });
      if (profilesRes.ok) {
        const profiles = await profilesRes.json();
        total = profiles.reduce((sum, p) => sum + (p.corrections_used || 0), 0);
        // Add a baseline so it doesn't show 0 when starting out
        if (total < 50) total = total + 47;
      }
    }

    return new Response(JSON.stringify({ total }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ total: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
