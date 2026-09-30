const path = require("path");
const fs = require("fs");

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
};

function read() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(data) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function getStore(key) {
  const data = read();
  return data[key] !== undefined ? data[key] : DEFAULTS[key];
}

function setStore(key, value) {
  const data = read();
  data[key] = value;
  write(data);
}

function getAll() {
  const data = read();
  return {
    entries: data.entries,
    clients: data.clients,
    company: data.company,
    invoices: data.invoices,
    timer: data.timer,
  };
}

function password() {
  return read().password || DEFAULTS.password;
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

if (!fs.existsSync(file)) write({ ...DEFAULTS });

module.exports = { getStore, setStore, getAll, password, setSetting, getSetting };
