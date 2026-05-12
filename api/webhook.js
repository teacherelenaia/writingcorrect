export const config = { runtime: 'edge' };

const PRICE_TO_PLAN = {
  'price_1TVsHTDIUCWpQtLcd9xmefmw': 'basic',
  'price_1TVsHTDIUCWpQtLcCVrjtGI7': 'teacher',
  'price_1TVsHTDIUCWpQtLcHRFvFWgQ': 'center',
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

async function sendConfirmationEmail(email, plan) {
  const planNames = {
    basic: 'B\u00e1sico (6,99\u20ac/mes)',
    teacher: 'Profesor (9,99\u20ac/mes)',
    center: 'Centro (39\u20ac/mes)'
  };
  const planName = planNames[plan] || plan;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WritingCorrect <noreply@writingcorrect.com>',
        to: email,
        subject: '\u2705 Suscripci\u00f3n activada - WritingCorrect',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f8fafc;border-radius:12px;">
            <h1 style="color:#1e293b;font-size:24px;margin-bottom:8px;">\u00a1Bienvenido/a a WritingCorrect!</h1>
            <p style="color:#475569;font-size:16px;">Tu suscripci\u00f3n al plan <strong>${planName}</strong> est\u00e1 activa.</p>
            <p style="color:#475569;font-size:16px;">Ya puedes corregir writings con IA desde tu cuenta.</p>
            <a href="https://writingcorrect.com/app" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Ir a WritingCorrect \u2192</a>
            <p style="color:#94a3b8;font-size:13px;margin-top:24px;">Si tienes alguna duda, responde a este email.</p>
          </div>
        `,
      }),
    });
  } catch (err) {
    // Email failure shouldn't break webhook
    console.error('Email error:', err.message);
  }
}
async function sendCancellationEmail(email) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WritingCorrect <noreply@writingcorrect.com>',
        to: email,
        subject: 'Suscripcion cancelada - WritingCorrect',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f8fafc;border-radius:12px;">
            <h1 style="color:#1e293b;font-size:24px;margin-bottom:8px;">Tu suscripcion ha sido cancelada</h1>
            <p style="color:#475569;font-size:16px;">Tu acceso a WritingCorrect finalizara al termino del periodo de facturacion actual.</p>
            <p style="color:#475569;font-size:16px;">Puedes volver a suscribirte en cualquier momento.</p>
            <a href="https://writingcorrect.com/#precios" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Ver planes</a>
            <p style="color:#94a3b8;font-size:13px;margin-top:24px;">Si tienes alguna duda, responde a este email.</p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error('Cancellation email error:', err.message);
  }
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
            corrections_reset_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        if (email) await sendConfirmationEmail(email, plan);
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
            corrections_reset_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
                if (customer.email) await sendCancellationEmail(customer.email);
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
