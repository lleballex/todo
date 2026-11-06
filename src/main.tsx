import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/tailwind.css";
import "./styles/mockup.css";
import "./styles/app.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
