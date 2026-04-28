export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { texto, nivel, curso, idioma_feedback, images } = body;

    if (!texto || texto.length < 5) {
      return new Response(JSON.stringify({ error: 'Texto requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (texto === '__transcribe__' && images && images.length > 0) {
      const transcribeContent = [
        ...images.map((img) => ({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.base64 },
        })),
        { type: 'text', text: 'Transcribe el texto del writing tal cual aparece, respetando los errores ortográficos y gramaticales originales. Devuelve SOLO el texto transcrito.' },
      ];

      const tRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1500,
          messages: [{ role: 'user', content: transcribeContent }],
        }),
      });

      const tData = await tRes.json();
      const transcription = tData.content?.[0]?.text || '';
      return new Response(JSON.stringify({ transcription }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nivelInfo = nivel ? `Nivel MCER ${nivel}` : curso ? `Curso ${curso}` : 'Nivel B1';
    const idiomaFeedback = idioma_feedback === 'en' ? 'inglés' : 'español';

    const prompt = `Eres un profesor experto de inglés en secundaria española. Corrige este writing para un alumno de ${nivelInfo}.

WRITING DEL ALUMNO:
${texto}

INSTRUCCIONES:
- Detecta TODOS los errores (gramática, vocabulario, ortografía, puntuación, estilo).
- En "original" pon el texto EXACTO con el error (importante para localizarlo en el writing).
- En "explicacion" da una explicación pedagógica clara en español (1-2 frases) que ayude al alumno a entender el porqué del error.
- "comentario_profesor": valoración general detallada en español para el profesor (3-4 frases sobre nivel, fortalezas y áreas de mejora globales).
- "feedback_alumno": mensaje motivador y constructivo dirigido al alumno en ${idiomaFeedback} (4-5 frases). Empieza reconociendo lo positivo, después señala 2-3 áreas concretas de mejora con sugerencias prácticas, y termina con una frase de ánimo. Trata al alumno con calidez.
- "strengths": 3 puntos fuertes específicos (no genéricos).
- "improvements": 3 áreas concretas a mejorar con consejo práctico.

Devuelve SOLO un objeto JSON válido, sin markdown, sin texto extra:
{
  "nota": <0-10 con un decimal>,
  "nivel_detectado": "<nivel MCER detectado>",
  "comentario_profesor": "<3-4 frases en español>",
  "criterios": {
    "Gramática": <0-10>,
    "Vocabulario": <0-10>,
    "Ortografía": <0-10>,
    "Coherencia": <0-10>,
    "Adecuación": <0-10>
  },
  "errores": [
    {"tipo": "<Gramática|Vocabulario|Ortografía|Puntuación|Estilo>", "original": "<texto exacto del error>", "correcto": "<corregido>", "explicacion": "<1-2 frases en español>"}
  ],
  "strengths": ["<punto fuerte 1>", "<punto fuerte 2>", "<punto fuerte 3>"],
  "improvements": ["<a mejorar 1>", "<a mejorar 2>", "<a mejorar 3>"],
  "feedback_alumno": "<4-5 frases en ${idiomaFeedback}>"
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
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: 'Error API Anthropic', detalle: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';

    let resultado;
    try {
      const inicio = rawText.indexOf('{');
      const fin = rawText.lastIndexOf('}');
      if (inicio === -1 || fin === -1) throw new Error('Sin JSON');
      resultado = JSON.parse(rawText.slice(inicio, fin + 1));
    } catch (parseErr) {
      return new Response(
        JSON.stringify({ error: 'Error parseando respuesta', detalle: parseErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
