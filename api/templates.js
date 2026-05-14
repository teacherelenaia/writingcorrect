export const config = { runtime: 'edge' };

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const WRITING_TEMPLATES = {
    'Email / Carta formal': {
          estructura: 'Dear Mr/Ms [apellido],\n\nI am writing to [motivo].\n\n[Parrafo principal con detalles]\n\n[Parrafo de solicitud o conclusion]\n\nI look forward to hearing from you.\n\nYours sincerely,\n[Tu nombre]',
          frases: ['I am writing to enquire about...','I would be grateful if you could...','I look forward to your reply.','Please do not hesitate to contact me if...','I am sorry to inform you that...'],
          conectores: ['Furthermore,','In addition,','However,','Therefore,','With regard to...']
    },
    'Email / Carta informal': {
          estructura: 'Hi [nombre],\n\nHow are you? I hope you\'re well!\n\n[Primer parrafo: noticias personales]\n\n[Segundo parrafo: motivo principal]\n\nAnyway, I\'d better go now. Write back soon!\n\nLots of love / Take care,\n[Tu nombre]',
          frases: ['It was great to hear from you!','I\'m so sorry I haven\'t written in ages.','Guess what? I\'ve just...','You\'ll never believe what happened!','Give my love to...'],
          conectores: ['By the way,','Anyway,','Also,','Oh, and another thing -','Speaking of which,']
    },
    'Opinion Essay': {
          estructura: 'Introduction: state the topic + your opinion\n\nParagraph 2: first argument + example\n\nParagraph 3: second argument + example\n\nParagraph 4: counterargument + refutation\n\nConclusion: restate opinion + final thought',
          frases: ['In my opinion,','I strongly believe that...','It is my view that...','From my perspective,','I am convinced that...'],
          conectores: ['Firstly,','Moreover,','Furthermore,','However,','On the other hand,','In conclusion,','To sum up,']
    },
    'For and Against Essay': {
          estructura: 'Introduction: present the topic neutrally\n\nParagraph 2: arguments FOR + examples\n\nParagraph 3: arguments AGAINST + examples\n\nConclusion: balanced summary or personal opinion',
          frases: ['There are several arguments in favour of...','On the other hand, critics argue that...','Proponents claim that...','Opponents point out that...'],
          conectores: ['On the one hand,','On the other hand,','Nevertheless,','Despite this,','Admittedly,','In contrast,']
    },
    'Narrativa / Story': {
          estructura: 'Set the scene: When/Where/Who\n\nRising action: the problem or event\n\nClimax: the most exciting moment\n\nFalling action: how things changed\n\nResolution: how it ended / what you learnt',
          frases: ['It was a dark and stormy night when...','Suddenly, without warning,...','I will never forget the day...','Just as I was about to..., something unexpected happened.'],
          conectores: ['First,','Then,','After that,','Suddenly,','Meanwhile,','Finally,','In the end,']
    },
    'Informe / Report': {
          estructura: 'Title: Report on [tema]\n\nIntroduction: purpose of the report\n\nFindings: section 1\n\nFindings: section 2\n\nConclusion and Recommendations',
          frases: ['The aim of this report is to...','According to the data,...','It is recommended that...','The findings suggest that...','Overall, it can be concluded that...'],
          conectores: ['Firstly,','In addition,','Furthermore,','However,','As a result,','In conclusion,']
    },
    'Resena / Review': {
          estructura: 'Introduction: what you are reviewing + basic info\n\nPlot/Description: brief summary (no spoilers!)\n\nAnalysis: what worked well / what did not\n\nConclusion: recommendation',
          frases: ['I recently watched/read/visited...','The plot revolves around...','One of the highlights is...','On the downside,...','I would highly recommend this to...'],
          conectores: ['Overall,','In addition,','However,','What is more,','On the whole,']
    },
    'Redaccion / Essay': {
          estructura: 'Introduction: hook + thesis statement\n\nBody paragraph 1: point + evidence + explanation\n\nBody paragraph 2: point + evidence + explanation\n\nConclusion: summary + broader implication',
          frases: ['It is widely argued that...','This essay will examine...','There is no doubt that...','Evidence suggests that...'],
          conectores: ['Firstly,','Secondly,','Furthermore,','However,','In conclusion,','To conclude,']
    },
    'Blog post': {
          estructura: 'Catchy title\n\nHook: question or surprising fact\n\nMain section 1: your experience/idea\n\nMain section 2: tips or details\n\nCall to action / closing question',
          frases: ['Have you ever wondered...?','Let me tell you about...','Here are my top tips:','What do you think? Leave a comment below!'],
          conectores: ['Plus,','Also,','By the way,','And guess what?','In short,']
    },
    'Queja / Complaint letter': {
          estructura: 'Dear Sir/Madam,\n\nI am writing to express my dissatisfaction with...\n\n[Describe the problem with details and dates]\n\n[Explain the impact / how you felt]\n\nI would be grateful if you could [specific solution].\n\nI look forward to a prompt reply.\n\nYours faithfully,\n[Tu nombre]',
          frases: ['I am writing to complain about...','I was extremely disappointed to find...','This is not acceptable because...','I demand a full refund / an apology / a replacement.'],
          conectores: ['Furthermore,','In addition,','As a result,','I therefore request that...']
    },
    'Solicitud / Application letter': {
          estructura: 'Dear [nombre/Sir/Madam],\n\nI am writing to apply for [puesto/programa].\n\n[Paragraph 2: why you are suitable - skills and experience]\n\n[Paragraph 3: why you want this position - motivation]\n\nI have enclosed my CV and I am available for interview at your convenience.\n\nYours sincerely,\n[Tu nombre]',
          frases: ['I am writing to apply for the position of...','I have X years of experience in...','I believe I am an ideal candidate because...','I am particularly interested in this role because...'],
          conectores: ['Furthermore,','In addition to this,','Moreover,','I am also...']
    },
    'Descripcion': {
          estructura: 'Introduction: what/who you are describing\n\nPhysical description: appearance, size, colour\n\nPersonality / atmosphere / details\n\nConclusion: overall impression',
          frases: ['From the moment I saw...','What strikes you first is...','The most striking feature is...','It is impossible to overlook...'],
          conectores: ['In the foreground,','In the background,','On the left/right,','What is more,','Above all,']
    },
    'Resumen / Summary': {
          estructura: 'Opening: title + author + main topic (1 sentence)\n\nMain ideas: paragraph by paragraph\n\nClosing: main conclusion of the original text\n\nNOTE: Use your own words. No opinions.',
          frases: ['The text deals with...','The author argues that...','According to the text,...','The main point is...','In conclusion, the author states that...'],
          conectores: ['First,','Then,','Finally,','In addition,','However,']
    },
    'Biografia': {
          estructura: 'Introduction: who + why they are famous\n\nEarly life: birth, family, education\n\nCareer / achievements: key events in order\n\nLater life / Legacy: impact and death (if applicable)',
          frases: ['[Name] was born on [date] in [place].','From an early age,...','He/She became famous for...','His/Her greatest achievement was...','He/She is remembered for...'],
          conectores: ['After that,','In [year],','Later,','Eventually,','As a result,']
    },
    'Instrucciones / How-to': {
          estructura: 'Title: How to [action]\n\nIntroduction: what you will learn / materials needed\n\nStep 1: ...\nStep 2: ...\nStep 3: ...\n\nTop tip: ...\n\nConclusion: what you have achieved',
          frases: ['First, you will need...','Make sure you...','Be careful not to...','Once you have done this,...','Top tip:'],
          conectores: ['First,','Next,','After that,','Then,','Finally,','Once you have...']
    },
    'Articulo / Article': {
          estructura: 'Attention-grabbing headline\n\nHook: surprising fact or question\n\nBody: developed arguments / information\n\nExpert quote or example\n\nConclusion: call to action or reflection',
          frases: ['Did you know that...?','According to experts,...','Recent studies show that...','It is estimated that...'],
          conectores: ['Furthermore,','However,','As a result,','In contrast,','Above all,']
    },
    'Dialogo': {
          estructura: 'Setting: where and when\n\nCharacter A: opening line\nCharacter B: response\n\n[Exchange continues with a clear purpose]\n\nConclusion: agreement, decision or dramatic end',
          frases: ['- How are you doing?','- I am glad you brought that up.','- I could not agree more.','- That is a good point, but...','- What do you mean exactly?'],
          conectores: ['Actually,','Well,','You know,','To be honest,','By the way,','Anyway,']
    },
};

export default async function handler(req) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    return new Response(JSON.stringify(WRITING_TEMPLATES), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
    });
}
