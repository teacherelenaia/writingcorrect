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
                  status: 405,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
    }
    try {
          const body = await req.json();
          const { texto, nivel, curso, idioma_feedback, images, writing_type, criterio, rubrica_contenido, nivel_custom } = body;
          if (!texto || texto.length < 5) {
                  return new Response(JSON.stringify({ error: 'Texto requerido' }), {
                            status: 400,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  });
          }
                  // CHECK PLAN LIMIT
        const authHeader = req.headers.get('Authorization') || '';
        const token = authHeader.replace('Bearer ', '');
        let userId4Limit = null;
        if (token && texto !== '__transcribe__') {
          const SB_URL4 = process.env.SUPABASE_URL;
          const SB_SVC = process.env.SUPABASE_SECRET_KEY;
          const PLAN_LIMITS = { free: 5, basic: 80, teacher: 250, center: Infinity };
          try {
            const uRes = await fetch(SB_URL4 + '/auth/v1/user', {
              headers: { 'apikey': SB_SVC, 'Authorization': 'Bearer ' + token }
            });
            if (uRes.ok) {
              const uData = await uRes.json();
              userId4Limit = uData?.id || null;
            }
            if (userId4Limit) {
              const pRes = await fetch(SB_URL4 + '/rest/v1/profiles?id=eq.' + userId4Limit + '&select=plan,corrections_used', {
                headers: { 'apikey': SB_SVC, 'Authorization': 'Bearer ' + SB_SVC, 'Accept': 'application/vnd.pgrst.object+json' }
              });
              if (pRes.ok) {
                const prof = await pRes.json();
                const planKey = prof?.plan || 'free';
                const used = prof?.corrections_used || 0;
                const limit = PLAN_LIMITS[planKey] !== undefined ? PLAN_LIMITS[planKey] : 5;
                if (limit !== Infinity && used >= limit) {
                  return new Response(JSON.stringify({ error: 'limit_reached', plan: planKey, used, limit }), {
                    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                  });
                }
              }
            }
          } catch (_e) {}
        }
// TRANSCRIPCION
      if (texto === '__transcribe__' && images && images.length > 0) {
              const transcribeContent = [
                        ...images.map((img) => ({
                                    type: 'image',
                                    source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.base64 },
                        })),
                { type: 'text', text: 'Transcribe el texto del writing tal cual aparece, respetando los errores ortograficos y gramaticales originales. Devuelve SOLO el texto transcrito.' },
                      ];
              const tRes = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
                        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500, messages: [{ role: 'user', content: transcribeContent }] }),
              });
              const tData = await tRes.json();
              const transcription = tData.content?.[0]?.text || '';
              return new Response(JSON.stringify({ transcription }), {
                        status: 200,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
      }
          // NIVEL / CONTEXTO
      const nivelInfo = nivel ? `nivel MCER ${nivel}` : curso ? `${curso}` : 'B1';
          const enIngles = idioma_feedback === 'en';
          const idiomaFeedback = enIngles ? 'English' : 'espanol';
          const tipoWriting = writing_type || 'writing';
          const lang = enIngles ? 'en' : 'es';

      // TIPOS DE ERROR segun idioma
      const tipoEjemplo = enIngles ? 'Grammar' : 'Gramatica';
          const tiposValidos = enIngles
            ? '"Grammar", "Vocabulary", "Spelling", "Punctuation", "Style"'
                  : '"Gramatica", "Vocabulario", "Ortografia", "Puntuacion", "Estilo"';

      // BLOQUE DE CRITERIO DE CORRECCION
      let criterioBloqueTexto = '';
          let criteriosJSON = '';
          if (criterio === 'rubrica' && rubrica_contenido) {
                  criterioBloqueTexto = `
                  RUBRICA DE CORRECCION DEL PROFESOR:
                  Usa esta rubrica como criterio EXCLUSIVO para evaluar el writing:
                  ---
                  ${rubrica_contenido}
                  ---
                  INSTRUCCIONES PARA LA PUNTUACION:
                  1. Extrae TODOS los criterios con sus puntuaciones maximas.
                  2. Puntua cada criterio segun los descriptores de la rubrica.
                  3. Nota final = (suma puntos obtenidos / suma puntos maximos) x 10. Redondea a 1 decimal.
                  4. En "criterios" pon cada criterio con su puntuacion convertida a 0-10.
                  5. En "rubrica_detalle" incluye para cada criterio: criterio, puntos_obtenidos, puntos_maximos, nivel_descriptor.
                  La nota final DEBE coincidir con el calculo proporcional.
                  IMPORTANTE: el campo rubrica_detalle es OBLIGATORIO en tu respuesta JSON.`;
                  criteriosJSON = `"criterios": { "CRITERIO_1": 7.5, "CRITERIO_2": 8.0 }, "rubrica_detalle": [ {"criterio": "CRITERIO_1", "puntos_obtenidos": 2, "puntos_maximos": 3, "nivel_descriptor": "Descripcion del nivel alcanzado segun la rubrica"}, {"criterio": "CRITERIO_2", "puntos_obtenidos": 3, "puntos_maximos": 3, "nivel_descriptor": "Descripcion del nivel alcanzado segun la rubrica"} ]`;
          } else if (criterio === 'nivel_eso') {
                  criterioBloqueTexto = `
                  CRITERIO DE CORRECCION: ESO (${nivelInfo})
                  Corrige segun los estandares del curriculo de ingles de la ESO espanola para ${nivelInfo}.
                  Ten en cuenta el nivel linguistico esperado para ese curso (vocabulario, estructuras gramaticales, complejidad textual). Se justo con el nivel real de un alumno de esa edad.`;
                  criteriosJSON = `"criterios": { "Gramatica": <0-10>, "Vocabulario": <0-10>, "Ortografia": <0-10>, "Coherencia": <0-10>, "Adecuacion": <0-10> }`;
          } else if (criterio === 'nivel_bach') {
                  criterioBloqueTexto = `
                  CRITERIO DE CORRECCION: Bachillerato (${nivelInfo})
                  Corrige segun los estandares del curriculo de ingles de Bachillerato espanol para ${nivelInfo}.
                  Exige mayor precision gramatical, riqueza lexica, cohesion textual y adecuacion al tipo de texto que en ESO.`;
                  criteriosJSON = `"criterios": { "Gramatica": <0-10>, "Vocabulario": <0-10>, "Ortografia": <0-10>, "Coherencia": <0-10>, "Adecuacion": <0-10> }`;
          } else if (criterio === 'nivel_mcer') {
                  criterioBloqueTexto = `
                  CRITERIO DE CORRECCION: Nivel MCER ${nivelInfo}
                  Corrige segun los descriptores del Marco Comun Europeo de Referencia para las Lenguas (MCER) para el nivel ${nivelInfo}.
                  Evalua si el alumno alcanza los descriptores de produccion escrita de ese nivel.`;
                  criteriosJSON = `"criterios": { "Gramatica": <0-10>, "Vocabulario": <0-10>, "Ortografia": <0-10>, "Coherencia": <0-10>, "Adecuacion": <0-10> }`;
          } else if (criterio === 'custom' && nivel_custom) {
                  criterioBloqueTexto = `
                  CRITERIO DE CORRECCION PERSONALIZADO:
                  El profesor indica: "${nivel_custom}"
                  Sigue exactamente estas instrucciones para evaluar el writing.`;
                  criteriosJSON = `"criterios": { "Gramatica": <0-10>, "Vocabulario": <0-10>, "Ortografia": <0-10>, "Coherencia": <0-10>, "Adecuacion": <0-10> }`;
          } else {
                  criterioBloqueTexto = `
                  CRITERIO DE CORRECCION: Libre (criterio del profesor de ingles)
                  Corrige con tu criterio profesional como profesor experto de ingles, adaptando la exigencia al nivel detectado en el writing.`;
                  criteriosJSON = `"criterios": { "Gramatica": <0-10>, "Vocabulario": <0-10>, "Ortografia": <0-10>, "Coherencia": <0-10>, "Adecuacion": <0-10> }`;
          }
          // INSTRUCCIONES ESPECIFICAS POR TIPO DE WRITING
      const writingInstrucciones = {
              'Email / Carta formal': 'Es una carta o email formal. Evalua: registro formal, formulas de apertura/cierre adecuadas, estructura clara (saludo, cuerpo, despedida), tono apropiado, ausencia de coloquialismos.',
              'Email / Carta informal': 'Es una carta o email informal. Evalua: registro informal pero correcto, expresiones coloquiales apropiadas, tono amigable, estructura epistolar basica.',
              'Redaccion / Essay': 'Es una redaccion o essay. Evalua: introduccion con tesis clara, desarrollo de argumentos con ejemplos, conclusion, cohesion entre parrafos, conectores discursivos.',
              'Opinion Essay': 'Es un opinion essay. Evalua: expresion clara de la opinion propia, argumentos bien desarrollados con justificacion, uso de expresiones de opinion (I believe, In my view...), conclusion coherente.',
              'For and Against Essay': 'Es un for and against essay. Evalua: presentacion equilibrada de argumentos a favor y en contra, estructura en parrafos diferenciados, conectores de contraste (however, on the other hand...), conclusion.',
              'Descripcion': 'Es una descripcion. Evalua: uso de vocabulario descriptivo y adjetivos variados, organizacion espacial o tematica, detalles sensoriales, cohesion.',
              'Narrativa / Story': 'Es una narracion. Evalua: estructura narrativa (planteamiento, nudo, desenlace), uso de tiempos verbales del pasado, conectores temporales (first, then, finally...), vocabulario narrativo.',
              'Informe / Report': 'Es un informe. Evalua: estructura con secciones y subtitulos, registro formal, presentacion objetiva de informacion, recomendaciones si procede, claridad y concision.',
              'Resena / Review': 'Es una resena. Evalua: descripcion del objeto resenado, opinion personal justificada, estructura equilibrada entre descripcion y valoracion, recomendacion final.',
              'Articulo / Article': 'Es un articulo. Evalua: titulo llamativo, apertura que capte la atencion, desarrollo organizado, tono apropiado al publico objetivo, conclusion.',
              'Blog post': 'Es un blog post. Evalua: tono personal y cercano, estructura con parrafos claros, engagement con el lector (preguntas retoricas, interpelacion directa), vocabulario variado.',
              'Dialogo': 'Es un dialogo. Evalua: naturalidad de los turnos de habla, registro apropiado entre los personajes, uso de expresiones coloquiales o formales segun el contexto, puntuacion del dialogo.',
              'Resumen / Summary': 'Es un resumen. Evalua: identificacion de las ideas principales, sintesis sin copiar el original, objetividad (sin opinion personal), concision y claridad.',
              'Biografia': 'Es una biografia. Evalua: organizacion cronologica, uso de tiempos verbales del pasado, datos relevantes bien seleccionados, conectores temporales, tono objetivo.',
              'Instrucciones / How-to': 'Es un texto instructivo. Evalua: claridad y orden de los pasos, uso del imperativo, numeracion o conectores de secuencia (first, next, finally...), precision del vocabulario.',
              'Queja / Complaint letter': 'Es una carta de queja. Evalua: registro formal, descripcion clara del problema, tono firme pero educado, peticion explicita de solucion, formulas epistolares apropiadas.',
              'Solicitud / Application letter': 'Es una carta de solicitud. Evalua: estructura formal, presentacion del candidato, argumentos de por que es adecuado, tono profesional, formulas de cortesia.',
      };
          const instruccionTipo = writingInstrucciones[tipoWriting] || 'Corrige el writing atendiendo a su tipo y proposito comunicativo.';
          const usaRubrica = criterio === 'rubrica' && rubrica_contenido;
          const jsonEstructura = usaRubrica
            ? `{
              "nota": 7.5,
                "nivel_detectado": "B2",
                  "comentario_profesor": "...",
                    "criterios": {"Criterio 1": 8.0, "Criterio 2": 7.0},
                      "rubrica_detalle": [
                          {"criterio": "Criterio 1", "puntos_obtenidos": 2, "puntos_maximos": 3, "nivel_descriptor": "Texto del nivel alcanzado"},
                              {"criterio": "Criterio 2", "puntos_obtenidos": 2, "puntos_maximos": 3, "nivel_descriptor": "Texto del nivel alcanzado"}
                                ],
                                  "errores": [{"tipo": "${tipoEjemplo}", "original": "texto", "correcto": "texto", "explicacion": "..."}],
                                    "strengths": ["punto 1", "punto 2", "punto 3"],
                                      "improvements": ["mejora 1", "mejora 2", "mejora 3"],
                                        "feedback_alumno": "..."
                                        }`
                  : `{
                    "nota": 7.5,
                      "nivel_detectado": "B2",
                        "comentario_profesor": "...",
                          ${criteriosJSON},
                            "errores": [{"tipo": "${tipoEjemplo}", "original": "texto", "correcto": "texto", "explicacion": "..."}],
                              "strengths": ["punto 1", "punto 2", "punto 3"],
                                "improvements": ["mejora 1", "mejora 2", "mejora 3"],
                                  "feedback_alumno": "..."
                                  }`;
          const prompt = `Eres un profesor experto de ingles en secundaria espanola. Corrige este writing de tipo "${tipoWriting}" para un alumno de ${nivelInfo}.

          TIPO DE WRITING - instrucciones especificas:
          ${instruccionTipo}
          ${criterioBloqueTexto}

          WRITING DEL ALUMNO:
          ${texto}

          INSTRUCCIONES GENERALES:
          - Detect ALL errors (grammar, vocabulary, spelling, punctuation, style).
          - In "original" put the EXACT text with the error as it appears in the writing.
          - In "explicacion" give a clear pedagogical explanation in ${enIngles ? 'English' : 'Spanish'} (1-2 sentences).
          - The "tipo" field of each error MUST be exactly one of these values: ${tiposValidos}. No other values are allowed.
          - "comentario_profesor": overall assessment for the teacher in ${enIngles ? 'English' : 'Spanish'} (3-4 sentences about level, strengths, areas for improvement and adequacy to the "${tipoWriting}" text type).
          - "feedback_alumno": motivating message for the student in ${idiomaFeedback} (4-5 sentences). Acknowledge the positives, point out 2-3 specific areas for improvement, end with encouragement.
          - "strengths": 3 specific strong points of the writing (in ${enIngles ? 'English' : 'Spanish'}).
          - "improvements": 3 concrete areas to improve with practical advice (in ${enIngles ? 'English' : 'Spanish'}).

          Devuelve SOLO un objeto JSON valido, sin markdown, sin texto extra:
          ${jsonEstructura}`;
          const response = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
                  body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
          });
          if (!response.ok) {
                  const errorText = await response.text();
                  return new Response(JSON.stringify({ error: 'Error API Anthropic', detalle: errorText }), {
                            status: 500,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  });
          }
          const data = await response.json();
          const rawText = data.content?.[0]?.text || '';
          let resultado;
          try {
                  const inicio = rawText.indexOf('{');
                  const fin = rawText.lastIndexOf('}');
                  if (inicio === -1 || fin === -1) throw new Error('Sin JSON: ' + rawText.slice(0, 200));
                  resultado = JSON.parse(rawText.slice(inicio, fin + 1));
          } catch (parseErr) {
                  return new Response(JSON.stringify({ error: 'Error parseando respuesta', detalle: parseErr.message, raw: rawText.slice(0, 500) }), {
                            status: 500,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  });
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
