function normalizeUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) return "";
  return url;
}

export function normalizeImagesInput(images = {}) {
  const primaryImageUrl = normalizeUrl(images.primaryImageUrl || "");
  const galleryUrlsRaw = Array.isArray(images.galleryUrls) ? images.galleryUrls : [];
  const galleryUrls = galleryUrlsRaw.map(normalizeUrl).filter(Boolean);

  const uniqueUrls = [];
  const seen = new Set();

  if (primaryImageUrl && !seen.has(primaryImageUrl)) {
    uniqueUrls.push(primaryImageUrl);
    seen.add(primaryImageUrl);
  }

  for (const url of galleryUrls) {
    if (!seen.has(url)) {
      uniqueUrls.push(url);
      seen.add(url);
    }
  }

  return {
    primaryImageUrl,
    allUrls: uniqueUrls
  };
}

export async function replaceProductImages(supabaseAdmin, productId, images = {}) {
  const { primaryImageUrl, allUrls } = normalizeImagesInput(images);

  const { error: deleteError } = await supabaseAdmin
    .from("product_images")
    .delete()
    .eq("product_id", productId);
  if (deleteError) return { error: deleteError };

  if (!allUrls.length) {
    return { error: null, primaryImageUrl: primaryImageUrl || null };
  }

  const rows = allUrls.map((url, index) => ({
    product_id: productId,
    url,
    sort_order: index,
    is_primary: index === 0
  }));

  const { error: insertError } = await supabaseAdmin.from("product_images").insert(rows);
  if (insertError) return { error: insertError };

  return {
    error: null,
    primaryImageUrl: allUrls[0]
  };
}
