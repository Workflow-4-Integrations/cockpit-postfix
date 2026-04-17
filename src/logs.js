import { escapeHtml } from "./utils.js";

export function createLogsTab(context) {
  const { showAlert, cockpit } = context;
  const MAIL_LOG_PATH = "/var/log/mail.log";
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";
  root.innerHTML = '<header class="section-header"><h2>Logs</h2><p>View Postfix/Dovecot logs with filtering and download support.</p></header>';

  const controls = document.createElement("div");
  controls.className = "actions-inline";
  controls.innerHTML = `
    <input class="pf-c-form-control" type="search" placeholder="Search logs" data-role="search">
    <select class="pf-c-form-control" data-role="level">
      <option value="all">All</option>
      <option value="warning">Warnings + Errors</option>
      <option value="error">Errors only</option>
    </select>
    <button class="pf-c-button pf-m-secondary" type="button" data-action="toggle">Pause</button>
    <button class="pf-c-button pf-m-secondary" type="button" data-action="download">Download</button>
    <span class="pf-c-label pf-m-info" data-role="stream-state">Streaming</span>
  `;

  const table = document.createElement("table");
  table.className = "pf-c-table pf-m-grid-md";
  table.innerHTML = "<thead><tr><th>Timestamp</th><th>Message</th></tr></thead><tbody></tbody>";

  let paused = false;
  let follower = null;
  let lines = [];

  function parseLine(raw) {
    const line = String(raw || "").trim();
    if (!line) {
      return null;
    }
    const timestamp = line.slice(0, 15);
    const message = line.slice(16);
    const lower = message.toLowerCase();
    const level = lower.includes("error") || lower.includes("fatal") ? "error" : (lower.includes("warn") ? "warning" : "info");
    return { timestamp, message, level, raw: line };
  }

  function highlightMessage(message, query) {
    if (!query) {
      return escapeHtml(message);
    }
    const source = String(message || "");
    const lowerSource = source.toLowerCase();
    const lowerQuery = query.toLowerCase();
    if (!lowerQuery) {
      return escapeHtml(source);
    }

    let start = 0;
    let output = "";
    while (start < source.length) {
      const matchIndex = lowerSource.indexOf(lowerQuery, start);
      if (matchIndex < 0) {
        output += escapeHtml(source.slice(start));
        break;
      }
      output += escapeHtml(source.slice(start, matchIndex));
      const matched = source.slice(matchIndex, matchIndex + lowerQuery.length);
      output += `<mark>${escapeHtml(matched)}</mark>`;
      start = matchIndex + lowerQuery.length;
    }
    return output;
  }

  function append(text) {
    if (paused || !text) {
      return;
    }
    text.split("\n").forEach((line) => {
      const parsed = parseLine(line);
      if (parsed) {
        lines.push(parsed);
      }
    });
    if (lines.length > 2000) {
      lines = lines.slice(-2000);
    }
    render();
  }

  function render() {
    const search = controls.querySelector('[data-role="search"]').value.trim().toLowerCase();
    const level = controls.querySelector('[data-role="level"]').value;
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";

    const filtered = lines.filter((entry) => {
      if (level === "error" && entry.level !== "error") {
        return false;
      }
      if (level === "warning" && entry.level === "info") {
        return false;
      }
      if (!search) {
        return true;
      }
      return entry.raw.toLowerCase().includes(search);
    });

    filtered.slice(-500).forEach((entry) => {
      const tr = document.createElement("tr");
      tr.className = `log-${entry.level}`;
      const highlighted = highlightMessage(entry.message, search);
      tr.innerHTML = `<td>${escapeHtml(entry.timestamp)}</td><td>${highlighted}</td>`;
      tbody.appendChild(tr);
    });
  }

  async function loadInitial() {
    if (!cockpit) {
      return;
    }
    try {
      const out = await cockpit.spawn(["tail", "-n", "200", MAIL_LOG_PATH], { superuser: "require", err: "message" });
      out.split("\n").forEach((line) => {
        const parsed = parseLine(line);
        if (parsed) {
          lines.push(parsed);
        }
      });
      render();
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  function startFollow() {
    if (!cockpit) {
      return;
    }
    follower = cockpit.spawn(["tail", "-f", MAIL_LOG_PATH], { superuser: "require", err: "message" });
    follower.stream((data) => append(data));
    follower.catch((error) => showAlert("danger", error.message));
  }

  controls.querySelector('[data-role="search"]').addEventListener("input", render);
  controls.querySelector('[data-role="level"]').addEventListener("change", render);
  controls.querySelector('[data-action="toggle"]').addEventListener("click", () => {
    paused = !paused;
    controls.querySelector('[data-action="toggle"]').textContent = paused ? "Resume" : "Pause";
    controls.querySelector('[data-role="stream-state"]').textContent = paused ? "Paused" : "Streaming";
    controls.querySelector('[data-role="stream-state"]').className = `pf-c-label ${paused ? "pf-m-warning" : "pf-m-info"}`;
  });
  controls.querySelector('[data-action="download"]').addEventListener("click", () => {
    const blob = new Blob([lines.map((entry) => entry.raw).join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mail.log";
    link.click();
    URL.revokeObjectURL(url);
  });

  root.appendChild(controls);
  root.appendChild(table);

  loadInitial();
  startFollow();

  return {
    element: root,
    cleanup() {
      if (follower && typeof follower.close === "function") {
        follower.close();
      }
    }
  };
}
