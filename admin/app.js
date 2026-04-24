const SUPABASE_URL = "https://kzlvxawotfnxjbnhysdx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bHZ4YXdvdGZueGpibmh5c2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDQ4MzYsImV4cCI6MjA5MTM4MDgzNn0.Kh5ugtSRLQXLbsM2JXz6KJEv85L5H64IStftuLNfNd8";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const app = document.getElementById("app");

const state = {
  products: [],
  orders: [],
  productFilters: {
    search: "",
    category: "all",
    active: "all",
    featured: "all",
    sort: "name_asc"
  },
  orderFilters: {
    search: "",
    status: "all",
    payment: "all"
  }
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEUR(value) {
  return `${Number(value || 0).toFixed(2)}EUR`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-PT");
}

function toBooleanFilter(value, defaultValue) {
  if (value === "all") return defaultValue;
  return value === "true";
}

function setMessage(text, isError = false) {
  const element = document.getElementById("admin-message");
  if (!element) return;
  element.innerHTML = `<div class="${
    isError ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
  } p-3 rounded mb-4">${escapeHtml(text)}</div>`;
  window.setTimeout(() => {
    const current = document.getElementById("admin-message");
    if (current) current.innerHTML = "";
  }, 3500);
}

async function getAccessToken() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();
  return session?.access_token || "";
}

async function callAdminApi(url, body, method = "POST") {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessao expirada. Faz login novamente.");
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Erro na operacao.");
  }

  return payload;
}

async function callAdminApiGet(url) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessao expirada. Faz login novamente.");
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Erro na operacao.");
  }

  return payload;
}

function parseGalleryUrls(input) {
  return String(input || "")
    .split(/\r?\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function collectImageInput() {
  const primaryImageUrl = document.getElementById("primary_image_url")?.value.trim() || "";
  const galleryRaw = document.getElementById("gallery_urls")?.value || "";
  const galleryUrls = parseGalleryUrls(galleryRaw);
  return { primaryImageUrl, galleryUrls };
}

function getPreviewUrls() {
  const { primaryImageUrl, galleryUrls } = collectImageInput();
  const urls = [];
  const seen = new Set();

  if (primaryImageUrl && !seen.has(primaryImageUrl)) {
    urls.push(primaryImageUrl);
    seen.add(primaryImageUrl);
  }

  for (const url of galleryUrls) {
    if (!seen.has(url)) {
      urls.push(url);
      seen.add(url);
    }
  }

  return urls;
}

function renderImagePreview() {
  const container = document.getElementById("image-preview");
  if (!container) return;
  const urls = getPreviewUrls();

  if (!urls.length) {
    container.innerHTML = `<p class="text-sm opacity-70">Sem imagens para preview.</p>`;
    return;
  }

  const activeIndex = Number(container.dataset.index || 0);
  const safeIndex = Math.max(0, Math.min(activeIndex, urls.length - 1));
  const current = urls[safeIndex];

  container.dataset.index = String(safeIndex);
  container.innerHTML = `
    <div class="border rounded p-3 bg-zinc-50">
      <img src="${escapeHtml(current)}" alt="Preview produto" class="w-full h-64 object-contain bg-white rounded border">
      <div class="flex items-center justify-between mt-3 text-sm">
        <button type="button" onclick="stepImagePreview(-1)" class="border rounded px-3 py-1">Anterior</button>
        <span>${safeIndex + 1} / ${urls.length}</span>
        <button type="button" onclick="stepImagePreview(1)" class="border rounded px-3 py-1">Seguinte</button>
      </div>
    </div>
  `;
}

function stepImagePreview(delta) {
  const container = document.getElementById("image-preview");
  if (!container) return;
  const urls = getPreviewUrls();
  if (!urls.length) return;

  const current = Number(container.dataset.index || 0);
  const next = (current + delta + urls.length) % urls.length;
  container.dataset.index = String(next);
  renderImagePreview();
}

async function init() {
  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Erro ao obter sessao:", error);
    renderLogin("Falha ao validar sessao.");
    return;
  }

  if (!session) {
    renderLogin();
    return;
  }

  renderApp();
}

function renderLogin(message = "") {
  app.innerHTML = `
    <div class="h-screen flex items-center justify-center bg-[#f7f3ef] p-4">
      <div class="bg-white p-6 rounded-xl shadow w-full max-w-sm">
        <h2 class="text-xl font-bold mb-4">Login Admin</h2>
        ${
          message
            ? `<div class="bg-red-100 text-red-800 p-3 rounded mb-3">${escapeHtml(
                message
              )}</div>`
            : ""
        }
        <input id="email" placeholder="Email" class="input w-full mb-3 border p-2 rounded">
        <input id="password" type="password" placeholder="Password" class="input w-full mb-3 border p-2 rounded">
        <button onclick="login()" class="btn w-full mt-2 bg-[#575244] text-white py-2 rounded">Entrar</button>
      </div>
    </div>
  `;
}

async function login() {
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;

  if (!email || !password) {
    renderLogin("Preenche email e password.");
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("Erro login:", error);
    renderLogin(error.message || "Erro no login.");
    return;
  }

  init();
}

async function logout() {
  await supabaseClient.auth.signOut();
  renderLogin();
}

function renderApp() {
  app.innerHTML = `
    <div class="flex h-screen">
      <aside class="w-64 bg-[#575244] text-white p-4">
        <h1 class="text-xl font-bold mb-6">Bijudri Admin</h1>
        <nav class="space-y-2 flex flex-col">
          <button class="text-left hover:bg-[#6a6354] rounded p-2" onclick="loadDashboard()">Dashboard</button>
          <button class="text-left hover:bg-[#6a6354] rounded p-2" onclick="loadOrders()">Encomendas</button>
          <button class="text-left hover:bg-[#6a6354] rounded p-2" onclick="loadProducts()">Produtos</button>
          <button class="text-left hover:bg-[#6a6354] rounded p-2 mt-8" onclick="logout()">Logout</button>
        </nav>
      </aside>

      <main class="flex-1 p-6 overflow-y-auto bg-[#f7f3ef]">
        <div id="admin-message"></div>
        <div id="content"></div>
      </main>
    </div>
  `;

  loadDashboard();
}

async function loadDashboard() {
  const [ordersRes, productsRes] = await Promise.all([
    supabaseClient.from("orders").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("products").select("*")
  ]);

  if (ordersRes.error || productsRes.error) {
    console.error("Erro dashboard:", ordersRes.error || productsRes.error);
    document.getElementById("content").innerHTML = `<p>Erro ao carregar dashboard.</p>`;
    return;
  }

  const orders = ordersRes.data || [];
  const products = productsRes.data || [];

  const paidOrders = orders.filter((order) => order.payment_status === "paid");
  const totalRevenue = paidOrders.reduce((acc, order) => acc + Number(order.total || 0), 0);
  const avgOrder = paidOrders.length ? totalRevenue / paidOrders.length : 0;
  const activeProducts = products.filter((product) => product.active).length;
  const lowStockCount = products.filter((product) => Number(product.stock || 0) <= 2).length;
  const pendingOrders = orders.filter((order) => order.status !== "delivered").length;

  document.getElementById("content").innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Dashboard</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <div class="bg-white rounded-xl shadow p-4">
        <p class="text-xs uppercase opacity-70">Receita paga</p>
        <p class="text-2xl font-bold">${formatEUR(totalRevenue)}</p>
      </div>
      <div class="bg-white rounded-xl shadow p-4">
        <p class="text-xs uppercase opacity-70">Encomendas pagas</p>
        <p class="text-2xl font-bold">${paidOrders.length}</p>
      </div>
      <div class="bg-white rounded-xl shadow p-4">
        <p class="text-xs uppercase opacity-70">Ticket medio</p>
        <p class="text-2xl font-bold">${formatEUR(avgOrder)}</p>
      </div>
      <div class="bg-white rounded-xl shadow p-4">
        <p class="text-xs uppercase opacity-70">Produtos ativos</p>
        <p class="text-2xl font-bold">${activeProducts}</p>
      </div>
      <div class="bg-white rounded-xl shadow p-4">
        <p class="text-xs uppercase opacity-70">Stock baixo (<=2)</p>
        <p class="text-2xl font-bold">${lowStockCount}</p>
      </div>
    </div>
    <div class="bg-white rounded-xl shadow p-4 mt-4">
      <p class="text-xs uppercase opacity-70">Encomendas por fechar</p>
      <p class="text-2xl font-bold">${pendingOrders}</p>
    </div>
  `;
}

async function loadOrders() {
  const { data, error } = await supabaseClient
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro encomendas:", error);
    document.getElementById("content").innerHTML = `<p>Erro ao carregar encomendas.</p>`;
    return;
  }

  state.orders = data || [];
  renderOrdersView();
}

function renderOrdersView() {
  const content = document.getElementById("content");
  const allOrders = state.orders;
  const search = state.orderFilters.search.toLowerCase();
  const statusOptions = [...new Set(allOrders.map((order) => order.status).filter(Boolean))];
  const paymentOptions = [...new Set(allOrders.map((order) => order.payment_status).filter(Boolean))];

  const filtered = allOrders.filter((order) => {
    const matchesSearch =
      !search ||
      String(order.customer_name || "").toLowerCase().includes(search) ||
      String(order.customer_email || "").toLowerCase().includes(search) ||
      String(order.order_number || "").toLowerCase().includes(search);
    const matchesStatus =
      state.orderFilters.status === "all" || order.status === state.orderFilters.status;
    const matchesPayment =
      state.orderFilters.payment === "all" || order.payment_status === state.orderFilters.payment;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  content.innerHTML = `
    <div class="flex items-center justify-between gap-3 mb-4">
      <h2 class="text-2xl font-bold">Encomendas</h2>
      <button onclick="loadOrders()" class="bg-white border px-3 py-2 rounded">Atualizar</button>
    </div>

    <div class="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
      <input id="order-search" class="border p-2 rounded" placeholder="Pesquisar cliente, email, n. encomenda" value="${escapeHtml(
        state.orderFilters.search
      )}">
      <select id="order-status" class="border p-2 rounded">
        <option value="all" ${
          state.orderFilters.status === "all" ? "selected" : ""
        }>Todos estados</option>
        ${statusOptions
          .map(
            (status) =>
              `<option value="${escapeHtml(status)}" ${
                state.orderFilters.status === status ? "selected" : ""
              }>${escapeHtml(status)}</option>`
          )
          .join("")}
      </select>
      <select id="order-payment" class="border p-2 rounded">
        <option value="all" ${
          state.orderFilters.payment === "all" ? "selected" : ""
        }>Todos pagamentos</option>
        ${paymentOptions
          .map(
            (payment) =>
              `<option value="${escapeHtml(payment)}" ${
                state.orderFilters.payment === payment ? "selected" : ""
              }>${escapeHtml(payment)}</option>`
          )
          .join("")}
      </select>
      <button onclick="applyOrderFilters()" class="bg-[#575244] text-white py-2 px-4 rounded">Aplicar filtros</button>
    </div>

    <div class="bg-white rounded-xl shadow overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-[#f3efe8] text-left">
          <tr>
            <th class="p-3">Encomenda</th>
            <th class="p-3">Cliente</th>
            <th class="p-3">Total</th>
            <th class="p-3">Pagamento</th>
            <th class="p-3">Estado</th>
            <th class="p-3">Criada em</th>
          </tr>
        </thead>
        <tbody>
          ${
            filtered.length
              ? filtered
                  .map(
                    (order) => `
              <tr class="border-t align-top">
                <td class="p-3">
                  <p class="font-semibold">${escapeHtml(order.order_number || order.id)}</p>
                  <p class="opacity-70">${escapeHtml(order.shipping_method || "-")}</p>
                </td>
                <td class="p-3">
                  <p class="font-semibold">${escapeHtml(order.customer_name || "-")}</p>
                  <p class="opacity-70">${escapeHtml(order.customer_email || "-")}</p>
                </td>
                <td class="p-3 font-semibold">${formatEUR(order.total)}</td>
                <td class="p-3">${escapeHtml(order.payment_status || "-")}</td>
                <td class="p-3">
                  <select onchange="updateOrderStatus('${order.id}', this.value)" class="border p-2 rounded">
                    ${statusOptions
                      .map(
                        (status) =>
                          `<option value="${escapeHtml(status)}" ${
                            order.status === status ? "selected" : ""
                          }>${escapeHtml(status)}</option>`
                      )
                      .join("")}
                  </select>
                </td>
                <td class="p-3">${formatDate(order.created_at)}</td>
              </tr>
            `
                  )
                  .join("")
              : `<tr><td class="p-4" colspan="6">Sem resultados para os filtros atuais.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function applyOrderFilters() {
  state.orderFilters.search = document.getElementById("order-search")?.value.trim() || "";
  state.orderFilters.status = document.getElementById("order-status")?.value || "all";
  state.orderFilters.payment = document.getElementById("order-payment")?.value || "all";
  renderOrdersView();
}

async function updateOrderStatus(id, status) {
  try {
    await callAdminApi("/api/admin/order-status", { id, status });
  } catch (error) {
    console.error("Erro update status:", error);
    setMessage("Erro ao atualizar estado da encomenda.", true);
    return;
  }

  const order = state.orders.find((item) => item.id === id);
  if (order) order.status = status;
  setMessage("Estado da encomenda atualizado.");
}

async function loadProducts() {
  const { data, error } = await supabaseClient.from("products").select("*");

  if (error) {
    console.error("Erro produtos:", error);
    document.getElementById("content").innerHTML = `<p>Erro ao carregar produtos.</p>`;
    return;
  }

  state.products = data || [];
  renderProductsView();
}

function getSortedProducts(products) {
  const cloned = [...products];
  switch (state.productFilters.sort) {
    case "price_asc":
      return cloned.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    case "price_desc":
      return cloned.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    case "stock_asc":
      return cloned.sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
    case "stock_desc":
      return cloned.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    default:
      return cloned.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), "pt")
      );
  }
}

function renderProductsView() {
  const content = document.getElementById("content");
  const products = state.products;
  const search = state.productFilters.search.toLowerCase();
  const activeFilter = toBooleanFilter(state.productFilters.active, null);
  const featuredFilter = toBooleanFilter(state.productFilters.featured, null);

  const filteredProducts = getSortedProducts(
    products.filter((product) => {
      const matchesSearch =
        !search ||
        String(product.name || "").toLowerCase().includes(search) ||
        String(product.description || "").toLowerCase().includes(search);
      const matchesCategory =
        state.productFilters.category === "all" || product.category === state.productFilters.category;
      const matchesActive = activeFilter === null || Boolean(product.active) === activeFilter;
      const matchesFeatured = featuredFilter === null || Boolean(product.featured) === featuredFilter;
      return matchesSearch && matchesCategory && matchesActive && matchesFeatured;
    })
  );

  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];
  const activeCount = products.filter((product) => product.active).length;
  const featuredCount = products.filter((product) => product.featured).length;
  const lowStockCount = products.filter((product) => Number(product.stock || 0) <= 2).length;

  content.innerHTML = `
    <div class="flex items-center justify-between gap-3 mb-4">
      <h2 class="text-2xl font-bold">Produtos</h2>
      <div class="flex gap-2">
        <button onclick="loadProducts()" class="bg-white border px-3 py-2 rounded">Atualizar</button>
        <button onclick="showProductForm()" class="bg-[#575244] text-white py-2 px-4 rounded">+ Produto</button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <div class="bg-white rounded-xl shadow p-3"><p class="text-xs uppercase opacity-70">Ativos</p><p class="text-xl font-bold">${activeCount}</p></div>
      <div class="bg-white rounded-xl shadow p-3"><p class="text-xs uppercase opacity-70">Em destaque</p><p class="text-xl font-bold">${featuredCount}</p></div>
      <div class="bg-white rounded-xl shadow p-3"><p class="text-xs uppercase opacity-70">Stock baixo (<=2)</p><p class="text-xl font-bold">${lowStockCount}</p></div>
    </div>

    <div class="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-6 gap-3">
      <input id="product-search" class="border p-2 rounded md:col-span-2" placeholder="Pesquisar nome/descricao" value="${escapeHtml(
        state.productFilters.search
      )}">
      <select id="product-category" class="border p-2 rounded">
        <option value="all">Todas categorias</option>
        ${categories
          .map(
            (category) =>
              `<option value="${escapeHtml(category)}" ${
                state.productFilters.category === category ? "selected" : ""
              }>${escapeHtml(category)}</option>`
          )
          .join("")}
      </select>
      <select id="product-active" class="border p-2 rounded">
        <option value="all" ${
          state.productFilters.active === "all" ? "selected" : ""
        }>Ativo: todos</option>
        <option value="true" ${
          state.productFilters.active === "true" ? "selected" : ""
        }>Ativo</option>
        <option value="false" ${
          state.productFilters.active === "false" ? "selected" : ""
        }>Inativo</option>
      </select>
      <select id="product-featured" class="border p-2 rounded">
        <option value="all" ${
          state.productFilters.featured === "all" ? "selected" : ""
        }>Destaque: todos</option>
        <option value="true" ${
          state.productFilters.featured === "true" ? "selected" : ""
        }>Em destaque</option>
        <option value="false" ${
          state.productFilters.featured === "false" ? "selected" : ""
        }>Sem destaque</option>
      </select>
      <select id="product-sort" class="border p-2 rounded">
        <option value="name_asc" ${
          state.productFilters.sort === "name_asc" ? "selected" : ""
        }>Nome A-Z</option>
        <option value="price_asc" ${
          state.productFilters.sort === "price_asc" ? "selected" : ""
        }>Preco crescente</option>
        <option value="price_desc" ${
          state.productFilters.sort === "price_desc" ? "selected" : ""
        }>Preco decrescente</option>
        <option value="stock_asc" ${
          state.productFilters.sort === "stock_asc" ? "selected" : ""
        }>Stock crescente</option>
        <option value="stock_desc" ${
          state.productFilters.sort === "stock_desc" ? "selected" : ""
        }>Stock decrescente</option>
      </select>
      <button onclick="applyProductFilters()" class="bg-[#575244] text-white py-2 px-4 rounded md:col-span-6">Aplicar filtros</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      ${
        filteredProducts.length
          ? filteredProducts
              .map(
                (product) => `
          <div class="bg-white rounded-xl shadow p-4">
            <div class="flex justify-between gap-3">
              <div>
                <p class="font-bold text-lg">${escapeHtml(product.name)}</p>
                <p class="opacity-70 text-sm">${escapeHtml(
                  product.category || "Sem categoria"
                )}</p>
              </div>
              <div class="text-right">
                <p class="font-bold">${formatEUR(product.price)}</p>
                <p class="text-sm ${
                  Number(product.stock || 0) <= 2 ? "text-red-600" : "opacity-70"
                }">Stock: ${Number(product.stock || 0)}</p>
              </div>
            </div>
            <div class="text-sm mt-2 opacity-80">${escapeHtml(
              product.description || "Sem descricao"
            )}</div>
            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              <span class="px-2 py-1 rounded ${
                product.active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700"
              }">${product.active ? "Ativo" : "Inativo"}</span>
              <span class="px-2 py-1 rounded ${
                product.featured ? "bg-amber-100 text-amber-800" : "bg-zinc-200 text-zinc-700"
              }">${product.featured ? "Destaque" : "Normal"}</span>
              <span class="px-2 py-1 rounded bg-zinc-100 text-zinc-700">Forro: ${
                product.has_lining ? "Sim" : "Nao"
              }</span>
              <span class="px-2 py-1 rounded bg-zinc-100 text-zinc-700">Impermeavel: ${
                product.allow_waterproof_lining ? "Sim" : "Nao"
              }</span>
            </div>
            <div class="flex flex-wrap gap-2 mt-4">
              <button onclick="showProductForm('${product.id}')" class="bg-[#575244] text-white px-3 py-2 rounded text-sm">Editar</button>
              <button onclick="toggleProductActive('${product.id}', ${
                  product.active ? "false" : "true"
                })" class="border px-3 py-2 rounded text-sm">${
                  product.active ? "Desativar" : "Ativar"
                }</button>
              <button onclick="toggleProductFeatured('${product.id}', ${
                  product.featured ? "false" : "true"
                })" class="border px-3 py-2 rounded text-sm">${
                  product.featured ? "Retirar destaque" : "Destacar"
                }</button>
              <button onclick="deleteProduct('${product.id}')" class="border border-red-300 text-red-700 px-3 py-2 rounded text-sm">Apagar</button>
            </div>
          </div>
        `
              )
              .join("")
          : `<div class="bg-white rounded-xl shadow p-4">Sem produtos para os filtros atuais.</div>`
      }
    </div>
  `;
}

function applyProductFilters() {
  state.productFilters.search = document.getElementById("product-search")?.value.trim() || "";
  state.productFilters.category = document.getElementById("product-category")?.value || "all";
  state.productFilters.active = document.getElementById("product-active")?.value || "all";
  state.productFilters.featured = document.getElementById("product-featured")?.value || "all";
  state.productFilters.sort = document.getElementById("product-sort")?.value || "name_asc";
  renderProductsView();
}

async function showProductForm(productId = "") {
  const editing = Boolean(productId);
  const product = state.products.find((item) => item.id === productId) || {
    name: "",
    description: "",
    price: 0,
    image_url: "",
    category: "",
    stock: 0,
    active: true,
    featured: false,
    has_lining: true,
    allow_waterproof_lining: false,
    weight: "",
    length: "",
    width: "",
    height: ""
  };
  let galleryUrls = [];

  if (editing) {
    try {
      const response = await callAdminApiGet(`/api/admin/product-images?id=${encodeURIComponent(productId)}`);
      galleryUrls = (response.items || []).map((item) => item.url).filter(Boolean);
    } catch (error) {
      console.error("Erro ao carregar galeria:", error);
      setMessage("Nao foi possivel carregar as imagens extra do produto.", true);
    }
  }

  const primaryImageUrl = product.image_url || galleryUrls[0] || "";
  const extraGalleryUrls = galleryUrls.filter((url) => url !== primaryImageUrl);

  document.getElementById("content").innerHTML = `
    <div class="max-w-3xl">
      <button onclick="loadProducts()" class="mb-4 border px-3 py-2 rounded bg-white">Voltar aos produtos</button>
      <h2 class="text-2xl font-bold mb-4">${editing ? "Editar Produto" : "Novo Produto"}</h2>

      <div class="bg-white rounded-xl shadow p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input id="name" class="border p-2 rounded md:col-span-2" placeholder="Nome*" value="${escapeHtml(
          product.name
        )}">
        <textarea id="description" class="border p-2 rounded md:col-span-2" rows="4" placeholder="Descricao">${escapeHtml(
          product.description || ""
        )}</textarea>
        <input id="price" type="number" min="0" step="0.01" class="border p-2 rounded" placeholder="Preco*" value="${Number(
          product.price || 0
        )}">
        <input id="stock" type="number" min="0" step="1" class="border p-2 rounded" placeholder="Stock*" value="${Number(
          product.stock || 0
        )}">
        <input id="category" class="border p-2 rounded" placeholder="Categoria*" value="${escapeHtml(
          product.category || ""
        )}">
        <input id="primary_image_url" class="border p-2 rounded md:col-span-2" placeholder="Imagem principal URL (Cloudinary)" value="${escapeHtml(
          primaryImageUrl
        )}">
        <textarea id="gallery_urls" class="border p-2 rounded md:col-span-2" rows="4" placeholder="Imagens extra (1 URL por linha)">${escapeHtml(
          extraGalleryUrls.join("\n")
        )}</textarea>
        <button type="button" onclick="renderImagePreview()" class="border px-3 py-2 rounded md:col-span-2">Atualizar preview de galeria</button>
        <div id="image-preview" data-index="0" class="md:col-span-2"></div>
        <input id="weight" type="number" min="0" step="0.01" class="border p-2 rounded" placeholder="Peso (kg)" value="${
          product.weight ?? ""
        }">
        <input id="length" type="number" min="0" step="0.01" class="border p-2 rounded" placeholder="Comprimento (cm)" value="${
          product.length ?? ""
        }">
        <input id="width" type="number" min="0" step="0.01" class="border p-2 rounded" placeholder="Largura (cm)" value="${
          product.width ?? ""
        }">
        <input id="height" type="number" min="0" step="0.01" class="border p-2 rounded" placeholder="Altura (cm)" value="${
          product.height ?? ""
        }">
        <label class="flex items-center gap-2"><input id="active" type="checkbox" ${
          product.active ? "checked" : ""
        }> Ativo</label>
        <label class="flex items-center gap-2"><input id="featured" type="checkbox" ${
          product.featured ? "checked" : ""
        }> Destaque</label>
        <label class="flex items-center gap-2"><input id="has_lining" type="checkbox" ${
          product.has_lining ? "checked" : ""
        }> Tem forro</label>
        <label class="flex items-center gap-2"><input id="allow_waterproof_lining" type="checkbox" ${
          product.allow_waterproof_lining ? "checked" : ""
        }> Permite forro impermeavel</label>
      </div>

      <div id="product-form-error" class="mt-3"></div>
      <div class="mt-4 flex gap-2">
        <button onclick="${
          editing ? `updateProduct('${productId}')` : "createProduct()"
        }" class="bg-[#575244] text-white py-2 px-4 rounded">Guardar</button>
        <button onclick="loadProducts()" class="border bg-white py-2 px-4 rounded">Cancelar</button>
      </div>
    </div>
  `;

  renderImagePreview();
}

function toNullableNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function readProductForm() {
  const images = collectImageInput();
  return {
    name: document.getElementById("name")?.value.trim(),
    description: document.getElementById("description")?.value.trim() || null,
    price: Number(document.getElementById("price")?.value || 0),
    image_url: images.primaryImageUrl || null,
    category: document.getElementById("category")?.value.trim(),
    stock: Number(document.getElementById("stock")?.value || 0),
    active: document.getElementById("active")?.checked || false,
    featured: document.getElementById("featured")?.checked || false,
    has_lining: document.getElementById("has_lining")?.checked || false,
    allow_waterproof_lining: document.getElementById("allow_waterproof_lining")?.checked || false,
    weight: toNullableNumber(document.getElementById("weight")?.value),
    length: toNullableNumber(document.getElementById("length")?.value),
    width: toNullableNumber(document.getElementById("width")?.value),
    height: toNullableNumber(document.getElementById("height")?.value),
    images
  };
}

function validateProductPayload(payload) {
  if (!payload.name) return "Nome do produto e obrigatorio.";
  if (!payload.category) return "Categoria e obrigatoria.";
  if (payload.price <= 0) return "Preco deve ser maior que 0.";
  if (!Number.isInteger(payload.stock) || payload.stock < 0) {
    return "Stock deve ser um numero inteiro >= 0.";
  }
  return "";
}

async function ensureUniqueName(name, excludeId = "") {
  let query = supabaseClient.from("products").select("id").eq("name", name).limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) {
    console.error("Erro validacao de nome:", error);
    return false;
  }
  return !(data || []).length;
}

function renderProductFormError(message) {
  const errorBox = document.getElementById("product-form-error");
  if (!errorBox) return;
  errorBox.innerHTML = message
    ? `<div class="bg-red-100 text-red-800 p-3 rounded">${escapeHtml(message)}</div>`
    : "";
}

async function createProduct() {
  const formData = readProductForm();
  const { images, ...payload } = formData;
  const validationError = validateProductPayload(payload);
  if (validationError) {
    renderProductFormError(validationError);
    return;
  }

  try {
    await callAdminApi("/api/admin/products", { payload, images });
  } catch (error) {
    console.error("Erro criar produto:", error);
    renderProductFormError(error.message || "Erro ao criar produto.");
    return;
  }

  setMessage("Produto criado com sucesso.");
  loadProducts();
}

async function updateProduct(id) {
  const formData = readProductForm();
  const { images, ...payload } = formData;
  const validationError = validateProductPayload(payload);
  if (validationError) {
    renderProductFormError(validationError);
    return;
  }

  try {
    await callAdminApi("/api/admin/product-update", { id, payload, images });
  } catch (error) {
    console.error("Erro update produto:", error);
    renderProductFormError(error.message || "Erro ao atualizar produto.");
    return;
  }

  setMessage("Produto atualizado com sucesso.");
  loadProducts();
}

async function toggleProductActive(id, active) {
  try {
    await callAdminApi("/api/admin/product-update", { id, payload: { active } });
  } catch (error) {
    console.error("Erro ao alterar ativo:", error);
    setMessage("Erro ao alterar estado do produto.", true);
    return;
  }
  const product = state.products.find((item) => item.id === id);
  if (product) product.active = active;
  renderProductsView();
  setMessage(`Produto ${active ? "ativado" : "desativado"} com sucesso.`);
}

async function toggleProductFeatured(id, featured) {
  try {
    await callAdminApi("/api/admin/product-update", { id, payload: { featured } });
  } catch (error) {
    console.error("Erro ao alterar destaque:", error);
    setMessage("Erro ao alterar destaque do produto.", true);
    return;
  }
  const product = state.products.find((item) => item.id === id);
  if (product) product.featured = featured;
  renderProductsView();
  setMessage(featured ? "Produto colocado em destaque." : "Destaque removido.");
}

async function deleteProduct(id) {
  const confirmed = window.confirm("Tens a certeza que queres apagar este produto?");
  if (!confirmed) return;

  try {
    await callAdminApi("/api/admin/product-delete", { id });
  } catch (error) {
    console.error("Erro ao apagar produto:", error);
    setMessage("Erro ao apagar produto.", true);
    return;
  }

  state.products = state.products.filter((item) => item.id !== id);
  renderProductsView();
  setMessage("Produto apagado com sucesso.");
}

init();

