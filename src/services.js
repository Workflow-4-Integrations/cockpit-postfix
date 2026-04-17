export function createServicesTab(context) {
  const { runHelper, showAlert, notify } = context;
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";
  root.innerHTML = '<header class="section-header"><h2>Services</h2><p>Control Postfix and Dovecot service lifecycle and enablement.</p></header>';

  const table = document.createElement("table");
  table.className = "pf-c-table pf-m-grid-md";
  table.innerHTML = `
    <thead>
      <tr><th>Service</th><th>Status</th><th>Enablement</th><th>Actions</th></tr>
    </thead>
    <tbody></tbody>
  `;

  async function getStatus(service) {
    const out = await runHelper("service-control.sh", ["status", service]);
    return JSON.parse(out || "{}");
  }

  function badge(value) {
    const normalized = String(value || "unknown");
    const variant = normalized === "active" || normalized === "enabled" ? "green" : (normalized === "inactive" || normalized === "disabled" ? "red" : "orange");
    return `<span class="status-badge status-${variant}">${normalized}</span>`;
  }

  async function serviceAction(service, action, label) {
    try {
      await runHelper("service-control.sh", [action, service]);
      notify("success", `${label} ${service}`);
      await refresh();
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  async function refresh() {
    try {
      const tbody = table.querySelector("tbody");
      tbody.innerHTML = "";

      for (const service of ["postfix", "dovecot"]) {
        const status = await getStatus(service);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${service}</td>
          <td>${badge(status.active)}</td>
          <td>${badge(status.enabled)}</td>
          <td>
            <div class="actions-inline">
              <button class="pf-c-button pf-m-secondary pf-m-link" type="button" data-action="restart">Restart</button>
              <button class="pf-c-button pf-m-secondary pf-m-link" type="button" data-action="toggle">${status.enabled === "enabled" ? "Disable" : "Enable"}</button>
              <button class="pf-c-button pf-m-secondary pf-m-link" type="button" data-action="toggle-run">${status.active === "active" ? "Stop" : "Start"}</button>
            </div>
          </td>
        `;

        tr.querySelector('[data-action="restart"]').addEventListener("click", () => serviceAction(service, "restart", "Restarted"));
        tr.querySelector('[data-action="toggle"]').addEventListener("click", () => serviceAction(service, status.enabled === "enabled" ? "disable" : "enable", status.enabled === "enabled" ? "Disabled" : "Enabled"));
        tr.querySelector('[data-action="toggle-run"]').addEventListener("click", () => serviceAction(service, status.active === "active" ? "stop" : "start", status.active === "active" ? "Stopped" : "Started"));
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
