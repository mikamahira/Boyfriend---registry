# The Boyfriend Registry

A responsive pink/red/white boyfriend application site with:
- A 20-question, five-section application form
- Multiple-choice and written answers
- Optional applicant photo upload
- Progress bar and confirmation screen
- Server-side application storage
- Password-protected HR dashboard
- Status changes (Under review, Shortlisted, Interview, Rejected)
- Applicant deletion

## Run locally

1. Install Node.js 18 or newer.
2. Unzip this folder and open a terminal in it.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env`.
5. Change `ADMIN_PASSWORD` to a strong, unique password. Set `SESSION_SECRET` to a long random secret.
6. Start the site:

   ```bash
   npm start
   ```

7. Open `http://localhost:3000` for the application.
8. Open `http://localhost:3000/admin` for the private HR dashboard.

## Before putting it online

- Deploy only to a host that supports Node.js and persistent storage.
- Set `NODE_ENV=production`, `ADMIN_PASSWORD`, and `SESSION_SECRET` as private environment variables in your host's settings. Do not publish your `.env` file.
- Use HTTPS. Production cookies are marked secure.
- This starter stores applications in `data/applications.json` and photos in `uploads/`. Use persistent disk storage and regular encrypted backups. If your host has an ephemeral filesystem, configure a database and object storage before launch.
- The built-in Express session MemoryStore is for a small starter/demo only. Replace it with a persistent session store for production.
- Keep the admin URL and password private. The dashboard requires a password, but this starter has one admin account configured through an environment variable.
- Tell applicants who can see their submissions and how long you plan to keep them. Delete applications you no longer need.
- Photo uploads are limited to JPG, PNG and WEBP, with a 4MB maximum.

## Customization

- Edit `public/index.html` to change wording and questions.
- Edit `public/styles.css` to change the look.
- Edit `public/app.js` if you add, remove or rename questions. Keep the `required` field names in sync with `server.js`.
