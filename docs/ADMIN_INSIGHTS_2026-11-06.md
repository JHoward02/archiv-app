# Archív 2.0: Private analytics dashboard and affiliate tracking

**Staging branch:** `feature/admin-analytics-redesign-20261106`  
**Production source:** remains pinned to `75f2647aaddf77bdef166a14d7e86cb0b3f2db8e`. Do not promote until the owner reviews the redesign.  
**GA4 measurement ID already installed on production:** `G-HY619R4T32` through the independent main workflow overlay.

## What is available in the redesigned admin dashboard

- 7, 30 and 90-day selectors with refresh.
- All visitors, guest browsing and signed-in browsing from GA4, when connected.
- Registered accounts and new registrations from Firestore. These are app-recorded profiles, not the authoritative complete Firebase Authentication user directory.
- Daily traffic trend, sessions, views, engaged sessions, engagement rate, new visitors, average session length, channel groups, top pages and device type.
- Aggregate public `archiv_set_view`, `archiv_catalog_search`, `sign_up`, `login` events.
- All `affiliate_click` events, including guest clicks, from GA4 once the instrumented app is promoted. GA4 custom dimensions supply set numbers and link placements.
- Separately labeled historical Firestore signed-in affiliate-click totals. **Do not add these to GA4 clicks** because they overlap.
- Top owned LEGO themes, owned and wishlisted counts, and private individual activity details, retaining the existing 50-profile event sample.
- Existing admin community-photo moderation retained.

Unavailable or unconfigured data is shown as unavailable, not zero. If a custom dimension has not been registered, the respective segmented visitor totals and affiliate breakdowns remain unavailable, while ordinary GA4 metrics still work.

## Secure GA4 read-only connection

The application is hosted on static GitHub Pages and has no server that can safely hold a Google Analytics API secret. The admin dashboard therefore requests a **separate, interactive, read-only Google OAuth access token** from Google Identity Services and sends it directly to Google Analytics Data API. This never changes collectors' existing Firebase sign-in scopes.

1. In Google Analytics, find the **numeric GA4 property ID** for the Archív Collect property under Admin > Property details. **It is not the `G-HY619R4T32` measurement ID**, and is not the `560465020` AILearningDocs.com property.
2. In Google Cloud Console, use a Google Cloud project with **Google Analytics Data API** enabled.
3. Configure a Web application OAuth 2.0 client ID. Add authorized JavaScript origins for the domain(s) serving Archív, including `https://jhoward02.github.io` and `https://www.archivcollect.com` only if the latter is serving Archív. Consent-screen testing mode may require adding your Google account as a test user. The Google account used to connect must have read access to the Archív GA4 property.
4. Set `VITE_GA4_PROPERTY_ID=<numeric-property-id>` and `VITE_GA4_OAUTH_CLIENT_ID=<web-client-id>` in the staging build environment (both are public configuration identifiers, **not secrets**).
5. Rebuild and open `#/admin` while signed into an account approved through `adminAccess/{uid}`. Click **Connect Google Analytics** and grant the readonly scope.
6. Refresh or change the date range. OAuth tokens are held in browser memory only and are not persisted.

Do not insert a Google service-account private key, GA4 API secret, Firebase admin secret or OAuth client secret in GitHub Pages HTML, browser code, `.env.production` or this repository.

## Three event-scoped GA4 custom dimensions

Under GA4 Admin > Data display > Custom definitions, create:

| Dimension | Scope | Event parameter |
| --- | --- | --- |
| Visitor status | Event | `visitor_status` |
| Affiliate set number | Event | `set_number` |
| Affiliate link location | Event | `link_placement` |

The events recorded by the new frontend use:

- `archiv_visitor_status`: `visitor_status=guest` or `registered` after Firebase has resolved browser sign-in state. Guest means **not signed in at the time of the event**; it does not prove someone has never registered.
- `archiv_set_view`: public LEGO set number only.
- `archiv_catalog_search`: an interaction counter, no visitor-entered search terms.
- `sign_up` and `login`: method Google or email only.
- `affiliate_click`: `set_number`, `link_placement` (detail, catalog, wishlist), `marketplace=ebay`, and browser visitor status. The delegated click handler runs only once per activated eBay affiliate anchor, and signed-in Firestore activity records the set number.

GA4 custom dimensions generally do **not** backfill historical reports. Data latency and browser tracking blocking still apply. Signed-in and guest unique-user cohorts may overlap within a date range if the same browser switches status; do not assume they add up to GA4 total unique visitors. Unique GA4 browser totals are not account totals. EPN commissions and completed sales must be verified in eBay's own reporting.

## Privacy and operational safeguards

- No Firebase UID, email, name, password, personal collection list, uploaded photograph or wishlist status is sent in GA4 event parameters.
- Existing Firebase `adminAccess/{uid}` authorization still controls visibility of the dashboard and Firestore private reporting. Google independently authorizes GA4 property access.
- No public Firestore anonymous write endpoint or guest identity database was introduced. That avoids turning the database into an unauthenticated tracking/spam endpoint.
- The staged Privacy Policy discloses aggregate visitor status and affiliate-click set/placement tracking.
- The production GA4 post-build installer on main must remain in place on eventual promotion; verify it injects `G-HY619R4T32` once and leaves independent `/lego-preview/` measurement disabled.
- The staged GitHub Actions `admin-analytics-staging-ci.yml` runs `npm run check` and a web build without publishing to production.

## Before launch

Verify the staging CI passes, confirm responsive rendering by signing in to the admin account at a preview build, connect GA4 read-only and confirm actual counts and clicks, verify the link does not double-count when clicked from Wishlist, confirm Privacy matches the released telemetry, and obtain explicit owner approval before changing the pinned production SHA.
