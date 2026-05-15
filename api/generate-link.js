export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://onrnbbjajlmdesoyqcrf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || '';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function getToken(req) {
  const auth = req.headers.get('Authorization') || '';
  return auth.replace('Bearer ', '').trim();
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  const token = getToken(req);
  if (!token) return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });

  // Verify user
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${token}` }
  });
  if (!userRes.ok) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
  const user = await userRes.json();

  const body = await req.json().catch(() => ({}));
  const nivel = body.nivel || 'B1';
  const writing_type = body.writing_type || 'writing';
  const days = parseInt(body.days) || 30;

  // Generate unique token
  const linkToken = crypto.randomUUID();
  const expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  // Save to student_links
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/student_links`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ token: linkToken, user_id: user.id, nivel, writing_type, expires_at })
  });

  if (!insertRes.ok) {
    const err = await insertRes.text();
    return new Response(JSON.stringify({ error: 'Could not create link', detail: err }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  const origin = req.headers.get('origin') || 'https://writingcorrect.com';
  const url = `${origin}/c?token=${linkToken}`;

  return new Response(JSON.stringify({ url, token: linkToken, expires_at }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}
