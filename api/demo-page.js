export const config = { runtime: 'edge' };

export default async function handler(req) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Demo Gratuita - WritingCorrect</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{--navy:#0E1E35;--blue:#1A6AFF;--slate:#475569;--light:#f8fafc;--border:#e2e8f0;--serif:'Georgia',serif;--sans:system-ui,-apple-system,sans-serif}
  body{font-family:var(--sans);background:var(--light);color:var(--navy);min-height:100vh}
  .topbar{background:var(--navy);padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
  .topbar a{color:white;text-decoration:none;font-weight:700;font-size:18px}
  .topbar .reg-btn{background:#1A6AFF;color:white;padding:8px 18px;border-radius:7px;font-size:14px;font-weight:600}
  .container{max-width:720px;margin:0 auto;padding:40px 20px}
  h1{font-size:28px;font-weight:800;margin-bottom:6px}
  .subtitle{color:var(--slate);margin-bottom:32px;font-size:16px}
  .demo-badge{display:inline-block;background:#FEF3C7;color:#92400E;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;margin-bottom:16px;letter-spacing:0.5px}
  textarea{width:100%;border:2px solid var(--border);border-radius:10px;padding:16px;font-size:15px;font-family:var(--sans);resize:vertical;min-height:160px;transition:border 0.2s;outline:none}
  textarea:focus{border-color:var(--blue)}
  .char-count{text-align:right;font-size:12px;color:var(--slate);margin-top:4px}
  .btn{background:var(--navy);color:white;border:none;padding:14px 32px;border-radius:9px;font-size:16px;font-weight:700;cursor:pointer;width:100%;margin-top:16px;font-family:var(--sans);transition:background 0.2s}
  .btn:hover{background:#1e3a5f}
  .btn:disabled{opacity:0.6;cursor:not-allowed}
  #result{margin-top:32px;display:none}
  .result-card{background:white;border-radius:12px;border:1px solid var(--border);overflow:hidden}
  .result-header{background:var(--navy);color:white;padding:20px 24px;display:flex;align-items:center;gap:16px}
  .nota-circle{width:64px;height:64px;border-radius:50%;background:white;color:var(--navy);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;font-family:var(--serif);flex-shrink:0}
  .result-meta h2{font-size:18px;margin-bottom:2px}
  .result-meta p{opacity:0.7;font-size:14px}
  .result-body{padding:24px}
  .section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--slate);margin-bottom:12px;margin-top:20px}
  .section-title:first-child{margin-top:0}
  .comment-box{background:#f1f5f9;border-radius:8px;padding:14px 16px;font-size:14px;line-height:1.6;color:var(--navy)}
  .criterios-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .crit-item{background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center}
  .crit-num{font-size:20px;font-weight:800;color:var(--navy);font-family:var(--serif)}
  .crit-label{font-size:11px;color:var(--slate);margin-top:2px}
  .error-item{border:1px solid #fee2e2;border-radius:8px;padding:12px 14px;margin-bottom:8px;background:#fff5f5}
  .error-tipo{display:inline-block;background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;margin-bottom:6px}
  .error-original{font-size:14px;margin-bottom:4px}<br>  .error-original del{color:#dc2626;text-decoration:line-through;font-style:italic}
  .error-original ins{color:#16a34a;text-decoration:none;font-weight:600}
  .error-expl{font-size:13px;color:var(--slate);line-height:1.5}
  .blur-section{position:relative;overflow:hidden}
  .blur-section::after{content:'';position:absolute;top:0;left:0;right:0;bottom:0;backdrop-filter:blur(4px);background:rgba(248,250,252,0.5)}
  .blur-msg{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1;text-align:center;background:white;border-radius:12px;padding:20px 28px;box-shadow:0 4px 24px rgba(0,0,0,0.12);width:280px}
  .blur-msg strong{display:block;font-size:15px;margin-bottom:8px}
  .blur-msg p{font-size:13px;color:var(--slate);margin-bottom:14px}
  .cta-section{background:linear-gradient(135deg,#0E1E35,#1A3A6A);border-radius:12px;padding:28px;text-align:center;margin-top:24px;color:white}
  .cta-section h3{font-size:20px;margin-bottom:8px}
  .cta-section p{opacity:0.75;font-size:14px;margin-bottom:20px}
  .cta-btn{display:inline-block;background:#1A6AFF;color:white;padding:13px 28px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;transition:background 0.2s}
  .cta-btn:hover{background:#0052cc}
  .loading{text-align:center;padding:32px;color:var(--slate)}
  .spinner{display:inline-block;width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:var(--navy);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px}
  @keyframes spin{to{transform:rotate(360deg)}}
  .error-msg{background:#fee2e2;color:#991b1b;padding:12px 16px;border-radius:8px;margin-top:16px;font-size:14px}
</style>
</head>
<body>
<div class="topbar">
  <a href="/">WritingCorrect</a>
  <a href="/app" class="reg-btn">Registrarse gratis</a>
</div>
<div class="container">
  <div class="demo-badge">DEMO GRATUITA</div>
  <h1>Prueba WritingCorrect ahora</h1>
  <p class="subtitle">Sin registro. Pega un writing en inglés y obtén corrección con IA en segundos.</p>
  
  <textarea id="texto" placeholder="Pega aquí el writing en inglés (mínimo 20 palabras, máximo 800 caracteres)..." oninput="updateCount()"></textarea>
  <div class="char-count"><span id="charCount">0</span> / 800 caracteres</div>
  
  <button class="btn" id="btn" onclick="corregir()">Corregir ahora →</button>
  <div id="errorMsg" class="error-msg" style="display:none"></div>
  
  <div id="result">
    <div id="loadingDiv" class="loading" style="display:none">
      <div class="spinner"></div>
      <div>Corrigiendo con IA...</div>
    </div>
    <div id="resultContent"></div>
  </div>
</div>

<script>
function updateCount() {
  var t = document.getElementById('texto').value;
  document.getElementById('charCount').textContent = t.length;
}

function corregir() {
  var texto = document.getElementById('texto').value.trim();
  if (!texto || texto.length < 20) {
    showError('Escribe al menos 20 palabras para obtener la corrección.');
    return;
  }
  if (texto.length > 800) {
    showError('El texto no puede superar los 800 caracteres.');
    return;
  }
  document.getElementById('errorMsg').style.display = 'none';
  document.getElementById('btn').disabled = true;
  document.getElementById('btn').textContent = 'Corrigiendo...';
  document.getElementById('result').style.display = 'block';
  document.getElementById('loadingDiv').style.display = 'block';
  document.getElementById('resultContent').innerHTML = '';

  fetch('/api/demo', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ texto: texto })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    document.getElementById('loadingDiv').style.display = 'none';
    document.getElementById('btn').disabled = false;
    document.getElementById('btn').textContent = 'Corregir ahora →';
    if (d.error) { showError(d.error); return; }
    renderResult(d);
  })
  .catch(function() {
    document.getElementById('loadingDiv').style.display = 'none';
    document.getElementById('btn').disabled = false;
    document.getElementById('btn').textContent = 'Corregir ahora →';
    showError('Error de conexión. Inténtalo de nuevo.');
  });
}

function showError(msg) {
  var el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.style.display = 'block';
}

function renderResult(d) {
  var nota = d.nota || 0;
  var nivel = d.nivel_detectado || '';
  var criterios = d.criterios || {};
  var errores = d.errores || [];
  var totalErrores = d.errores_total || errores.length;
  var comentario = d.comentario_profesor || '';
  var feedback = d.feedback_alumno || '';

  var critsHtml = '';
  Object.keys(criterios).forEach(function(k) {
    critsHtml += '<div class="crit-item"><div class="crit-num">' + criterios[k].toFixed(1) + '</div><div class="crit-label">' + k + '</div></div>';
  });

  var erroresHtml = '';
  errores.forEach(function(e) {
    erroresHtml += '<div class="error-item"><span class="error-tipo">' + e.tipo + '</span><div class="error-original"><del>' + e.original + '</del> → <ins>' + e.correcto + '</ins></div><div class="error-expl">' + e.explicacion + '</div></div>';
  });

  var hiddenCount = totalErrores - errores.length;
  var blurHtml = '';
  if (hiddenCount > 0) {
    blurHtml = '<div class="blur-section" style="min-height:80px"><div style="opacity:0.3">' + hiddenCount + ' errores más encontrados...</div><div class="blur-msg"><strong>+' + hiddenCount + ' errores más</strong><p>Regístrate gratis para ver todos los errores, el feedback completo y el PDF.</p><a href="/app" class="cta-btn" style="display:inline-block;padding:10px 20px;font-size:14px">Ver todos los errores →</a></div></div>';
  }

  document.getElementById('resultContent').innerHTML =
    '<div class="result-card">' +
      '<div class="result-header">' +
        '<div class="nota-circle">' + nota + '</div>' +
        '<div class="result-meta"><h2>Nivel detectado: ' + nivel + '</h2><p>Corrección completada por IA</p></div>' +
      '</div>' +
      '<div class="result-body">' +
        '<div class="section-title">Valoración del profesor</div>' +
        '<div class="comment-box">' + comentario + '</div>' +
        (Object.keys(criterios).length ? '<div class="section-title">Criterios</div><div class="criterios-grid">' + critsHtml + '</div>' : '') +
        '<div class="section-title">Errores encontrados (' + totalErrores + ' total)</div>' +
        erroresHtml +
        blurHtml +
      '</div>' +
    '</div>' +
    '<div class="cta-section">' +
      '<h3>¿Quieres ver la corrección completa?</h3>' +
      '<p>Regístrate gratis y obtén 5 correcciones al mes. Sin tarjeta de crédito.</p>' +
      '<a href="/app" class="cta-btn">Crear cuenta gratuita →</a>' +
    '</div>';
}
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
