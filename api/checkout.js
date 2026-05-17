export const config = { runtime: 'edge' };

const PRICE_IDS = {
      basic: 'price_1TQ6ZID4OTzYheExGNSUWHhJ',
      teacher: 'price_1TQ6abD4OTzYheExYuDTrEq9',
      center: 'price_1TQ6bYD4OTzYheExarp2zPHc',
};

const ALLOWED_ORIGINS = [
      'https://writingcorrect.com',
      'https://www.writingcorrect.com',
    ];

function corsHeaders(req) {
      const origin = req.headers.get('origin') || '';
      const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
      return {
              'Access-Control-Allow-Origin': allow,
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              'Vary': 'Origin',
      };
}

async function getUserFromAuth(req) {
      const auth = req.headers.get('authorization') || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!token) return null;
      try {
              const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
                        headers: {
                                    'apikey': process.env.SUPABASE_ANON_KEY,
                                    'Authorization': `Bearer ${token}`,
                        },
              });
              if (!res.ok) return null;
              const u = await res.json();
              return u?.id ? { id: u.id, email: u.email } : null;
      } catch {
              return null;
      }
}

export default async function handler(req) {
      const cors = corsHeaders(req);

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
      if (req.method !== 'POST') {
              return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                        status: 405,
                        headers: { ...cors, 'Content-Type': 'application/json' },
              });
      }

  try {
          const body = await req.json();
          const { plan } = body;

        if (!plan || !PRICE_IDS[plan]) {
                  return new Response(JSON.stringify({ error: 'Plan invalido' }), {
                              status: 400,
                              headers: { ...cors, 'Content-Type': 'application/json' },
                  });
        }

        const authUser = await getUserFromAuth(req);
          const userId = authUser?.id || body.userId || '';
          const email = authUser?.email || body.email || '';

        if (!userId) {
                  return new Response(JSON.stringify({ error: 'No autenticado' }), {
                              status: 401,
                              headers: { ...cors, 'Content-Type': 'application/json' },
                  });
        }

        const form = new URLSearchParams({
                  mode: 'subscription',
                  'payment_method_types[]': 'card',
                  'line_items[0][price]': PRICE_IDS[plan],
                  'line_items[0][quantity]': '1',
                  'metadata[userId]': userId,
                  'metadata[plan]': plan,
                  'subscription_data[metadata][userId]': userId,
                  'subscription_data[metadata][plan]': plan,
                  'client_reference_id': userId,
                  'success_url': 'https://writingcorrect.com/app?pago=ok',
                  'cancel_url': 'https://writingcorrect.com/app?pago=cancelado',
                  'locale': 'es',
                  'allow_promotion_codes': 'true',
        });
          if (email) form.set('customer_email', email);

        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
                  method: 'POST',
                  headers: {
                              'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                              'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: form,
        });

        const session = await stripeRes.json();
          if (session.error) throw new Error(session.error.message);

        return new Response(JSON.stringify({ url: session.url }), {
                  status: 200,
                  headers: { ...cors, 'Content-Type': 'application/json' },
        });
  } catch (err) {
          console.error('Checkout error:', err.message);
          return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
                    status: 500,
                    headers: { ...cors, 'Content-Type': 'application/json' },
          });
  }
}
