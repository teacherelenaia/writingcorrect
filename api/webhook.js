export const config = { runtime: 'edge' };

const PRICE_TO_PLAN = {
      'price_1TQ6ZID4OTzYheExGNSUWHhJ': 'basic',
      'price_1TQ6abD4OTzYheExYuDTrEq9': 'teacher',
      'price_1TQ6bYD4OTzYheExarp2zPHc': 'center',
};

// ---------- Helpers Supabase ----------

const SB_HEADERS = () => ({
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SECRET_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
});

async function updateProfile(userId, data) {
      const res = await fetch(
              `${process.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
          {
                    method: 'PATCH',
                    headers: { ...SB_HEADERS(), 'Prefer': 'return=minimal' },
                    body: JSON.stringify(data),
          }
            );
      if (!res.ok) {
              const text = await res.text();
              throw new Error(`Supabase update error: ${text}`);
      }
}

async function getUserIdByEmail(email) {
      const res = await fetch(
              `${process.env.SUPABASE_URL}/rest/v1/rpc/get_user_id_by_email`,
          {
                    method: 'POST',
                    headers: SB_HEADERS(),
                    body: JSON.stringify({ email }),
          }
            );
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data)) return data[0]?.id || data[0] || null;
      if (data && typeof data === 'object') return data.id || null;
      return data || null;
}

async function markEventProcessed(eventId) {
      const res = await fetch(
              `${process.env.SUPABASE_URL}/rest/v1/processed_webhooks`,
          {
                    method: 'POST',
                    headers: { ...SB_HEADERS(), 'Prefer': 'return=minimal' },
                    body: JSON.stringify({ event_id: eventId }),
          }
            );
      if (res.status === 409) return false;
      if (!res.ok && res.status !== 201) {
              const text = await res.text();
              console.error('processed_webhooks insert failed:', text);
              return true;
      }
      return true;
}

async function savePendingSubscription(payload) {
      try {
              await fetch(
                        `${process.env.SUPABASE_URL}/rest/v1/pending_subscriptions`,
                  {
                              method: 'POST',
                              headers: { ...SB_HEADERS(), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
                              body: JSON.stringify(payload),
                  }
                      );
      } catch (err) {
              console.error('pending_subscriptions save failed:', err.message);
      }
}

// ---------- Helpers Stripe ----------

async function stripeGet(path) {
      const res = await fetch(`https://api.stripe.com/v1/${path}`, {
              headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      });
      return res.json();
}

// ---------- Emails ----------

async function sendConfirmationEmail(email, plan) {
      const planNames = {
              basic: 'Basico (6,99 EUR/mes)',
              teacher: 'Profesor (9,99 EUR/mes)',
              center: 'Centro (39 EUR/mes)',
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
                                    subject: 'Suscripcion activada - WritingCorrect',
                                    html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f8fafc;border-radius:12px;"><h1 style="color:#1e293b;font-size:24px;margin-bottom:8px;">Bienvenido/a a WritingCorrect</h1><p style="color:#475569;font-size:16px;">Tu suscripcion al plan <strong>${planName}</strong> esta activa.</p><p style="color:#475569;font-size:16px;">Ya puedes corregir writings con IA desde tu cuenta.</p><a href="https://writingcorrect.com/app" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Ir a WritingCorrect</a><p style="color:#94a3b8;font-size:13px;margin-top:24px;">Si tienes alguna duda, responde a este email.</p></div>`,
                        }),
              });
      } catch (err) {
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
                                    html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f8fafc;border-radius:12px;"><h1 style="color:#1e293b;font-size:24px;margin-bottom:8px;">Tu suscripcion ha sido cancelada</h1><p style="color:#475569;font-size:16px;">Tu acceso a WritingCorrect finalizara al termino del periodo de facturacion actual.</p><p style="color:#475569;font-size:16px;">Puedes volver a suscribirte en cualquier momento.</p><a href="https://writingcorrect.com/#precios" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Ver planes</a><p style="color:#94a3b8;font-size:13px;margin-top:24px;">Si tienes alguna duda, responde a este email.</p></div>`,
                        }),
              });
      } catch (err) {
              console.error('Cancellation email error:', err.message);
      }
}

// ---------- Verificacion de firma (timing-safe + replay protection) ----------

function timingSafeEqual(a, b) {
      if (a.length !== b.length) return false;
      let result = 0;
      for (let i = 0; i < a.length; i++) {
              result |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return result === 0;
}

async function verifyStripeSignature(payload, sigHeader, secret, toleranceSec = 300) {
      if (!sigHeader || !secret) return false;
      const parts = sigHeader.split(',').reduce((acc, part) => {
              const [k, v] = part.split('=');
              if (k && v) acc[k] = acc[k] ? acc[k] + ',' + v : v;
              return acc;
      }, {});
      const timestamp = parts['t'];
      const signatures = (parts['v1'] || '').split(',');
      if (!timestamp || signatures.length === 0) return false;

  const ts = parseInt(timestamp, 10);
      if (!Number.isFinite(ts)) return false;
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - ts) > toleranceSec) return false;

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

  return signatures.some(sig => timingSafeEqual(computed, sig));
}

// ---------- Resolucion de plan/usuario ----------

async function resolvePlanFromSubscription(subscriptionId) {
      if (!subscriptionId) return null;
      const sub = await stripeGet(`subscriptions/${subscriptionId}`);
      const priceId = sub?.items?.data?.[0]?.price?.id;
      return { plan: PRICE_TO_PLAN[priceId] || null, status: sub?.status, raw: sub };
}

async function resolveCustomerEmail(customerId) {
      if (!customerId) return null;
      const c = await stripeGet(`customers/${customerId}`);
      return c?.email || null;
}

// ---------- Handler ----------

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

  const shouldProcess = await markEventProcessed(event.id);
      if (!shouldProcess) {
              return new Response(JSON.stringify({ received: true, duplicate: true }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
              });
      }

  try {
          switch (event.type) {
              case 'checkout.session.completed': {
                          const session = event.data.object;
                          const userId =
                                        session.metadata?.userId ||
                                        session.client_reference_id ||
                                        null;
                          const email =
                                        session.customer_email ||
                                        session.customer_details?.email ||
                                        null;

                          let plan = session.metadata?.plan || null;
                          let subscriptionId = session.subscription || null;

                          if (!plan && subscriptionId) {
                                        const resolved = await resolvePlanFromSubscription(subscriptionId);
                                        plan = resolved?.plan || null;
                          }

                          if (!plan) {
                                        console.error('Webhook: no plan resolved for session', session.id);
                                        break;
                          }

                          let targetUserId = userId;
                          if (!targetUserId && email) {
                                        targetUserId = await getUserIdByEmail(email);
                          }

                          if (targetUserId) {
                                        await updateProfile(targetUserId, {
                                                        plan,
                                                        corrections_used: 0,
                                                        corrections_reset_at: new Date().toISOString(),
                                                        stripe_customer_id: session.customer || null,
                                                        stripe_subscription_id: subscriptionId,
                                                        updated_at: new Date().toISOString(),
                                        });
                                        if (email) await sendConfirmationEmail(email, plan);
                          } else if (email) {
                                        console.warn('Webhook: user not found, saving pending for', email);
                                        await savePendingSubscription({
                                                        email,
                                                        plan,
                                                        stripe_customer_id: session.customer || null,
                                                        stripe_subscription_id: subscriptionId,
                                        });
                                        await sendConfirmationEmail(email, plan);
                          } else {
                                        console.error('Webhook: no userId and no email for session', session.id);
                          }
                          break;
              }

              case 'customer.subscription.updated': {
                          const sub = event.data.object;
                          const priceId = sub?.items?.data?.[0]?.price?.id;
                          const mappedPlan = PRICE_TO_PLAN[priceId];
                          if (!mappedPlan) {
                                        console.warn('Webhook: unknown price on subscription.updated', priceId);
                                        break;
                          }

                          const planActiveStates = ['active', 'trialing'];
                          const effectivePlan = planActiveStates.includes(sub.status) ? mappedPlan : 'free';

                          let userId = sub.metadata?.userId || null;
                          if (!userId && sub.customer) {
                                        const email = await resolveCustomerEmail(sub.customer);
                                        if (email) userId = await getUserIdByEmail(email);
                          }

                          if (!userId) {
                                        console.warn('Webhook: subscription.updated no user found', sub.id);
                                        break;
                          }

                          await updateProfile(userId, {
                                        plan: effectivePlan,
                                        stripe_subscription_id: sub.id,
                                        updated_at: new Date().toISOString(),
                          });
                          break;
              }

              case 'customer.subscription.deleted': {
                          const sub = event.data.object;
                          const email = await resolveCustomerEmail(sub.customer);
                          const userId =
                                        sub.metadata?.userId ||
                                        (email ? await getUserIdByEmail(email) : null);

                          if (userId) {
                                        await updateProfile(userId, {
                                                        plan: 'free',
                                                        corrections_used: 0,
                                                        corrections_reset_at: new Date().toISOString(),
                                                        stripe_subscription_id: null,
                                                        updated_at: new Date().toISOString(),
                                        });
                          }
                          if (email) await sendCancellationEmail(email);
                          break;
              }

              case 'invoice.payment_failed': {
                          const inv = event.data.object;
                          console.warn('Webhook: payment_failed', inv.id, inv.customer);
                          break;
              }

              default:
                          break;
          }
  } catch (err) {
          console.error('Webhook handler error:', event.type, event.id, err.message);
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
  });
}
