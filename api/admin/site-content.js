import { getSupabaseAdmin, requireAdmin } from "./_auth.js";

const DEFAULT_CONTENT = {
  id: 1,
  logo_url: "",
  about_title: "Sobre mim",
  about_content: "",
  hero_title: "",
  hero_subtitle: ""
};

export default async function handler(req, res) {
  try {
    const adminContext = await requireAdmin(req, res);
    if (!adminContext) return;

    const supabaseAdmin = getSupabaseAdmin();

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("site_content")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ item: data || DEFAULT_CONTENT });
    }

    if (req.method === "POST" || req.method === "PATCH") {
      const payload = req.body?.payload || {};
      const row = { ...DEFAULT_CONTENT, ...payload, id: 1 };

      const { error } = await supabaseAdmin
        .from("site_content")
        .upsert(row, { onConflict: "id" });
      if (error) return res.status(400).json({ error: error.message });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Erro interno em site-content." });
  }
}
