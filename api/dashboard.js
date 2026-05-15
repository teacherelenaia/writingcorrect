export const config = { runtime: 'edge' };

const SB_URL = 'https://onrnbbjajlmdesoyqcrf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ucm5iYmphamxtZGVzb3lxY3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMDY1MjksImV4cCI6MjA5MjY4MjUyOX0.paqP-s9aD6tjXyuizKjYH4hksXY2Ebb0tzmRR5bCY6I';

function tok(req) { return (req.headers.get('Authorization') || '').replace('Bearer ', ''); }

export default async function handler(req) {
  const token = tok(req);
  const html = await buildDashboard(token);
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function buildDashboard(token) {
  let data = null;
  if (token) {
    try {
      const ur = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token } });
      if (ur.ok) {
        const user = await ur.json();
        const cr = await fetch(SB_URL + '/rest/v1/correcciones?user_id=eq.' + user.id + '&select=id,student_name,writing_type,score,created_at&order=created_at.desc&limit=300', { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token } });
        const corrs = cr.ok ? await cr.json() : [];
        data = processData(corrs);
      }
    } catch(e) {}
  }
  return renderPage(data);
}

function processData(c) {
  const total = c.length;
  const avg = total > 0 ? (c.reduce((s, x) => s + Number(x.score || 0), 0) / total).toFixed(1) : '0.0';
  const sm = {};
  c.forEach(x => {
    const n = x.student_name || 'Anonimo';
    if (!sm[n]) sm[n] = { name: n, count: 0, total: 0 };
    sm[n].count++; sm[n].total += Number(x.score || 0);
  });
  const students = Object.values(sm).map(s => ({ name: s.name, count: s.count, avg: (s.total / s.count).toFixed(1) })).sort((a, b) => b.count - a.count).slice(0, 10);
  const tm = {};
  c.forEach(x => { const t = (x.writing_type || 'Otro').replace(/_/g, ' '); tm[t] = (tm[t] || 0) + 1; });
  const types = Object.entries(tm).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const dist = { A: 0, B: 0, C: 0, D: 0 };
  c.forEach(x => { const s = Number(x.score || 0); if (s >= 9) dist.A++; else if (s >= 7) dist.B++; else if (s >= 5) dist.C++; else dist.D++; });
  const now = new Date(); const act = {};
  for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); act[d.toISOString().slice(0, 10)] = 0; }
  c.forEach(x => { const day = x.created_at ? x.created_at.slice(0, 10) : null; if (day && act[day] !== undefined) act[day]++; });
  const last30 = Object.values(act).reduce((s, v) => s + v, 0);
  return { total, avg, students, types, dist, act: Object.entries(act), last30, studentCount: students.length };
}

function renderPage(data) {
  const noAuth = !data;
  const d = data || { total: 0, avg: '0.0', students: [], types: [], dist: { A: 0, B: 0, C: 0, D: 0 }, act: [], last30: 0, studentCount: 0 };
  const maxAct = Math.max(...d.act.map(a => a[1]), 1);
  const bars = d.act.map(a => { const h = Math.max(2, Math.round(a[1] / maxAct * 60)); return '<div title="' + a[0] + ': ' + a[1] + '" style="flex:1;background:#1D6FA4;border-radius:2px 2px 0 0;min-height:2px;height:' + h + 'px;opacity:0.7"></div>'; }).join('');
  const fl = d.act[0] ? d.act[0][0].slice(5) : ''; const ll = d.act[d.act.length - 1] ? d.act[d.act.length - 1][0].slice(5) : '';
  const mxT = d.types[0] ? d.types[0][1] : 1;
  const typeRows = d.types.map(t => '<div style="display:flex;align-items:center;gap:8px;padding:5px 0"><div style="font-size:12px;color:#4A5C70;width:90px;flex-shrink:0">' + t[0] + '</div><div style="flex:1;height:5px;background:#D8E2EC;border-radius:3px;overflow:hidden"><div style="height:100%;width:' + Math.round(t[1]/mxT*100) + '%;background:#1D6FA4;border-radius:3px"></div></div><div style="font-size:12px;font-weight:600;color:#0E1E35;width:28px;text-align:right">' + t[1] + '</div></div>').join('');
  const dColors = { A: '#1A7F5A', B: '#1D6FA4', C: '#92520C', D: '#A32D2D' };
  const dLabels = { A: 'A (9-10)', B: 'B (7-8)', C: 'C (5-6)', D: 'D (<5)' };
  const maxD = Math.max(d.dist.A, d.dist.B, d.dist.C, d.dist.D, 1);
  const distRows = Object.entries(d.dist).map(([k, v]) => '<div style="display:flex;align-items:center;gap:8px;padding:5px 0"><div style="font-size:12px;color:#4A5C70;width:60px;flex-shrink:0">' + dLabels[k] + '</div><div style="flex:1;height:5px;background:#D8E2EC;border-radius:3px;overflow:hidden"><div style="height:100%;width:' + Math.round(v/maxD*100) + '%;background:' + dColors[k] + ';border-radius:3px"></div></div><div style="font-size:12px;font-weight:600;color:#0E1E35;width:28px;text-align:right">' + v + '</div></div>').join('');
  const studentRows = d.students.length ? d.students.map(s => '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #D8E2EC;font-size:13px"><div><div style="font-weight:500;color:#1A2638">' + s.name + '</div><div style="font-size:12px;color:#8A9BAD">' + s.count + ' correcciones</div></div><div style="font-family:serif;font-size:18px;color:' + (Number(s.avg) >= 7 ? '#1A7F5A' : Number(s.avg) >= 5 ? '#92520C' : '#A32D2D') + '">' + s.avg + '</div></div>').join('') : '<div style="text-align:center;padding:24px;color:#8A9BAD;font-size:14px">Sin datos a&uacute;n</div>';
  const mainContent = noAuth
    ? '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center"><div style="background:white;border:1px solid #D8E2EC;border-radius:16px;padding:40px;max-width:380px;width:100%;text-align:center"><div style="font-family:serif;font-size:26px;color:#0E1E35;margin-bottom:8px">Dashboard</div><div style="font-size:14px;color:#4A5C70;margin-bottom:24px">Inicia sesi&oacute;n para ver las estad&iacute;sticas.</div><a href="/app" style="display:block;background:#0E1E35;color:white;text-decoration:none;padding:12px;border-radius:8px;font-size:14px;font-weight:500">Ir al app</a></div></div>'
    : '<main style="max-width:960px;margin:0 auto;padding:80px 24px 80px">' +
      '<div style="font-family:serif;font-size:36px;color:#0E1E35;margin-bottom:6px">Dashboard del profesor</div>' +
      '<div style="font-size:15px;color:#4A5C70;font-weight:300;margin-bottom:28px">Resumen de actividad de correcci&oacute;n</div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">' +
        '<div style="background:white;border:1px solid #D8E2EC;border-radius:12px;padding:18px 20px"><div style="font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#8A9BAD;margin-bottom:8px">Total correcciones</div><div style="font-family:serif;font-size:32px;color:#0E1E35">' + d.total + '</div></div>' +
        '<div style="background:white;border:1px solid #D8E2EC;border-radius:12px;padding:18px 20px"><div style="font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#8A9BAD;margin-bottom:8px">Nota media</div><div style="font-family:serif;font-size:32px;color:#0E1E35">' + d.avg + '</div><div style="font-size:12px;color:#4A5C70">sobre 10</div></div>' +
        '<div style="background:white;border:1px solid #D8E2EC;border-radius:12px;padding:18px 20px"><div style="font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#8A9BAD;margin-bottom:8px">Alumnos distintos</div><div style="font-family:serif;font-size:32px;color:#0E1E35">' + d.studentCount + '</div></div>' +
        '<div style="background:white;border:1px solid #D8E2EC;border-radius:12px;padding:18px 20px"><div style="font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#8A9BAD;margin-bottom:8px">&Uacute;ltimos 30 d&iacute;as</div><div style="font-family:serif;font-size:32px;color:#0E1E35">' + d.last30 + '</div></div>' +
      '</div>' +
      '<div style="background:white;border:1px solid #D8E2EC;border-radius:12px;margin-bottom:16px">' +
        '<div style="padding:16px 20px;border-bottom:1px solid #D8E2EC;font-size:13px;font-weight:600;color:#0E1E35">Actividad &mdash; &uacute;ltimos 30 d&iacute;as</div>' +
        '<div style="padding:16px 20px"><div style="display:flex;align-items:flex-end;gap:2px;height:64px">' + bars + '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:10px;color:#8A9BAD;padding-top:4px"><span>' + fl + '</span><span>' + ll + '</span></div></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
        '<div style="background:white;border:1px solid #D8E2EC;border-radius:12px"><div style="padding:16px 20px;border-bottom:1px solid #D8E2EC;font-size:13px;font-weight:600;color:#0E1E35">Top alumnos</div><div style="padding:16px 20px">' + studentRows + '</div></div>' +
        '<div style="background:white;border:1px solid #D8E2EC;border-radius:12px"><div style="padding:16px 20px;border-bottom:1px solid #D8E2EC;font-size:13px;font-weight:600;color:#0E1E35">Distribuci&oacute;n y tipos</div><div style="padding:16px 20px">' + distRows + '<div style="font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#8A9BAD;margin:12px 0 8px">Tipos de writing</div>' + typeRows + '</div></div>' +
      '</div>' +
      '</main>';
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Dashboard &mdash; WritingCorrect</title><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"><style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:\'DM Sans\',system-ui,sans-serif;background:#D4DAE3;color:#1A2638;-webkit-font-smoothing:antialiased}nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(235,238,242,0.97);backdrop-filter:blur(12px);border-bottom:1px solid #D8E2EC;padding:0 2rem;height:60px;display:flex;align-items:center;justify-content:space-between}.logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:#0E1E35;font-family:\'DM Sans\',sans-serif;font-weight:600;font-size:17px}.logo-mark{width:34px;height:34px;background:#0E1E35;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}.back-btn{background:white;border:1px solid #D8E2EC;border-radius:7px;padding:6px 14px;font-size:13px;color:#4A5C70;font-weight:500;text-decoration:none;transition:all 0.2s}.back-btn:hover{border-color:#4A5C70;color:#0E1E35}@media(max-width:640px){main{padding:72px 16px 60px!important}[style*="grid-template-columns:repeat(4"]{grid-template-columns:repeat(2,1fr)!important}[style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr!important}}</style></head><body><nav><a href="/app" class="logo"><div class="logo-mark">&#9997;</div>&nbsp;Writing<span style="color:#1D6FA4">Correct</span></a><a href="/app" class="back-btn">&larr; Volver al app</a></nav>' + mainContent + '</body></html>';
}
