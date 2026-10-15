import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import ClerkAuthProvider from "./auth/ClerkAuthProvider.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkAuthProvider>
        <App />
      </ClerkAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
