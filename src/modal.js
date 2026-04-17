export function openModal({ title, body, confirmText = "Save", cancelText = "Cancel", danger = false, onConfirm }) {
  const backdrop = document.createElement("div");
  backdrop.className = "pf-c-backdrop";

  const modal = document.createElement("div");
  modal.className = "pf-c-modal-box";
  modal.setAttribute("role", "dialog");
  modal.innerHTML = `
    <header class="pf-c-modal-box__header">
      <h1 class="pf-c-modal-box__title">${title}</h1>
    </header>
    <div class="pf-c-modal-box__body"></div>
    <footer class="pf-c-modal-box__footer">
      <button type="button" class="pf-c-button ${danger ? "pf-m-danger" : "pf-m-primary"}" data-action="confirm">${confirmText}</button>
      <button type="button" class="pf-c-button pf-m-link" data-action="cancel">${cancelText}</button>
    </footer>
  `;

  const bodyWrap = modal.querySelector(".pf-c-modal-box__body");
  if (typeof body === "string") {
    bodyWrap.innerHTML = body;
  } else if (body) {
    bodyWrap.appendChild(body);
  }

  function close() {
    backdrop.remove();
  }

  modal.querySelector('[data-action="cancel"]').addEventListener("click", close);
  modal.querySelector('[data-action="confirm"]').addEventListener("click", async () => {
    if (!onConfirm) {
      close();
      return;
    }
    const result = await onConfirm({ modal, close });
    if (result !== false) {
      close();
    }
  });

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  return close;
}

export function openConfirmModal({ title, message, danger = true, confirmText = "Confirm" }) {
  return new Promise((resolve) => {
    openModal({
      title,
      body: `<p>${message}</p>`,
      confirmText,
      cancelText: "Cancel",
      danger,
      onConfirm: () => {
        resolve(true);
      }
    });

    const handle = document.querySelector(".pf-c-backdrop:last-child");
    if (handle) {
      handle.querySelector('[data-action="cancel"]').addEventListener("click", () => resolve(false));
    }
  });
}
