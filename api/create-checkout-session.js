import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BJ-${year}${month}${day}-${random}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      customer,
      cart,
      shippingMethod,
      shippingPrice,
      subtotal,
      total
    } = req.body;

    if (!customer || !cart || !cart.length || !shippingMethod) {
      return res.status(400).json({ error: "Dados em falta." });
    }

    const numericSubtotal = Number(subtotal) || 0;
    const numericShipping = Number(shippingPrice) || 0;
    const numericTotal = Number(total) || 0;

    const orderNumber = generateOrderNumber();

    const orderPayload = {
      order_number: orderNumber,
      customer_name: customer.name || null,
      customer_email: customer.email || null,
      customer_phone: customer.phone || null,
      address: customer.address || null,
      city: customer.city || null,
      postal_code: customer.postal || null,
      country: customer.country || null,
      inpost_address: customer.inpost || null,
      subtotal: numericSubtotal,
      shipping_price: numericShipping,
      total: numericTotal,
      shipping_method: shippingMethod,
      status: "pending_payment",
      payment_status: "pending",
      payment_method: "stripe",
      email_sent: false
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();

    if (orderError) {
      console.error("Erro ao criar encomenda:", orderError);
      return res.status(400).json({ error: orderError.message });
    }

    const itemsPayload = cart.map(item => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      quantity: Number(item.qty) || 1,
      price: Number(item.price) || 0,
      exterior: item.exterior || null,
      lining: item.lining || null
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsPayload);

    if (itemsError) {
      console.error("Erro ao guardar artigos:", itemsError);

      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      return res.status(400).json({ error: itemsError.message });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customer.email,
      success_url: `${process.env.APP_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/cancel.html`,
      metadata: {
        order_id: order.id,
        order_number: orderNumber
      },
      line_items: [
        ...cart.map(item => ({
          price_data: {
            currency: "eur",
            product_data: {
              name: item.name,
              description: [
                item.exterior ? `Exterior: ${item.exterior}` : null,
                item.lining ? `Forro: ${item.lining}` : null
              ].filter(Boolean).join(" | ")
            },
            unit_amount: Math.round((Number(item.price) || 0) * 100)
          },
          quantity: Number(item.qty) || 1
        })),
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Envio - ${shippingMethod}`
            },
            unit_amount: Math.round(numericShipping * 100)
          },
          quantity: 1
        }
      ]
    });

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        stripe_session_id: session.id
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("Erro ao guardar stripe_session_id:", updateError);
      return res.status(400).json({ error: updateError.message });
    }

    return res.status(200).json({
      url: session.url
    });
  } catch (error) {
    console.error("Erro geral create-checkout-session:", error);
    return res.status(500).json({ error: error.message });
  }
}
