export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://onrnbbjajlmdesoyqcrf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return htmlResponse(`<p>Error OAuth: ${error}</p>`);
  }

  if (!code || !stateRaw) {
    return htmlResponse('<p>Parámetros inválidos.</p>');
  }

  let claseId, userId;
  try {
    const decoded = JSON.parse(atob(stateRaw));
    claseId = decoded.clase_id;
    userId = decoded.user_id;
  } catch {
    return htmlResponse('<p>State inválido.</p>');
  }

  // 1. Intercambiar code por access_token
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

  if (!accessToken) {
    return htmlResponse(`<p>Error obteniendo token: ${JSON.stringify(tokenData)}</p>`);
  }

  // 2. Listar cursos de Google Classroom
  const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const coursesData = await coursesRes.json();
  const courses = coursesData.courses || [];

  if (courses.length === 0) {
    return htmlResponse('<p>No se encontraron clases activas en Google Classroom.</p>');
  }

  // 3. Devolver HTML con selector de clase
  const courseOptions = courses
    .map(c => `<option value="${c.id}">${c.name}${c.section ? ' — ' + c.section : ''}</option>`)
    .join('');

  return new Response(
    `<!DOCTYPE html>
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
    select { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; margin-bottom: 16px; appearance: none; background: #fafafa; }
    button { width: 100%; padding: 12px; background: #1a1a2e; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 500; }
    button:hover { background: #2d2d4e; }
    .loading { display: none; text-align: center; color: #666; font-size: 0.9rem; margin-top: 12px; }
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
    <button onclick="importar()">Importar alumnos</button>
    <div class="loading" id="loading">Importando alumnos...</div>
    <div class="success" id="success"></div>
    <div class="error-msg" id="errorMsg"></div>
  </div>
  <script>
    const ACCESS_TOKEN = ${JSON.stringify(accessToken)};
    const CLASE_ID = ${JSON.stringify(claseId)};
    const USER_ID = ${JSON.stringify(userId)};

    async function importar() {
      const courseId = document.getElementById('courseSelect').value;
      if (!courseId) { alert('Selecciona una clase primero.'); return; }

      document.getElementById('loading').style.display = 'block';
      document.getElementById('success').style.display = 'none';
      document.getElementById('errorMsg').style.display = 'none';

      try {
        // Obtener alumnos del curso seleccionado
        const res = await fetch(\`https://classroom.googleapis.com/v1/courses/\${courseId}/students\`, {
          headers: { Authorization: \`Bearer \${ACCESS_TOKEN}\` }
        });
        const data = await res.json();
        const students = data.students || [];

        if (students.length === 0) {
          document.getElementById('loading').style.display = 'none';
          document.getElementById('errorMsg').textContent = 'No se encontraron alumnos en esa clase.';
          document.getElementById('errorMsg').style.display = 'block';
          return;
        }

        // Insertar en Supabase
        const alumnos = students.map(s => ({
          clase_id: CLASE_ID,
          user_id: USER_ID,
          nombre: s.profile.name.fullName,
        }));

        const insertRes = await fetch(\`https://onrnbbjajlmdesoyqcrf.supabase.co/rest/v1/alumnos\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ucm5iYmphamxtZGVzb3lxY3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MjcwODUsImV4cCI6MjA2MTAwMzA4NX0.4_sMtDiGRHGDvXUAiVMVDvxMkjFpMujmK8f6pIk9QaQ',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ucm5iYmphamxtZGVzb3lxY3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MjcwODUsImV4cCI6MjA2MTAwMzA4NX0.4_sMtDiGRHGDvXUAiVMVDvxMkjFpMujmK8f6pIk9QaQ',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(alumnos),
        });

        document.getElementById('loading').style.display = 'none';

        if (insertRes.ok) {
          document.getElementById('success').textContent = \`✓ Se importaron \${alumnos.length} alumno(s) correctamente. Puedes cerrar esta ventana y volver a WritingCorrect.\`;
          document.getElementById('success').style.display = 'block';
        } else {
          const errData = await insertRes.text();
          document.getElementById('errorMsg').textContent = 'Error al guardar en base de datos: ' + errData;
          document.getElementById('errorMsg').style.display = 'block';
        }
      } catch (err) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('errorMsg').textContent = 'Error: ' + err.message;
        document.getElementById('errorMsg').style.display = 'block';
      }
    }
  </script>
</body>
</html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

function htmlResponse(body) {
  return new Response(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px">${body}</body></html>`, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
