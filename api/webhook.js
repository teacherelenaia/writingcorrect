export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    const event = JSON.parse(body);

    // Plan mapping from Stripe price IDs
    const planMap = {
      'price_1TQ6ZID4OTzYheExGNSUWHhJ': 'basic',
      'price_1TQ6abD4OTzYheExYuDTrEq9': 'teacher',
      'price_1TQ6bYD4OTzYheExarp2zPHc': 'center',
    };

    const planLimits = {
      basic: 80,
      teacher: 250,
      center: 999999,
    };

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerEmail = session.customer_email || session.customer_details?.email;
      const priceId = session.line_items?.data?.[0]?.price?.id;

      // Get price ID from subscription if not in session
      let resolvedPriceId = priceId;
      if (!resolvedPriceId && session.subscription) {
        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${session.subscription}`, {
          headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
        });
        const sub = await subRes.json();
        resolvedPriceId = sub.items?.data?.[0]?.price?.id;
      }

      const plan = planMap[resolvedPriceId] || 'basic';
      const limit = planLimits[plan];

      if (customerEmail) {
        // Update user in Supabase
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SECRET_KEY;

        await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(customerEmail)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            plan,
            correcciones_limite: limit,
            correcciones_usadas: 0,
            stripe_customer_id: session.customer
          })
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      // Get customer email from Stripe
      const customerRes = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
        headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
      });
      const customer = await customerRes.json();
      const email = customer.email;

      if (email) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SECRET_KEY;

        await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            plan: 'free',
            correcciones_limite: 5,
            correcciones_usadas: 0
          })
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
