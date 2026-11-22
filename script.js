// Normalize the homepage URL so the browser shows /#section instead of /index.html#section.
if (window.location.pathname.endsWith('/index.html')) {
  const cleanPath = window.location.pathname.slice(0, -'index.html'.length);
  window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
}

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
toggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "×" : "☰";
});
nav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  nav.classList.remove("open");
  toggle?.setAttribute("aria-expanded", "false");
  if (toggle) toggle.textContent = "☰";
}));
