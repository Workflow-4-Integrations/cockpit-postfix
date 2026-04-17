import { createEnhancedTable } from "./table.js";
import { openModal, openConfirmModal } from "./modal.js";

export function createDomainsTab(context) {
  const { runHelper, showAlert, notify } = context;
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";
  root.innerHTML = '<header class="section-header"><h2>Domains</h2><p>Manage virtual mailbox domains.</p></header><div class="actions-inline"><button class="pf-c-button pf-m-primary" type="button" data-action="add">Add domain</button></div>';

  const table = createEnhancedTable({
    title: "domains",
    columns: [{ label: "Domain", key: "domain" }],
    emptyMessage: "No domains configured yet",
    emptyActionLabel: "Add domain",
    onEmptyAction: () => openAddModal(),
    onBulkDelete: (rows) => bulkDelete(rows),
    rowActions: [
      { label: "Edit", onClick: (row) => openEditModal(row.domain) },
      { label: "Delete", variant: "danger", onClick: (row) => removeDomain(row.domain) }
    ]
  });

  async function refresh() {
    try {
      const out = await runHelper("domain-list.sh");
      const rows = out.split("\n").map((line) => line.trim()).filter(Boolean).map((domain) => ({ domain, id: domain }));
      table.setRows(rows);
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  function openAddModal() {
    const body = document.createElement("div");
    body.innerHTML = '<div class="pf-c-form__group"><label class="pf-c-form__label"><span class="pf-c-form__label-text">Domain</span></label><input class="pf-c-form-control" name="domain" placeholder="example.com"></div>';
    openModal({
      title: "Add domain",
      body,
      confirmText: "Add",
      onConfirm: async ({ modal }) => {
        const domain = modal.querySelector('[name="domain"]').value.trim();
        if (!domain) {
          showAlert("danger", "Domain is required");
          return false;
        }
        try {
          await runHelper("domain-add.sh", [domain]);
          notify("success", `Added domain ${domain}`);
          await refresh();
        } catch (error) {
          showAlert("danger", error.message);
          return false;
        }
        return true;
      }
    });
  }

  function openEditModal(domain) {
    const body = document.createElement("div");
    body.innerHTML = `<div class="pf-c-form__group"><label class="pf-c-form__label"><span class="pf-c-form__label-text">Domain</span></label><input class="pf-c-form-control" name="domain" value="${domain}"></div>`;
    openModal({
      title: `Edit ${domain}`,
      confirmText: "Save",
      body,
      onConfirm: async ({ modal }) => {
        const next = modal.querySelector('[name="domain"]').value.trim();
        if (!next || next === domain) {
          return true;
        }
        try {
          await runHelper("domain-remove.sh", [domain]);
          await runHelper("domain-add.sh", [next]);
          notify("success", `Renamed ${domain} to ${next}`);
          await refresh();
        } catch (error) {
          showAlert("danger", error.message);
          return false;
        }
        return true;
      }
    });
  }

  async function removeDomain(domain) {
    const confirmed = await openConfirmModal({ title: "Delete domain", message: `Delete domain ${domain}?`, danger: true, confirmText: "Delete" });
    if (!confirmed) {
      return;
    }
    try {
      await runHelper("domain-remove.sh", [domain]);
      notify("success", `Deleted domain ${domain}`);
      await refresh();
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  async function bulkDelete(rows) {
    const confirmed = await openConfirmModal({ title: "Bulk delete", message: `Delete ${rows.length} selected domain(s)?`, danger: true, confirmText: "Delete selected" });
    if (!confirmed) {
      return;
    }

    for (const row of rows) {
      try {
        await runHelper("domain-remove.sh", [row.domain]);
      } catch (error) {
        showAlert("danger", error.message);
      }
    }
    notify("success", `Deleted ${rows.length} domain(s)`);
    await refresh();
  }

  root.querySelector('[data-action="add"]').addEventListener("click", () => openAddModal());
  root.appendChild(table.element);
  refresh();
  return { element: root };
}
