export const config = { runtime: 'edge' };

export default async function handler(req) {
  const css = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}:root{--navy:#0E1E35;--navy-mid:#1B3252;--ink:#1A2638;--slate:#4A5C70;--mist:#8A9BAD;--border:#D8E2EC;--bg:#D4DAE3;--white:#FFFFFF;--accent:#1D6FA4;--accent-light:#E8F3FB;--green:#1A7F5A;--green-light:#E6F6EF;--red:#A32D2D;--red-light:#FCEBEB;--amber:#92520C;--amber-light:#FDF3E3;--serif:'DM Serif Display',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif}html{scroll-behavior:smooth}body{font-family:var(--sans);background:var(--bg);color:var(--ink);line-height:1.6;font-size:16px;-webkit-font-smoothing:antialiased}nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(235,238,242,0.97);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:0 2rem;height:60px;display:flex;align-items:center;justify-content:space-between}.logo{display:flex;align-items:center;gap:10px;text-decoration:none}.logo-mark{width:34px;height:34px;background:var(--navy);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}.logo-text{font-family:var(--sans);font-weight:600;font-size:17px;color:var(--navy);letter-spacing:-0.3px}.logo-text span{color:var(--accent)}.nav-right{display:flex;align-items:center;gap:8px}.avatar{width:34px;height:34px;border-radius:50%;background:var(--accent);color:white;border:none;font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer}.app-wrap{padding-top:60px;min-height:100vh}.app-main{max-width:880px;margin:0 auto;padding:40px 24px 80px}.section-top{margin-bottom:32px}.page-title{font-family:var(--serif);font-size:clamp(26px,3.5vw,36px);color:var(--navy);margin-bottom:6px}.page-sub{font-size:15px;color:var(--slate);font-weight:300}.card{background:white;border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:20px}.card-section{padding:24px 28px}.card-label{font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--mist);margin-bottom:14px}.tag{display:inline-block;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:var(--accent);margin-bottom:10px}.loading-wrap{text-align:center;padding:48px 24px}.loading-spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px}@keyframes spin{to{transform:rotate(360deg)}}.error-box{background:var(--red-light);border:1px solid #F09595;border-radius:10px;padding:14px 18px;font-size:14px;color:var(--red);margin-bottom:16px}.form-field label{display:block;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:var(--slate);margin-bottom:6px}.form-field input{width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-family:var(--sans);font-size:14px;color:var(--ink);outline:none;transition:border-color 0.2s}.form-field input:focus{border-color:var(--accent)}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rúbricas — WritingCorrect</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script src="/api/rubricas-bundle"></script>
</body>
</html>`;

  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
