# Visual Monitor — Render Deployment

## Quick start (no credit card required)
1) Create free accounts:
   - Render: https://render.com
   - Postgres (Render managed) or any external DB
   - Redis (Upstash free): https://upstash.com
   - Backblaze B2 for object storage: https://www.backblaze.com/b2/cloud-storage.html
   - SendGrid (email): https://sendgrid.com/free/

2) In Render, create a new service from repository and include this project.
   Render will detect `render.yaml` and create two services:
     - `visual-monitor-web` (web app)
     - `visual-monitor-worker` (background worker)

3) In each service, add environment variables from `.env.example`.
   Replace placeholders with your real connection strings and keys.

4) Deploy both services. Open the web URL to confirm it's live.

Notes:
- This bundle includes a minimal web placeholder UI. You can extend it later.
- The worker uses Playwright to capture screenshots and create diffs and will upload to your S3-compatible bucket if credentials are set.
