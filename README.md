# Salt Swap V1.3.4 — Root API Fix

This version is intentionally flat for GitHub web uploads. `scan.js` stays in the project root. `vercel.json` explicitly builds it as a Node function and routes `/api/scan` to it.

Upload/replace these files at the ROOT of the GitHub repository:
- index.html
- styles.css
- app.js
- scan.js
- vercel.json

No `/api` folder is required for this version.
