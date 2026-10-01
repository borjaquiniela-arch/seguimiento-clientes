const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });
const file = path.join(dataDir, "seguimiento.json");

const DEFAULTS = {
  password: process.env.APP_PASSWORD || "afid2026",
  entries: [],
  clients: [],
  company: {
    nom: "A-Fid Comptabilité",
    adresse: "Rue Es Crès 3",
    npaLocalite: "2830 Courrendlin",
    telephone: "",
    email: "",
    ide: "",
    iban: "",
    tvaRate: "0",
    delaiPaiement: "30",
    piedDePage: "Merci de votre confiance.",
  },
  invoices: [],
  timer: null,
  users: [],
  sandboxes: {},
};

function emptySandbox() {
  return {
    entries: [],
    clients: [
      {
        id: "demo",
        code: "DEMO",
        nom: "Cliente de prueba",
        contact: "",
        adresse: "Rue de test 1",
        npaLocalite: "2800 Delémont",
        email: "",
        pays: "CH",
        taux: 150,
      },
    ],
    company: { ...DEFAULTS.company, nom: "A-Fid (prueba)" },
    invoices: [],
    timer: null,
  };
}

function read() {
  let data;
  try {
    data = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    data = { ...DEFAULTS };
  }
  return ensureUsers(data);
}

function write(data) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function ensureUsers(data) {
  if (!Array.isArray(data.users)) data.users = [];
  if (!data.sandboxes || typeof data.sandboxes !== "object") data.sandboxes = {};
  const adminPass = data.password || process.env.APP_PASSWORD || DEFAULTS.password;
  if (!data.users.some((u) => u.role === "admin")) {
    data.users.unshift({
      id: "admin",
      username: "admin",
      name: "Administrador",
      password: adminPass,
      role: "admin",
      sandbox: false,
    });
  }
  if (!data.users.some((u) => u.username === "prueba")) {
    data.users.push({
      id: "prueba",
      username: "prueba",
      name: "Usuario de prueba",
      password: "prueba2026",
      role: "user",
      sandbox: true,
    });
  }
  return data;
}

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    name: u.name || u.username,
    role: u.role,
    sandbox: Boolean(u.sandbox),
  };
}

function findUser(username, password) {
  const data = read();
  const name = String(username || "").trim().toLowerCase();
  let user = data.users.find((u) => u.username.toLowerCase() === name && u.password === password);
  if (!user && !name) {
    user = data.users.find((u) => u.role === "admin" && u.password === password);
  }
  return user ? publicUser(user) : null;
}

function userById(id) {
  const data = read();
  const user = data.users.find((u) => u.id === id);
  return user ? publicUser(user) : null;
}

function listUsers() {
  return read().users.map(publicUser);
}

function addUser({ username, name, password, sandbox }) {
  const data = read();
  const uname = String(username || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,24}$/.test(uname)) throw new Error("Usuario: 3 a 24 letras o números, sin espacios");
  if (data.users.some((u) => u.username.toLowerCase() === uname)) throw new Error("Ese usuario ya existe");
  const pass = String(password || "").trim();
  if (pass.length < 4) throw new Error("La contraseña necesita al menos 4 caracteres");
  const user = {
    id: crypto.randomBytes(8).toString("hex"),
    username: uname,
    name: String(name || uname).trim(),
    password: pass,
    role: "user",
    sandbox: Boolean(sandbox),
  };
  data.users.push(user);
  write(data);
  return publicUser(user);
}

function removeUser(id) {
  const data = read();
  const user = data.users.find((u) => u.id === id);
  if (!user) throw new Error("Usuario no encontrado");
  if (user.role === "admin") throw new Error("No se puede borrar el administrador");
  data.users = data.users.filter((u) => u.id !== id);
  if (data.sandboxes[id]) delete data.sandboxes[id];
  write(data);
}

function setUserPassword(id, password) {
  const data = read();
  const user = data.users.find((u) => u.id === id);
  if (!user) throw new Error("Usuario no encontrado");
  const pass = String(password || "").trim();
  if (pass.length < 4) throw new Error("Mínimo 4 caracteres");
  user.password = pass;
  if (user.role === "admin") data.password = pass;
  write(data);
}

function storeOf(data, user) {
  if (user && user.sandbox) {
    if (!data.sandboxes[user.id]) data.sandboxes[user.id] = emptySandbox();
    return data.sandboxes[user.id];
  }
  return data;
}

function getAll(user) {
  const data = read();
  if (user && user.sandbox && !data.sandboxes[user.id]) {
    data.sandboxes[user.id] = emptySandbox();
    write(data);
  }
  const current = storeOf(data, user);
  return {
    entries: current.entries || [],
    clients: current.clients || [],
    company: current.company || DEFAULTS.company,
    invoices: current.invoices || [],
    timer: current.timer || null,
  };
}

function setStore(key, value, user) {
  const data = read();
  const store = storeOf(data, user);
  store[key] = value;
  write(data);
}

function password() {
  const data = read();
  const admin = data.users.find((u) => u.role === "admin");
  return (admin && admin.password) || data.password || DEFAULTS.password;
}

function setSetting(key, value) {
  const data = read();
  data[key] = value;
  write(data);
}

function getSetting(key, fallback) {
  const data = read();
  return data[key] != null ? data[key] : fallback;
}

if (!fs.existsSync(file)) write(ensureUsers({ ...DEFAULTS }));
else write(ensureUsers(read()));

module.exports = {
  getAll,
  setStore,
  password,
  setSetting,
  getSetting,
  findUser,
  userById,
  listUsers,
  addUser,
  removeUser,
  setUserPassword,
  publicUser,
};
