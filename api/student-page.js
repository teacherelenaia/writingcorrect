export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || url.searchParams.get('t') || '';

  if (!token) {
    const errorHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Enlace inválido</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc"><div style="text-align:center;max-width:400px;padding:40px"><h2 style="color:#0E1E35">Enlace no válido</h2><p style="color:#64748b">Este enlace no es válido o ha caducado. Pide a tu profesor un nuevo enlace.</p><a href="/" style="color:#1A6AFF">Ir a WritingCorrect →</a></div></body></html>`;
    return new Response(errorHtml, { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Corrige tu writing - WritingCorrect</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{--navy:#0E1E35;--blue:#1A6AFF;--slate:#475569;--light:#f8fafc;--border:#e2e8f0;--sans:system-ui,-apple-system,sans-serif;--serif:'Georgia',serif}
  body{font-family:var(--sans);background:var(--light);color:var(--navy);min-height:100vh}
  .topbar{background:var(--navy);padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
  .topbar .logo{color:white;font-weight:700;font-size:18px;text-decoration:none}
  .topbar .badge{background:#1A6AFF;color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
  .container{max-width:680px;margin:0 auto;padding:40px 20px}
  h1{font-size:26px;font-weight:800;margin-bottom:6px}
  .subtitle{color:var(--slate);font-size:15px;margin-bottom:28px}
  .student-form label{display:block;font-weight:600;font-size:14px;margin-bottom:6px;color:var(--navy)}
  .student-form input[type=text]{width:100%;border:2px solid var(--border);border-radius:8px;padding:11px 14px;font-size:15px;font-family:var(--sans);outline:none;transition:border 0.2s;margin-bottom:16px}
  .student-form input[type=text]:focus{border-color:var(--blue)}
  .student-form textarea{width:100%;border:2px solid var(--border);border-radius:10px;padding:16px;font-size:15px;font-family:var(--sans);resize:vertical;min-height:180px;outline:none;transition:border 0.2s}
  .student-form textarea:focus{border-color:var(--blue)}
  .char-count{text-align:right;font-size:12px;color:var(--slate);margin-top:4px;margin-bottom:16px}
  .btn{background:var(--navy);color:white;border:none;padding:14px 32px;border-radius:9px;font-size:16px;font-weight:700;cursor:pointer;width:100%;font-family:var(--sans);transition:background 0.2s}
  .btn:hover{background:#1e3a5f}
  .btn:disabled{opacity:0.6;cursor:not-allowed}
  .error-msg{background:#fee2e2;color:#991b1b;padding:12px 16px;border-radius:8px;margin-top:16px;font-size:14px;display:none}
  .loading{text-align:center;padding:32px;color:var(--slate);display:none}
  .spinner{display:inline-block;width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:var(--navy);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px}
  @keyframes spin{to{transform:rotate(360deg)}}
  #result{display:none;margin-top:32px}
  .result-card{background:white;border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:20px}
  .result-header{background:var(--navy);color:white;padding:20px 24px;display:flex;align-items:center;gap:16px}
  .nota-circle{width:64px;height:64px;border-radius:50%;background:white;color:var(--navy);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;font-family:var(--serif);flex-shrink:0}
  .result-meta h2{font-size:18px;margin-bottom:2px}
  .result-meta p{opacity:0.7;font-size:14px}
  .result-body{padding:24px}
  .section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--slate);margin-bottom:10px;margin-top:20px}
  .section-title:first-child{margin-top:0}
  .feedback-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;font-size:15px;line-height:1.6;color:#15803d}
  .error-item{border:1px solid #fee2e2;border-radius:8px;padding:12px 14px;margin-bottom:8px;background:#fff5f5}
  .error-tipo{display:inline-block;background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;margin-bottom:6px}
  .error-change{font-size:14px;margin-bottom:4px}
  .error-change del{color:#dc2626;text-decoration:line-through}
  .error-change ins{color:#16a34a;text-decoration:none;font-weight:600}
  .error-expl{font-size:13px;color:var(--slate);line-height:1.5}
  .strengths-list li{font-size:14px;color:var(--slate);margin-bottom:4px;padding-left:4px}
  .success-badge{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;text-align:center;margin-top:16px}
  .success-badge strong{color:#15803d;display:block;font-size:16px;margin-bottom:4px}
  .success-badge p{color:var(--slate);font-size:14px}
</style>
</head>
<body>
<div class="topbar">
  <a href="/" class="logo">WritingCorrect</a>
  <span class="badge">Corrección de alumno</span>
</div>
<div class="container">
  <h1>Entrega tu writing</h1>
  <p class="subtitle">Tu profesor te ha enviado este enlace para que corrijas tu writing con IA.</p>

  <div class="student-form">
    <label for="studentName">Tu nombre</label>
    <input type="text" id="studentName" placeholder="Escribe tu nombre completo..." maxlength="80">

    <label for="texto">Tu writing en inglés</label>
    <textarea id="texto" placeholder="Pega o escribe aquí tu writing en inglés..." oninput="updateCount()"></textarea>
    <div class="char-count"><span id="charCount">0</span> caracteres</div>

    <button class="btn" id="btn" onclick="submit()">Entregar y corregir →</button>
    <div class="error-msg" id="errorMsg"></div>
  </div>

  <div class="loading" id="loading">
    <div class="spinner"></div>
    <div>Corrigiendo con IA...</div>
  </div>

  <div id="result"></div>
</div>

<script>
var TOKEN = '${token}';

function updateCount() {
  document.getElementById('charCount').textContent = document.getElementById('texto').value.length;
}

function showError(msg) {
  var el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.style.display = 'block';
}

function submit() {
  var name = document.getElementById('studentName').value.trim();
  var texto = document.getElementById('texto').value.trim();
  document.getElementById('errorMsg').style.display = 'none';

  if (!name) { showError('Por favor escribe tu nombre.'); return; }
  if (!texto || texto.length < 30) { showError('El writing debe tener al menos 30 caracteres.'); return; }

  document.getElementById('btn').disabled = true;
  document.getElementById('btn').textContent = 'Corrigiendo...';
  document.getElementById('loading').style.display = 'block';
  document.getElementById('result').style.display = 'none';

  fetch('/api/student-correct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: TOKEN, student_name: name, texto: texto })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('btn').disabled = false;
    document.getElementById('btn').textContent = 'Entregar y corregir →';
    if (d.error) { showError(d.error); return; }
    renderResult(d);
  })
  .catch(function() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('btn').disabled = false;
    document.getElementById('btn').textContent = 'Entregar y corregir →';
    showError('Error de conexión. Inténtalo de nuevo.');
  });
}

function renderResult(d) {
  var nota = d.nota || 0;
  var nivel = d.nivel_detectado || '';
  var errores = d.errores || [];
  var feedback = d.feedback_alumno || '';
  var strengths = d.strengths || [];

  var erroresHtml = errores.map(function(e) {
    return '<div class="error-item"><span class="error-tipo">' + e.tipo + '</span>' +
      '<div class="error-change"><del>' + e.original + '</del> → <ins>' + e.correcto + '</ins></div>' +
      '<div class="error-expl">' + e.explicacion + '</div></div>';
  }).join('');

  var strengthsHtml = strengths.length ? '<ul class="strengths-list">' + strengths.map(function(s) {
    return '<li>✓ ' + s + '</li>';
  }).join('') + '</ul>' : '';

  document.getElementById('result').style.display = 'block';
  document.getElementById('result').innerHTML =
    '<div class="result-card">' +
      '<div class="result-header">' +
        '<div class="nota-circle">' + nota + '</div>' +
        '<div class="result-meta"><h2>Nivel detectado: ' + nivel + '</h2><p>Tu corrección está lista</p></div>' +
      '</div>' +
      '<div class="result-body">' +
        (feedback ? '<div class="section-title">Feedback de tu profesor IA</div><div class="feedback-box">' + feedback + '</div>' : '') +
        (errores.length ? '<div class="section-title">Errores encontrados (' + errores.length + ')</div>' + erroresHtml : '') +
        (strengths.length ? '<div class="section-title">Puntos fuertes</div>' + strengthsHtml : '') +
      '</div>' +
    '</div>' +
    '<div class="success-badge"><strong>✓ Corrección enviada a tu profesor</strong><p>Tu profesor podrá ver tu nota y errores en el historial de WritingCorrect.</p></div>';
}
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
