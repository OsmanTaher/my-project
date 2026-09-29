# Projects — HTML / CSS / JS

Static conversion of the original Next.js/React projects page.

## Files

- `index.html` — page structure
- `style.css` — responsive styling and animations
- `script.js` — rendering, skeleton loading, links, and interactions
- `projects.json` — project data
- `labs/` — place the existing project images here

## Images

The JSON keeps the original image names under `labs/`, for example:

`labs/github.webp`

Copy your existing `labs` images into the `labs` folder next to `index.html`.

## Run locally

Use VS Code Live Server (or another local HTTP server) and open `index.html`.

The page loads project data from `projects.json`, so opening the HTML directly with `file://` may be blocked by browser CORS rules.

## Live URLs

The JavaScript keeps the original behavior of building the live link from the current page path:

`/projects` + `/github` → `/projects/github`

Adjust `buildLiveHref()` in `script.js` if your static routing is different.
