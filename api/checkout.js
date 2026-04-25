export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { plan, email } = await req.json();

    const priceIds = {
      basic: 'price_1TQ6ZID4OTzYheExGNSUWHhJ',
      teacher: 'price_1TQ6abD4OTzYheExYuDTrEq9',
      center: 'price_1TQ6bYD4OTzYheExarp2zPHc'
    };

    const priceId = priceIds[plan];
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Plan no válido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'customer_email': email || '',
        'success_url': 'https://writingcorrect.com/app?success=true',
        'cancel_url': 'https://writingcorrect.com/app?canceled=true',
        'locale': 'es',
      })
    });

    const session = await response.json();

    if (session.error) {
      return new Response(JSON.stringify({ error: session.error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
