export function createNotifications() {
  const root = document.createElement("div");
  root.className = "toast-stack";

  function notify(variant, title, detail = "") {
    const toast = document.createElement("div");
    toast.className = `pf-c-alert pf-m-${variant} toast-item`;
    toast.innerHTML = `
      <div class="pf-c-alert__title">${title}</div>
      ${detail ? `<div class="pf-c-alert__description">${detail}</div>` : ""}
    `;
    root.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  return { element: root, notify };
}
