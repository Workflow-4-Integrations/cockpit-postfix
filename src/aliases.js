import { escapeHtml } from "./utils.js";

export function createAliasesTab(context) {
  const { runHelper, showAlert } = context;
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";

  const form = document.createElement("form");
  form.className = "pf-c-form pf-l-flex pf-m-align-items-flex-end";
  form.innerHTML = `
    <div class="pf-c-form__group">
      <label class="pf-c-form__label" for="alias-source"><span class="pf-c-form__label-text">Source</span></label>
      <input class="pf-c-form-control" id="alias-source" name="source" required placeholder="info@example.com">
    </div>
    <div class="pf-c-form__group">
      <label class="pf-c-form__label" for="alias-destination"><span class="pf-c-form__label-text">Destination</span></label>
      <input class="pf-c-form-control" id="alias-destination" name="destination" required placeholder="user@example.com">
    </div>
    <div class="pf-c-form__group">
      <button class="pf-c-button pf-m-primary" type="submit">Add alias</button>
    </div>
  `;

  const table = document.createElement("table");
  table.className = "pf-c-table pf-m-grid-md";
  table.innerHTML = `
    <thead>
      <tr><th>Source</th><th>Destination</th><th>Actions</th></tr>
    </thead>
    <tbody></tbody>
  `;

  async function refresh() {
    try {
      const out = await runHelper("alias-list.sh");
      const tbody = table.querySelector("tbody");
      tbody.innerHTML = "";
      const rows = out.split("\n").map((line) => line.trim()).filter(Boolean);

      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3">No aliases configured</td></tr>`;
        return;
      }

      for (const line of rows) {
        const [source, destination] = line.split("\t");
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${escapeHtml(source ?? "")}</td><td>${escapeHtml(destination ?? "")}</td><td><button class="pf-c-button pf-m-danger pf-m-link" type="button">Remove</button></td>`;
        tr.querySelector("button").addEventListener("click", async () => {
          if (!window.confirm(`Remove alias ${source}?`)) {
            return;
          }
          try {
            await runHelper("alias-remove.sh", [source]);
            showAlert("success", `Removed alias ${source}`);
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
    const source = data.get("source").toString().trim();
    const destination = data.get("destination").toString().trim();

    try {
      await runHelper("alias-add.sh", [source, destination]);
      form.reset();
      showAlert("success", `Added alias ${source}`);
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
