# Addis Hiwot SACCO project notes

## Running the app

- Run `npm run dev` to start the frontend and API together.
- Vite serves the frontend on port 5000; Express serves the API on port 3001.
- Run `npm run build` to build the frontend for production.
- Run `npm start` to serve the built frontend and API from Express.
- Set the `MONGODB_URI` secret to a real MongoDB connection string for
  membership application and private document persistence. Without it, the API
  rejects submissions rather than reporting unsaved data as successful.

## Structure

- `frontend/` contains the React/Vite app and Tailwind CSS.
- `backend/src/models/`, `backend/src/controllers/`, and
  `backend/src/routes/` separate database models, request handling, and API
  routes.
- Staff accounts (`User`) and member applications (`MemberApplication`) are
  separate models. Staff passwords are hashed with Node.js scrypt and are
  never stored in plaintext.
- `/admin` manages administrator/staff accounts only. Signed-in staff can
  update their password under `/account`; administrators can register staff
  and other administrators with initial passwords.
- After connecting MongoDB, run `npm run admin:bootstrap` to create the first
  administrator. The dashboard uses database-backed sessions and requires an
  active administrator account. There is no self-service password recovery;
  administrators can reset an account's password from the staff directory.
- Member ID documents are stored in a private MongoDB GridFS bucket. There is
  no public file-download route or staff application-review screen yet.
- The staff dashboard manages staff/admin accounts only; member applications
  remain outside its scope.
