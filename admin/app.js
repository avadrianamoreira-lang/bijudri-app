const SUPABASE_URL = "https://kzlvxawotfnxjbnhysdx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bHZ4YXdvdGZueGpibmh5c2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDQ4MzYsImV4cCI6MjA5MTM4MDgzNn0.Kh5ugtSRLQXLbsM2JXz6KJEv85L5H64IStftuLNfNd8";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const app = document.getElementById("app");

async function init() {
  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Erro ao obter sessão:", error);
    renderLogin();
    return;
  }

  if (!session) {
    renderLogin();
  } else {
    renderApp();
  }
}

function renderLogin() {
  app.innerHTML = `
    <div class="h-screen flex items-center justify-center bg-[#f7f3ef]">
      <div class="bg-white p-6 rounded-xl shadow w-80">
        <h2 class="text-xl font-bold mb-4">Login Admin</h2>

        <input id="email" placeholder="Email" class="input w-full mb-3 border p-2 rounded">
        <input id="password" type="password" placeholder="Password" class="input w-full mb-3 border p-2 rounded">

        <button onclick="login()" class="btn w-full mt-2 bg-[#575244] text-white py-2 rounded">
          Entrar
        </button>
      </div>
    </div>
  `;
}

async function login() {
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Erro login:", error);
    alert("Erro no login: " + error.message);
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

        <nav class="space-y-3 flex flex-col">
          <button onclick="loadDashboard()">Dashboard</button>
          <button onclick="loadOrders()">Encomendas</button>
          <button onclick="loadProducts()">Produtos</button>
          <button onclick="logout()">Logout</button>
        </nav>
      </aside>

      <main class="flex-1 p-6 overflow-y-auto bg-[#f7f3ef]">
        <div id="content"></div>
      </main>
    </div>
  `;

  loadDashboard();
}

async function loadDashboard() {
  const { data, error } = await supabaseClient
    .from("orders")
    .select("*")
    .eq("payment_status", "paid");

  if (error) {
    console.error("Erro dashboard:", error);
    document.getElementById("content").innerHTML = `<p>Erro ao carregar dashboard.</p>`;
    return;
  }

  const total = (data || []).reduce((a, o) => a + (Number(o.total) || 0), 0);
  const orders = (data || []).length;

  document.getElementById("content").innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Dashboard</h2>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white rounded-xl shadow p-4">💰 ${total}€</div>
      <div class="bg-white rounded-xl shadow p-4">📦 ${orders} encomendas</div>
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

  document.getElementById("content").innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Encomendas</h2>

    ${(data || []).map(o => `
      <div class="bg-white rounded-xl shadow p-4 mb-3 flex justify-between items-center">
        <div>
          <p><b>${o.customer_name || "-"}</b></p>
          <p>${Number(o.total) || 0}€</p>
        </div>

        <select onchange="updateStatus('${o.id}', this.value)" class="border p-2 rounded">
          <option value="pending_payment" ${o.status === "pending_payment" ? "selected" : ""}>pending_payment</option>
          <option value="confirmed" ${o.status === "confirmed" ? "selected" : ""}>confirmed</option>
          <option value="shipped" ${o.status === "shipped" ? "selected" : ""}>shipped</option>
          <option value="delivered" ${o.status === "delivered" ? "selected" : ""}>delivered</option>
        </select>
      </div>
    `).join("")}
  `;
}

async function updateStatus(id, status) {
  const { error } = await supabaseClient
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("Erro update status:", error);
    alert("Erro ao atualizar estado.");
  }
}

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*");

  if (error) {
    console.error("Erro produtos:", error);
    document.getElementById("content").innerHTML = `<p>Erro ao carregar produtos.</p>`;
    return;
  }

  document.getElementById("content").innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Produtos</h2>

    <button onclick="showAddProduct()" class="bg-[#575244] text-white py-2 px-4 rounded mb-4">
      + Produto
    </button>

    ${(data || []).map(p => `
      <div class="bg-white rounded-xl shadow p-4 mb-3 flex justify-between">
        <div>
          <p><b>${p.name}</b></p>
          <p>${Number(p.price) || 0}€</p>
        </div>

        <button onclick="editProduct('${p.id}','${(p.name || "").replace(/'/g, "\\'")}',${Number(p.price) || 0})">
          Editar
        </button>
      </div>
    `).join("")}
  `;
}

function showAddProduct() {
  document.getElementById("content").innerHTML = `
    <h2 class="text-2xl font-bold mb-4">Novo Produto</h2>

    <input id="name" class="w-full border p-2 rounded mb-3" placeholder="Nome">
    <input id="price" class="w-full border p-2 rounded mb-3" placeholder="Preço">

    <button onclick="createProduct()" class="bg-[#575244] text-white py-2 px-4 rounded">Guardar</button>
  `;
}

async function createProduct() {
  const name = document.getElementById("name")?.value.trim();
  const price = Number(document.getElementById("price")?.value || 0);

  const { error } = await supabaseClient.from("products").insert({ name, price });

  if (error) {
    console.error("Erro criar produto:", error);
    alert("Erro ao criar produto.");
    return;
  }

  loadProducts();
}

function editProduct(id, name, price) {
  document.getElementById("content").innerHTML = `
    <h2 class="text-2xl font-bold mb-4">Editar Produto</h2>

    <input id="name" value="${name}" class="w-full border p-2 rounded mb-3">
    <input id="price" value="${price}" class="w-full border p-2 rounded mb-3">

    <button onclick="updateProduct('${id}')" class="bg-[#575244] text-white py-2 px-4 rounded">Guardar</button>
  `;
}

async function updateProduct(id) {
  const name = document.getElementById("name")?.value.trim();
  const price = Number(document.getElementById("price")?.value || 0);

  const { error } = await supabaseClient
    .from("products")
    .update({ name, price })
    .eq("id", id);

  if (error) {
    console.error("Erro update produto:", error);
    alert("Erro ao atualizar produto.");
    return;
  }

  loadProducts();
}

init();
