#!/usr/bin/env node
// Add Archív-only GA4 measurement to the generated, pinned production release.
// Do not alter the immutable collector release or the independent LEGO preview.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const directory = process.argv[2] || "dist-web";
const measurementId = "G-HY619R4T32";
const snippet = [
  "<!-- Archív Google Analytics 4: aggregate site usage measurement -->",
  '<script async src="https://www.googletagmanager.com/gtag/js?id=' + measurementId + '"></script>',
  "<script>",
  "  window.dataLayer = window.dataLayer || [];",
  "  function gtag(){window.dataLayer.push(arguments);}",
  "  gtag('js', new Date());",
  "  gtag('config', '" + measurementId + "', { send_page_view: false });",
  "  // Track each view explicitly because Archív navigates with URL hash routes.",
  "  (function(){",
  "    let previousUrl = document.referrer;",
  "    function recordPageView(){",
  "      gtag('event', 'page_view', {",
  "        page_title: document.title,",
  "        page_location: location.href,",
  "        page_referrer: previousUrl",
  "      });",
  "      previousUrl = location.href;",
  "    }",
  "    recordPageView();",
  "    window.addEventListener('hashchange', recordPageView);",
  "  })();",
  "</script>"
].join("\n");

const sitePages = ["index.html", "privacy.html", "terms.html", "contact.html", "attribution.html"];
for (const file of sitePages) {
  const path = join(directory, file);
  let html = readFileSync(path, "utf8");
  if (html.includes(measurementId)) continue;
  if (/googletagmanager\.com\/gtag\/js\?id=/.test(html)) {
    throw new Error("Refusing to install a second Google tag in " + file);
  }
  if (!/<head(?:\s[^>]*)?>/i.test(html)) {
    throw new Error("Missing HTML head in " + file);
  }
  html = html.replace(/<head(?:\s[^>]*)?>/i, (opening) => opening + "\n" + snippet + "\n");
  writeFileSync(path, html, "utf8");
}

// The approved base privacy policy predates Google Analytics. Add a visible,
// accurate disclosure alongside the existing Firebase and affiliate notices.
const privacyPath = join(directory, "privacy.html");
let privacy = readFileSync(privacyPath, "utf8");
if (!privacy.includes("<strong>Google Analytics 4:</strong>")) {
  const heading = "<h2>4. Cookies, analytics and affiliate tracking</h2>";
  if (!privacy.includes(heading)) throw new Error("Privacy policy section 4 not found");
  const disclosure = '<p><strong>Google Analytics 4:</strong> Archív uses Google Analytics 4 to understand website visits and navigation, including the pages and catalog views people open. Google Analytics may use cookies or similar browser identifiers and receive page URLs, usage events, and technical browser or device information. We do not intentionally send visitor names, email addresses, or private owned and wishlisted set records to Google Analytics. Google processes Analytics information under its own terms and policies. You can limit tracking through your browser privacy settings or the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a>. This website measurement is separate from Firebase sign-in and collection activity reporting.</p>';
  privacy = privacy.replace(heading, heading + "\n" + disclosure);
  privacy = privacy.replace("Last updated November 2, 2026", "Last updated November 6, 2026");
  writeFileSync(privacyPath, privacy, "utf8");
}

const manifestPath = join(directory, "build-info.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.ga4_measurement_id = measurementId;
manifest.ga4_postbuild_overlay = true;
writeFileSync(manifestPath, JSON.stringify(manifest) + "\n", "utf8");

console.log("Archív GA4 installed in production HTML and privacy policy; preview untouched.");
