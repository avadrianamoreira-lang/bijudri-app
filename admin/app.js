const SUPABASE_URL = "https://kzlvxawotfnxjbnhysdx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bHZ4YXdvdGZueGpibmh5c2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNDgzNiwiZXhwIjoyMDkxMzgwODM2fQ.7p5QmRdyYs2PoiV0dao4iUugPh74ebm1mM9TmP-hwno";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const app = document.getElementById("app");

// 🔐 CHECK SESSION
async function init() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    renderLogin();
  } else {
    renderApp();
  }
}

// 🔐 LOGIN UI
function renderLogin() {
  app.innerHTML = `
    <div class="h-screen flex items-center justify-center">
      <div class="bg-white p-6 rounded-xl shadow w-80">
        <h2 class="text-xl font-bold mb-4">Login Admin</h2>

        <input id="email" placeholder="Email" class="input">
        <input id="password" type="password" placeholder="Password" class="input">

        <button onclick="login()" class="btn w-full mt-2">
          Entrar
        </button>
      </div>
    </div>
  `;
}

// 🔐 LOGIN ACTION
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("Erro login");
    return;
  }

  init();
}

// 🔐 LOGOUT
async function logout() {
  await supabase.auth.signOut();
  renderLogin();
}

// 🧩 APP PRINCIPAL
function renderApp() {
  app.innerHTML = `
    <div class="flex h-screen">

      <aside class="w-64 bg-[#575244] text-white p-4">
        <h1 class="text-xl font-bold mb-6">Bijudri Admin</h1>

        <nav class="space-y-3">
          <button onclick="loadDashboard()">Dashboard</button>
          <button onclick="loadOrders()">Encomendas</button>
          <button onclick="loadProducts()">Produtos</button>
          <button onclick="logout()">Logout</button>
        </nav>
      </aside>

      <main class="flex-1 p-6 overflow-y-auto">
        <div id="content"></div>
      </main>

    </div>
  `;

  loadDashboard();
}

// 📊 DASHBOARD
async function loadDashboard() {
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("payment_status", "paid");

  const total = data.reduce((a, o) => a + o.total, 0);
  const orders = data.length;

  document.getElementById("content").innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Dashboard</h2>

    <div class="grid grid-cols-3 gap-4">
      <div class="card">💰 ${total}€</div>
      <div class="card">📦 ${orders} encomendas</div>
    </div>
  `;
}

// 📦 ENCOMENDAS (COM UPDATE DE STATUS)
async function loadOrders() {
  const { data } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  document.getElementById("content").innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Encomendas</h2>

    ${data.map(o => `
      <div class="card mb-3 flex justify-between items-center">

        <div>
          <p><b>${o.customer_name}</b></p>
          <p>${o.total}€</p>
        </div>

        <select onchange="updateStatus('${o.id}', this.value)" class="border p-1 rounded">
          <option ${o.status === "pending_payment" ? "selected" : ""}>pending_payment</option>
          <option ${o.status === "confirmed" ? "selected" : ""}>confirmed</option>
          <option ${o.status === "shipped" ? "selected" : ""}>shipped</option>
          <option ${o.status === "delivered" ? "selected" : ""}>delivered</option>
        </select>

      </div>
    `).join("")}
  `;
}

async function updateStatus(id, status) {
  await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);
}

// 🛍️ PRODUTOS (COM EDIÇÃO)
async function loadProducts() {
  const { data } = await supabase
    .from("products")
    .select("*");

  document.getElementById("content").innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Produtos</h2>

    <button onclick="showAddProduct()" class="btn mb-4">
      + Produto
    </button>

    ${data.map(p => `
      <div class="card mb-3 flex justify-between">

        <div>
          <p><b>${p.name}</b></p>
          <p>${p.price}€</p>
        </div>

        <button onclick="editProduct('${p.id}','${p.name}',${p.price})">
          Editar
        </button>

      </div>
    `).join("")}
  `;
}

// ➕ CREATE
function showAddProduct() {
  document.getElementById("content").innerHTML = `
    <h2>Novo Produto</h2>

    <input id="name" class="input" placeholder="Nome">
    <input id="price" class="input" placeholder="Preço">

    <button onclick="createProduct()" class="btn">Guardar</button>
  `;
}

async function createProduct() {
  const name = document.getElementById("name").value;
  const price = document.getElementById("price").value;

  await supabase.from("products").insert({ name, price });

  loadProducts();
}

// ✏️ EDIT
function editProduct(id, name, price) {
  document.getElementById("content").innerHTML = `
    <h2>Editar Produto</h2>

    <input id="name" value="${name}" class="input">
    <input id="price" value="${price}" class="input">

    <button onclick="updateProduct('${id}')" class="btn">Guardar</button>
  `;
}

async function updateProduct(id) {
  const name = document.getElementById("name").value;
  const price = document.getElementById("price").value;

  await supabase
    .from("products")
    .update({ name, price })
    .eq("id", id);

  loadProducts();
}

// INIT
init();
