// /functions/_middleware.js
export async function onRequest(context) {
  // Let Pages serve the static asset (index.html, etc.)
  const res = await context.next();

  // Only touch HTML
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return res;

  const baseHref = "https://iphone-air.pages.dev/"; // or your custom domain

  return new HTMLRewriter()
    .on("head", {
      element(head) {
        // Always prepend a <base>; remove this if you prefer to add only when missing
        head.prepend(`<base href="${baseHref}">`, { html: true });
      }
    })
    .transform(res);
}
