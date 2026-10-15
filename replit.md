# Addis Hiwot SACCO project notes

## Running the app

- Run `npm run dev` to start the frontend and API together.
- Vite serves the frontend on port 5000; Express serves the API on port 3001.
- Run `npm run build` to build the frontend for production.
- Run `npm start` to serve the built frontend and API from Express.
- Set the `MONGODB_URI` secret to a real MongoDB connection string for
  membership application persistence. Without it, the API deliberately rejects
  submissions rather than reporting unsaved data as successful.

## Structure

- `frontend/` contains the React/Vite app and Tailwind CSS.
- `backend/src/models/`, `backend/src/controllers/`, and
  `backend/src/routers/` separate database models, request handling, and API
  routes.
- The `/admin` page is a placeholder. Do not imply that staff authentication,
  member review, or access controls exist until those features are implemented.
