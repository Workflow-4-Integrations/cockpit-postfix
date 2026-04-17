import { createEnhancedTable } from "./table.js";
import { openModal, openConfirmModal } from "./modal.js";
import { escapeHtml } from "./utils.js";

export function createAliasesTab(context) {
  const { runHelper, showAlert, notify } = context;
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";
  root.innerHTML = '<header class="section-header"><h2>Aliases</h2><p>Manage source and destination alias mappings.</p></header><div class="actions-inline"><button class="pf-c-button pf-m-primary" type="button" data-action="add">Add alias</button></div>';

  const table = createEnhancedTable({
    title: "aliases",
    columns: [
      { label: "Source", key: "source" },
      { label: "Destination", key: "destination" }
    ],
    emptyMessage: "No aliases configured yet",
    emptyActionLabel: "Add alias",
    onEmptyAction: () => openEditModal(),
    onBulkDelete: (rows) => bulkDelete(rows),
    rowActions: [
      { label: "Edit", onClick: (row) => openEditModal(row) },
      { label: "Delete", variant: "danger", onClick: (row) => removeAlias(row.source) }
    ]
  });

  async function refresh() {
    try {
      const out = await runHelper("alias-list.sh");
      const rows = out.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
        const [source, destination] = line.split("\t");
        return { id: source, source, destination };
      });
      table.setRows(rows);
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  function openEditModal(existing = null) {
    const body = document.createElement("div");
    body.className = "pf-c-form section-grid";
    body.innerHTML = `
      <div class="pf-c-form__group">
        <label class="pf-c-form__label"><span class="pf-c-form__label-text">Source</span></label>
        <input class="pf-c-form-control" name="source" value="${escapeHtml(existing?.source || "")}">
      </div>
      <div class="pf-c-form__group">
        <label class="pf-c-form__label"><span class="pf-c-form__label-text">Destination</span></label>
        <input class="pf-c-form-control" name="destination" value="${escapeHtml(existing?.destination || "")}">
      </div>
    `;

    openModal({
      title: existing ? `Edit alias ${existing.source}` : "Add alias",
      confirmText: existing ? "Save" : "Add",
      body,
      onConfirm: async ({ modal }) => {
        const source = modal.querySelector('[name="source"]').value.trim();
        const destination = modal.querySelector('[name="destination"]').value.trim();
        if (!source || !destination) {
          showAlert("danger", "Source and destination are required.");
          return false;
        }
        try {
          if (existing) {
            await runHelper("alias-remove.sh", [existing.source]);
          }
          await runHelper("alias-add.sh", [source, destination]);
          notify("success", existing ? `Updated alias ${source}` : `Added alias ${source}`);
          await refresh();
        } catch (error) {
          showAlert("danger", error.message);
          return false;
        }
        return true;
      }
    });
  }

  async function removeAlias(source) {
    const confirmed = await openConfirmModal({ title: "Delete alias", message: `Delete alias ${source}?`, confirmText: "Delete" });
    if (!confirmed) {
      return;
    }
    try {
      await runHelper("alias-remove.sh", [source]);
      notify("success", `Deleted alias ${source}`);
      await refresh();
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  async function bulkDelete(rows) {
    const confirmed = await openConfirmModal({ title: "Bulk delete", message: `Delete ${rows.length} selected alias(es)?`, confirmText: "Delete selected" });
    if (!confirmed) {
      return;
    }
    for (const row of rows) {
      try {
        await runHelper("alias-remove.sh", [row.source]);
      } catch (error) {
        showAlert("danger", error.message);
      }
    }
    notify("success", `Deleted ${rows.length} alias(es)`);
    await refresh();
  }

  root.querySelector('[data-action="add"]').addEventListener("click", () => openEditModal());
  root.appendChild(table.element);
  refresh();

  return { element: root };
}
