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
- `/admin` — staff portal placeholder; application review is not implemented.
- `GET /api/health` — API and MongoDB readiness.
- `POST /api/applications` — saves a member application and its documents when
  MongoDB is connected. At least one ID side is required (10MB maximum per
  file); passport photos are optional (5MB maximum).

Staff records store email and role in the `User` model. Clerk manages staff
passwords; application passwords are not stored in MongoDB. The current
environment still needs MongoDB and Clerk configured before these services are
available.
