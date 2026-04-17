import { createEnhancedTable } from "./table.js";
import { openModal, openConfirmModal } from "./modal.js";

function scorePassword(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function quotaCell(row) {
  const used = Number(row.quota_used || 0);
  const total = Number(row.quota_total || 0);
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="quota-bar"><div class="quota-bar-fill" style="width:${percent}%"></div></div>
    <small>${used}/${total || "∞"}</small>
  `;
  return wrap;
}

export function createMailboxesTab(context) {
  const { runHelper, showAlert, notify } = context;
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";
  root.innerHTML = '<header class="section-header"><h2>Mailboxes</h2><p>Manage mailbox accounts, quotas, and passwords.</p></header><div class="actions-inline"><button class="pf-c-button pf-m-primary" type="button" data-action="add">Add mailbox</button></div>';

  const table = createEnhancedTable({
    title: "mailboxes",
    columns: [
      { label: "Mailbox", key: "email" },
      { label: "Quota", sortable: false, render: quotaCell, sortValue: (row) => row.quota_used || 0 },
      { label: "Mailbox size", key: "mailbox_size" },
      { label: "Last login", key: "last_login" }
    ],
    emptyMessage: "No mailboxes configured yet",
    emptyActionLabel: "Add mailbox",
    onEmptyAction: () => openAddModal(),
    onBulkDelete: (rows) => bulkDelete(rows),
    rowActions: [
      { label: "Edit password", onClick: (row) => openResetModal(row.email) },
      { label: "Delete", variant: "danger", onClick: (row) => removeMailbox(row.email) }
    ]
  });

  async function refresh() {
    try {
      const [mailboxOut, quotaOut] = await Promise.all([
        runHelper("mailbox-list.sh"),
        runHelper("mailbox-quota.sh")
      ]);
      const mailboxes = mailboxOut.split("\n").map((line) => line.trim()).filter(Boolean);
      const quota = JSON.parse(quotaOut || "[]");
      const quotaByMailbox = new Map(quota.map((entry) => [entry.email, entry]));
      const rows = mailboxes.map((email) => {
        const q = quotaByMailbox.get(email) || {};
        return {
          id: email,
          email,
          quota_used: q.used || 0,
          quota_total: q.total || 0,
          mailbox_size: q.mailbox_size || "-",
          last_login: q.last_login || "-"
        };
      });
      table.setRows(rows);
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  function openPasswordModal({ title, email = "", onSubmit, confirmText }) {
    const body = document.createElement("div");
    body.className = "pf-c-form section-grid";
    body.innerHTML = `
      <div class="pf-c-form__group">
        <label class="pf-c-form__label"><span class="pf-c-form__label-text">Email</span></label>
        <input class="pf-c-form-control" name="email" value="${email}">
      </div>
      <div class="pf-c-form__group">
        <label class="pf-c-form__label"><span class="pf-c-form__label-text">Password</span></label>
        <input class="pf-c-form-control" type="password" name="password">
        <div class="password-strength" data-role="strength">Strength: weak</div>
      </div>
    `;

    const password = body.querySelector('[name="password"]');
    const strength = body.querySelector('[data-role="strength"]');
    password.addEventListener("input", () => {
      const score = scorePassword(password.value);
      const labels = ["very weak", "weak", "fair", "good", "strong", "excellent"];
      strength.textContent = `Strength: ${labels[score]}`;
    });

    openModal({
      title,
      body,
      confirmText,
      onConfirm: async ({ modal }) => {
        const mailbox = modal.querySelector('[name="email"]').value.trim();
        const pass = modal.querySelector('[name="password"]').value;
        if (!mailbox || !pass) {
          showAlert("danger", "Email and password are required.");
          return false;
        }
        try {
          await onSubmit(mailbox, pass);
          await refresh();
        } catch (error) {
          showAlert("danger", error.message);
          return false;
        }
        return true;
      }
    });
  }

  function openAddModal() {
    openPasswordModal({
      title: "Add mailbox",
      confirmText: "Add",
      onSubmit: async (email, password) => {
        await runHelper("mailbox-add.sh", [email, password]);
        notify("success", `Added mailbox ${email}`);
      }
    });
  }

  function openResetModal(email) {
    openPasswordModal({
      title: `Reset password for ${email}`,
      email,
      confirmText: "Update",
      onSubmit: async (mailbox, password) => {
        await runHelper("mailbox-add.sh", ["--reset", mailbox, password]);
        notify("success", `Password updated for ${mailbox}`);
      }
    });
  }

  async function removeMailbox(email) {
    const confirmed = await openConfirmModal({ title: "Delete mailbox", message: `Delete mailbox ${email}?`, danger: true, confirmText: "Delete" });
    if (!confirmed) {
      return;
    }
    try {
      await runHelper("mailbox-remove.sh", [email, "--purge"]);
      notify("success", `Deleted mailbox ${email}`);
      await refresh();
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  async function bulkDelete(rows) {
    const confirmed = await openConfirmModal({ title: "Bulk delete", message: `Delete ${rows.length} selected mailbox(es)?`, danger: true, confirmText: "Delete selected" });
    if (!confirmed) {
      return;
    }
    for (const row of rows) {
      try {
        await runHelper("mailbox-remove.sh", [row.email, "--purge"]);
      } catch (error) {
        showAlert("danger", error.message);
      }
    }
    notify("success", `Deleted ${rows.length} mailbox(es)`);
    await refresh();
  }

  root.querySelector('[data-action="add"]').addEventListener("click", () => openAddModal());
  root.appendChild(table.element);
  refresh();

  return { element: root };
}
