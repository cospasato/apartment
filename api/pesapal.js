// api/pesapal.js — Pesapal payment gateway integration
// Handles: initiate payment, IPN callback, status check
const { getDb, setCors, dbError } = require('./_db.js');

// ── Pesapal v3 API helpers ──────────────────────────────────
async function getPesapalToken(consumerKey, consumerSecret, isLive) {
  const base = isLive
    ? 'https://pay.pesapal.com/v3'
    : 'https://cybqa.pesapal.com/pesapalv3';

  const resp = await fetch(`${base}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
  });
  const data = await resp.json();
  if (!data.token) throw new Error('Pesapal auth failed: ' + (data.message || JSON.stringify(data)));
  return { token: data.token, base };
}

async function registerIPN(base, token, ipnUrl) {
  const resp = await fetch(`${base}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: 'GET' }),
  });
  const data = await resp.json();
  return data.ipn_id || null;
}

async function submitOrder(base, token, order) {
  const resp = await fetch(`${base}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(order),
  });
  const data = await resp.json();
  if (!data.redirect_url) throw new Error('Pesapal order failed: ' + (data.message || JSON.stringify(data)));
  return data;
}

async function getTransactionStatus(base, token, orderTrackingId) {
  const resp = await fetch(`${base}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  return await resp.json();
}

// ── Main handler ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let sql;
  try { sql = getDb(); } catch (err) { return res.status(500).json({ error: err.message }); }

  const { action } = req.query;

  try {
    // ── Load Pesapal credentials from platform_settings ──
    const settings = await sql`SELECT key, value FROM platform_settings WHERE key IN ('pesapal_consumer_key','pesapal_consumer_secret','pesapal_env','payment_currency','platform_currency') LIMIT 10`;
    const cfg = {};
    settings.forEach(r => { cfg[r.key] = r.value; });

    const consumerKey    = cfg.pesapal_consumer_key    || process.env.PESAPAL_CONSUMER_KEY    || '';
    const consumerSecret = cfg.pesapal_consumer_secret || process.env.PESAPAL_CONSUMER_SECRET || '';
    const isLive         = (cfg.pesapal_env || process.env.PESAPAL_ENV || 'sandbox') === 'live';

    if (!consumerKey || !consumerSecret) {
      return res.status(400).json({ error: 'Pesapal credentials not configured. Set them in Super Admin → Gateways.' });
    }

    // ─────────────────────────────────────────────────────────
    // INITIATE: store owner starts a subscription payment
    // POST /api/pesapal?action=initiate
    // Body: { store_id, plan_id, billing_cycle, owner_email, owner_phone, owner_name }
    // ─────────────────────────────────────────────────────────
    if (req.method === 'POST' && action === 'initiate') {
      const { store_id, plan_id, billing_cycle, owner_email, owner_phone, owner_name } = req.body || {};
      if (!store_id || !plan_id) return res.status(400).json({ error: 'store_id and plan_id required' });

      // Get plan price
      const plans = await sql`SELECT * FROM subscription_plans WHERE id = ${plan_id}`;
      if (!plans.length) return res.status(404).json({ error: 'Plan not found' });
      const plan = plans[0];

      const amount = billing_cycle === 'yearly'
        ? (plan.price_yearly || plan.price_monthly * 12)
        : plan.price_monthly;

      if (!amount || amount <= 0) return res.status(400).json({ error: 'Plan has no price set' });

      // Build a unique merchant reference
      const merchantRef = 'BNBMIS-' + store_id.slice(-6).toUpperCase() + '-' + Date.now();

      // Use the actual domain from the request Host header (not VERCEL_URL which is a preview URL)
      const appUrl  = 'https://bnbmis.com';
      const callbackUrl = appUrl + '/api/pesapal?action=callback&store_id=' + store_id + '&plan_id=' + plan_id + '&cycle=' + (billing_cycle||'monthly') + '&ref=' + merchantRef;
      const ipnUrl      = appUrl + '/api/pesapal?action=ipn';

      // Get Pesapal auth token
      const { token, base } = await getPesapalToken(consumerKey, consumerSecret, isLive);

      // Register IPN (idempotent — Pesapal deduplicates by URL)
      let ipnId;
      try { ipnId = await registerIPN(base, token, ipnUrl); } catch {}

      // Submit order to Pesapal
      const order = {
        id:               merchantRef,
        // Use configured currency (TZS by default for Tanzania)
        // Pesapal supports TZS natively — no conversion needed
        currency:         (cfg.payment_currency || cfg.platform_currency || 'TZS').toUpperCase(),
        amount:           Math.round(Number(amount)), // Pesapal expects integer cents for some currencies
        description:      `BNBMIS ${plan.name} subscription (${billing_cycle||'monthly'})`,
        callback_url:     callbackUrl,
        notification_id:  ipnId || '',
        billing_address: {
          email_address: owner_email || '',
          phone_number:  (owner_phone || '').replace(/\D/g, ''),
          first_name:    (owner_name  || 'Business').split(' ')[0],
          last_name:     (owner_name  || 'Owner').split(' ').slice(1).join(' ') || 'Owner',
        },
      };

      const result = await submitOrder(base, token, order);

      // Store pending payment record
      await sql`
        INSERT INTO subscription_payments (store_id, amount, method, reference, notes)
        VALUES (${store_id}, ${amount}, 'Pesapal', ${merchantRef}, ${'Pending — ' + plan.name + ' ' + (billing_cycle||'monthly')})
        ON CONFLICT DO NOTHING
      `;

      return res.status(200).json({
        redirect_url:       result.redirect_url,
        order_tracking_id:  result.order_tracking_id,
        merchant_reference: merchantRef,
      });
    }

    // ─────────────────────────────────────────────────────────
    // CALLBACK: user returns to site after completing payment on Pesapal
    // GET /api/pesapal?action=callback&OrderTrackingId=xxx&store_id=...
    // ─────────────────────────────────────────────────────────
    if (action === 'callback') {
      const orderTrackingId = req.query.OrderTrackingId || req.query.order_tracking_id || '';
      const storeId = req.query.store_id || '';
      const planId  = req.query.plan_id  || '';
      const cycle   = req.query.cycle    || 'monthly';
      const ref     = req.query.ref      || '';

      if (orderTrackingId) {
        try {
          const { token, base } = await getPesapalToken(consumerKey, consumerSecret, isLive);
          const status = await getTransactionStatus(base, token, orderTrackingId);

          if (status.payment_status_description === 'Completed') {
            await activateSubscription(sql, storeId, planId, cycle, status.amount, 'Pesapal', ref || orderTrackingId, status.confirmation_code);
          }
        } catch(e) {
          console.error('Callback status check failed:', e.message);
        }
      }

      // Redirect back to the billing tab on the actual domain used
      const appUrl2 = 'https://bnbmis.com';
      // ?payment=done triggers the success handler; #billing scrolls to billing tab
      return res.redirect(302, appUrl2 + '/?payment=done&store=' + storeId + '&tab=billing');
    }

    // ─────────────────────────────────────────────────────────
    // IPN: Pesapal notifies us of payment status changes
    // GET /api/pesapal?action=ipn&OrderTrackingId=xxx&OrderMerchantReference=xxx
    // ─────────────────────────────────────────────────────────
    if (action === 'ipn') {
      const orderTrackingId  = req.query.OrderTrackingId || '';
      const merchantReference = req.query.OrderMerchantReference || '';

      if (!orderTrackingId) return res.status(200).json({ message: 'No tracking id' });

      const { token, base } = await getPesapalToken(consumerKey, consumerSecret, isLive);
      const status = await getTransactionStatus(base, token, orderTrackingId);

      if (status.payment_status_description === 'Completed') {
        // Parse store_id and plan from merchant reference BNBMIS-{storeId}-{ts}
        // or look it up from pending payments
        const pending = await sql`
          SELECT * FROM subscription_payments
          WHERE reference = ${merchantReference} OR reference = ${orderTrackingId}
          LIMIT 1
        `;

        if (pending.length) {
          const p = pending[0];
          // Find plan from subscription
          const sub = await sql`SELECT plan_id, billing_cycle FROM subscriptions WHERE store_id = ${p.store_id} ORDER BY created_at DESC LIMIT 1`;
          const planId = sub[0]?.plan_id || null;
          const cycle  = sub[0]?.billing_cycle || 'monthly';

          await activateSubscription(sql, p.store_id, planId, cycle, status.amount, 'Pesapal', merchantReference, status.confirmation_code);
        }
      }

      return res.status(200).json({ orderNotificationType: 'IPNCHANGE', orderTrackingId, orderMerchantReference: merchantReference, status: 200 });
    }

    // ─────────────────────────────────────────────────────────
    // STATUS CHECK: verify payment status for a given tracking ID
    // GET /api/pesapal?action=status&tracking_id=xxx
    // ─────────────────────────────────────────────────────────
    if (action === 'status') {
      const trackingId = req.query.tracking_id || '';
      if (!trackingId) return res.status(400).json({ error: 'tracking_id required' });

      const { token, base } = await getPesapalToken(consumerKey, consumerSecret, isLive);
      const status = await getTransactionStatus(base, token, trackingId);
      return res.status(200).json(status);
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (err) {
    console.error('Pesapal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ── Helper: activate store subscription after confirmed payment ──
async function activateSubscription(sql, storeId, planId, cycle, amount, method, reference, confirmation) {
  if (!storeId) return;

  const endDate = cycle === 'yearly'
    ? new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
    : new Date(Date.now() +  30*24*60*60*1000).toISOString().split('T')[0];

  // Upsert subscription
  const existing = await sql`SELECT id FROM subscriptions WHERE store_id = ${storeId} LIMIT 1`;
  let subId;
  if (existing.length) {
    await sql`UPDATE subscriptions SET status='active', current_period_end=${endDate} WHERE id=${existing[0].id}`;
    subId = existing[0].id;
  } else {
    const newSub = await sql`
      INSERT INTO subscriptions (store_id, plan_id, billing_cycle, amount, status, current_period_end)
      VALUES (${storeId}, ${planId}, ${cycle}, ${amount||0}, 'active', ${endDate})
      RETURNING id
    `;
    subId = newSub[0].id;
  }

  // Update payment record
  await sql`
    UPDATE subscription_payments
    SET method=${method}, notes=${'Pesapal confirmed: ' + (confirmation||'')}
    WHERE reference=${reference} AND store_id=${storeId}
  `;
  // If no record existed, insert
  const existing_pay = await sql`SELECT id FROM subscription_payments WHERE reference=${reference}`;
  if (!existing_pay.length) {
    await sql`
      INSERT INTO subscription_payments (store_id, subscription_id, amount, method, reference, notes)
      VALUES (${storeId}, ${subId}, ${amount||0}, ${method}, ${reference}, ${'Auto: ' + (confirmation||'')})
    `;
  }

  // Activate store + set plan
  if (planId) {
    await sql`UPDATE stores SET status='active', plan_id=${planId} WHERE id=${storeId}`;
  } else {
    await sql`UPDATE stores SET status='active' WHERE id=${storeId}`;
  }

  console.log('Subscription activated for store', storeId, 'until', endDate);
}
