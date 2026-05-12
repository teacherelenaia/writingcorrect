export const config = { runtime: 'edge' };
export default async function handler(req) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_SVC = process.env.SUPABASE_SECRET_KEY;
  const res = await fetch(SB_URL + '/rest/v1/rpc/exec_sql', {
    method: 'POST',
    headers: { 'apikey': SB_SVC, 'Authorization': 'Bearer ' + SB_SVC, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS corrections_reset_at timestamptz DEFAULT NULL;' })
  });
  const r = await res.text();
  return new Response(JSON.stringify({ status: res.status, result: r }), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
