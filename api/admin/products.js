import { getSupabaseAdmin, requireAdmin } from "./_auth.js";
import { normalizeImagesInput, replaceProductImages } from "./_product-images.js";

function validateProductPayload(payload) {
  if (!payload || typeof payload !== "object") return "Payload invalido.";
  if (!payload.name || !String(payload.name).trim()) return "Nome do produto e obrigatorio.";
  if (!payload.category || !String(payload.category).trim()) return "Categoria e obrigatoria.";

  const price = Number(payload.price);
  if (!Number.isFinite(price) || price <= 0) return "Preco deve ser maior que 0.";

  const stock = Number(payload.stock);
  if (!Number.isInteger(stock) || stock < 0) return "Stock deve ser inteiro >= 0.";

  return "";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const adminContext = await requireAdmin(req, res);
    if (!adminContext) return;

    const payload = req.body?.payload;
    const images = req.body?.images || {};
    const validationError = validateProductPayload(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("name", payload.name)
      .limit(1);

    if ((existing || []).length) {
      return res.status(409).json({ error: "Ja existe um produto com este nome." });
    }

    const { primaryImageUrl } = normalizeImagesInput(images);
    const productPayload = {
      ...payload,
      image_url: primaryImageUrl || payload.image_url || null
    };

    const { data: createdProduct, error } = await supabaseAdmin
      .from("products")
      .insert(productPayload)
      .select("id")
      .single();
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (createdProduct?.id) {
      const { error: imageError } = await replaceProductImages(supabaseAdmin, createdProduct.id, images);
      if (imageError) {
        return res.status(400).json({ error: imageError.message });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Erro interno na criacao de produto." });
  }
}

