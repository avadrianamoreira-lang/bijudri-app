const password = prompt("Acesso admin:");

if (password !== "BD2026") {
  document.body.innerHTML = "Acesso negado";
}
