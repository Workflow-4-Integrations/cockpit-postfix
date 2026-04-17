import { createDashboardTab } from "./dashboard.js";
import { createDomainsTab } from "./domains.js";
import { createMailboxesTab } from "./mailboxes.js";
import { createAliasesTab } from "./aliases.js";
import { createConfigTab } from "./config.js";
import { createQueueTab } from "./queue.js";
import { createLogsTab } from "./logs.js";
import { createServicesTab } from "./services.js";
import { createSidebarNavigation } from "./navigation.js";
import { createNotifications } from "./notifications.js";

const helperRoot = "/usr/local/lib/cockpit-postfix";
const cockpitApi = window.cockpit;
const root = document.getElementById("app-root");

const alertWrap = document.createElement("div");
const breadcrumb = document.createElement("div");
breadcrumb.className = "pf-c-breadcrumb";
const contentWrap = document.createElement("div");
contentWrap.className = "app-content";
const viewWrap = document.createElement("div");
viewWrap.id = "tab-content";

const notifications = createNotifications();
document.body.appendChild(notifications.element);

function showAlert(variant, message, details = "") {
  alertWrap.innerHTML = `
    <div class="pf-c-alert pf-m-${variant}">
      <div class="pf-c-alert__title">${message}</div>
      ${details ? `<details><summary>Details</summary><pre>${details}</pre></details>` : ""}
    </div>
  `;
}

function notify(variant, message, detail = "") {
  notifications.notify(variant, message, detail);
}

function runHelper(script, args = []) {
  if (!cockpitApi) {
    return Promise.reject(new Error("Cockpit API is unavailable in this context."));
  }
  return cockpitApi.spawn([`${helperRoot}/${script}`, ...args], {
    superuser: "require",
    err: "message"
  });
}

const context = { runHelper, showAlert, notify, cockpit: cockpitApi };
const views = [
  { id: "dashboard", title: "Dashboard", icon: "🏠", factory: () => createDashboardTab(context) },
  { id: "domains", title: "Domains", icon: "🌐", factory: () => createDomainsTab(context) },
  { id: "mailboxes", title: "Mailboxes", icon: "📫", factory: () => createMailboxesTab(context) },
  { id: "aliases", title: "Aliases", icon: "🔀", factory: () => createAliasesTab(context) },
  { id: "config", title: "Postfix Configuration", icon: "⚙️", factory: () => createConfigTab(context) },
  { id: "queue", title: "Queue", icon: "📬", factory: () => createQueueTab(context) },
  { id: "logs", title: "Logs", icon: "🧾", factory: () => createLogsTab(context) },
  { id: "services", title: "Services", icon: "🛠", factory: () => createServicesTab(context) }
];

const sidebar = createSidebarNavigation(views, (id) => renderView(id));

let activeView = null;

function renderView(viewId) {
  const view = views.find((entry) => entry.id === viewId) ?? views[0];
  if (activeView?.cleanup) {
    activeView.cleanup();
  }

  viewWrap.innerHTML = "";
  activeView = view.factory();
  viewWrap.appendChild(activeView.element);

  breadcrumb.innerHTML = `<ol class="pf-c-breadcrumb__list"><li class="pf-c-breadcrumb__item"><span class="pf-c-breadcrumb__link">Mail Server</span></li><li class="pf-c-breadcrumb__item pf-m-current"><span class="pf-c-breadcrumb__heading">${view.title}</span></li></ol>`;
  sidebar.setActive(view.id);
}

contentWrap.appendChild(breadcrumb);
contentWrap.appendChild(viewWrap);
root.appendChild(alertWrap);
root.appendChild(sidebar.element);
root.appendChild(contentWrap);

renderView("dashboard");

if (!cockpitApi) {
  showAlert("warning", "Cockpit API is unavailable in this context.");
}
