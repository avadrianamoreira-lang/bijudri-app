import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// ⚠️ MUITO IMPORTANTE (fica aqui em cima, fora da função)
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    const buf = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", chunk => {
        data += chunk;
      });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

  } catch (err) {
    console.error("Erro webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🎯 PAGAMENTO CONFIRMADO
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const orderId = session.metadata.order_id;

    // ✅ ATUALIZAR ENCOMENDA
    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "confirmed"
      })
      .eq("id", orderId);

    if (error) {
      console.error("Erro ao atualizar encomenda:", error);
    }

  // 📧 enviar email
  await resend.emails.send({
  from: "Bijudri <encomendas@bijudri.pt>",
  to: session.customer_email,
  subject: "Encomenda confirmada 💛",
  html: `
    <h1>Obrigado pela tua encomenda!</h1>
    <p>Número: ${session.metadata.order_number}</p>
  `
});
  }


  res.status(200).json({ received: true });
}
