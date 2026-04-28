export const config = { runtime: 'nodejs', maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { texto, nivel, curso, idioma_feedback, images } = req.body;

    if (!texto || texto.length < 5) {
      return res.status(400).json({ error: 'Texto requerido' });
    }

    // ── MODO TRANSCRIPCIÓN (foto del writing) ──────────────────
    if (texto === '__transcribe__' && images && images.length > 0) {
      const transcribeContent = [
        ...images.map((img) => ({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType || 'image/jpeg',
            data: img.base64,
          },
        })),
        {
          type: 'text',
          text: 'Transcribe el texto del writing del alumno tal y como aparece, respetando los errores ortográficos y gramaticales originales. Devuelve SOLO el texto transcrito, sin explicaciones ni comentarios adicionales.',
        },
      ];

      const transcribeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 2000,
          messages: [{ role: 'user', content: transcribeContent }],
        }),
      });

      if (!transcribeRes.ok) {
        const errorText = await transcribeRes.text();
        return res.status(500).json({ error: 'Error transcribiendo imagen', detalle: errorText });
      }

      const transcribeData = await transcribeRes.json();
      const transcription = transcribeData.content?.[0]?.text || '';
      return res.status(200).json({ transcription });
    }

    // ── MODO CORRECCIÓN ────────────────────────────────────────
    const nivelInfo = nivel
      ? `Nivel MCER: ${nivel}`
      : curso
      ? `Curso español: ${curso}`
      : 'Nivel B1';
    const idiomaFeedback = idioma_feedback === 'en' ? 'English' : 'español';

    const prompt = `Eres un profesor experto en corrección de writings en inglés para secundaria española. Corrige el siguiente writing.

${nivelInfo}
Idioma del feedback al alumno: ${idiomaFeedback}

WRITING DEL ALUMNO:
${texto}

Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin texto adicional. IMPORTANTE: el campo "original" de cada error debe contener el texto EXACTO tal como aparece en el writing del alumno (con el error), para poder localizarlo.

{
  "nota": <número 0-10 con un decimal>,
  "nivel_detectado": "<nivel MCER detectado>",
  "comentario_profesor": "<valoración general para el profesor en español, 2-3 frases>",
  "criterios": {
    "Gramática": <0-10>,
    "Vocabulario": <0-10>,
    "Ortografía": <0-10>,
    "Coherencia": <0-10>,
    "Adecuación": <0-10>
  },
  "errores": [
    {
      "tipo": "<Gramática|Vocabulario|Ortografía|Puntuación|Estilo>",
      "original": "<texto EXACTO del writing con el error>",
      "correcto": "<versión corregida>",
      "explicacion": "<explicación breve en español>"
    }
  ],
  "strengths": ["<punto fuerte 1>", "<punto fuerte 2>"],
  "improvements": ["<a mejorar 1>", "<a mejorar 2>"],
  "feedback_alumno": "<feedback directo al alumno en ${idiomaFeedback}, 2-3 frase
