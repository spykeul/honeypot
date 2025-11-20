import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { Low, JSONFile } from "lowdb";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express setup
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend build (React or admin.html)
app.use(express.static(path.join(__dirname, "public")));

// LowDB setup
const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);
await db.read();
db.data ||= { logs: [] };

// HTTP + Socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Helper to detect unique visitor (by IP)
function findVisitor(ip) {
  return db.data.logs.find((l) => l.ip === ip && l.type === "visit");
}

// Routes
app.get(["/admin", "/"], async (req, res) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const log = {
    type: "visit",
    ip,
    ua: req.headers["user-agent"],
    time: new Date().toISOString(),
    path: req.path,
    id: Date.now() + Math.random()
  };

  if (!findVisitor(ip)) db.data.logs.push(log);
  await db.write();
  io.emit("new_log", log);

  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Fake login
app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const log = {
    type: "attempt",
    ip,
    ua: req.headers["user-agent"],
    time: new Date().toISOString(),
    path: req.path,
    payload: { username, password },
    id: Date.now() + Math.random()
  };

  db.data.logs.push(log);
  await db.write();
  io.emit("new_log", log);

  res.status(403).json({ message: "Invalid credentials" });
});

// Fetch all logs
app.get("/api/logs", async (req, res) => {
  await db.read();
  res.json(db.data.logs);
});

// Clear all logs
app.delete("/api/logs/clear", async (req, res) => {
  db.data.logs = [];
  await db.write();
  io.emit("logs_cleared");
  res.json({ message: "All logs cleared" });
});

// Remove single log
app.delete("/api/logs/:id", async (req, res) => {
  const { id } = req.params;
  db.data.logs = db.data.logs.filter((l) => l.id != id);
  await db.write();
  io.emit("log_removed", id);
  res.json({ message: "Log removed" });
});

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🔥 Honeypot Active → http://localhost:${PORT}`);
  console.log(`🛠 Admin Panel → http://localhost:${PORT}/admin`);
  console.log(`📡 Logs API → http://localhost:${PORT}/api/logs`);
});