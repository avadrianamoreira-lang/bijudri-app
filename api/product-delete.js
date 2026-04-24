import { getSupabaseAdmin, requireAdmin } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminContext = await requireAdmin(req, res);
  if (!adminContext) return;

  const id = req.body?.id;
  if (!id) return res.status(400).json({ error: "ID em falta." });

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
