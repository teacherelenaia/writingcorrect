export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { texto, nivel, curso, rubrica, idioma_feedback } = body;

    if (!texto) {
      return new Response(JSON.stringify({ error: 'Texto requerido' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const nivelInfo = nivel
      ? `Nivel MCER: ${nivel}`
      : curso
      ? `Curso: ${curso}`
      : rubrica
      ? `Rúbrica personalizada: ${rubrica}`
      : 'Nivel general B1';

    const idiomaFeedback = idioma_feedback === 'en' ? 'English' : 'español';

    const prompt = `Eres un profesor experto en corrección de writings en inglés. Corrige el siguiente writing de un alumno.

${nivelInfo}
Idioma del feedback al alumno: ${idiomaFeedback}

WRITING DEL ALUMNO:
${texto}

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "nota": <número del 0 al 10 con un decimal>,
  "nivel_detectado": "<nivel MCER detectado>",
  "criterios": {
    "gramatica": <nota 0-10>,
    "vocabulario": <nota 0-10>,
    "ortografia": <nota 0-10>,
    "coherencia": <nota 0-10>,
    "adecuacion": <nota 0-10>
  },
  "errores": [
    {
      "numero": <número>,
      "tipo": "<Gramática|Vocabulario|Ortografía|Puntuación|Cohesión>",
      "original": "<texto con error>",
      "correcto": "<texto corregido>",
      "explicacion": "<explicación breve en español>"
    }
  ],
  "texto_corregido": "<writing completo con correcciones aplicadas>",
  "feedback_alumno": "<feedback pedagógico en ${idiomaFeedback}, 2-3 frases, positivo y constructivo>",
  "comentario_profesor": "<observaciones para el profesor en español, aspectos a trabajar>"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: 'Error en API de Anthropic', detalle: error }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await response.json();
    const content = data.content[0].text;

    let resultado;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      resultado = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      return new Response(JSON.stringify({ error: 'Error al parsear respuesta', raw: content }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error interno', detalle: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
