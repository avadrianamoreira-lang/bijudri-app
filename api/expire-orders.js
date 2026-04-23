import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: "expired",
      status: "cancelled"
    })
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .eq("payment_status", "pending");

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(200).json({ message: "Orders expiradas atualizadas" });
}
