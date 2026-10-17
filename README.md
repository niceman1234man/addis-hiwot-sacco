# Addis Hiwot SACCO

አዲስ ህይወት የገንዘብ ቁጠባ እና ብድር ኀብረት ሥራ ማህበር

React and Tailwind CSS frontend with a separate Express and Mongoose backend.

## Run locally

```sh
npm install
npm run dev
```

The frontend is served on port 5000 and proxies `/api` requests to the Express
API on port 3001. To run only the API, change to `backend/` and run
`npm run dev`; this also loads `.env` from the repository root.

To accept membership applications, configure `MONGODB_URI` and the three
Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET`) in the root `.env` file. Application records remain in
MongoDB; uploaded ID documents, photos, and signatures are stored in Cloudinary
as authenticated (non-public) raw assets. Submissions are rejected if either
MongoDB or Cloudinary is unavailable or unconfigured.

## Project structure

- `frontend/` — React pages and components, Tailwind CSS, and the Vite config.
- `backend/src/models/` — separate staff account (`User`) and member application
  (`MemberApplication`) Mongoose models.
- `backend/src/controllers/` — request handling and persistence logic.
- `backend/src/routers/` — Express API routes.
- New member documents are stored in Cloudinary using authenticated delivery;
  existing submissions may still reference their original private GridFS files.

## Routes and current scope

- `/` — public SACCO landing page.
- `/register` — membership application form.
- `/admin` — administrator dashboard for staff accounts and member applications.
  Admins can review and update member details/application status, permanently
  delete a member and associated stored documents, securely view submitted
  national ID documents, photos, and signatures, and export a member CSV report.
  Staff account registration, editing, archiving, restoring, and CSV reports are
  also available here.
- `/sign-in` — staff email and password sign-in.
- `/account` — change the signed-in staff member's password.
- `GET /api/health` — API and MongoDB readiness.
- `POST /api/applications` — saves the application record in MongoDB and its
  documents in Cloudinary. At least one ID side is required (10MB maximum per
  file); passport photos are optional (5MB maximum).

Staff accounts use passwords hashed with Node.js scrypt; raw passwords are
never stored. Add `MONGODB_URI`, then run `npm run admin:bootstrap` to create
the first administrator or reset that administrator's password. An active
administrator can register staff or additional administrators in `/admin` by
setting their initial passwords. Account holders can change their passwords
after signing in. Password recovery requires an administrator to set a new
password from the staff directory because no email service is configured.
