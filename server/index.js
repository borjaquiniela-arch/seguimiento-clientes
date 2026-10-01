const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const os = require("os");
const multer = require("multer");
const db = require("./db");
const drive = require("./drive");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

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
  return Boolean(currentUser(req));
}

function currentUser(req) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : req.query.token;
  if (!t) return null;
  const tokens = loadTokens();
  const rec = tokens[t];
  if (!rec) return null;
  const userId = typeof rec === "object" ? rec.userId : null;
  if (!userId) return null;
  return db.userById(userId);
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
  const username = String((req.body && req.body.username) || "");
  const password = String((req.body && req.body.password) || "");
  const user = db.findUser(username, password);
  if (!user) return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
  const token = crypto.randomBytes(24).toString("hex");
  const tokens = loadTokens();
  tokens[token] = { at: Date.now(), userId: user.id };
  saveTokens(tokens);
  res.json({ token, user });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: currentUser(req) });
});

app.get("/api/users", requireAuth, (req, res) => {
  const me = currentUser(req);
  if (!me || me.role !== "admin") return res.status(403).json({ error: "Solo el administrador" });
  res.json({ users: db.listUsers() });
});

app.post("/api/users", requireAuth, (req, res) => {
  const me = currentUser(req);
  if (!me || me.role !== "admin") return res.status(403).json({ error: "Solo el administrador" });
  try {
    const user = db.addUser(req.body || {});
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/users/:id", requireAuth, (req, res) => {
  const me = currentUser(req);
  if (!me || me.role !== "admin") return res.status(403).json({ error: "Solo el administrador" });
  if (req.params.id === me.id) return res.status(400).json({ error: "No puede borrarse a sí mismo" });
  try {
    db.removeUser(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/password", requireAuth, (req, res) => {
  const me = currentUser(req);
  const next = String((req.body && req.body.password) || "").trim();
  if (next.length < 4) return res.status(400).json({ error: "Mínimo 4 caracteres" });
  try {
    db.setUserPassword(me.id, next);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/data", requireAuth, (req, res) => {
  res.json(db.getAll(currentUser(req)));
});

app.get("/api/drive/status", requireAuth, (_req, res) => {
  res.json(drive.status());
});

app.get("/api/drive/files", requireAuth, async (req, res) => {
  try {
    res.json(await drive.list(req.query.folderId || ""));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/drive/folder", requireAuth, async (req, res) => {
  try {
    const created = await drive.createFolder(req.body && req.body.name, req.body && req.body.parentId);
    res.json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/drive/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Falta el archivo" });
    res.json(await drive.upload(req.file, req.body && req.body.parentId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/drive/file/:id", requireAuth, async (req, res) => {
  try {
    const { meta, stream } = await drive.download(req.params.id);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(meta.name || "archivo")}"`);
    if (meta.mimeType) res.setHeader("Content-Type", meta.mimeType);
    stream.on("error", () => res.status(500).end());
    stream.pipe(res);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/data/:key", requireAuth, (req, res) => {
  const key = req.params.key;
  if (!["entries", "clients", "company", "invoices", "timer"].includes(key)) {
    return res.status(400).json({ error: "Clave no válida" });
  }
  db.setStore(key, req.body, currentUser(req));
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
