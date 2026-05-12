export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': process.env.SUPABASE_SECRET_KEY,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!userRes.ok) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }
  const userData = await userRes.json();
  const email = userData.email;
  if (!email) {
    return new Response(JSON.stringify({ error: 'No email found' }), { status: 400 });
  }

  const custRes = await fetch(
    `https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(email)}'&limit=1`,
    { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
  );
  const custData = await custRes.json();
  const customerId = custData.data?.[0]?.id;
  if (!customerId) {
    return new Response(JSON.stringify({ error: 'No Stripe customer found' }), { status: 404 });
  }

  const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      customer: customerId,
      return_url: 'https://writingcorrect.com/app',
    }).toString(),
  });
  const portalData = await portalRes.json();

  if (!portalData.url) {
    return new Response(JSON.stringify({ error: 'Could not create portal session', detail: portalData }), { status: 500 });
  }

  return new Response(JSON.stringify({ url: portalData.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
