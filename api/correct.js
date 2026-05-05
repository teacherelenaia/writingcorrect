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
    const { texto, nivel, curso, idioma_feedback, images, writing_type, criterio, rubrica_contenido, nivel_custom } = body;

    if (!texto || texto.length < 5) {
      return new Response(JSON.stringify({ error: 'Texto requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TRANSCRIPCIÓN
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
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500, messages: [{ role: 'user', content: transcribeContent }] }),
      });
      const tData = await tRes.json();
      const transcription = tData.content?.[0]?.text || '';
      return new Response(JSON.stringify({ transcription }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // NIVEL / CONTEXTO
    const nivelInfo = nivel ? `nivel MCER ${nivel}` : curso ? `${curso}` : 'B1';
    const idiomaFeedback = idioma_feedback === 'en' ? 'inglés' : 'español';
    const tipoWriting = writing_type || 'writing';

    // BLOQUE DE CRITERIO DE CORRECCIÓN
    let criterioBloqueTexto = '';
    let criteriosJSON = '';

    if (criterio === 'rubrica' && rubrica_contenido) {
      criterioBloqueTexto = `
RÚBRICA DE CORRECCIÓN DEL PROFESOR:
Usa esta rúbrica como criterio EXCLUSIVO para evaluar el writing:
---
${rubrica_contenido}
---
INSTRUCCIONES PARA LA PUNTUACIÓN:
1. Extrae TODOS los criterios con sus puntuaciones máximas.
2. Puntúa cada criterio según los descriptores de la rúbrica.
3. Nota final = (suma puntos obtenidos / suma puntos máximos) × 10. Redondea a 1 decimal.
4. En "criterios" pon cada criterio con su puntuación convertida a 0-10.
5. En "rubrica_detalle" incluye para cada criterio: criterio, puntos_obtenidos, puntos_maximos, nivel_descriptor.
La nota final DEBE coincidir con el cálculo proporcional. IMPORTANTE: el campo rubrica_detalle es OBLIGATORIO en tu respuesta JSON.`;
      criteriosJSON = `"criterios": { "CRITERIO_1": 7.5, "CRITERIO_2": 8.0 },
  "rubrica_detalle": [
    {"criterio": "CRITERIO_1", "puntos_obtenidos": 2, "puntos_maximos": 3, "nivel_descriptor": "Descripción del nivel alcanzado según la rúbrica"},
    {"criterio": "CRITERIO_2", "puntos_obtenidos": 3, "puntos_maximos": 3, "nivel_descriptor": "Descripción del nivel alcanzado según la rúbrica"}
  ]`;
    } else if (criterio === 'nivel_eso') {
      criterioBloqueTexto = `
CRITERIO DE CORRECCIÓN: ESO (${nivelInfo})
Corrige según los estándares del currículo de inglés de la ESO española para ${nivelInfo}. Ten en cuenta el nivel lingüístico esperado para ese curso (vocabulario, estructuras gramaticales, complejidad textual). Sé justo con el nivel real de un alumno de esa edad.`;
      criteriosJSON = `"criterios": { "Gramática": <0-10>, "Vocabulario": <0-10>, "Ortografía": <0-10>, "Coherencia": <0-10>, "Adecuación": <0-10> }`;
    } else if (criterio === 'nivel_bach') {
      criterioBloqueTexto = `
CRITERIO DE CORRECCIÓN: Bachillerato (${nivelInfo})
Corrige según los estándares del currículo de inglés de Bachillerato español para ${nivelInfo}. Exige mayor precisión gramatical, riqueza léxica, cohesión textual y adecuación al tipo de texto que en ESO.`;
      criteriosJSON = `"criterios": { "Gramática": <0-10>, "Vocabulario": <0-10>, "Ortografía": <0-10>, "Coherencia": <0-10>, "Adecuación": <0-10> }`;
    } else if (criterio === 'nivel_mcer') {
      criterioBloqueTexto = `
CRITERIO DE CORRECCIÓN: Nivel MCER ${nivelInfo}
Corrige según los descriptores del Marco Común Europeo de Referencia para las Lenguas (MCER) para el nivel ${nivelInfo}. Evalúa si el alumno alcanza los descriptores de producción escrita de ese nivel.`;
      criteriosJSON = `"criterios": { "Gramática": <0-10>, "Vocabulario": <0-10>, "Ortografía": <0-10>, "Coherencia": <0-10>, "Adecuación": <0-10> }`;
    } else if (criterio === 'custom' && nivel_custom) {
      criterioBloqueTexto = `
CRITERIO DE CORRECCIÓN PERSONALIZADO:
El profesor indica: "${nivel_custom}"
Sigue exactamente estas instrucciones para evaluar el writing.`;
      criteriosJSON = `"criterios": { "Gramática": <0-10>, "Vocabulario": <0-10>, "Ortografía": <0-10>, "Coherencia": <0-10>, "Adecuación": <0-10> }`;
    } else {
      // Sin rúbrica — criterio libre de la IA
      criterioBloqueTexto = `
CRITERIO DE CORRECCIÓN: Libre (criterio del profesor de inglés)
Corrige con tu criterio profesional como profesor experto de inglés, adaptando la exigencia al nivel detectado en el writing.`;
      criteriosJSON = `"criterios": { "Gramática": <0-10>, "Vocabulario": <0-10>, "Ortografía": <0-10>, "Coherencia": <0-10>, "Adecuación": <0-10> }`;
    }

    // INSTRUCCIONES ESPECÍFICAS POR TIPO DE WRITING
    const writingInstrucciones = {
      'Email / Carta formal': 'Es una carta o email formal. Evalúa: registro formal, fórmulas de apertura/cierre adecuadas, estructura clara (saludo, cuerpo, despedida), tono apropiado, ausencia de coloquialismos.',
      'Email / Carta informal': 'Es una carta o email informal. Evalúa: registro informal pero correcto, expresiones coloquiales apropiadas, tono amigable, estructura epistolar básica.',
      'Redacción / Essay': 'Es una redacción o essay. Evalúa: introducción con tesis clara, desarrollo de argumentos con ejemplos, conclusión, cohesión entre párrafos, conectores discursivos.',
      'Opinion Essay': 'Es un opinion essay. Evalúa: expresión clara de la opinión propia, argumentos bien desarrollados con justificación, uso de expresiones de opinión (I believe, In my view...), conclusión coherente.',
      'For and Against Essay': 'Es un for and against essay. Evalúa: presentación equilibrada de argumentos a favor y en contra, estructura en párrafos diferenciados, conectores de contraste (however, on the other hand...), conclusión.',
      'Descripción': 'Es una descripción. Evalúa: uso de vocabulario descriptivo y adjetivos variados, organización espacial o temática, detalles sensoriales, cohesión.',
      'Narrativa / Story': 'Es una narración. Evalúa: estructura narrativa (planteamiento, nudo, desenlace), uso de tiempos verbales del pasado, conectores temporales (first, then, finally...), vocabulario narrativo.',
      'Informe / Report': 'Es un informe. Evalúa: estructura con secciones y subtítulos, registro formal, presentación objetiva de información, recomendaciones si procede, claridad y concisión.',
      'Reseña / Review': 'Es una reseña. Evalúa: descripción del objeto reseñado, opinión personal justificada, estructura equilibrada entre descripción y valoración, recomendación final.',
      'Artículo / Article': 'Es un artículo. Evalúa: título llamativo, apertura que capte la atención, desarrollo organizado, tono apropiado al público objetivo, conclusión.',
      'Blog post': 'Es un blog post. Evalúa: tono personal y cercano, estructura con párrafos claros, engagement con el lector (preguntas retóricas, interpelación directa), vocabulario variado.',
      'Diálogo': 'Es un diálogo. Evalúa: naturalidad de los turnos de habla, registro apropiado entre los personajes, uso de expresiones coloquiales o formales según el contexto, puntuación del diálogo.',
      'Resumen / Summary': 'Es un resumen. Evalúa: identificación de las ideas principales, síntesis sin copiar el original, objetividad (sin opinión personal), concisión y claridad.',
      'Biografía': 'Es una biografía. Evalúa: organización cronológica, uso de tiempos verbales del pasado, datos relevantes bien seleccionados, conectores temporales, tono objetivo.',
      'Instrucciones / How-to': 'Es un texto instructivo. Evalúa: claridad y orden de los pasos, uso del imperativo, numeración o conectores de secuencia (first, next, finally...), precisión del vocabulario.',
      'Queja / Complaint letter': 'Es una carta de queja. Evalúa: registro formal, descripción clara del problema, tono firme pero educado, petición explícita de solución, fórmulas epistolares apropiadas.',
      'Solicitud / Application letter': 'Es una carta de solicitud. Evalúa: estructura formal, presentación del candidato, argumentos de por qué es adecuado, tono profesional, fórmulas de cortesía.',
    };

    const instruccionTipo = writingInstrucciones[tipoWriting] || 'Corrige el writing atendiendo a su tipo y propósito comunicativo.';

    const usaRubrica = criterio === 'rubrica' && rubrica_contenido;

    const jsonEstructura = usaRubrica ? `{
  "nota": <0-10 con un decimal, resultado de (suma puntos obtenidos / suma puntos maximos) x 10>,
  "nivel_detectado": "<nivel MCER detectado>",
  "comentario_profesor": "<3-4 frases en español>",
  ${criteriosJSON},
  "errores": [
    {"tipo": "<Gramática|Vocabulario|Ortografía|Puntuación|Estilo>", "original": "<texto exacto>", "correcto": "<corregido>", "explicacion": "<1-2 frases en español>"}
  ],
  "strengths": ["<punto fuerte 1>", "<punto fuerte 2>", "<punto fuerte 3>"],
  "improvements": ["<a mejorar 1>", "<a mejorar 2>", "<a mejorar 3>"],
  "feedback_alumno": "<4-5 frases en ${idiomaFeedback}>"
}` : `{
  "nota": <0-10 con un decimal>,
  "nivel_detectado": "<nivel MCER detectado>",
  "comentario_profesor": "<3-4 frases en español>",
  ${criteriosJSON},
  "errores": [
    {"tipo": "<Gramática|Vocabulario|Ortografía|Puntuación|Estilo>", "original": "<texto exacto>", "correcto": "<corregido>", "explicacion": "<1-2 frases en español>"}
  ],
  "strengths": ["<punto fuerte 1>", "<punto fuerte 2>", "<punto fuerte 3>"],
  "improvements": ["<a mejorar 1>", "<a mejorar 2>", "<a mejorar 3>"],
  "feedback_alumno": "<4-5 frases en ${idiomaFeedback}>"
}`;

    const prompt = `Eres un profesor experto de inglés en secundaria española. Corrige este writing de tipo "${tipoWriting}" para un alumno de ${nivelInfo}.

TIPO DE WRITING — instrucciones específicas:
${instruccionTipo}
${criterioBloqueTexto}

WRITING DEL ALUMNO:
${texto}

INSTRUCCIONES GENERALES:
- Detecta TODOS los errores (gramática, vocabulario, ortografía, puntuación, estilo).
- En "original" pon el texto EXACTO con el error tal como aparece en el writing.
- En "explicacion" da una explicación pedagógica clara en español (1-2 frases).
- "comentario_profesor": valoración general para el profesor en español (3-4 frases sobre nivel, fortalezas, áreas de mejora y adecuación al tipo de texto "${tipoWriting}").
- "feedback_alumno": mensaje motivador dirigido al alumno en ${idiomaFeedback} (4-5 frases). Reconoce lo positivo, señala 2-3 áreas concretas de mejora, termina con ánimo.
- "strengths": 3 puntos fuertes específicos del writing.
- "improvements": 3 áreas concretas a mejorar con consejo práctico.

Devuelve SOLO un objeto JSON válido, sin markdown, sin texto extra:
${jsonEstructura}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: 'Error API Anthropic', detalle: errorText }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: 'Error parseando respuesta', detalle: parseErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    

    return new Response(JSON.stringify(resultado), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
