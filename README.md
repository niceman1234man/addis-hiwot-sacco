# Addis Hiwot SACCO

አዲስ ህይወት የገንዘብ ቁጠባ እና ብድር ኀብረት ሥራ ማህበር

React and Tailwind CSS frontend with a separate Express and Mongoose backend.

## Run locally

```sh
npm install
npm run dev
```

The frontend is served on port 5000 and proxies `/api` requests to the Express
API on port 3001.

To accept membership applications, add a MongoDB connection string as the
`MONGODB_URI` Replit Secret, then restart the app. Applications and their private
document files are saved in MongoDB; without this secret, submissions are
rejected and nothing is saved.

## Project structure

- `frontend/` — React pages and components, Tailwind CSS, and the Vite config.
- `backend/src/models/` — separate staff account (`User`) and member application
  (`MemberApplication`) Mongoose models.
- `backend/src/controllers/` — request handling and persistence logic.
- `backend/src/routers/` — Express API routes.
- National ID files are stored in a private MongoDB GridFS bucket and are not
  exposed through a public download route.

## Routes and current scope

- `/` — public SACCO landing page.
- `/register` — membership application form.
- `/admin` — administrator dashboard for staff accounts (invite, edit role/name,
  archive, restore, and export a CSV report).
- `/sign-in` — Clerk staff sign-in, including the built-in forgot-password flow.
- `/account` — Clerk account profile and password-security settings.
- `GET /api/health` — API and MongoDB readiness.
- `POST /api/applications` — saves a member application and its documents when
  MongoDB is connected. At least one ID side is required (10MB maximum per
  file); passport photos are optional (5MB maximum).

Staff records store email and role in the `User` model. Clerk manages staff
passwords and password recovery; passwords are never stored in MongoDB. Add
`MONGODB_URI`, then run `npm run admin:bootstrap` to invite the first
administrator. The dashboard remains unavailable until MongoDB is connected
and that administrator accepts the invitation.
