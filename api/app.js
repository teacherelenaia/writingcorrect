export const config = { runtime: 'edge' };

export default async function handler(req) {
  const SUPABASE_URL = 'https://onrnbbjajlmdesoyqcrf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_amUFB6H9kpPoNJ3iHN-udA_6VsJwmzQ';

  const injection = `<script>window.__SUPABASE_URL__=${JSON.stringify(SUPABASE_URL)};window.__SUPABASE_KEY__=${JSON.stringify(SUPABASE_KEY)};</script>`;

  // Leer el index.html desde la misma URL base
  const host = req.headers.get('host') || 'writingcorrect.com';
  const proto = host.includes('localhost') ? 'http' : 'https';
  
  let html;
  try {
    const res = await fetch(`${proto}://${host}/app/index.html`, {
      headers: { 'x-vercel-skip-toolbar': '1' }
    });
    if (!res.ok) throw new Error('fetch failed: ' + res.status);
    html = await res.text();
  } catch(e) {
    // Fallback: redirigir directamente
    return new Response(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/app/index.html"></head></html>`, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  html = html.replace('</head>', injection + '</head>');

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    }
  });
}
