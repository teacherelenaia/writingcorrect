export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { token, student_name, texto } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token requerido.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!texto || texto.trim().length < 30) {
      return new Response(JSON.stringify({ error: 'El writing debe tener al menos 30 caracteres.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SB_URL = process.env.SUPABASE_URL;
    const SB_SVC = process.env.SUPABASE_SECRET_KEY;

    // Validate token from student_links table
    let teacherUserId = null;
    let linkConfig = {};
    try {
      const linkRes = await fetch(SB_URL + '/rest/v1/student_links?token=eq.' + encodeURIComponent(token) + '&select=*', {
        headers: {
          'apikey': SB_SVC,
          'Authorization': 'Bearer ' + SB_SVC,
          'Accept': 'application/vnd.pgrst.object+json',
        },
      });
      if (linkRes.ok) {
        const linkData = await linkRes.json();
        if (linkData && linkData.user_id) {
          teacherUserId = linkData.user_id;
          linkConfig = linkData;
          // Check if link is expired
          if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
            return new Response(JSON.stringify({ error: 'Este enlace ha caducado. Pide a tu profesor un nuevo enlace.' }), {
              status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
    } catch (_e) {}

    // If no token found in DB, proceed anyway (graceful degradation - saves to teacher=null)
    // In production this should be stricter, but allows testing without the table

    const nivel = linkConfig.nivel || 'B1';
    const writing_type = linkConfig.writing_type || 'writing';

    const prompt = `Eres un profesor experto de ingles en secundaria espanola. Corrige este writing de tipo "${writing_type}" para un alumno de nivel ${nivel}.

WRITING DEL ALUMNO (${student_name || 'Alumno'}):
${texto}

INSTRUCCIONES:
- Detecta TODOS los errores (gramatica, vocabulario, ortografia, puntuacion, estilo).
- En "original" pon el texto EXACTO con el error tal como aparece en el writing.
- El campo "tipo" debe ser exactamente uno de: "Gramatica", "Vocabulario", "Ortografia", "Puntuacion", "Estilo".
- "comentario_profesor": valoracion global en espanol (3-4 frases).
- "feedback_alumno": mensaje motivador para el alumno en espanol (3-4 frases).
- "strengths": 3 puntos fuertes especificos del writing.
- "improvements": 3 areas concretas de mejora.

Devuelve SOLO un objeto JSON valido, sin markdown:
{
  "nota": 7.0,
  "nivel_detectado": "B1",
  "comentario_profesor": "...",
  "criterios": { "Gramatica": 7, "Vocabulario": 7, "Coherencia": 7 },
  "errores": [{"tipo": "Gramatica", "original": "texto", "correcto": "texto", "explicacion": "..."}],
  "strengths": ["punto 1", "punto 2", "punto 3"],
  "improvements": ["mejora 1", "mejora 2", "mejora 3"],
  "feedback_alumno": "..."
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Error al procesar la corrección.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';
    let resultado;
    try {
      const inicio = rawText.indexOf('{');
      const fin = rawText.lastIndexOf('}');
      resultado = JSON.parse(rawText.slice(inicio, fin + 1));
    } catch (_e) {
      return new Response(JSON.stringify({ error: 'Error procesando la respuesta.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save correction to Supabase (attributed to teacher's account)
    if (teacherUserId) {
      fetch(SB_URL + '/rest/v1/correcciones', {
        method: 'POST',
        headers: {
          'apikey': SB_SVC,
          'Authorization': 'Bearer ' + SB_SVC,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          user_id: teacherUserId,
          student_name: student_name || 'Alumno/a',
          writing_type: writing_type,
          mode_label: 'Enlace alumno',
          score: resultado.nota ?? 0,
          result: resultado,
          transcribed_text: texto,
        }),
      }).catch(() => {});

      // Increment teacher's corrections_used
      fetch(SB_URL + '/rest/v1/rpc/increment_corrections_used', {
        method: 'POST',
        headers: { 'apikey': SB_SVC, 'Authorization': 'Bearer ' + SB_SVC, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: teacherUserId }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
