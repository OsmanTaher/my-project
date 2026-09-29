const grid = document.getElementById("projects-grid");

const skeletonCount = 8;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function getBasePath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "/" ? "" : path;
}

function buildLiveHref(liveUrl) {
  if (!liveUrl || !liveUrl.trim()) return "#";
  const base = getBasePath();
  return `${base}/${liveUrl.replace(/^\/+/, "")}`;
}

function externalIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 5h5v5"></path>
      <path d="M10 14 19 5"></path>
      <path d="M19 13v6H5V5h6"></path>
    </svg>
  `;
}

function githubIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 22v-3.3c0-.9-.3-1.6-.8-2.1 2.6-.3 5.3-1.3 5.3-5.8 0-1.3-.5-2.4-1.2-3.3.1-.3.5-1.6-.1-3.2 0 0-1-.3-3.4 1.3a11.7 11.7 0 0 0-6.2 0C6.2 4 5.2 4.3 5.2 4.3c-.6 1.6-.2 2.9-.1 3.2C4.4 8.4 4 9.5 4 10.8c0 4.5 2.7 5.5 5.3 5.8-.5.5-.8 1.2-.8 2.1V22"></path>
      <path d="M9.5 18.5c-3 .9-3-1.3-4.2-1.5"></path>
    </svg>
  `;
}

function createSkeleton() {
  return `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton-image"></div>
      <div class="skeleton-content">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-text"></div>
        <div class="skeleton-line skeleton-text short"></div>
      </div>
      <div class="skeleton-footer">
        <div class="skeleton-tags">
          <div class="skeleton-line skeleton-tag one"></div>
          <div class="skeleton-line skeleton-tag two"></div>
          <div class="skeleton-line skeleton-tag three"></div>
        </div>
        <div class="skeleton-actions">
          <div class="skeleton-line skeleton-button one"></div>
          <div class="skeleton-line skeleton-button two"></div>
        </div>
      </div>
    </div>
  `;
}

function renderSkeletons() {
  grid.classList.add("is-loading");
  grid.innerHTML = Array.from({ length: skeletonCount }, createSkeleton).join("");
  grid.setAttribute("aria-busy", "true");
}

function renderProjects(projects) {
  grid.classList.remove("is-loading");
  grid.setAttribute("aria-busy", "false");

  if (!Array.isArray(projects) || projects.length === 0) {
    grid.innerHTML = `<p class="status">No projects found.</p>`;
    return;
  }

  grid.innerHTML = projects.map((item, index) => {
    const hasLive = Boolean(item.liveUrl && item.liveUrl.trim());
    const hasGithub = Boolean(item.githubUrl && item.githubUrl.trim());

    const tags = Array.isArray(item.stack)
      ? item.stack.map((tech) => `<span class="stack-tag">${escapeHtml(tech)}</span>`).join("")
      : "";

    const actions = (hasLive || hasGithub)
      ? `
        <div class="actions">
          ${
            hasGithub
              ? `
                <a
                  class="action-link"
                  href="${escapeHtml(item.githubUrl)}"
                  target="_blank"
                  rel="noreferrer"
                >
                  ${githubIcon()}
                  <span>Source</span>
                </a>
              `
              : ""
          }

          ${
            hasLive
              ? `
                <a
                  class="action-link live external"
                  href="${escapeHtml(buildLiveHref(item.liveUrl))}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ${externalIcon()}
                  <span>Live</span>
                </a>
              `
              : ""
          }
        </div>
      `
      : "";

    return `
      <article class="project-card" style="animation-delay: ${index * 70}ms">
        <div>
          <div class="project-image">
            <img
              src="${escapeHtml(item.image || "")}"
              alt="${escapeHtml(item.title || "Project")}"
              loading="${index < 4 ? "eager" : "lazy"}"
              decoding="async"
              onerror="this.style.opacity='0.15'"
            />
          </div>

          <div class="project-content">
            <div>
              <h2 class="project-title">${escapeHtml(item.title || "")}</h2>
              <p class="project-description">${escapeHtml(item.description || "")}</p>
            </div>

            <div class="project-footer">
              ${tags ? `<div class="stack">${tags}</div>` : ""}
              ${actions}
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function loadProjects() {
  renderSkeletons();

  try {
    const response = await fetch("./projects.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const projects = await response.json();

    setTimeout(() => {
      renderProjects(projects);
    }, 400);
  } catch (error) {
    grid.classList.remove("is-loading");
    grid.setAttribute("aria-busy", "false");
    grid.innerHTML = `
      <p class="status">
        Unable to load <code>projects.json</code>.
        Run this folder with a local web server such as VS Code Live Server.
      </p>
    `;
    console.error("Projects loading failed:", error);
  }
}

loadProjects();
