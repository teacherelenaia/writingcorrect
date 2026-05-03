export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { base64, mediaType, isImage } = await req.json();

    const content = isImage
      ? [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'Extrae el texto completo de esta rúbrica de evaluación. Devuelve SOLO el texto extraído, conservando la estructura (criterios, niveles, puntuaciones) lo mejor posible.' }
        ]
      : [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: 'Extrae el texto completo de esta rúbrica de evaluación. Devuelve SOLO el texto extraído, conservando la estructura (criterios, niveles, puntuaciones) lo mejor posible.' }
        ];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content }] })
    });

    const data = await res.json();
    const texto = data.content?.[0]?.text || '';
    return new Response(JSON.stringify({ texto }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
