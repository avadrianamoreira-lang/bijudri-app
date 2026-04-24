import { createClient } from "@supabase/supabase-js";

const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export function getSupabaseAdmin() {
  return supabaseAdmin;
}

export async function requireAdmin(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    res.status(401).json({ error: "Sem token de autenticacao." });
    return null;
  }

  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
  if (userError || !userData?.user?.id) {
    res.status(401).json({ error: "Sessao invalida ou expirada." });
    return null;
  }

  const userId = userData.user.id;
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    res.status(500).json({ error: "Erro ao validar perfil admin." });
    return null;
  }

  if (!profile || profile.role !== "admin") {
    res.status(403).json({ error: "Apenas admins podem executar esta acao." });
    return null;
  }

  return { userId };
}
