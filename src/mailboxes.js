import { escapeHtml } from "./utils.js";

export function createMailboxesTab(context) {
  const { runHelper, showAlert } = context;
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";

  const form = document.createElement("form");
  form.className = "pf-c-form pf-l-flex pf-m-align-items-flex-end";
  form.innerHTML = `
    <div class="pf-c-form__group">
      <label class="pf-c-form__label" for="mailbox-email"><span class="pf-c-form__label-text">Email</span></label>
      <input class="pf-c-form-control" id="mailbox-email" name="email" required placeholder="user@example.com">
    </div>
    <div class="pf-c-form__group">
      <label class="pf-c-form__label" for="mailbox-password"><span class="pf-c-form__label-text">Password</span></label>
      <input class="pf-c-form-control" id="mailbox-password" name="password" type="password" required>
    </div>
    <div class="pf-c-form__group">
      <button class="pf-c-button pf-m-primary" type="submit">Add mailbox</button>
    </div>
  `;

  const table = document.createElement("table");
  table.className = "pf-c-table pf-m-grid-md";
  table.innerHTML = `
    <thead>
      <tr><th>Mailbox</th><th>Actions</th></tr>
    </thead>
    <tbody></tbody>
  `;

  async function resetPassword(email) {
    const password = window.prompt(`Enter a new password for ${email}:`);
    if (!password) {
      return;
    }

    try {
      await runHelper("mailbox-add.sh", ["--reset", email, password]);
      showAlert("success", `Password updated for ${email}`);
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  async function refresh() {
    try {
      const out = await runHelper("mailbox-list.sh");
      const tbody = table.querySelector("tbody");
      tbody.innerHTML = "";
      const rows = out.split("\n").map((line) => line.trim()).filter(Boolean);

      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2">No mailboxes configured</td></tr>`;
        return;
      }

      for (const mailbox of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(mailbox)}</td>
          <td>
            <div class="actions-inline">
              <button class="pf-c-button pf-m-secondary pf-m-link" type="button" data-action="reset">Reset password</button>
              <button class="pf-c-button pf-m-danger pf-m-link" type="button" data-action="remove">Remove</button>
            </div>
          </td>
        `;

        tr.querySelector('[data-action="reset"]').addEventListener("click", () => resetPassword(mailbox));
        tr.querySelector('[data-action="remove"]').addEventListener("click", async () => {
          const purge = window.confirm(`Delete mailbox ${mailbox} and remove mailbox directory?`);
          try {
            await runHelper("mailbox-remove.sh", purge ? [mailbox, "--purge"] : [mailbox]);
            showAlert("success", `Removed mailbox ${mailbox}`);
            await refresh();
          } catch (error) {
            showAlert("danger", error.message);
          }
        });

        tbody.appendChild(tr);
      }
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const email = data.get("email").toString().trim();
    const password = data.get("password").toString();

    try {
      await runHelper("mailbox-add.sh", [email, password]);
      form.reset();
      showAlert("success", `Added mailbox ${email}`);
      await refresh();
    } catch (error) {
      showAlert("danger", error.message);
    }
  });

  root.appendChild(form);
  root.appendChild(table);
  refresh();

  return { element: root };
}
