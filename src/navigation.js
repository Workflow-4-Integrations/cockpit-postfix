import { escapeHtml } from "./utils.js";

export function createSidebarNavigation(items, onSelect) {
  const root = document.createElement("aside");
  root.className = "app-sidebar";

  const nav = document.createElement("nav");
  nav.className = "pf-c-nav";
  const list = document.createElement("ul");
  list.className = "pf-c-nav__list";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "pf-c-nav__item";
    li.dataset.navId = item.id;
    li.innerHTML = `<button class="pf-c-nav__link" type="button"><span class="nav-icon">${escapeHtml(item.icon || "•")}</span>${escapeHtml(item.title)}</button>`;
    li.querySelector("button").addEventListener("click", () => onSelect(item.id));
    list.appendChild(li);
  });

  nav.appendChild(list);
  root.appendChild(nav);

  return {
    element: root,
    setActive(id) {
      list.querySelectorAll(".pf-c-nav__item").forEach((item) => {
        item.classList.toggle("pf-m-current", item.dataset.navId === id);
      });
    }
  };
}
