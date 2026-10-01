const { google } = require("googleapis");

function config() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  const folderId = (process.env.DRIVE_FOLDER_ID || "").trim();
  if (!raw || !folderId) return null;
  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido");
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return {
    folderId,
    email: credentials.client_email || "",
    drive: google.drive({ version: "v3", auth }),
  };
}

function status() {
  try {
    const c = config();
    if (!c) return { connected: false, email: "", folderId: "" };
    return { connected: true, email: c.email, folderId: c.folderId };
  } catch (err) {
    return { connected: false, email: "", folderId: "", error: err.message };
  }
}

async function list(parentId) {
  const c = config();
  if (!c) throw new Error("Google Drive no está configurado");
  const parent = parentId || c.folderId;
  const q = `'${parent.replace(/'/g, "")}' in parents and trashed = false`;
  const res = await c.drive.files.list({
    q,
    pageSize: 100,
    fields: "files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)",
    orderBy: "folder,name",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return { parentId: parent, rootId: c.folderId, files: res.data.files || [] };
}

async function createFolder(name, parentId) {
  const c = config();
  if (!c) throw new Error("Google Drive no está configurado");
  const res = await c.drive.files.create({
    requestBody: {
      name: String(name || "Dossier").slice(0, 120),
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId || c.folderId],
    },
    fields: "id,name,mimeType,webViewLink",
    supportsAllDrives: true,
  });
  return res.data;
}

async function upload(file, parentId) {
  const c = config();
  if (!c) throw new Error("Google Drive no está configurado");
  const res = await c.drive.files.create({
    requestBody: {
      name: file.originalname,
      parents: [parentId || c.folderId],
    },
    media: {
      mimeType: file.mimetype || "application/octet-stream",
      body: require("stream").Readable.from(file.buffer),
    },
    fields: "id,name,mimeType,webViewLink,size",
    supportsAllDrives: true,
  });
  return res.data;
}

async function download(id) {
  const c = config();
  if (!c) throw new Error("Google Drive no está configurado");
  const meta = await c.drive.files.get({
    fileId: id,
    fields: "id,name,mimeType",
    supportsAllDrives: true,
  });
  const media = await c.drive.files.get(
    { fileId: id, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );
  return { meta: meta.data, stream: media.data };
}

module.exports = { status, list, createFolder, upload, download };
