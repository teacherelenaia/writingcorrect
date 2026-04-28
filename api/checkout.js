export const config = { runtime: 'edge' };

const PRICE_IDS = {
  basic:   'price_1TQ6ZID4OTzYheExGNSUWHhJ',
  teacher: 'price_1TQ6abD4OTzYheExYuDTrEq9',
  center:  'price_1TQ6bYD4OTzYheExarp2zPHc',
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { plan, email, userId } = await req.json();

    if (!plan || !PRICE_IDS[plan]) {
      return new Response(JSON.stringify({ error: 'Plan inválido' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        'payment_method_types[]': 'card',
        'line_items[0][price]': PRICE_IDS[plan],
        'line_items[0][quantity]': '1',
        'metadata[userId]': userId || '',
        'metadata[plan]': plan,
        'customer_email': email || '',
        'success_url': 'https://writingcorrect.com/app?pago=ok',
        'cancel_url': 'https://writingcorrect.com/app?pago=cancelado',
        'locale': 'es',
      }),
    });

    const session = await stripeRes.json();
    if (session.error) throw new Error(session.error.message);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
}
