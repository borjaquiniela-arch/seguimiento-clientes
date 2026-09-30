const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const os = require("os");
const db = require("./db");

const PORT = Number(process.env.PORT || 8787);
const tokenFile = path.join(process.env.DATA_DIR || path.join(__dirname, "..", "data"), "tokens.json");

function loadTokens() {
  try {
    return JSON.parse(fs.readFileSync(tokenFile, "utf8"));
  } catch {
    return {};
  }
}

function saveTokens(map) {
  fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
  fs.writeFileSync(tokenFile, JSON.stringify(map));
}

function tokenOk(req) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : req.query.token;
  if (!t) return false;
  const tokens = loadTokens();
  return Boolean(tokens[t]);
}

function requireAuth(req, res, next) {
  if (!tokenOk(req)) return res.status(401).json({ error: "No autorizado" });
  next();
}

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "Seguimiento Clientes", time: new Date().toISOString() });
});

app.post("/api/login", (req, res) => {
  const password = String((req.body && req.body.password) || "");
  if (password !== db.password()) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }
  const token = crypto.randomBytes(24).toString("hex");
  const tokens = loadTokens();
  tokens[token] = Date.now();
  saveTokens(tokens);
  res.json({ token });
});

app.post("/api/password", requireAuth, (req, res) => {
  const next = String((req.body && req.body.password) || "").trim();
  if (next.length < 4) return res.status(400).json({ error: "Mínimo 4 caracteres" });
  db.setSetting("password", next);
  res.json({ ok: true });
});

app.get("/api/data", requireAuth, (_req, res) => {
  res.json(db.getAll());
});

app.put("/api/data/:key", requireAuth, (req, res) => {
  const key = req.params.key;
  if (!["entries", "clients", "company", "invoices", "timer"].includes(key)) {
    return res.status(400).json({ error: "Clave no válida" });
  }
  db.setStore(key, req.body);
  res.json({ ok: true });
});

const webDist = path.join(__dirname, "..", "web", "dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const list of Object.values(nets)) {
    for (const n of list || []) {
      if (n.family === "IPv4" && !n.internal) ips.push(n.address);
    }
  }
  console.log(`Servidor listo en http://localhost:${PORT}`);
  ips.forEach((ip) => console.log(`  Red local: http://${ip}:${PORT}`));
  if (process.env.PUBLIC_URL) console.log(`  Internet: ${process.env.PUBLIC_URL}`);
  console.log("Contraseña inicial: afid2026 — cámbiala en cuanto entre.");
});
