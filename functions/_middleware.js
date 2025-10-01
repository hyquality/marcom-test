// functions/_middleware.js
const ORIGIN = "https://marcom-test.pages.dev"; // or your custom domain, trailing slash optional

function absolutize(url) {
  try {
    // leave absolute URLs alone
    new URL(url);
    return url;
  } catch {
    // relative -> absolute
    return new URL(url, ORIGIN).toString();
  }
}

function rewriteSrcset(srcset) {
  // Handles comma-separated candidates: "img1.png 310w, ./img2.png 620w"
  return srcset
    .split(",")
    .map(part => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      const [url, ...descriptors] = trimmed.split(/\s+/);
      return [absolutize(url), ...descriptors].join(" ");
    })
    .join(", ");
}

export async function onRequest(context) {
  const res = await context.next();
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return res;

  let hasBase = false;

  return new HTMLRewriter()
    // optional: keep the base for true iframe use
    .on("base", { element() { hasBase = true; } })
    .on("head", { element(h) { if (!hasBase) h.prepend(`<base href="${ORIGIN}/">`, { html: true }); } })

    // rewrite <img src> and <img srcset>
    .on("img", {
      element(e) {
        const s = e.getAttribute("src");
        if (s) e.setAttribute("src", absolutize(s));
        const ss = e.getAttribute("srcset");
        if (ss) e.setAttribute("srcset", rewriteSrcset(ss));
      }
    })

    // rewrite <source srcset> inside <picture>/<video>
    .on("source", {
      element(e) {
        const ss = e.getAttribute("srcset");
        if (ss) e.setAttribute("srcset", rewriteSrcset(ss));
        const s = e.getAttribute("src");
        if (s) e.setAttribute("src", absolutize(s));
      }
    })

    // (optional) rewrite other assets commonly referenced relatively
    .on("link", { element(e) { const h = e.getAttribute("href"); if (h) e.setAttribute("href", absolutize(h)); } })
    .on("script", { element(e) { const s = e.getAttribute("src"); if (s) e.setAttribute("src", absolutize(s)); } })

    .transform(res);
}
