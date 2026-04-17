import { escapeHtml } from "./utils.js";

export function createQueueTab(context) {
  const { runHelper, showAlert } = context;
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";

  const actions = document.createElement("div");
  actions.className = "actions-inline";
  actions.innerHTML = `<button class="pf-c-button pf-m-primary" type="button">Flush queue</button>`;

  const table = document.createElement("table");
  table.className = "pf-c-table pf-m-grid-md";
  table.innerHTML = `
    <thead>
      <tr><th>ID</th><th>Sender</th><th>Recipients</th><th>Size</th><th>Actions</th></tr>
    </thead>
    <tbody></tbody>
  `;

  actions.querySelector("button").addEventListener("click", async () => {
    try {
      await runHelper("queue-flush.sh");
      showAlert("success", "Queue flush requested");
      await refresh();
    } catch (error) {
      showAlert("danger", error.message);
    }
  });

  async function queueAction(script, id, message) {
    try {
      await runHelper(script, [id]);
      showAlert("success", message);
      await refresh();
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  async function refresh() {
    try {
      const out = await runHelper("queue-list.sh");
      const list = JSON.parse(out || "[]");
      const tbody = table.querySelector("tbody");
      tbody.innerHTML = "";

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">Queue is empty</td></tr>`;
        return;
      }

      for (const item of list) {
        const recipients = Array.isArray(item.recipients) ? item.recipients.join(", ") : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(item.id ?? "")}</td>
          <td>${escapeHtml(item.sender ?? "")}</td>
          <td>${escapeHtml(recipients)}</td>
          <td>${escapeHtml(item.size ?? "")}</td>
          <td>
            <div class="actions-inline">
              <button class="pf-c-button pf-m-secondary pf-m-link" type="button" data-action="hold">Hold</button>
              <button class="pf-c-button pf-m-secondary pf-m-link" type="button" data-action="release">Release</button>
              <button class="pf-c-button pf-m-danger pf-m-link" type="button" data-action="delete">Delete</button>
            </div>
          </td>
        `;

        tr.querySelector('[data-action="hold"]').addEventListener("click", () => queueAction("queue-hold.sh", item.id, `Held ${item.id}`));
        tr.querySelector('[data-action="release"]').addEventListener("click", () => queueAction("queue-release.sh", item.id, `Released ${item.id}`));
        tr.querySelector('[data-action="delete"]').addEventListener("click", () => queueAction("queue-delete.sh", item.id, `Deleted ${item.id}`));
        tbody.appendChild(tr);
      }
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  root.appendChild(actions);
  root.appendChild(table);
  refresh();

  return { element: root };
}
