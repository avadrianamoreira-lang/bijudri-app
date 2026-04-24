import { getSupabaseAdmin, requireAdmin } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminContext = await requireAdmin(req, res);
  if (!adminContext) return;

  const id = req.body?.id;
  const status = req.body?.status;
  if (!id || !status) {
    return res.status(400).json({ error: "ID e status sao obrigatorios." });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
