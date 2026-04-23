const SUPABASE_URL = "https://kzlvxawotfnxjbnhysdx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bHZ4YXdvdGZueGpibmh5c2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNDgzNiwiZXhwIjoyMDkxMzgwODM2fQ.7p5QmRdyYs2PoiV0dao4iUugPh74ebm1mM9TmP-hwno";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const content = document.getElementById("content");

// 🔐 proteção simples
const password = prompt("Acesso admin:");
if (password !== "BD2026") {
  document.body.innerHTML = "Acesso negado";
}

// 📊 DASHBOARD
async function loadDashboard() {
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("payment_status", "paid");

  const total = data.reduce((a, o) => a + o.total, 0);
  const orders = data.length;
  const avg = orders ? (total / orders).toFixed(2) : 0;

  content.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Dashboard</h2>

    <div class="grid grid-cols-3 gap-4">
      <div class="card">💰 Total: ${total}€</div>
      <div class="card">📦 Encomendas: ${orders}</div>
      <div class="card">📊 Ticket médio: ${avg}€</div>
    </div>
  `;
}

// 📦 ENCOMENDAS
async function loadOrders() {
  const { data } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  content.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Encomendas</h2>

    ${data.map(o => `
      <div class="card flex justify-between">
        <div>
          <p><b>${o.customer_name}</b></p>
          <p>${o.total}€</p>
        </div>

        <div>
          <p class="text-sm">${o.status}</p>
        </div>
      </div>
    `).join("")}
  `;
}

// 🛍️ PRODUTOS
async function loadProducts() {
  const { data } = await supabase
    .from("products")
    .select("*");

  content.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Produtos</h2>

    <button onclick="showAddProduct()" class="mb-4 bg-black text-white px-4 py-2 rounded">
      + Novo Produto
    </button>

    ${data.map(p => `
      <div class="card flex justify-between items-center">
        <div>
          <p><b>${p.name}</b></p>
          <p>${p.price}€</p>
        </div>
      </div>
    `).join("")}
  `;
}

// ➕ FORM PRODUTO
function showAddProduct() {
  content.innerHTML = `
    <h2 class="text-xl font-bold mb-4">Novo Produto</h2>

    <input id="name" placeholder="Nome" class="input">
    <input id="price" placeholder="Preço" class="input">

    <button onclick="createProduct()" class="btn">
      Guardar
    </button>
  `;
}

async function createProduct() {
  const name = document.getElementById("name").value;
  const price = document.getElementById("price").value;

  await supabase.from("products").insert({
    name,
    price
  });

  loadProducts();
}

// INIT
loadDashboard();
