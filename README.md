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

To persist membership applications, add a MongoDB connection string as the
`MONGODB_URI` Replit Secret, then restart the app. Without this secret, the
landing page and API health check still run, but application submissions return
a clear database-unavailable error and are not saved.

## Project structure

- `frontend/` — React pages and components, Tailwind CSS, and the Vite config.
- `backend/src/models/` — Mongoose data models.
- `backend/src/controllers/` — request handling and persistence logic.
- `backend/src/routers/` — Express API routes.

## Routes and current scope

- `/` — public SACCO landing page.
- `/register` — membership application form.
- `/admin` — staff setup placeholder; staff sign-in and application review are
  not implemented.
- `GET /api/health` — API and MongoDB readiness.
- `POST /api/applications` — saves an application when MongoDB is connected.

There is no staff access to submitted applications yet. Configure a real
MongoDB deployment before collecting member information.
