import { escapeHtml } from "./utils.js";

export function createDashboardTab(context) {
  const { runHelper, showAlert, cockpit, notify } = context;
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";

  const cards = document.createElement("div");
  cards.className = "dashboard-cards";

  const quick = document.createElement("div");
  quick.className = "actions-inline";
  quick.innerHTML = `
    <button class="pf-c-button pf-m-secondary" type="button" data-action="flush">Flush Queue</button>
    <button class="pf-c-button pf-m-secondary" type="button" data-action="restart-postfix">Restart Postfix</button>
    <button class="pf-c-button pf-m-secondary" type="button" data-action="restart-dovecot">Restart Dovecot</button>
  `;

  const info = document.createElement("div");
  info.className = "pf-c-description-list pf-m-horizontal";

  const logs = document.createElement("pre");
  logs.className = "pf-c-code-block__content log-view dashboard-log";

  async function refresh() {
    try {
      const out = await runHelper("dashboard-stats.sh");
      const data = JSON.parse(out || "{}");
      cards.innerHTML = [
        { title: "Postfix", value: data.postfix_status || "unknown", type: data.postfix_status === "active" ? "success" : "danger" },
        { title: "Dovecot", value: data.dovecot_status || "unknown", type: data.dovecot_status === "active" ? "success" : "danger" },
        { title: "Queue", value: String(data.queue_count ?? 0), type: Number(data.queue_count || 0) > 50 ? "warning" : "success" },
        { title: "Domains / Mailboxes / Aliases", value: `${data.domain_count || 0} / ${data.mailbox_count || 0} / ${data.alias_count || 0}`, type: "info" }
      ].map((card) => `
        <div class="dashboard-card">
          <div class="dashboard-card-title">${escapeHtml(card.title)}</div>
          <div class="pf-c-label pf-m-${escapeHtml(card.type)}">${escapeHtml(card.value)}</div>
        </div>
      `).join("");

      info.innerHTML = `
        <div class="pf-c-description-list__group"><dt class="pf-c-description-list__term">Hostname</dt><dd class="pf-c-description-list__description">${escapeHtml(data.hostname || "-")}</dd></div>
        <div class="pf-c-description-list__group"><dt class="pf-c-description-list__term">Postfix version</dt><dd class="pf-c-description-list__description">${escapeHtml(data.postfix_version || "-")}</dd></div>
        <div class="pf-c-description-list__group"><dt class="pf-c-description-list__term">Dovecot version</dt><dd class="pf-c-description-list__description">${escapeHtml(data.dovecot_version || "-")}</dd></div>
      `;

      logs.textContent = data.recent_log || "";
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  async function quickAction(script, args, message) {
    try {
      await runHelper(script, args);
      notify("success", message);
      await refresh();
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  quick.querySelector('[data-action="flush"]').addEventListener("click", () => quickAction("queue-flush.sh", [], "Queue flush requested"));
  quick.querySelector('[data-action="restart-postfix"]').addEventListener("click", () => quickAction("service-control.sh", ["restart", "postfix"], "Postfix restarted"));
  quick.querySelector('[data-action="restart-dovecot"]').addEventListener("click", () => quickAction("service-control.sh", ["restart", "dovecot"], "Dovecot restarted"));

  root.innerHTML = '<header class="section-header"><h2>Dashboard</h2><p>Overview of mail services and activity.</p></header>';
  root.appendChild(cards);
  root.appendChild(quick);
  root.appendChild(info);
  root.appendChild(logs);

  if (!cockpit) {
    showAlert("warning", "Cockpit API is unavailable in this context.");
  }

  refresh();
  return { element: root };
}
