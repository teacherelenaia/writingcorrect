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
        { type: 'text', text: 'Transcribe el texto del writing tal cual aparece, respetando errores. Devuelve SOLO el texto.' },
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
    const idiomaFeedback = idioma_feedback === 'en' ? 'English' : 'español';

    const prompt = `Profesor de inglés, corrige este writing (${nivelInfo}). Feedback en ${idiomaFeedback}.

WRITING:
${texto}

Devuelve SOLO JSON válido, sin markdown:
{"nota":<0-10 1 decimal>,"nivel_detectado":"<MCER>","comentario_profesor":"<2 frases ES>","criterios":{"Gramática":<0-10>,"Vocabulario":<0-10>,"Ortografía":<0-10>,"Coherencia":<0-10>,"Adecuación":<0-10>},"errores":[{"tipo":"<Gramática|Vocabulario|Ortografía|Puntuación|Estilo>","original":"<texto exacto>","correcto":"<corregido>","explicacion":"<breve ES>"}],"strengths":["<punto>","<punto>"],"improvements":["<a mejorar>","<a mejorar>"],"feedback_alumno":"<2 frases ${idiomaFeedback}>"}`;

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
