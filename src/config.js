import { escapeHtml } from "./utils.js";
import { openModal } from "./modal.js";

const CONFIG_SECTIONS = [
  {
    id: "general",
    title: "General Settings",
    fields: [
      "myhostname", "mydomain", "myorigin", "mydestination",
      "inet_interfaces", "inet_protocols",
      "mail_owner", "setgid_group", "compatibility_level"
    ]
  },
  {
    id: "network",
    title: "Network & Access",
    fields: ["mynetworks", "mynetworks_style", "relay_host", "relayhost", "smtp_bind_address", "smtp_bind_address6"]
  },
  {
    id: "tls",
    title: "TLS/SSL",
    fields: [
      "smtpd_tls_cert_file", "smtpd_tls_key_file", "smtpd_tls_CAfile",
      "smtpd_tls_security_level", "smtp_tls_security_level", "smtpd_tls_auth_only",
      "smtpd_tls_mandatory_protocols", "smtpd_tls_mandatory_ciphers", "tls_preempt_cipherlist"
    ]
  },
  {
    id: "sasl",
    title: "SASL Authentication",
    fields: ["smtpd_sasl_auth_enable", "smtpd_sasl_type", "smtpd_sasl_path", "smtpd_sasl_security_options", "smtpd_sasl_local_domain", "broken_sasl_auth_clients"]
  },
  {
    id: "virtual",
    title: "Virtual Mailbox",
    fields: [
      "virtual_mailbox_domains", "virtual_mailbox_base", "virtual_mailbox_maps",
      "virtual_alias_maps", "virtual_alias_domains", "virtual_uid_maps", "virtual_gid_maps",
      "virtual_minimum_uid", "virtual_transport"
    ]
  },
  {
    id: "restrictions",
    title: "Restrictions & Policies",
    fields: [
      "smtpd_helo_required", "smtpd_helo_restrictions", "smtpd_sender_restrictions",
      "smtpd_recipient_restrictions", "smtpd_relay_restrictions", "smtpd_client_restrictions", "smtpd_data_restrictions"
    ],
    ordered: new Set([
      "smtpd_helo_restrictions", "smtpd_sender_restrictions", "smtpd_recipient_restrictions",
      "smtpd_relay_restrictions", "smtpd_client_restrictions", "smtpd_data_restrictions"
    ])
  },
  {
    id: "limits",
    title: "Size & Rate Limits",
    fields: [
      "message_size_limit", "mailbox_size_limit", "virtual_mailbox_limit",
      "smtpd_client_message_rate_limit", "smtpd_client_connection_rate_limit", "smtpd_client_recipient_rate_limit",
      "anvil_rate_time_unit", "default_process_limit", "smtpd_client_connection_count_limit"
    ]
  },
  {
    id: "queue",
    title: "Queue Settings",
    fields: ["queue_directory", "queue_run_delay", "maximal_queue_lifetime", "bounce_queue_lifetime", "minimal_backoff_time", "maximal_backoff_time"]
  },
  {
    id: "transport",
    title: "Transport & Delivery",
    fields: ["default_transport", "local_transport", "mailbox_transport", "virtual_transport", "fallback_transport", "lmtp_host_lookup"]
  },
  {
    id: "milter",
    title: "Milter (Mail Filter)",
    fields: ["milter_protocol", "milter_default_action", "smtpd_milters", "non_smtpd_milters", "milter_connect_macros"]
  }
];

const MASTER_COLUMNS = ["service", "type", "private", "unpriv", "chroot", "wakeup", "maxproc", "command"];

function parseList(value) {
  return String(value || "").split(",").map((entry) => entry.trim()).filter(Boolean);
}

function createOrderedListEditor(value = "") {
  const root = document.createElement("div");
  root.className = "ordered-editor";
  const list = document.createElement("ul");
  const addWrap = document.createElement("div");
  addWrap.className = "actions-inline";
  addWrap.innerHTML = '<input class="pf-c-form-control" placeholder="Add rule"><button type="button" class="pf-c-button pf-m-secondary">Add</button>';

  let items = parseList(value);

  function render() {
    list.innerHTML = "";
    items.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "ordered-item";
      li.innerHTML = `<span>${escapeHtml(item)}</span>`;
      const controls = document.createElement("div");
      controls.className = "actions-inline";
      controls.innerHTML = '<button type="button" class="pf-c-button pf-m-link">↑</button><button type="button" class="pf-c-button pf-m-link">↓</button><button type="button" class="pf-c-button pf-m-link pf-m-danger">✕</button>';
      const [up, down, remove] = controls.querySelectorAll("button");
      up.disabled = index === 0;
      down.disabled = index === items.length - 1;
      up.addEventListener("click", () => {
        [items[index - 1], items[index]] = [items[index], items[index - 1]];
        render();
      });
      down.addEventListener("click", () => {
        [items[index + 1], items[index]] = [items[index], items[index + 1]];
        render();
      });
      remove.addEventListener("click", () => {
        items.splice(index, 1);
        render();
      });
      li.appendChild(controls);
      list.appendChild(li);
    });
  }

  addWrap.querySelector("button").addEventListener("click", () => {
    const input = addWrap.querySelector("input");
    const valueToAdd = input.value.trim();
    if (!valueToAdd) {
      return;
    }
    items.push(valueToAdd);
    input.value = "";
    render();
  });

  root.appendChild(list);
  root.appendChild(addWrap);
  render();

  return {
    element: root,
    getValue() {
      return items.join(", ");
    }
  };
}

export function createConfigTab(context) {
  const { runHelper, showAlert, notify } = context;
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";

  const header = document.createElement("header");
  header.className = "section-header";
  header.innerHTML = "<h2>Postfix Configuration</h2><p>Manage Postfix parameters, master.cf entries, and raw postconf output.</p>";

  const pendingBanner = document.createElement("div");
  pendingBanner.className = "pf-c-alert pf-m-warning pending-banner";
  pendingBanner.innerHTML = '<div class="pf-c-alert__title">Pending configuration changes</div><div class="actions-inline"><button class="pf-c-button pf-m-warning" type="button" data-action="validate">Validate</button><button class="pf-c-button pf-m-primary" type="button" data-action="reload">Reload Postfix</button></div>';
  pendingBanner.hidden = true;

  const tabNav = document.createElement("div");
  tabNav.className = "actions-inline";
  tabNav.innerHTML = `
    <button class="pf-c-button pf-m-secondary" type="button" data-view="sections">Sections</button>
    <button class="pf-c-button pf-m-secondary" type="button" data-view="master">Master.cf</button>
    <button class="pf-c-button pf-m-secondary" type="button" data-view="raw">Raw Configuration</button>
  `;

  const body = document.createElement("div");
  const state = {
    view: "sections",
    params: {},
    defaults: {},
    showAllRaw: false,
    master: [],
    pending: false
  };

  function setPending(value) {
    state.pending = value;
    pendingBanner.hidden = !value;
  }

  async function loadConfig(showAll = false) {
    const out = await runHelper("postfix-config-get.sh", [showAll ? "--all" : "--non-default"]);
    const parsed = JSON.parse(out || "{}");
    state.params = parsed.params || {};
    state.defaults = parsed.defaults || {};
  }

  async function loadMaster() {
    const out = await runHelper("postfix-master-get.sh");
    state.master = JSON.parse(out || "[]");
  }

  async function saveParams(params) {
    await runHelper("postfix-config-set.sh", ["--json", JSON.stringify(params)]);
    setPending(true);
  }

  function renderTlsStatus() {
    const smtpdLevel = String(state.params.smtpd_tls_security_level || "").toLowerCase();
    let status = "disabled";
    let type = "warning";
    if (smtpdLevel && smtpdLevel !== "none") {
      status = smtpdLevel === "encrypt" ? "enforced" : "enabled";
      type = smtpdLevel === "encrypt" ? "success" : "info";
    }
    return `<div class="pf-c-label pf-m-${type}">TLS ${status}</div>`;
  }

  function renderSections() {
    body.innerHTML = "";

    CONFIG_SECTIONS.forEach((section) => {
      const card = document.createElement("section");
      card.className = "pf-c-card";
      const cardBody = document.createElement("div");
      cardBody.className = "pf-c-card__body";

      const form = document.createElement("form");
      form.className = "pf-c-form section-grid";
      const orderedEditors = new Map();

      if (section.id === "tls") {
        const indicator = document.createElement("div");
        indicator.innerHTML = renderTlsStatus();
        form.appendChild(indicator);
      }

      section.fields.forEach((field) => {
        const group = document.createElement("div");
        group.className = "pf-c-form__group";
        group.innerHTML = `<label class="pf-c-form__label"><span class="pf-c-form__label-text">${escapeHtml(field)}</span><span class="help-icon" title="Postfix parameter: ${escapeHtml(field)}">?</span></label>`;
        const value = state.params[field] ?? "";
        if (section.ordered?.has(field)) {
          const editor = createOrderedListEditor(value);
          orderedEditors.set(field, editor);
          group.appendChild(editor.element);
        } else {
          const input = document.createElement("input");
          input.className = "pf-c-form-control";
          input.name = field;
          input.value = value;
          group.appendChild(input);
        }
        form.appendChild(group);
      });

      const actions = document.createElement("div");
      actions.className = "actions-inline";
      actions.innerHTML = '<button class="pf-c-button pf-m-primary" type="submit">Save section</button>';
      form.appendChild(actions);

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = {};
        const formData = new FormData(form);
        section.fields.forEach((field) => {
          if (orderedEditors.has(field)) {
            payload[field] = orderedEditors.get(field).getValue();
          } else {
            payload[field] = String(formData.get(field) ?? "");
          }
        });
        try {
          await saveParams(payload);
          await loadConfig(false);
          renderSections();
          notify("success", `${section.title} saved`);
        } catch (error) {
          showAlert("danger", error.message);
        }
      });

      card.innerHTML = `<div class="pf-c-card__title">${escapeHtml(section.title)}</div>`;
      cardBody.appendChild(form);
      card.appendChild(cardBody);
      body.appendChild(card);
    });
  }

  function editMasterRow(existing, index = -1) {
    const wrapper = document.createElement("div");
    wrapper.className = "pf-c-form section-grid";
    MASTER_COLUMNS.forEach((column) => {
      const group = document.createElement("div");
      group.className = "pf-c-form__group";
      group.innerHTML = `<label class="pf-c-form__label"><span class="pf-c-form__label-text">${escapeHtml(column)}</span></label><input class="pf-c-form-control" name="${escapeHtml(column)}" value="${escapeHtml(existing?.[column] || "")}">`;
      wrapper.appendChild(group);
    });

    openModal({
      title: index >= 0 ? "Edit service" : "Add service",
      body: wrapper,
      onConfirm: async ({ modal }) => {
        const next = {};
        MASTER_COLUMNS.forEach((column) => {
          next[column] = modal.querySelector(`[name="${column}"]`).value.trim();
        });
        if (!next.service || !next.type) {
          showAlert("danger", "service and type are required");
          return false;
        }
        if (index >= 0) {
          state.master[index] = next;
        } else {
          state.master.push(next);
        }
        renderMaster();
        return true;
      }
    });
  }

  function renderMaster() {
    body.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "pf-l-stack pf-m-gutter";
    wrapper.innerHTML = '<div class="actions-inline"><button class="pf-c-button pf-m-primary" type="button" data-action="add">Add service</button><button class="pf-c-button pf-m-secondary" type="button" data-action="save">Save master.cf</button><button class="pf-c-button pf-m-secondary" type="button" data-action="check">Validate syntax</button></div>';

    const table = document.createElement("table");
    table.className = "pf-c-table pf-m-grid-md";
    table.innerHTML = `<thead><tr>${MASTER_COLUMNS.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}<th>Actions</th></tr></thead><tbody></tbody>`;

    const tbody = table.querySelector("tbody");
    state.master.forEach((entry, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `${MASTER_COLUMNS.map((column) => `<td>${escapeHtml(entry[column] || "")}</td>`).join("")}<td><div class="actions-inline"><button class="pf-c-button pf-m-link" type="button" data-action="edit">Edit</button><button class="pf-c-button pf-m-link pf-m-danger" type="button" data-action="remove">Remove</button></div></td>`;
      tr.querySelector('[data-action="edit"]').addEventListener("click", () => editMasterRow(entry, index));
      tr.querySelector('[data-action="remove"]').addEventListener("click", () => {
        state.master.splice(index, 1);
        renderMaster();
      });
      tbody.appendChild(tr);
    });

    wrapper.querySelector('[data-action="add"]').addEventListener("click", () => editMasterRow());
    wrapper.querySelector('[data-action="save"]').addEventListener("click", async () => {
      try {
        await runHelper("postfix-master-set.sh", ["--json", JSON.stringify(state.master)]);
        await runHelper("postfix-check.sh");
        setPending(true);
        notify("success", "master.cf updated");
      } catch (error) {
        showAlert("danger", error.message);
      }
    });
    wrapper.querySelector('[data-action="check"]').addEventListener("click", async () => {
      try {
        await runHelper("postfix-check.sh");
        notify("success", "postfix check passed");
      } catch (error) {
        showAlert("danger", error.message);
      }
    });

    wrapper.appendChild(table);
    body.appendChild(wrapper);
  }

  function renderRaw() {
    body.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "pf-l-stack pf-m-gutter";
    wrapper.innerHTML = `
      <div class="actions-inline">
        <input class="pf-c-form-control" placeholder="Search parameter" data-role="search">
        <button class="pf-c-button pf-m-secondary" type="button" data-role="toggle">${state.showAllRaw ? "Show non-default only" : "Show all settings"}</button>
      </div>
      <table class="pf-c-table pf-m-grid-md"><thead><tr><th>Parameter</th><th>Value</th><th>Actions</th></tr></thead><tbody></tbody></table>
    `;

    const tbody = wrapper.querySelector("tbody");

    function paint() {
      const query = wrapper.querySelector('[data-role="search"]').value.trim().toLowerCase();
      const pairs = Object.entries(state.params).filter(([key, value]) => {
        if (!query) {
          return true;
        }
        return key.toLowerCase().includes(query) || String(value).toLowerCase().includes(query);
      }).sort((a, b) => a[0].localeCompare(b[0]));

      tbody.innerHTML = "";
      pairs.forEach(([key, value]) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td><td><div class="actions-inline"><button class="pf-c-button pf-m-link" type="button" data-action="edit">Edit</button><button class="pf-c-button pf-m-link" type="button" data-action="default">Show default</button></div></td>`;
        tr.querySelector('[data-action="edit"]').addEventListener("click", () => {
          const editor = document.createElement("div");
          editor.innerHTML = `<input class="pf-c-form-control" value="${escapeHtml(value)}">`;
          openModal({
            title: `Edit ${key}`,
            body: editor,
            onConfirm: async ({ modal }) => {
              try {
                const next = modal.querySelector("input").value;
                await saveParams({ [key]: next });
                await loadConfig(state.showAllRaw);
                renderRaw();
                notify("success", `${key} updated`);
              } catch (error) {
                showAlert("danger", error.message);
                return false;
              }
              return true;
            }
          });
        });
        tr.querySelector('[data-action="default"]').addEventListener("click", () => {
          const def = state.defaults[key] ?? "(not available)";
          openModal({ title: `Default: ${key}`, body: `<pre>${escapeHtml(def)}</pre>`, confirmText: "Close", cancelText: "", onConfirm: () => true });
        });
        tbody.appendChild(tr);
      });
    }

    wrapper.querySelector('[data-role="search"]').addEventListener("input", paint);
    wrapper.querySelector('[data-role="toggle"]').addEventListener("click", async () => {
      try {
        state.showAllRaw = !state.showAllRaw;
        await loadConfig(state.showAllRaw);
        renderRaw();
      } catch (error) {
        showAlert("danger", error.message);
      }
    });

    paint();
    body.appendChild(wrapper);
  }

  async function renderActive() {
    try {
      if (state.view === "sections") {
        await loadConfig(false);
        renderSections();
      } else if (state.view === "master") {
        await loadMaster();
        renderMaster();
      } else {
        await loadConfig(state.showAllRaw);
        renderRaw();
      }
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  tabNav.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      state.view = button.dataset.view;
      await renderActive();
    });
  });

  pendingBanner.querySelector('[data-action="validate"]').addEventListener("click", async () => {
    try {
      await runHelper("postfix-check.sh");
      notify("success", "postfix check passed");
    } catch (error) {
      showAlert("danger", error.message);
    }
  });

  pendingBanner.querySelector('[data-action="reload"]').addEventListener("click", async () => {
    try {
      await runHelper("postfix-check.sh", ["--reload"]);
      setPending(false);
      notify("success", "Postfix reloaded");
    } catch (error) {
      showAlert("danger", error.message);
    }
  });

  root.appendChild(header);
  root.appendChild(pendingBanner);
  root.appendChild(tabNav);
  root.appendChild(body);
  renderActive();
  return { element: root };
}
