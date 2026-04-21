import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ⚠️ IMPORTANTE: desativar body parsing
export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const sig = req.headers['stripe-signature'];

  let event;

  try {
    const rawBody = await buffer(req);

    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

  } catch (err) {
    console.error('❌ Erro na verificação do webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🔴 EVENTO PRINCIPAL
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const orderId = session.metadata?.order_id;

    if (!orderId) {
      console.error('❌ order_id não encontrado no metadata');
      return res.status(400).send('Missing order_id');
    }

    try {
      // 🔴 Buscar Payment Intent
      const paymentIntentId = session.payment_intent;

      // 🔴 Atualizar encomenda
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'paid', // ou 'processing' se preferires
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntentId
        })
        .eq('id', orderId);

      if (error) {
        console.error('❌ Erro ao atualizar encomenda:', error);
        return res.status(500).send('Erro ao atualizar');
      }

      console.log('✅ Pagamento confirmado para order:', orderId);

    } catch (err) {
      console.error('❌ Erro no processamento:', err);
      return res.status(500).send('Erro interno');
    }
  }

  res.status(200).json({ received: true });
}

// 🔴 Função necessária para ler raw body
function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    readable.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    readable.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    readable.on('error', reject);
  });
}
