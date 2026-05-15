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
    const { texto } = body;
    if (!texto || texto.trim().length < 20) {
      return new Response(JSON.stringify({ error: 'Escribe al menos 20 palabras para la demo.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (texto.length > 800) {
      return new Response(JSON.stringify({ error: 'La demo acepta textos de hasta 800 caracteres.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Eres un profesor experto de ingles en secundaria espanola. Corrige este writing de un alumno de nivel B1-B2.

WRITING DEL ALUMNO:
${texto}

INSTRUCCIONES:
- Detecta TODOS los errores (gramatica, vocabulario, ortografia, puntuacion, estilo).
- En "original" pon el texto EXACTO con el error tal como aparece.
- El campo "tipo" debe ser exactamente uno de: "Gramatica", "Vocabulario", "Ortografia", "Puntuacion", "Estilo".
- "comentario_profesor": valoracion global en espanol (2-3 frases).
- "feedback_alumno": mensaje motivador para el alumno en espanol (2-3 frases).
- "strengths": 2 puntos fuertes especificos del writing.
- "improvements": 2 areas concretas de mejora.

Devuelve SOLO un objeto JSON valido, sin markdown:
{
  "nota": 7.0,
  "nivel_detectado": "B1",
  "comentario_profesor": "...",
  "criterios": { "Gramatica": 7, "Vocabulario": 7, "Coherencia": 7 },
  "errores": [{"tipo": "Gramatica", "original": "texto", "correcto": "texto", "explicacion": "..."}],
  "strengths": ["punto 1", "punto 2"],
  "improvements": ["mejora 1", "mejora 2"],
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
        max_tokens: 2000,
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

    // Limit result for demo: show note, first 2 errors, hide rest
    const demoResult = {
      nota: resultado.nota,
      nivel_detectado: resultado.nivel_detectado,
      comentario_profesor: resultado.comentario_profesor,
      criterios: resultado.criterios,
      errores: (resultado.errores || []).slice(0, 2),
      errores_total: (resultado.errores || []).length,
      strengths: (resultado.strengths || []).slice(0, 1),
      improvements: (resultado.improvements || []).slice(0, 1),
      feedback_alumno: resultado.feedback_alumno,
      demo: true,
    };

    return new Response(JSON.stringify(demoResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
