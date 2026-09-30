import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

const KEY_MAP = {
  "time-entries-v1": "entries",
  "clients-v1": "clients",
  "company-v1": "company",
  "invoices-v1": "invoices",
  "timer-v1": "timer",
};

function apiBase() {
  const saved = localStorage.getItem("sc-server") || "";
  return saved.replace(/\/$/, "");
}

async function api(path, opts = {}) {
  const token = localStorage.getItem("sc-token") || "";
  const res = await fetch(`${apiBase()}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) throw new Error("auth");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Error de red");
  }
  return res.json();
}

function installStorage() {
  const cache = {};
  let boot = null;
  const ensure = async () => {
    if (boot) return boot;
    boot = api("/api/data").then((all) => {
      Object.entries(KEY_MAP).forEach(([local, remote]) => {
        cache[local] = JSON.stringify(all[remote] ?? null);
      });
    });
    return boot;
  };
  window.storage = {
    async get(key) {
      await ensure();
      return { value: cache[key] };
    },
    async set(key, value) {
      cache[key] = value;
      const remote = KEY_MAP[key];
      if (!remote) return;
      await api(`/api/data/${remote}`, { method: "PUT", body: value });
    },
  };
}

function Login({ onReady }) {
  const [server, setServer] = useState(localStorage.getItem("sc-server") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      localStorage.setItem("sc-server", server.trim());
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      localStorage.setItem("sc-token", data.token);
      installStorage();
      onReady();
    } catch (err) {
      setError(
        err.message === "auth"
          ? "Contraseña incorrecta"
          : "No se pudo conectar. En el móvil use http://IP-DEL-PC:8787"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F4EF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 420, background: "#fff", border: "1px solid #DCD9CF", padding: 28 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 28, color: "#16325C", marginBottom: 6 }}>Seguimiento</div>
        <p style={{ color: "#6B6B62", fontSize: 14, marginBottom: 20 }}>
          Misma cuenta en el PC y el móvil, desde cualquier red. Si abre la app ya alojada en internet, deje el servidor vacío.
        </p>
        <label style={{ fontSize: 12, color: "#6B6B62", display: "block", marginBottom: 6 }}>Servidor (URL pública)</label>
        <input
          value={server}
          onChange={(e) => setServer(e.target.value)}
          placeholder="https://su-app.onrender.com"
          style={{ width: "100%", border: "1px solid #DCD9CF", padding: "10px 12px", marginBottom: 14, fontFamily: "monospace" }}
        />
        <label style={{ fontSize: 12, color: "#6B6B62", display: "block", marginBottom: 6 }}>Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="afid2026"
          autoFocus
          style={{ width: "100%", border: "1px solid #DCD9CF", padding: "10px 12px", marginBottom: 16 }}
        />
        {error && <div style={{ color: "#B85C4A", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button
          disabled={busy || !password}
          style={{ width: "100%", background: "#16325C", color: "#fff", padding: "10px 12px", border: 0, fontWeight: 600 }}
        >
          {busy ? "Conectando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function Root() {
  const [ready, setReady] = useState(false);
  if (!ready) return <Login onReady={() => setReady(true)} />;
  return <App />;
}

createRoot(document.getElementById("root")).render(<Root />);
