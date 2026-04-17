import { escapeHtml } from "./utils.js";

export function createDomainsTab(context) {
  const { runHelper, showAlert } = context;
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";

  const form = document.createElement("form");
  form.className = "pf-c-form pf-l-flex pf-m-align-items-flex-end";
  form.innerHTML = `
    <div class="pf-c-form__group">
      <label class="pf-c-form__label" for="domain-input"><span class="pf-c-form__label-text">Domain</span></label>
      <input class="pf-c-form-control" id="domain-input" name="domain" required placeholder="example.com">
    </div>
    <div class="pf-c-form__group">
      <button class="pf-c-button pf-m-primary" type="submit">Add domain</button>
    </div>
  `;

  const table = document.createElement("table");
  table.className = "pf-c-table pf-m-grid-md";
  table.innerHTML = `
    <thead>
      <tr><th>Domain</th><th>Actions</th></tr>
    </thead>
    <tbody></tbody>
  `;

  async function refresh() {
    try {
      const out = await runHelper("domain-list.sh");
      const tbody = table.querySelector("tbody");
      tbody.innerHTML = "";
      const rows = out.split("\n").map((line) => line.trim()).filter(Boolean);

      if (rows.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="2">No domains configured</td>`;
        tbody.appendChild(tr);
        return;
      }

      for (const domain of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${escapeHtml(domain)}</td><td><button class="pf-c-button pf-m-danger pf-m-link" type="button">Remove</button></td>`;
        tr.querySelector("button").addEventListener("click", async () => {
          if (!window.confirm(`Remove domain ${domain}?`)) {
            return;
          }
          try {
            await runHelper("domain-remove.sh", [domain]);
            showAlert("success", `Removed domain ${domain}`);
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
    const domain = new FormData(form).get("domain").toString().trim();
    if (!domain) {
      return;
    }

    try {
      await runHelper("domain-add.sh", [domain]);
      form.reset();
      showAlert("success", `Added domain ${domain}`);
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
