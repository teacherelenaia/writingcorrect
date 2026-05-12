export const config = { runtime: 'edge' };
export default async function handler(req) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_SVC = process.env.SUPABASE_SECRET_KEY;
  try {
    const res = await fetch(SB_URL + '/rest/v1/rpc/exec_sql', {
      method: 'POST',
      headers: { 'apikey': SB_SVC, 'Authorization': 'Bearer ' + SB_SVC, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS corrections_reset_at timestamptz DEFAULT NULL;' })
    });
    const text = await res.text();
    return new Response(JSON.stringify({ status: res.status, result: text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
