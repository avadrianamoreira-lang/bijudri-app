import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customer, shipping, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }

    // 🔴 Calcular total no backend
    let subtotal = 0;

    for (const item of items) {
      subtotal += item.price * item.quantity;
    }

    const shippingPrice = shipping.price || 0;
    const total = subtotal + shippingPrice;

    // 🔴 Criar encomenda (ALINHADO COM AS TUAS COLUNAS)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,

        address: shipping.address.address,
city: shipping.address.city,
postal_code: shipping.address.postal_code,
country: shipping.address.country,

inpost_address: shipping.inpost_address,
shipping_address: shipping.address.address,

        shipping_method: shipping.method,
        shipping_price: shippingPrice,

        subtotal,
        total,

        status: 'pending_payment',
        payment_status: 'pending'
      }])
      .select()
      .single();

    if (orderError) {
      console.error(orderError);
      return res.status(500).json({ error: 'Erro ao criar encomenda' });
    }

    // 🔴 Criar order_items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      exterior: item.exterior,
      lining: item.lining
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error(itemsError);
      return res.status(500).json({ error: 'Erro ao criar items' });
    }

    // 🔴 Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],

      line_items: [
        ...items.map(item => ({
          price_data: {
            currency: 'eur',
            product_data: {
              name: item.product_name
            },
            unit_amount: Math.round(item.price * 100)
          },
          quantity: item.quantity
        })),
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Envio (${shipping.method})`
            },
            unit_amount: Math.round(shippingPrice * 100)
          },
          quantity: 1
        }
      ],

      mode: 'payment',

      success_url: `${process.env.APP_URL}/success.html`,
      cancel_url: `${process.env.APP_URL}/cancel.html`,

      metadata: {
        order_id: order.id
      }
    });

    // 🔴 Guardar session ID
    await supabase
      .from('orders')
      .update({
        stripe_session_id: session.id,
        payment_method: 'stripe'
      })
      .eq('id', order.id);

    return res.status(200).json({
      url: session.url
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Erro interno'
    });
  }
}
