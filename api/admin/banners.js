import { getSupabaseAdmin, requireAdmin } from "./_auth.js";

export default async function handler(req, res) {
  try {
    const adminContext = await requireAdmin(req, res);
    if (!adminContext) return;

    const supabaseAdmin = getSupabaseAdmin();

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("homepage_banners")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ items: data || [] });
    }

    if (req.method === "POST") {
      const action = req.body?.action || "create";

      if (action === "create") {
        const payload = req.body?.payload || {};
        const { error } = await supabaseAdmin.from("homepage_banners").insert({
          image_url: payload.image_url || "",
          title: payload.title || "",
          subtitle: payload.subtitle || "",
          link_url: payload.link_url || "",
          active: payload.active !== false,
          sort_order: Number(payload.sort_order || 0)
        });
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true });
      }

      if (action === "update") {
        const id = req.body?.id;
        const payload = req.body?.payload || {};
        if (!id) return res.status(400).json({ error: "ID em falta." });
        const { error } = await supabaseAdmin
          .from("homepage_banners")
          .update({
            image_url: payload.image_url || "",
            title: payload.title || "",
            subtitle: payload.subtitle || "",
            link_url: payload.link_url || "",
            active: payload.active !== false,
            sort_order: Number(payload.sort_order || 0)
          })
          .eq("id", id);
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true });
      }

      if (action === "delete") {
        const id = req.body?.id;
        if (!id) return res.status(400).json({ error: "ID em falta." });
        const { error } = await supabaseAdmin.from("homepage_banners").delete().eq("id", id);
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: "Acao invalida." });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Erro interno em banners." });
  }
}
