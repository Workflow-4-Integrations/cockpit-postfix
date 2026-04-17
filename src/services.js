import { escapeHtml } from "./utils.js";

export function createServicesTab(context) {
  const { runHelper, showAlert } = context;
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";

  const table = document.createElement("table");
  table.className = "pf-c-table pf-m-grid-md";
  table.innerHTML = `
    <thead>
      <tr><th>Service</th><th>Active</th><th>Enabled</th><th>Actions</th></tr>
    </thead>
    <tbody></tbody>
  `;

  async function serviceAction(service, action, label) {
    try {
      await runHelper("service-control.sh", [action, service]);
      showAlert("success", `${label} ${service}`);
      await refresh();
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  async function getStatus(service) {
    const out = await runHelper("service-control.sh", ["status", service]);
    return JSON.parse(out);
  }

  async function refresh() {
    try {
      const tbody = table.querySelector("tbody");
      tbody.innerHTML = "";

      for (const service of ["postfix", "dovecot"]) {
        const status = await getStatus(service);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(service)}</td>
          <td>${escapeHtml(status.active)}</td>
          <td>${escapeHtml(status.enabled)}</td>
          <td>
            <div class="actions-inline">
              <button class="pf-c-button pf-m-secondary pf-m-link" type="button" data-action="start">Start</button>
              <button class="pf-c-button pf-m-secondary pf-m-link" type="button" data-action="stop">Stop</button>
              <button class="pf-c-button pf-m-secondary pf-m-link" type="button" data-action="restart">Restart</button>
              <button class="pf-c-button pf-m-secondary pf-m-link" type="button" data-action="enable">Enable</button>
              <button class="pf-c-button pf-m-secondary pf-m-link" type="button" data-action="disable">Disable</button>
            </div>
          </td>
        `;

        tr.querySelector('[data-action="start"]').addEventListener("click", () => serviceAction(service, "start", "Started"));
        tr.querySelector('[data-action="stop"]').addEventListener("click", () => serviceAction(service, "stop", "Stopped"));
        tr.querySelector('[data-action="restart"]').addEventListener("click", () => serviceAction(service, "restart", "Restarted"));
        tr.querySelector('[data-action="enable"]').addEventListener("click", () => serviceAction(service, "enable", "Enabled"));
        tr.querySelector('[data-action="disable"]').addEventListener("click", () => serviceAction(service, "disable", "Disabled"));
        tbody.appendChild(tr);
      }
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  root.appendChild(table);
  refresh();

  return { element: root };
}
