export const config = { runtime: 'edge' };
export default async function handler(req) {
  const js = `
(function() {
  'use strict';

  // ---- Config ----
  var MODAL_ID = 'wc-genlink-modal';
  var BTN_ID = 'wc-genlink-btn';
  var API = '/api/generate-link';

  function getAuthToken() {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.includes('auth-token')) {
        try {
          var val = JSON.parse(localStorage.getItem(key));
          return val && val.access_token ? val.access_token : null;
        } catch(e) {}
      }
    }
    return null;
  }

  function createModal() {
    if (document.getElementById(MODAL_ID)) return;
    var overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(14,30,53,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease';
    overlay.innerHTML = `
      <div style="background:white;border-radius:16px;max-width:420px;width:100%;padding:32px 28px;box-shadow:0 24px 80px rgba(14,30,53,0.2);position:relative;">
        <button onclick="document.getElementById('wc-genlink-modal').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:20px;color:#8A9BAD;cursor:pointer;line-height:1">&times;</button>
        <div style="font-family:'DM Serif Display',serif;font-size:22px;color:#0E1E35;margin-bottom:6px">Generar enlace de alumno</div>
        <div style="font-size:13px;color:#4A5C70;margin-bottom:24px;font-weight:300">Crea un enlace compartible para que tus alumnos envíen su writing directamente.</div>
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#4A5C70;margin-bottom:6px">Nivel</label>
          <select id="wc-gl-nivel" style="width:100%;padding:10px 14px;border:1.5px solid #D8E2EC;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;color:#1A2638;background:white;outline:none">
            <option value="A2">A2 - Elementary</option>
            <option value="B1" selected>B1 - Intermediate</option>
            <option value="B2">B2 - Upper Intermediate</option>
            <option value="C1">C1 - Advanced</option>
          </select>
        </div>
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#4A5C70;margin-bottom:6px">Tipo de writing</label>
          <select id="wc-gl-type" style="width:100%;padding:10px 14px;border:1.5px solid #D8E2EC;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;color:#1A2638;background:white;outline:none">
            <option value="formal_email">Email formal</option>
            <option value="informal_email">Email informal</option>
            <option value="essay" selected>Essay / Redacción</option>
            <option value="report">Report</option>
            <option value="letter">Carta formal</option>
            <option value="review">Review</option>
          </select>
        </div>
        <div style="margin-bottom:24px">
          <label style="display:block;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#4A5C70;margin-bottom:6px">Válido durante</label>
          <select id="wc-gl-days" style="width:100%;padding:10px 14px;border:1.5px solid #D8E2EC;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;color:#1A2638;background:white;outline:none">
            <option value="7">7 días</option>
            <option value="30" selected>30 días</option>
            <option value="90">90 días</option>
            <option value="365">1 año</option>
          </select>
        </div>
        <button id="wc-gl-submit" onclick="wcGenerateLink()" style="width:100%;padding:13px;background:#0E1E35;color:white;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;cursor:pointer;transition:all 0.2s">Generar enlace</button>
        <div id="wc-gl-result" style="display:none;margin-top:16px"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  }

  window.wcGenerateLink = function() {
    var token = getAuthToken();
    if (!token) { alert('Sesión no encontrada. Recarga la página.'); return; }
    var btn = document.getElementById('wc-gl-submit');
    var result = document.getElementById('wc-gl-result');
    var nivel = document.getElementById('wc-gl-nivel').value;
    var writing_type = document.getElementById('wc-gl-type').value;
    var days = document.getElementById('wc-gl-days').value;
    btn.textContent = 'Generando...';
    btn.disabled = true;
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ nivel: nivel, writing_type: writing_type, days: parseInt(days) })
    }).then(function(r) { return r.json(); }).then(function(data) {
      btn.textContent = 'Generar otro enlace';
      btn.disabled = false;
      if (data.error) {
        result.style.display = 'block';
        result.innerHTML = '<div style="background:#FCEBEB;border:1px solid #F09595;border-radius:7px;padding:10px 14px;font-size:13px;color:#A32D2D">Error: ' + data.error + '</div>';
      } else {
        result.style.display = 'block';
        result.innerHTML = '<div style="background:#E6F6EF;border:1px solid #A8DCC3;border-radius:7px;padding:12px 14px">'
          + '<div style="font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#1A7F5A;margin-bottom:8px">Enlace generado</div>'
          + '<div style="display:flex;gap:8px;align-items:center">'
          + '<input id="wc-gl-url" value="' + data.url + '" readonly style="flex:1;padding:8px 10px;border:1px solid #A8DCC3;border-radius:6px;font-size:12px;font-family:monospace;background:white;color:#1A2638;outline:none">'
          + '<button onclick="navigator.clipboard.writeText(document.getElementById('wc-gl-url').value).then(function(){var b=this;b.textContent='\u2713 Copiado';setTimeout(function(){b.textContent='Copiar'},2000)}.bind(this))" style="padding:8px 12px;background:#1A7F5A;color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer;white-space:nowrap">Copiar</button>'
          + '</div>'
          + '<div style="font-size:11px;color:#1A7F5A;margin-top:6px">Válido hasta: ' + new Date(data.expires_at).toLocaleDateString('es-ES') + '</div>'
          + '</div>';
      }
    }).catch(function(e) {
      btn.textContent = 'Generar enlace';
      btn.disabled = false;
      result.style.display = 'block';
      result.innerHTML = '<div style="background:#FCEBEB;border:1px solid #F09595;border-radius:7px;padding:10px 14px;font-size:13px;color:#A32D2D">Error de conexión</div>';
    });
  };

  function addButton() {
    if (document.getElementById(BTN_ID)) return;
    // Find the history section header (Historial tab content)
    var histTitle = document.querySelector('.page-title');
    if (!histTitle) return;
    var titleText = histTitle.textContent || '';
    if (!titleText.includes('Historial') && !titleText.includes('historial')) return;

    // Find section-top to inject after
    var sectionTop = document.querySelector('.section-top');
    if (!sectionTop) return;

    var btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.onclick = function() { createModal(); };
    btn.style.cssText = 'display:inline-flex;align-items:center;gap:7px;padding:8px 16px;background:#0E1E35;color:white;border:none;border-radius:8px;font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s;margin-bottom:16px';
    btn.innerHTML = '<span style="font-size:16px">🔗</span> Generar enlace de alumno';
    btn.onmouseover = function() { this.style.background = '#1B3252'; this.style.transform = 'translateY(-1px)'; };
    btn.onmouseout = function() { this.style.background = '#0E1E35'; this.style.transform = 'translateY(0)'; };

    // Insert after section-top div
    sectionTop.parentNode.insertBefore(btn, sectionTop.nextSibling);
  }

  function addDashboardLink() {
      if (document.getElementById('wc-dash-link')) return;
          var nav = document.querySelector('nav');
              if (!nav) return;
                  var navRight = nav.querySelector('.nav-right');
                      if (!navRight) return;
                          var link = document.createElement('a');
                              link.id = 'wc-dash-link';
                                  link.href = '/dashboard';
                                      link.style.cssText = 'padding:6px 14px;background:white;border:1px solid #D8E2EC;border-radius:7px;font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:500;color:#4A5C70;text-decoration:none;display:flex;align-items:center;gap:5px;transition:all 0.2s';
                                          link.innerHTML = '&#128202; Dashboard';
                                              link.onmouseover = function() { this.style.borderColor = '#4A5C70'; this.style.color = '#0E1E35'; };
                                                  link.onmouseout = function() { this.style.borderColor = '#D8E2EC'; this.style.color = '#4A5C70'; };
                                                      navRight.insertBefore(link, navRight.firstChild);
                                                        }
  // Watch for DOM changes (React renders dynamically)
  var observer = new MutationObserver(function() {
    addButton();
          addDashboardLink();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  // Initial check
  addButton();
      addDashboardLink();
})();
`;
  return new Response(js, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store'
    }
  });
}
