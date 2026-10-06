# Portfolio

A responsive static portfolio for GitHub Pages, with a separate JavaScript Cloudflare Worker for contact delivery. No frontend build or external font service is required.

## Preview

Serve this directory with a static HTTP server (for example `python -m http.server 8000`) and open http://localhost:8000. Opening the HTML directly will not activate plugin availability checks.

## Plugin downloads

Add your actual installable WordPress ZIPs to `assets/plugins/` using these filenames:

- `autodash.zip`
- `autodesk.zip`
- `calendly-bookings.zip`
- `wp-mailchimp-sync.zip`
- `bulk-first-to-last-name-split.zip`

The site checks availability and turns each “Request download” link into a download link when its file exists. Edit `assets/js/config.js` to change filenames or descriptions. No plugin functionality, compatibility, licensing or version claims have been invented. Fill these in after reviewing the packages.

## Contact form setup

Browser JavaScript submits to `backend/worker.mjs`. The Worker validates the message and a Cloudflare Turnstile challenge, then uses Brevo to send email. Credentials stay on Cloudflare. Delivery is disabled until configured; the public email link remains usable.

1. Create a Brevo account, verify `wafiq.harris-ashby@outlook.com` as a sender, and activate transactional email (account review may be required). Create an API key. No owned domain is configured here. Brevo currently documents temporary sender-address replacement for free-email senders; confirm the account supports this before going live. If Brevo requires a verified domain for your account, use a hosted form relay or add an owned domain rather than spoofing Outlook.
2. Create a Turnstile widget in Cloudflare for `whashby.github.io`. Copy the public site key into `assets/js/config.js`.
3. In `backend/`, run `npx wrangler login`. `FROM_EMAIL` and `TO_EMAIL` are already set to your Outlook address in `wrangler.toml`; the sender must be verified in Brevo.
4. Run `npx wrangler secret put BREVO_API_KEY` and `npx wrangler secret put TURNSTILE_SECRET_KEY`. Paste credentials only at the prompts; never into this repository.
5. Run `npx wrangler deploy`. Copy the returned HTTPS Worker URL, with `/contact` appended, into `contactEndpoint` in `assets/js/config.js`.
6. For a custom site domain, update `ALLOWED_ORIGINS` (comma-separated exact origins) and Turnstile’s allowed hostnames. Origin checks are browser controls; Turnstile verification provides the bot protection. The Worker enforces body size and field limits and does not log message content.
7. Test from the deployed site: invalid fields, security challenge, successful message, and arrival in Outlook (including junk). Automated tests mock provider responses; live delivery requires the configured services. Consider Cloudflare rate limiting for additional abuse protection if traffic requires it.

Official setup references: [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Brevo email API](https://developers.brevo.com/reference/send-transac-email), [Brevo sender requirements](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders).

## GitHub Pages

Publish from the root of your selected branch in repository Settings → Pages. `.nojekyll` ensures static assets are served directly. Backend source cannot execute on Pages; deploy the Worker separately. This change does not push or publish automatically.

## Checks

Run `node --test tests/contact.test.mjs`. The tests cover validation, CORS, challenge rejection, provider failure, payload limits and confirmed success without sending real email.

## Content review

See `docs/content-review.md` for resume reconciliation and remaining content decisions. The existing resume download is retained; review it before publication because it contains more personal information than the site itself.
