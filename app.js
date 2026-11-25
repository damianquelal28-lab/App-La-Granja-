const productCards = [...document.querySelectorAll(".product")];
const searchInput = document.querySelector("#busqueda");
const filterButtons = [...document.querySelectorAll(".filter-button")];
const categoryTiles = [...document.querySelectorAll(".category-tile")];
const cartDrawer = document.querySelector("#panel-carrito");
const cartBackdrop = document.querySelector("#fondo-carrito");
const cartItems = document.querySelector("#productos-carrito");
const cartCount = document.querySelector("#contador-carrito");
const cartTitleCount = document.querySelector("#cantidad-titulo");
const subtotalDisplay = document.querySelector("#subtotal");
const checkoutSubtotal = document.querySelector("#resumen-subtotal");
const checkoutButton = document.querySelector("#iniciar-compra");
const checkoutDialog = document.querySelector("#modal-compra");
const toast = document.querySelector("#aviso");
const menuToggle = document.querySelector("#menu-toggle");
const mainNav = document.querySelector(".main-nav");

const CART_STORAGE_KEY = "la-granja-carrito";
const ORDERS_STORAGE_KEY = "la-granja-solicitudes";
const USER_STORAGE_KEY = "la-granja-usuario";
const SESSION_STORAGE_KEY = "la-granja-sesion";
const SETTINGS_STORAGE_KEY = "la-granja-configuracion";
let activeCategory = "todos";
let toastTimeout;
let backdropTimeout;
let returnFocusTo;

function readStorage(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return stored ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

let cart = readStorage(CART_STORAGE_KEY, []);
if (!Array.isArray(cart)) cart = [];

function formatPrice(value) {
  return `$ ${Number(value).toFixed(2)}`;
}

function showToast(message) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 3200);
}

function productDetails(card) {
  return {
    name: card.querySelector("h3").textContent.trim(),
    price: Number(card.dataset.precio),
    image: card.querySelector("img").src,
    alt: card.querySelector("img").alt,
    size: card.querySelector(".product-bottom span").textContent.trim(),
    quantity: 1,
  };
}

function renderCart() {
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  cartCount.textContent = String(totalItems);
  cartTitleCount.textContent = `(${totalItems})`;
  subtotalDisplay.textContent = formatPrice(subtotal);
  checkoutSubtotal.textContent = formatPrice(subtotal);
  checkoutButton.disabled = cart.length === 0;
  cartItems.replaceChildren();

  if (cart.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "cart-empty";
    emptyMessage.textContent = "Todavía no agregas productos.";
    cartItems.append(emptyMessage);
    return;
  }

  for (const item of cart) {
    const row = document.createElement("article");
    row.className = "cart-item";

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.alt;
    image.loading = "lazy";

    const details = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = item.name;
    const size = document.createElement("div");
    size.className = "item-price";
    size.textContent = `${formatPrice(item.price)} · ${item.size}`;

    const controls = document.createElement("div");
    controls.className = "quantity-controls";
    controls.innerHTML = `<button type="button" data-action="decrease" aria-label="Quitar una unidad de ${item.name}">−</button><span>${item.quantity}</span><button type="button" data-action="increase" aria-label="Agregar una unidad de ${item.name}">+</button>`;

    const removeButton = document.createElement("button");
    removeButton.className = "remove-item";
    removeButton.type = "button";
    removeButton.dataset.action = "remove";
    removeButton.setAttribute("aria-label", `Eliminar ${item.name} del carrito`);
    removeButton.textContent = "×";

    details.append(name, size, controls);
    row.append(image, details, removeButton);
    row.dataset.name = item.name;
    cartItems.append(row);
  }
}

function saveCart() {
  if (!writeStorage(CART_STORAGE_KEY, cart)) {
    showToast("No se pudo guardar el carrito en este navegador.");
  }
}

function addProduct(card) {
  const product = productDetails(card);
  const existing = cart.find((item) => item.name === product.name);

  if (existing) existing.quantity += 1;
  else cart.push(product);

  saveCart();
  renderCart();
  cartCount.classList.remove("bump");
  requestAnimationFrame(() => cartCount.classList.add("bump"));
  showToast(`${product.name} se agregó al carrito.`);
}

function setCategory(category, shouldScroll = false) {
  activeCategory = category;
  for (const button of filterButtons) {
    const selected = button.dataset.categoria === category;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
  applyFilters();
  if (shouldScroll) document.querySelector("#productos").scrollIntoView({ behavior: "smooth" });
}

function applyFilters() {
  const query = searchInput.value.trim().toLocaleLowerCase("es");
  let visibleCount = 0;

  for (const card of productCards) {
    const matchesCategory = activeCategory === "todos" || card.dataset.categoria === activeCategory;
    const matchesSearch = `${card.dataset.nombre} ${card.querySelector("h3").textContent}`
      .toLocaleLowerCase("es")
      .includes(query);
    const visible = matchesCategory && matchesSearch;
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  }

  document.querySelector("#resultado-cantidad").textContent = `${visibleCount} ${visibleCount === 1 ? "producto" : "productos"}`;
  document.querySelector("#sin-resultados").hidden = visibleCount > 0;
}

function openCart() {
  clearTimeout(backdropTimeout);
  returnFocusTo = document.activeElement;
  cartBackdrop.hidden = false;
  cartDrawer.inert = false;
  cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
  requestAnimationFrame(() => {
    cartBackdrop.classList.add("visible");
    cartDrawer.classList.add("open");
    document.querySelector("#cerrar-carrito").focus();
  });
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.inert = true;
  cartDrawer.setAttribute("aria-hidden", "true");
  cartBackdrop.classList.remove("visible");
  document.body.classList.remove("drawer-open");
  backdropTimeout = setTimeout(() => {
    cartBackdrop.hidden = true;
  }, 300);
  if (returnFocusTo instanceof HTMLElement) returnFocusTo.focus();
}

for (const card of productCards) {
  card.querySelector(".quick-add").addEventListener("click", () => addProduct(card));
}

for (const button of filterButtons) {
  button.addEventListener("click", () => setCategory(button.dataset.categoria));
}

for (const tile of categoryTiles) {
  tile.addEventListener("click", () => setCategory(tile.dataset.categoria, true));
}

searchInput.addEventListener("input", applyFilters);
document.querySelector("#abrir-carrito").addEventListener("click", openCart);
document.querySelector("#cerrar-carrito").addEventListener("click", closeCart);
cartBackdrop.addEventListener("click", closeCart);

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const row = button.closest(".cart-item");
  const item = cart.find((entry) => entry.name === row.dataset.name);
  if (!item) return;

  if (button.dataset.action === "increase") item.quantity += 1;
  if (button.dataset.action === "decrease") item.quantity -= 1;
  if (button.dataset.action === "remove" || item.quantity <= 0) {
    cart = cart.filter((entry) => entry.name !== item.name);
    showToast(`${item.name} se quitó del carrito.`);
  }

  saveCart();
  renderCart();
});

checkoutButton.addEventListener("click", () => {
  if (cart.length === 0) return;
  closeCart();
  checkoutDialog.showModal();
  document.querySelector("#nombre").focus();
});

document.querySelector("#cerrar-modal").addEventListener("click", () => checkoutDialog.close());
checkoutDialog.addEventListener("click", (event) => {
  if (event.target === checkoutDialog) checkoutDialog.close();
});

document.querySelector("#form-compra").addEventListener("submit", (event) => {
  event.preventDefault();
  if (cart.length === 0) {
    checkoutDialog.close();
    showToast("Tu carrito está vacío.");
    return;
  }

  const formData = new FormData(event.currentTarget);
  const order = {
    reference: `LG-${Date.now().toString().slice(-7)}`,
    createdAt: new Date().toISOString(),
    payment: formData.get("pago"),
    customer: formData.get("nombre"),
    email: formData.get("correo"),
    items: cart.map(({ name, price, quantity }) => ({ name, price, quantity })),
    subtotal: cart.reduce((total, item) => total + item.price * item.quantity, 0),
  };
  const previousOrders = readStorage(ORDERS_STORAGE_KEY, []);
  const saved = writeStorage(ORDERS_STORAGE_KEY, [order, ...(Array.isArray(previousOrders) ? previousOrders : [])]);

  if (!saved) {
    showToast("No se pudo guardar la solicitud. Revisa el almacenamiento del navegador.");
    return;
  }

  cart = [];
  saveCart();
  renderCart();
  checkoutDialog.close();
  event.currentTarget.reset();
  document.querySelector("#referencia-pedido").textContent = order.reference;
  document.querySelector("#modal-confirmacion").showModal();
  renderOrderHistory();
});

menuToggle.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  menuToggle.setAttribute("aria-label", expanded ? "Abrir menú" : "Cerrar menú");
  mainNav.classList.toggle("open", !expanded);
});

mainNav.addEventListener("click", (event) => {
  if (!event.target.closest("a")) return;
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menú");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && cartDrawer.classList.contains("open")) closeCart();
});

const accountDialogIds = [
  "modal-acceso",
  "modal-registro",
  "modal-recuperar",
  "modal-perfil",
  "modal-editar-perfil",
  "modal-configuracion",
  "modal-notificaciones",
  "modal-detalle-producto",
  "modal-confirmacion",
];
let selectedProductCard;

function openDialog(id) {
  for (const dialogId of accountDialogIds) {
    const dialog = document.getElementById(dialogId);
    if (dialog.open) dialog.close();
  }
  document.getElementById(id).showModal();
}

function currentUser() {
  const user = readStorage(USER_STORAGE_KEY, null);
  return readStorage(SESSION_STORAGE_KEY, false) && user && typeof user.email === "string" ? user : null;
}

function renderOrderHistory() {
  const history = document.querySelector("#historial-pedidos");
  const orders = readStorage(ORDERS_STORAGE_KEY, []);
  history.replaceChildren();
  if (!Array.isArray(orders) || orders.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Todavía no tienes solicitudes guardadas.";
    history.append(empty);
    return;
  }
  for (const order of orders.slice(0, 5)) {
    const row = document.createElement("article");
    const reference = document.createElement("strong");
    reference.textContent = `Solicitud ${order.reference}`;
    const summary = document.createElement("span");
    const items = Array.isArray(order.items) ? order.items.reduce((total, item) => total + item.quantity, 0) : 0;
    summary.textContent = `${items} producto${items === 1 ? "" : "s"} · ${formatPrice(order.subtotal)}`;
    row.append(reference, summary);
    history.append(row);
  }
}

function showProfile() {
  const user = currentUser();
  if (!user) {
    openDialog("modal-acceso");
    return;
  }
  document.querySelector("#perfil-nombre").textContent = user.name || "Usuario";
  document.querySelector("#perfil-correo").textContent = user.email;
  renderOrderHistory();
  openDialog("modal-perfil");
}

function updateAuthButtons() {
  const loggedIn = Boolean(currentUser());
  document.querySelector("#abrir-registro").style.display = loggedIn ? "none" : "";
  document.querySelector("#abrir-cuenta").style.display = loggedIn ? "" : "none";
  document.querySelector("#menu-iniciar-sesion").hidden = loggedIn;
  document.querySelector("#menu-registrarse").hidden = loggedIn;
  document.querySelector("#menu-mi-cuenta").hidden = !loggedIn;
}

function fillSettingsForm() {
  const settings = readStorage(SETTINGS_STORAGE_KEY, {});
  const form = document.querySelector("#form-configuracion");
  for (const key of ["novedades", "recordatorios"]) form.elements[key].checked = Boolean(settings[key]);
  for (const key of ["facebook", "instagram", "tiktok"]) form.elements[key].value = settings[key] || "";
}

document.querySelector("#abrir-cuenta").addEventListener("click", showProfile);
document.querySelector("#abrir-sesion").addEventListener("click", () => openDialog("modal-acceso"));
document.querySelector("#abrir-registro").addEventListener("click", () => openDialog("modal-registro"));
document.querySelector("#menu-iniciar-sesion").addEventListener("click", () => openDialog("modal-acceso"));
document.querySelector("#menu-registrarse").addEventListener("click", () => openDialog("modal-registro"));
document.querySelector("#menu-mi-cuenta").addEventListener("click", showProfile);
document.querySelector("#abrir-notificaciones").addEventListener("click", () => openDialog("modal-notificaciones"));
document.querySelector("#editar-perfil").addEventListener("click", () => {
  const user = currentUser();
  if (!user) return;
  const form = document.querySelector("#form-editar-perfil");
  form.elements.nombre.value = user.name || "";
  form.elements.correo.value = user.email || "";
  form.elements.telefono.value = user.phone || "";
  openDialog("modal-editar-perfil");
});
document.querySelector("#abrir-configuracion").addEventListener("click", () => {
  fillSettingsForm();
  openDialog("modal-configuracion");
});
document.querySelector("#cerrar-sesion").addEventListener("click", () => {
  if (!writeStorage(SESSION_STORAGE_KEY, false)) {
    showToast("No se pudo cerrar la sesión en este navegador.");
    return;
  }
  document.querySelector("#modal-perfil").close();
  updateAuthButtons();
  showToast("Sesión cerrada en este dispositivo.");
});

document.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open-dialog]");
  if (openButton) openDialog(openButton.dataset.openDialog);
  const closeButton = event.target.closest("[data-close-dialog]");
  if (closeButton) closeButton.closest("dialog").close();
  const closeParentLink = event.target.closest("[data-close-parent]");
  if (closeParentLink) closeParentLink.closest("dialog").close();
});

for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

document.querySelector("#form-registro").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const user = {
    name: String(formData.get("nombre")).trim(),
    email: String(formData.get("correo")).trim().toLocaleLowerCase("es"),
    phone: String(formData.get("telefono")).trim(),
  };
  if (!writeStorage(USER_STORAGE_KEY, user)) {
    showToast("No se pudo guardar tu cuenta. Revisa el almacenamiento del navegador.");
    return;
  }
  if (!writeStorage(SESSION_STORAGE_KEY, true)) {
    showToast("No se pudo iniciar la sesión en este navegador.");
    return;
  }
  event.currentTarget.reset();
  document.querySelector("#modal-registro").close();
  document.querySelector("#perfil-nombre").textContent = user.name;
  document.querySelector("#perfil-correo").textContent = user.email;
  renderOrderHistory();
  updateAuthButtons();
  openDialog("modal-perfil");
  showToast("Cuenta creada y sesión iniciada en este dispositivo.");
});

document.querySelector("#form-acceso").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const storedUser = currentUser();
  const email = String(formData.get("correo")).trim().toLocaleLowerCase("es");
  const user = storedUser && storedUser.email === email
    ? storedUser
    : { name: email.split("@")[0], email, phone: "" };
  if (!writeStorage(USER_STORAGE_KEY, user)) {
    showToast("No se pudo guardar la sesión en este navegador.");
    return;
  }
  if (!writeStorage(SESSION_STORAGE_KEY, true)) {
    showToast("No se pudo iniciar la sesión en este navegador.");
    return;
  }
  event.currentTarget.reset();
  document.querySelector("#modal-acceso").close();
  updateAuthButtons();
  showToast("Sesión de demostración iniciada.");
});

document.querySelector("#form-recuperar").addEventListener("submit", (event) => {
  event.preventDefault();
  event.currentTarget.reset();
  document.querySelector("#modal-recuperar").close();
  showToast("Solicitud simulada. La app no envía correos en esta versión.");
});

document.querySelector("#form-editar-perfil").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const user = {
    name: String(formData.get("nombre")).trim(),
    email: String(formData.get("correo")).trim().toLocaleLowerCase("es"),
    phone: String(formData.get("telefono")).trim(),
  };
  if (!writeStorage(USER_STORAGE_KEY, user)) {
    showToast("No se pudieron guardar los cambios del perfil.");
    return;
  }
  document.querySelector("#modal-editar-perfil").close();
  document.querySelector("#perfil-nombre").textContent = user.name;
  document.querySelector("#perfil-correo").textContent = user.email;
  openDialog("modal-perfil");
  showToast("Perfil actualizado.");
});

document.querySelector("#form-configuracion").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const settings = {
    novedades: formData.has("novedades"),
    recordatorios: formData.has("recordatorios"),
    facebook: String(formData.get("facebook")).trim(),
    instagram: String(formData.get("instagram")).trim(),
    tiktok: String(formData.get("tiktok")).trim(),
  };
  if (!writeStorage(SETTINGS_STORAGE_KEY, settings)) {
    showToast("No se pudo guardar la configuración.");
    return;
  }
  document.querySelector("#modal-configuracion").close();
  showToast("Configuración guardada en este dispositivo.");
});

for (const card of productCards) {
  card.querySelector(".product-detail").addEventListener("click", () => {
    selectedProductCard = card;
    const product = productDetails(card);
    document.querySelector("#detalle-imagen").src = product.image;
    document.querySelector("#detalle-imagen").alt = product.alt;
    document.querySelector("#detalle-categoria").textContent = card.querySelector(".product-category").textContent;
    document.querySelector("#detalle-nombre").textContent = product.name;
    document.querySelector("#detalle-precio").textContent = formatPrice(product.price);
    document.querySelector("#detalle-presentacion").textContent = product.size;
    document.querySelector("#detalle-descripcion").textContent =
      `Producto de ${card.querySelector(".product-category").textContent.toLocaleLowerCase("es")} para las labores de tu campo. Consulta disponibilidad y recomendaciones con nuestro equipo antes de usarlo.`;
    openDialog("modal-detalle-producto");
  });
}
document.querySelector("#detalle-agregar").addEventListener("click", () => {
  if (selectedProductCard) addProduct(selectedProductCard);
  document.querySelector("#modal-detalle-producto").close();
});

document.querySelector("#anio").textContent = String(new Date().getFullYear());
renderCart();
applyFilters();
updateAuthButtons();