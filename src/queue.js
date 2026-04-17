import { createEnhancedTable } from "./table.js";
import { openConfirmModal } from "./modal.js";

export function createQueueTab(context) {
  const { runHelper, showAlert, notify } = context;
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";
  root.innerHTML = '<header class="section-header"><h2>Queue</h2><p>Inspect and operate on queued messages.</p></header><div class="actions-inline"><button class="pf-c-button pf-m-primary" type="button" data-action="flush">Flush queue</button><button class="pf-c-button pf-m-secondary" type="button" data-action="refresh">Refresh</button></div>';

  const table = createEnhancedTable({
    title: "queue",
    columns: [
      { label: "ID", key: "id" },
      { label: "Sender", key: "sender" },
      { label: "Recipients", key: "recipients" },
      { label: "Size", key: "size" }
    ],
    emptyMessage: "Queue is empty",
    onBulkDelete: (rows) => bulkDelete(rows),
    rowActions: [
      { label: "Hold", onClick: (row) => queueAction("queue-hold.sh", row.id, `Held ${row.id}`) },
      { label: "Release", onClick: (row) => queueAction("queue-release.sh", row.id, `Released ${row.id}`) },
      { label: "Delete", variant: "danger", onClick: (row) => queueAction("queue-delete.sh", row.id, `Deleted ${row.id}`) }
    ]
  });

  async function refresh() {
    try {
      const out = await runHelper("queue-list.sh");
      const list = JSON.parse(out || "[]");
      table.setRows(list.map((item) => ({
        ...item,
        recipients: Array.isArray(item.recipients) ? item.recipients.join(", ") : ""
      })));
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  async function queueAction(script, id, message) {
    try {
      await runHelper(script, [id]);
      notify("success", message);
      await refresh();
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  async function bulkDelete(rows) {
    const confirmed = await openConfirmModal({ title: "Bulk delete queue entries", message: `Delete ${rows.length} selected queue message(s)?`, confirmText: "Delete selected", danger: true });
    if (!confirmed) {
      return;
    }
    for (const row of rows) {
      await queueAction("queue-delete.sh", row.id, `Deleted ${row.id}`);
    }
  }

  root.querySelector('[data-action="flush"]').addEventListener("click", async () => {
    const confirmed = await openConfirmModal({ title: "Flush queue", message: "Flush all queued mail now?", confirmText: "Flush", danger: true });
    if (!confirmed) {
      return;
    }
    try {
      await runHelper("queue-flush.sh");
      notify("success", "Queue flush requested");
      await refresh();
    } catch (error) {
      showAlert("danger", error.message);
    }
  });

  root.querySelector('[data-action="refresh"]').addEventListener("click", () => refresh());
  root.appendChild(table.element);
  refresh();
  return { element: root };
}
