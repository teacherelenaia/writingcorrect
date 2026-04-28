export const config = { runtime: 'edge' };

export default async function handler(req) {
  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';

  // Lee el HTML de la app desde el mismo deploy de Vercel
  const baseUrl = new URL(req.url);
  const htmlUrl = `${baseUrl.protocol}//${baseUrl.host}/app/index.html`;

  let html;
  try {
    const res = await fetch(htmlUrl);
    html = await res.text();
  } catch {
    return new Response('Error cargando la app', { status: 500 });
  }

  // Inyecta las variables de Supabase justo antes de </head>
  const injection = `<script>window.__SUPABASE_URL__=${JSON.stringify(SUPABASE_URL)};window.__SUPABASE_KEY__=${JSON.stringify(SUPABASE_KEY)};</script>`;
  html = html.replace('</head>', injection + '</head>');

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
