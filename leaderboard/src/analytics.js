/* What the page reports to Google Analytics beyond the tag's own page views, as the main dashboard does
   (dashboard/static/js/analytics.js there), for the controls this site has:
     button_click   every press of a button, the model menu or a link
     copy_code      a selection copied out of a code block
     section_view   a section that stayed on screen for a second, once per page load
     exception      a script error, an unhandled rejection, a file that failed to load or a refused request
   A page opened with ?final loads no tag (index.html) and reports nothing. */
(function () {
  "use strict";
  // Analytics keeps 100 characters of a value.
  const clip = (s) => (s || "").replace(/\s+/g, " ").trim().slice(0, 100) || undefined;
  const send = (name, params) => { if (!new URLSearchParams(location.search).has("final")) gtag("event", name, params); };

  // ------------------------------------------------------- button_click
  /* Innermost match wins, so a link inside a button-like row is a link. The listener captures, so it also sees the
     presses a handler stops from bubbling. */
  const KINDS = [
    ["button", "button, [role=button], summary"],
    ["link", "a[href]"],
  ];
  const VALUES = ["metric", "harness"];
  function pressed(e) {
    for (const n of e.composedPath()) {
      if (!(n instanceof Element)) continue;
      const kind = KINDS.find(([, sel]) => n.matches(sel));
      if (kind) return [kind[0], n];
    }
    return null;
  }
  function describe(kind, el) {
    const d = el.dataset;
    return {
      button_kind: kind,
      button_label: clip(el.getAttribute("aria-label") || el.title || el.textContent),
      button_id: el.id || undefined,
      button_classes: clip(el.getAttribute("class")),
      button_value: clip(VALUES.map((k) => d[k]).find((v) => v != null)),
      link_url: clip(el.getAttribute("href")),
    };
  }
  document.addEventListener("click", (e) => {
    const hit = pressed(e);
    if (hit) send("button_click", describe(...hit));
  }, true);

  // ---------------------------------------------------------- copy_code
  /* copy_text is the start of what was copied. */
  document.addEventListener("copy", (e) => {
    const text = String(getSelection());
    if (text && e.composedPath().some((n) => n instanceof Element && n.matches("pre, code"))) {
      send("copy_code", { copy_method: "selection", copy_text: clip(text), copy_chars: text.length });
    }
  });

  // ------------------------------------------------------- section_view
  /* The plot, the ranking panels, the methodology and the Participate sections. Once a second each is measured: one
     counts as viewed when half of it, or half a screen of it, is on screen at two looks in a row. */
  const SECTIONS = "section, article[id]";
  const named = (el) => clip(el.id || el.getAttribute("aria-label") || (el.querySelector("h2") || {}).textContent || [...el.classList].find((c) => c !== "card"));
  const viewed = new Set();
  let before = new Set();
  setInterval(() => {
    if (document.hidden) return;
    const now = new Set();
    for (const el of document.querySelectorAll(SECTIONS)) {
      const r = el.getBoundingClientRect(), shown = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      if (shown <= 0 || shown < Math.min(r.height, innerHeight) / 2) continue;
      const section = named(el), key = `${location.pathname} ${section}`;
      now.add(key);
      if (before.has(key) && !viewed.has(key)) { viewed.add(key); send("section_view", { section }); }
    }
    before = now;
  }, 1000);

  // ---------------------------------------------------------- exception
  /* Each distinct failure is reported once and a page load reports at most ten. Requests cut off by leaving the page
     are not failures. Only this site's own requests are watched: the tag's are another origin's, and reporting their
     failures would mean more of them. Addresses go without their query. */
  const told = new Set();
  let leaving = false;
  addEventListener("pagehide", () => { leaving = true; });
  addEventListener("pageshow", () => { leaving = false; });
  function failed(kind, what) {
    const description = clip(`${kind}: ${what}`);
    if (leaving || told.size >= 10 || told.has(description)) return;
    told.add(description);
    send("exception", { description, fatal: false, error_kind: kind });
  }
  const where = (address) => { const u = new URL(address || "", location.href); return (u.origin === location.origin ? "" : u.host) + u.pathname; };
  // A file that fails to load raises an error on its element, which only a capturing listener sees.
  addEventListener("error", (e) => {
    const el = e.target;
    if (el instanceof Element) failed("resource", `${el.localName} ${where(el.src || el.href)}`);
    else failed("script", `${e.message} at ${where(e.filename)}:${e.lineno}`);
  }, true);
  addEventListener("unhandledrejection", (e) => failed("promise", (e.reason && e.reason.message) || e.reason));
  const request = window.fetch;
  window.fetch = function (input) {
    const got = request.apply(this, arguments), u = new URL(input instanceof Request ? input.url : input, location.href);
    if (u.origin === location.origin) got.then((r) => { if (r.status >= 400) failed("request", `${r.status} ${u.pathname}`); }, (err) => failed("request", `${err.name} ${u.pathname}`));
    return got;
  };
})();
