/**
 * Oshin Style Studio — Floating Launcher (home / sitewide)
 * Drop-in script for the main store (Shopify). Adds a floating
 * "Virtual Try-On" button that opens the full Style Studio in a
 * full-screen overlay ON the site (iframe), so the visitor never
 * leaves the store.
 *
 * Install (Shopify): paste once before </body> in theme.liquid:
 *   <script src="https://oshin-style-studio-kb-ajmeras-projects.vercel.app/widget/launcher.js" defer></script>
 *
 * Optional overrides via data attributes on the <script> tag:
 *   data-app="https://.../widget/"   custom app URL
 *   data-position="bottom-left"      bottom-left | bottom-right
 *   data-label="Virtual Try-On"      button text
 */
(function () {
  "use strict";

  if (window.__oshinLauncherLoaded) return;
  window.__oshinLauncherLoaded = true;

  var script =
    document.currentScript ||
    document.querySelector('script[src*="launcher.js"]');
  var ds = (script && script.dataset) || {};

  var APP_URL = ds.app || "https://oshin-style-studio-kb-ajmeras-projects.vercel.app/widget/";
  var POSITION = ds.position === "bottom-right" ? "bottom-right" : "bottom-left";
  var LABEL = ds.label || "Virtual Try-On";

  var FONTS =
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";

  var SIDE = POSITION === "bottom-right" ? "right: 24px;" : "left: 24px;";

  var CSS =
    "@import url('" + FONTS + "');" +
    ".oss-launch{" +
    "  position:fixed; bottom:24px; " + SIDE +
    "  z-index:2147483000;" +
    "  display:inline-flex; align-items:center; gap:9px;" +
    "  padding:13px 22px;" +
    "  background:#1a1714; color:#fff;" +
    "  border:none; border-radius:100px;" +
    "  font-family:'Inter',sans-serif; font-size:12px; font-weight:500;" +
    "  letter-spacing:0.12em; text-transform:uppercase;" +
    "  cursor:pointer;" +
    "  box-shadow:0 6px 24px rgba(0,0,0,0.22);" +
    "  transition:transform .22s ease, background .22s ease, box-shadow .22s ease;" +
    "}" +
    ".oss-launch:hover{ background:#2a2724; transform:translateY(-2px); box-shadow:0 10px 30px rgba(0,0,0,0.28); }" +
    ".oss-launch svg{ width:16px; height:16px; }" +
    "@media (max-width:600px){ .oss-launch{ padding:12px 18px; font-size:11px; bottom:18px; " +
    (POSITION === "bottom-right" ? "right:16px;" : "left:16px;") + " } }" +

    ".oss-overlay{" +
    "  position:fixed; inset:0; z-index:2147483001;" +
    "  background:#faf8f5;" +
    "  opacity:0; transition:opacity .3s ease; pointer-events:none;" +
    "}" +
    ".oss-overlay.open{ opacity:1; pointer-events:auto; }" +
    ".oss-frame{ width:100%; height:100%; border:0; display:block; }" +
    ".oss-close{" +
    "  position:fixed; top:18px; right:18px; z-index:2147483002;" +
    "  width:40px; height:40px; border:none; border-radius:50%;" +
    "  background:#1a1714; color:#fff; cursor:pointer;" +
    "  display:flex; align-items:center; justify-content:center;" +
    "  font-size:22px; line-height:1; box-shadow:0 4px 16px rgba(0,0,0,0.25);" +
    "  transition:background .2s ease;" +
    "}" +
    ".oss-close:hover{ background:#000; }";

  var STAR =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 2L13.5 8.5L20 7L15 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9 12L4 7L10.5 8.5L12 2Z"/></svg>';

  var overlay = null;
  var iframe = null;

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.className = "oss-overlay";

    iframe = document.createElement("iframe");
    iframe.className = "oss-frame";
    iframe.setAttribute("allow", "camera; clipboard-write");
    iframe.setAttribute("title", "Oshin Virtual Try-On");

    var close = document.createElement("button");
    close.className = "oss-close";
    close.setAttribute("aria-label", "Close virtual try-on");
    close.innerHTML = "&times;";
    close.onclick = closeOverlay;

    overlay.appendChild(iframe);
    overlay.appendChild(close);
    document.body.appendChild(overlay);
  }

  function openOverlay() {
    if (!overlay) buildOverlay();
    if (!iframe.src) iframe.src = APP_URL; // lazy-load on first open
    document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(function () { overlay.classList.add("open"); });
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.documentElement.style.overflow = "";
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeOverlay();
  });

  function init() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "oss-launch";
    btn.innerHTML = STAR + "<span>" + LABEL + "</span>";
    btn.onclick = openOverlay;
    document.body.appendChild(btn);

    window.OshinStudioLauncher = { open: openOverlay, close: closeOverlay };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
