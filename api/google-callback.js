export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://onrnbbjajlmdesoyqcrf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ucm5iYmphamxtZGVzb3lxY3JmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzEwNjUyOSwiZXhwIjoyMDkyNjgyNTI5fQ.dEhjogCK_du9FogA70VJkN6whKrotJihK6mzC-5EloE';

export default async function handler(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // POST: insertar alumnos en servidor con service_role
  if (req.method === 'POST') {
    const body = await req.json();
    const { courseId, accessToken: at, claseId: cid, userId: uid } = body;

    const studentsRes = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/students`, {
      headers: { Authorization: `Bearer ${at}` },
    });
    const studentsData = await studentsRes.json();
    const students = studentsData.students || [];

    if (students.length === 0) {
      return new Response(JSON.stringify({ error: 'No se encontraron alumnos en esa clase.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const alumnos = students.map(s => ({
      clase_id: cid,
      user_id: uid,
      nombre: s.profile.name.fullName,
    }));

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/alumnos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(alumnos),
    });

    if (insertRes.ok) {
      return new Response(JSON.stringify({ ok: true, count: alumnos.length }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    } else {
      const err = await insertRes.text();
      return new Response(JSON.stringify({ error: err }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // GET: OAuth callback
  if (error) return htmlResponse(`<p>Error OAuth: ${error}</p>`);
  if (!code || !stateRaw) return htmlResponse('<p>Parámetros inválidos.</p>');

  let claseId, userId;
  try {
    const decoded = JSON.parse(atob(stateRaw));
    claseId = decoded.clase_id;
    userId = decoded.user_id;
  } catch {
    return htmlResponse('<p>State inválido.</p>');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: 'https://writingcorrect.com/api/google-callback',
      grant_type: 'authorization_code',
    }),
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) return htmlResponse(`<p>Error obteniendo token: ${JSON.stringify(tokenData)}</p>`);

  const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const coursesData = await coursesRes.json();
  const courses = coursesData.courses || [];
  if (courses.length === 0) return htmlResponse('<p>No se encontraron clases activas en Google Classroom.</p>');

  const courseOptions = courses
    .map(c => `<option value="${c.id}">${c.name}${c.section ? ' — ' + c.section : ''}</option>`)
    .join('');

  const AT = JSON.stringify(accessToken);
  const CID = JSON.stringify(claseId);
  const UID = JSON.stringify(userId);

  return new Response(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Importar desde Google Classroom</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 32px; max-width: 480px; width: 100%; box-shadow: 0 2px 16px rgba(0,0,0,0.1); }
    h2 { font-size: 1.25rem; color: #1a1a2e; margin-bottom: 8px; }
    p { color: #666; font-size: 0.9rem; margin-bottom: 24px; }
    select { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; margin-bottom: 16px; background: #fafafa; }
    button { width: 100%; padding: 12px; background: #1a1a2e; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 500; }
    button:hover { background: #2d2d4e; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .success { display: none; background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 8px; padding: 16px; margin-top: 16px; color: #2e7d32; font-size: 0.9rem; }
    .error-msg { display: none; background: #ffebee; border: 1px solid #ef9a9a; border-radius: 8px; padding: 16px; margin-top: 16px; color: #c62828; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Importar desde Google Classroom</h2>
    <p>Selecciona la clase de Google Classroom cuyos alumnos quieres importar.</p>
    <select id="courseSelect">
      <option value="">— Selecciona una clase —</option>
      ${courseOptions}
    </select>
    <button id="btn" onclick="importar()">Importar alumnos</button>
    <div class="success" id="success"></div>
    <div class="error-msg" id="errorMsg"></div>
  </div>
  <script>
    const ACCESS_TOKEN = ${AT};
    const CLASE_ID = ${CID};
    const USER_ID = ${UID};
    async function importar() {
      const courseId = document.getElementById('courseSelect').value;
      if (!courseId) { alert('Selecciona una clase primero.'); return; }
      const btn = document.getElementById('btn');
      btn.disabled = true;
      btn.textContent = 'Importando...';
      document.getElementById('success').style.display = 'none';
      document.getElementById('errorMsg').style.display = 'none';
      try {
        const res = await fetch('/api/google-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, accessToken: ACCESS_TOKEN, claseId: CLASE_ID, userId: USER_ID })
        });
        const data = await res.json();
        btn.disabled = false;
        btn.textContent = 'Importar alumnos';
        if (data.ok) {
          document.getElementById('success').textContent = '✓ ' + data.count + ' alumno(s) importados. Puedes cerrar esta ventana.';
          document.getElementById('success').style.display = 'block';
        } else {
          document.getElementById('errorMsg').textContent = 'Error: ' + (data.error || 'desconocido');
          document.getElementById('errorMsg').style.display = 'block';
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Importar alumnos';
        document.getElementById('errorMsg').textContent = 'Error: ' + err.message;
        document.getElementById('errorMsg').style.display = 'block';
      }
    }
  </script>
</body>
</html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function htmlResponse(body) {
  return new Response(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px">${body}</body></html>`, {
    status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
