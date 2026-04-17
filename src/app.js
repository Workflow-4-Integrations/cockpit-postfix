import { createDomainsTab } from "./domains.js";
import { createMailboxesTab } from "./mailboxes.js";
import { createAliasesTab } from "./aliases.js";
import { createQueueTab } from "./queue.js";
import { createLogsTab } from "./logs.js";
import { createServicesTab } from "./services.js";

const helperRoot = "/usr/local/lib/cockpit-postfix";
const cockpitApi = window.cockpit;
const root = document.getElementById("app-root");

const alertWrap = document.createElement("div");
const tabsWrap = document.createElement("div");
const contentWrap = document.createElement("div");
contentWrap.id = "tab-content";
root.appendChild(alertWrap);
root.appendChild(tabsWrap);
root.appendChild(contentWrap);

function showAlert(variant, message) {
  const alert = document.createElement("div");
  alert.className = `pf-c-alert pf-m-${variant}`;
  const title = document.createElement("div");
  title.className = "pf-c-alert__title";
  title.textContent = message;
  alert.appendChild(title);
  alertWrap.innerHTML = "";
  alertWrap.appendChild(alert);
  window.setTimeout(() => {
    if (alert.parentElement === alertWrap) {
      alertWrap.innerHTML = "";
    }
  }, 6000);
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

const context = { runHelper, showAlert, cockpit: cockpitApi };
const tabs = [
  { id: "domains", title: "Domains", factory: () => createDomainsTab(context) },
  { id: "mailboxes", title: "Mailboxes", factory: () => createMailboxesTab(context) },
  { id: "aliases", title: "Aliases", factory: () => createAliasesTab(context) },
  { id: "queue", title: "Queue", factory: () => createQueueTab(context) },
  { id: "logs", title: "Logs", factory: () => createLogsTab(context) },
  { id: "services", title: "Services", factory: () => createServicesTab(context) }
];

const tabNav = document.createElement("nav");
tabNav.className = "pf-c-tabs";
const tabList = document.createElement("ul");
tabList.className = "pf-c-tabs__list";
tabNav.appendChild(tabList);
tabsWrap.appendChild(tabNav);

let activeView = null;

function renderTab(tabId) {
  const tab = tabs.find((entry) => entry.id === tabId) ?? tabs[0];
  if (activeView?.cleanup) {
    activeView.cleanup();
  }

  contentWrap.innerHTML = "";
  activeView = tab.factory();
  contentWrap.appendChild(activeView.element);

  tabList.querySelectorAll("li").forEach((li) => {
    li.classList.toggle("pf-m-current", li.dataset.tabId === tab.id);
  });
}

for (const tab of tabs) {
  const item = document.createElement("li");
  item.className = "pf-c-tabs__item";
  item.dataset.tabId = tab.id;

  const button = document.createElement("button");
  button.className = "pf-c-tabs__link";
  button.type = "button";
  button.textContent = tab.title;
  button.addEventListener("click", () => renderTab(tab.id));

  item.appendChild(button);
  tabList.appendChild(item);
}

renderTab(tabs[0].id);

if (!cockpitApi) {
  showAlert("warning", "Cockpit API is unavailable in this context.");
}
