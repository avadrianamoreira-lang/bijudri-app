import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend"; // 👈 ADICIONAR

const resend = new Resend(process.env.RESEND_API_KEY); // 👈 ADICIONAR

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

  // 👇 BLOQUEAR requests inválidos (browser, bots, etc)
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).send("No signature");
  }

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

  console.log("SESSION:", session); 

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
if (session.customer_email) {
  try {
    await resend.emails.send({
      from: "Bijudri <encomendas@bijudri.pt>",
      to: session.customer_email,
      subject: "Encomenda confirmada 💛",
      html: `
        <h1>Obrigado pela tua encomenda!</h1>
        <p>Número: ${session.metadata.order_number}</p>
      `
    });

    console.log("Email enviado com sucesso");
  } catch (err) {
    console.error("Erro ao enviar email:", err);
  }
}

  res.status(200).json({ received: true });
}
