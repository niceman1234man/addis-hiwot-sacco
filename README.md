# Addis Hiwot SACCO

አዲስ ህይወት የገንዘብ ቁጠባ እና ብድር ኀብረት ሥራ ማህበር

React and Tailwind CSS frontend with a separate Express and Mongoose backend.

## Run locally

```sh
npm install
npm run dev
```

The frontend is served on port 5000 and proxies `/api` requests to the Express
API on port 3001. To run only the API, run `npm run dev:backend` from the
repository root or `npm run dev` from `backend/`.

## Deploy to Netlify

The root `netlify.toml` builds the Vite app into `dist`, proxies `/api/*` to
the Express API hosted at `https://addis-hiwot-sacco.onrender.com`, and routes
other paths to the SPA entry point. Deploy from the repository root. The API
must also be deployed and configured with its MongoDB and Cloudinary
environment variables; Netlify hosts only the frontend and does not run the
Express server.

To accept membership applications, configure `MONGODB_URI` and the three
Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET`) in the root `.env` file. Application records remain in
MongoDB; uploaded ID documents, photos, and signatures are stored in Cloudinary
as authenticated (non-public) raw assets. Submissions are rejected if either
MongoDB or Cloudinary is unavailable or unconfigured.

## Project structure and current implementation

- `frontend/src/api/` — API client plus authentication, user, and member API modules.
- `frontend/src/routes/` — SPA route declarations.
- `frontend/src/App.jsx` — public landing and member application screens.
- `frontend/src/features/auth/` and `frontend/src/features/admin/` — staff
  authentication, account management, and member administration screens.
- `backend/src/app.js` — Express configuration and versioned route mounting.
- `backend/src/server.js` — server startup; database configuration is in `backend/src/config/`.
- `backend/src/models/` — staff account (`User`) and member (`Member`) Mongoose
  models; membership applications remain in the existing `memberapplications`
  MongoDB collection.
- `backend/src/controllers/` — request handling and persistence logic.
- `backend/src/routes/` — versioned API routes.
- `backend/src/models/`, `backend/src/controllers/`, and `backend/src/services/`
  contain existing account/member functionality plus clearly marked scaffolds
  for the planned finance modules.
- New member documents are stored in Cloudinary using authenticated delivery;
  existing submissions may still reference their original private GridFS files.

The four account roles are `admin`, `manager`, `accountant`, and `cashier`.
Existing `staff` accounts remain supported as legacy records. Admin account
management and membership applications are implemented. Savings, loan
applications/approval/disbursement, repayments, journal entries, expense
approval/payment, cash-session reconciliation, transaction viewing, and
financial summaries now have server-side workflows.

Financial model amounts are stored as integer minor currency units (for
example, cents/centimes), with `ETB` as the current default currency. The
loan service uses a standard monthly amortization estimate and allocates
repayments to principal before interest. Confirm this convention, fees,
eligibility, approval separation, and cash controls against SACCO policy before
production use. Generic transaction creation only creates pending records; it
does not change account balances.

Before posting money, create active accounts in the chart of accounts and set
the `SACCO_*_ACCOUNT_ID` values from `backend/.env.example` in the backend
environment. Financial workflows use MongoDB transactions and therefore need
a replica set (MongoDB Atlas provides one). If required accounts are missing,
posting endpoints return an error without applying a partial update.

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
- `GET /api/v1/health` — API and MongoDB readiness.
- `POST /api/v1/auth/login`, `GET /api/v1/auth/session`,
  `DELETE /api/v1/auth/logout`, and `PATCH /api/v1/auth/password` — staff
  authentication and password management.
- `POST /api/v1/auth/password/forgot` and `POST /api/v1/auth/password/reset` —
  rate-limited staff password recovery with single-use, expiring email tokens.
- `/api/v1/users` — administrator-only user management.
- `/api/v1/members` — public application submission and administrator-only
  member application administration.
- `/api/v1/savings` — account creation/listing and deposit/withdrawal posting.
- `/api/v1/loans` — application, listing, approval/rejection, and disbursement.
- `/api/v1/repayments` — loan repayment allocation and posting.
- `/api/v1/transactions` — posted transaction listing and pending draft creation.
- `/api/v1/accounting/accounts`, `/journals`, and `/expenses` — account listing,
  balanced journals, expense submission, approval, and payment.
- `/api/v1/cashier/sessions` — open/current/close session and cash reconciliation.
- `/api/v1/reports/financial` — summaries of posted transactions only.
- `POST /api/v1/members` — saves the application record in MongoDB and its
  documents in Cloudinary. At least one ID side is required (10MB maximum per
  file); passport photos are optional (5MB maximum).

Staff accounts use passwords hashed with Node.js scrypt; raw passwords are
never stored. Add `MONGODB_URI`, then run `npm run admin:bootstrap` to create
the first administrator or reset that administrator's password. An active
administrator can register staff or additional administrators in `/admin` by
setting their initial passwords. Account holders can change their passwords
after signing in. Self-service recovery is available at `/forgot-password`.
Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and
`FRONTEND_URL` in the backend environment to deliver reset links. `SMTP_FROM`
is optional and defaults to `SMTP_USER`. Tokens are stored only as hashes,
expire after 30 minutes, and are single-use. Recovery responses do not reveal
whether an email has an account. SMTP must be configured before enabling this
feature in production.
