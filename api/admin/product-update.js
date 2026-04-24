import { getSupabaseAdmin, requireAdmin } from "./_auth.js";
import { normalizeImagesInput, replaceProductImages } from "./_product-images.js";

function validateProductPayload(payload) {
  if (!payload || typeof payload !== "object") return "Payload invalido.";

  if ("name" in payload && !String(payload.name || "").trim()) {
    return "Nome do produto e obrigatorio.";
  }

  if ("category" in payload && !String(payload.category || "").trim()) {
    return "Categoria e obrigatoria.";
  }

  if ("price" in payload) {
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price <= 0) return "Preco deve ser maior que 0.";
  }

  if ("stock" in payload) {
    const stock = Number(payload.stock);
    if (!Number.isInteger(stock) || stock < 0) return "Stock deve ser inteiro >= 0.";
  }

  return "";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST" && req.method !== "PATCH") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const adminContext = await requireAdmin(req, res);
    if (!adminContext) return;

    const id = req.body?.id;
    const payload = req.body?.payload;
    const images = req.body?.images;

    if (!id) return res.status(400).json({ error: "ID em falta." });
    const validationError = validateProductPayload(payload);
    if (validationError) return res.status(400).json({ error: validationError });

    const supabaseAdmin = getSupabaseAdmin();

    if ("name" in payload) {
      const { data: existing } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("name", payload.name)
        .neq("id", id)
        .limit(1);
      if ((existing || []).length) {
        return res.status(409).json({ error: "Ja existe outro produto com este nome." });
      }
    }

    const updatePayload = { ...payload };
    if (images) {
      const { primaryImageUrl } = normalizeImagesInput(images);
      updatePayload.image_url = primaryImageUrl || null;
    }

    const { error } = await supabaseAdmin.from("products").update(updatePayload).eq("id", id);
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (images) {
      const { error: imageError } = await replaceProductImages(supabaseAdmin, id, images);
      if (imageError) {
        return res.status(400).json({ error: imageError.message });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Erro interno no update produto." });
  }
}
