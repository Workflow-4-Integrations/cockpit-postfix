export function createLogsTab(context) {
  const { showAlert, cockpit } = context;
  const MAIL_LOG_PATH = "/var/log/mail.log";
  const root = document.createElement("div");
  root.className = "pf-l-stack pf-m-gutter";

  const controls = document.createElement("div");
  controls.className = "actions-inline";
  controls.innerHTML = `
    <button class="pf-c-button pf-m-secondary" type="button" data-action="pause">Pause</button>
    <button class="pf-c-button pf-m-secondary" type="button" data-action="resume">Resume</button>
    <button class="pf-c-button pf-m-link" type="button" data-action="clear">Clear</button>
  `;

  const output = document.createElement("pre");
  output.className = "pf-c-code-block__content log-view";

  let paused = false;
  let follower = null;

  function append(text) {
    if (paused || !text) {
      return;
    }

    output.textContent += text;
    output.scrollTop = output.scrollHeight;
  }

  async function loadInitial() {
    if (!cockpit) {
      return;
    }
    try {
      const lines = await cockpit.spawn(["tail", "-n", "100", MAIL_LOG_PATH], {
        superuser: "require",
        err: "message"
      });
      output.textContent = lines;
      output.scrollTop = output.scrollHeight;
    } catch (error) {
      showAlert("danger", error.message);
    }
  }

  function startFollow() {
    if (!cockpit) {
      return;
    }
    follower = cockpit.spawn(["tail", "-f", MAIL_LOG_PATH], {
      superuser: "require",
      err: "message"
    });

    follower.stream((data) => append(data));
    follower.catch((error) => showAlert("danger", error.message));
  }

  controls.querySelector('[data-action="pause"]').addEventListener("click", () => {
    paused = true;
  });
  controls.querySelector('[data-action="resume"]').addEventListener("click", () => {
    paused = false;
  });
  controls.querySelector('[data-action="clear"]').addEventListener("click", () => {
    output.textContent = "";
  });

  root.appendChild(controls);
  root.appendChild(output);

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
