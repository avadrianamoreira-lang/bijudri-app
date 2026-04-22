import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { cart, customer, shippingPrice } = req.body;

  const line_items = cart.map(item => ({
    price_data: {
      currency: "eur",
      product_data: {
        name: item.name,
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.qty,
  }));

  // envio como linha separada
  if (shippingPrice > 0) {
    line_items.push({
      price_data: {
        currency: "eur",
        product_data: {
          name: "Envio",
        },
        unit_amount: Math.round(shippingPrice * 100),
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items,
    mode: "payment",
    success_url: `${req.headers.origin}/success`,
    cancel_url: `${req.headers.origin}/checkout`,
    metadata: {
      customername: customer.name,
      email: customer.email
    }
  });

  res.status(200).json({ url: session.url });
}
