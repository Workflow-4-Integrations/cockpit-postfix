import { escapeHtml } from "./utils.js";

export function createEnhancedTable({
  title,
  columns,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  rowActions,
  onBulkDelete
}) {
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";

  const controls = document.createElement("div");
  controls.className = "table-controls";
  controls.innerHTML = `
    <div class="pf-c-input-group">
      <input class="pf-c-form-control" type="search" placeholder="Search ${escapeHtml(title || "rows")}" data-role="search">
    </div>
    <div class="actions-inline">
      <select class="pf-c-form-control" data-role="per-page">
        <option value="10">10</option>
        <option value="25" selected>25</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
      ${onBulkDelete ? '<button class="pf-c-button pf-m-danger" type="button" data-role="bulk-delete" disabled>Delete selected</button>' : ""}
    </div>
  `;

  const table = document.createElement("table");
  table.className = "pf-c-table pf-m-grid-md enhanced-table";

  const headerCells = columns.map((column, index) => {
    const sortable = column.sortable !== false;
    return `<th data-col="${index}" ${sortable ? 'class="is-sortable"' : ""}>${escapeHtml(column.label)}${sortable ? " ↕" : ""}</th>`;
  }).join("");

  table.innerHTML = `
    <thead>
      <tr>
        ${onBulkDelete ? '<th><input type="checkbox" data-role="select-all"></th>' : ""}
        ${headerCells}
        ${rowActions?.length ? "<th>Actions</th>" : ""}
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const pager = document.createElement("div");
  pager.className = "actions-inline";
  pager.innerHTML = `
    <button class="pf-c-button pf-m-secondary" type="button" data-role="prev">Previous</button>
    <span data-role="page-info">Page 1 / 1</span>
    <button class="pf-c-button pf-m-secondary" type="button" data-role="next">Next</button>
  `;

  let rows = [];
  let filtered = [];
  let page = 1;
  let sortCol = 0;
  let sortDir = 1;
  const selected = new Set();

  function rowId(row, index) {
    return String(row.id ?? row.email ?? row.domain ?? row.source ?? index);
  }

  function getCellValue(row, column) {
    if (typeof column.sortValue === "function") {
      return String(column.sortValue(row) ?? "").toLowerCase();
    }
    if (column.key) {
      return String(row[column.key] ?? "").toLowerCase();
    }
    if (typeof column.render === "function") {
      return String(column.render(row) ?? "").toLowerCase();
    }
    return "";
  }

  function applyFilters() {
    const q = controls.querySelector('[data-role="search"]').value.trim().toLowerCase();
    filtered = rows.filter((row) => {
      if (!q) {
        return true;
      }
      return columns.some((column) => getCellValue(row, column).includes(q));
    });
    filtered.sort((a, b) => {
      const va = getCellValue(a, columns[sortCol]);
      const vb = getCellValue(b, columns[sortCol]);
      if (va < vb) {
        return -1 * sortDir;
      }
      if (va > vb) {
        return 1 * sortDir;
      }
      return 0;
    });
    renderBody();
  }

  function renderBody() {
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";
    const perPage = Number(controls.querySelector('[data-role="per-page"]').value);
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (page > totalPages) {
      page = totalPages;
    }
    const start = (page - 1) * perPage;
    const slice = filtered.slice(start, start + perPage);

    if (slice.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="${columns.length + (onBulkDelete ? 1 : 0) + (rowActions?.length ? 1 : 0)}">
        <div class="empty-state">
          <p>${escapeHtml(emptyMessage || "No rows")}</p>
          ${emptyActionLabel ? `<button class="pf-c-button pf-m-primary" type="button" data-role="empty-action">${escapeHtml(emptyActionLabel)}</button>` : ""}
        </div>
      </td>`;
      tbody.appendChild(tr);
      const emptyAction = tbody.querySelector('[data-role="empty-action"]');
      if (emptyAction && onEmptyAction) {
        emptyAction.addEventListener("click", () => onEmptyAction());
      }
    } else {
      slice.forEach((row, idx) => {
        const tr = document.createElement("tr");
        const rid = rowId(row, start + idx);

        if (onBulkDelete) {
          const td = document.createElement("td");
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = selected.has(rid);
          checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
              selected.add(rid);
            } else {
              selected.delete(rid);
            }
            refreshBulkState();
          });
          td.appendChild(checkbox);
          tr.appendChild(td);
        }

        columns.forEach((column) => {
          const td = document.createElement("td");
          if (typeof column.render === "function") {
            const rendered = column.render(row);
            if (rendered instanceof Node) {
              td.appendChild(rendered);
            } else {
              td.textContent = String(rendered ?? "");
            }
          } else {
            td.textContent = String(row[column.key] ?? "");
          }
          tr.appendChild(td);
        });

        if (rowActions?.length) {
          const td = document.createElement("td");
          const details = document.createElement("details");
          details.className = "row-kebab";
          details.innerHTML = '<summary>⋮</summary>';
          const menu = document.createElement("div");
          menu.className = "row-kebab-menu";
          rowActions.forEach((action) => {
            const button = document.createElement("button");
            button.className = `pf-c-button pf-m-link ${action.variant === "danger" ? "pf-m-danger" : ""}`;
            button.type = "button";
            button.textContent = action.label;
            button.addEventListener("click", () => {
              details.removeAttribute("open");
              action.onClick(row);
            });
            menu.appendChild(button);
          });
          details.appendChild(menu);
          td.appendChild(details);
          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      });
    }

    pager.querySelector('[data-role="page-info"]').textContent = `Page ${page} / ${totalPages}`;
    pager.querySelector('[data-role="prev"]').disabled = page <= 1;
    pager.querySelector('[data-role="next"]').disabled = page >= totalPages;
    refreshBulkState();
  }

  function refreshBulkState() {
    const button = controls.querySelector('[data-role="bulk-delete"]');
    if (button) {
      button.disabled = selected.size === 0;
    }
  }

  controls.querySelector('[data-role="search"]').addEventListener("input", () => {
    page = 1;
    applyFilters();
  });
  controls.querySelector('[data-role="per-page"]').addEventListener("change", () => {
    page = 1;
    renderBody();
  });
  pager.querySelector('[data-role="prev"]').addEventListener("click", () => {
    page -= 1;
    renderBody();
  });
  pager.querySelector('[data-role="next"]').addEventListener("click", () => {
    page += 1;
    renderBody();
  });

  table.querySelectorAll("th.is-sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const idx = Number(th.dataset.col);
      if (sortCol === idx) {
        sortDir *= -1;
      } else {
        sortCol = idx;
        sortDir = 1;
      }
      applyFilters();
    });
  });

  if (onBulkDelete) {
    table.querySelector('[data-role="select-all"]').addEventListener("change", (event) => {
      const checked = event.target.checked;
      const perPage = Number(controls.querySelector('[data-role="per-page"]').value);
      const start = (page - 1) * perPage;
      filtered.slice(start, start + perPage).forEach((row, idx) => {
        const rid = rowId(row, start + idx);
        if (checked) {
          selected.add(rid);
        } else {
          selected.delete(rid);
        }
      });
      renderBody();
    });

    controls.querySelector('[data-role="bulk-delete"]').addEventListener("click", () => {
      const selectedRows = rows.filter((row, idx) => selected.has(rowId(row, idx)));
      onBulkDelete(selectedRows);
    });
  }

  root.appendChild(controls);
  root.appendChild(table);
  root.appendChild(pager);

  return {
    element: root,
    setRows(nextRows) {
      rows = Array.isArray(nextRows) ? nextRows : [];
      selected.clear();
      page = 1;
      applyFilters();
    },
    getSelectedRows() {
      return rows.filter((row, idx) => selected.has(rowId(row, idx)));
    }
  };
}
