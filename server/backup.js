const fs = require("fs");
const path = require("path");
const drive = require("./drive");

const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const source = path.join(dataDir, "seguimiento.json");
const backupDir = path.join(dataDir, "backups");
const hours = Math.max(1, Number(process.env.BACKUP_HOURS || 24));
const keep = Math.max(7, Number(process.env.BACKUP_KEEP || 30));

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function listBackups() {
  if (!fs.existsSync(backupDir)) return [];
  return fs
    .readdirSync(backupDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const full = path.join(backupDir, name);
      const stat = fs.statSync(full);
      return { name, bytes: stat.size, time: stat.mtime.toISOString() };
    })
    .sort((a, b) => (a.time < b.time ? 1 : -1));
}

function prune() {
  const files = listBackups();
  files.slice(keep).forEach((item) => {
    fs.unlinkSync(path.join(backupDir, item.name));
  });
}

async function run() {
  if (!fs.existsSync(source)) return { ok: false, error: "Todavía no hay datos" };
  fs.mkdirSync(backupDir, { recursive: true });
  const name = `seguimiento-${stamp()}.json`;
  const dest = path.join(backupDir, name);
  fs.copyFileSync(source, dest);
  prune();
  let driveFile = null;
  try {
    if (drive.status().connected) {
      const buf = fs.readFileSync(dest);
      driveFile = await drive.upload(
        { originalname: name, mimetype: "application/json", buffer: buf },
        ""
      );
    }
  } catch (err) {
    driveFile = { error: err.message };
  }
  return { ok: true, name, hours, drive: driveFile };
}

function start() {
  const every = hours * 60 * 60 * 1000;
  setTimeout(() => {
    run().catch((err) => console.error("Copia de seguridad:", err.message));
  }, 60 * 1000);
  setInterval(() => {
    run().catch((err) => console.error("Copia de seguridad:", err.message));
  }, every);
  console.log(`Copia de seguridad cada ${hours} h, en ${backupDir}`);
}

function filePath(name) {
  const safe = path.basename(String(name || ""));
  const full = path.join(backupDir, safe);
  if (!safe.endsWith(".json") || !fs.existsSync(full)) return null;
  return full;
}

function restore(name) {
  const full = filePath(name);
  if (!full) throw new Error("Copia no encontrada");
  if (fs.existsSync(source)) {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(source, path.join(backupDir, `antes-de-restaurar-${stamp()}.json`));
  }
  fs.copyFileSync(full, source);
  return { ok: true, name };
}

module.exports = { run, start, listBackups, filePath, hours, restore };
