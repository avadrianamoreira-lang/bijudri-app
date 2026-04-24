import { getSupabaseAdmin, requireAdmin } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminContext = await requireAdmin(req, res);
  if (!adminContext) return;

  const id = req.query?.id;
  if (!id) return res.status(400).json({ error: "ID em falta." });

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("product_images")
    .select("id,url,sort_order,is_primary")
    .eq("product_id", id)
    .order("sort_order", { ascending: true });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ items: data || [] });
}
