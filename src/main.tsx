import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startSyncListener } from "./lib/syncEngine";

// Start offline sync engine
startSyncListener();

createRoot(document.getElementById("root")!).render(<App />);
