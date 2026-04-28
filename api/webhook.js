export const config = { runtime: 'edge' };

const PRICE_TO_PLAN = {
  'price_1TQ6ZID4OTzYheExGNSUWHhJ': 'basic',
  'price_1TQ6abD4OTzYheExYuDTrEq9': 'teacher',
  'price_1TQ6bYD4OTzYheExarp2zPHc': 'center',
};

async function updateProfile(userId, data) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error: ${text}`);
  }
}

async function getUserIdByEmail(email) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/rpc/get_user_id_by_email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      },
      body: JSON.stringify({ email }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data || null;
}

async function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;

  const signed = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(signed));
  const computed = Array.from(new Uint8Array(mac))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === signature;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const payload = await req.text();
  const sigHeader = req.headers.get('stripe-signature') || '';

  const valid = await verifyStripeSignature(
    payload,
    sigHeader,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId  = session.metadata?.userId;
        const email   = session.customer_email || session.customer_details?.email;
        let plan = session.metadata?.plan || null;

        if (!plan && session.subscription) {
          const subRes = await fetch(
            `https://api.stripe.com/v1/subscriptions/${session.subscription}`,
            { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
          );
          const sub = await subRes.json();
          const priceId = sub.items?.data?.[0]?.price?.id;
          plan = PRICE_TO_PLAN[priceId] || null;
        }

        if (!plan) break;

        let targetUserId = userId;
        if (!targetUserId && email) {
          targetUserId = await getUserIdByEmail(email);
        }

        if (targetUserId) {
          await updateProfile(targetUserId, {
            plan,
            corrections_used: 0,
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const custRes = await fetch(
          `https://api.stripe.com/v1/customers/${sub.customer}`,
          { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
        );
        const customer = await custRes.json();
        if (customer.email) {
          const uid = await getUserIdByEmail(customer.email);
          if (uid) {
            await updateProfile(uid, {
              plan: 'free',
              corrections_used: 0,
              updated_at: new Date().toISOString(),
            });
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
