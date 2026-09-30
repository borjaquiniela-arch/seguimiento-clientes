# Pasos para instalar Temps & facturation (A-Fid)

Misma app en Windows y Android. Los datos viven en un servidor de internet
(clientes, horas y facturas). Logo A-Fid y dirección Rue Es Crès 3, 2830 Courrendlin.

Contraseña inicial: **afid2026** (cámbiela en cuanto entre).

---

## 0. Qué necesita

- Un PC con [Node.js](https://nodejs.org) (versión 20 o superior)
- Cuenta gratuita en [Render](https://render.com) + [GitHub](https://github.com)
- Para el móvil: [Android Studio](https://developer.android.com/studio)

---

## 1. Descomprimir el proyecto

Descomprima `seguimiento-clientes-completo.tar.gz` en el PC:

```bash
tar -xzf seguimiento-clientes-completo.tar.gz
cd seguimiento-clientes
```

En Windows puede usar 7-Zip o «Extraer todo».

---

## 2. Probarlo en el PC (sin internet todavía)

```bash
npm install
npm start
```

O haga doble clic en **INICIAR-SERVIDOR.bat**.

Abra el navegador en http://localhost:8787  
Entre con la contraseña `afid2026`. Deje el campo «Servidor» vacío.

Ya puede crear clientes, registrar horas y generar facturas.

---

## 3. Publicar en internet (para usarlo fuera de casa)

1. Cree un repositorio en GitHub y suba la carpeta `seguimiento-clientes`.
2. En Render: **New → Web Service** y elija ese repositorio.
3. Configure:
   - **Build command:** `npm install && npm run build:web`
   - **Start command:** `node server/index.js`
   - Variable `APP_PASSWORD` = una contraseña fuerte
   - Variable `DATA_DIR` = `/opt/render/project/src/data`
   - Un **disco persistente** de 1 GB montado en esa misma ruta
     (si no, el plan gratis borra los datos al reiniciar).
4. Render le da una URL, por ejemplo:

   `https://seguimiento-clientes.onrender.com`

Esa URL es la que usará en el PC y en el teléfono, desde cualquier red.

En el plan gratuito el servicio se duerme a los 15 min sin uso:
la primera apertura del día puede tardar ~30 s.

### Alternativa sin Render

Si el PC permanece encendido:

```bash
npm start
cloudflared tunnel --url http://localhost:8787
```

Cloudflare imprime un `https://….trycloudflare.com`. Úselo igual que la URL de Render.

---

## 4. Windows en el día a día

- Más simple: abra la URL de Render en Chrome o Edge y fíjela en la barra de tareas.
- Ventana propia (Electron):

```bash
npm install --save-dev electron electron-builder
set PUBLIC_URL=https://su-app.onrender.com
npm run win
```

Instalador `.exe`: `npm run win:dist` (queda en `dist-win/`).

---

## 5. App Android

1. Abra Android Studio → **Open** → carpeta `android/` del proyecto.
2. Conecte el teléfono (depuración USB) o use un emulador.
3. Pulse **Run**.
4. La primera vez escriba la URL pública: `https://su-app.onrender.com`
5. Contraseña = la de `APP_PASSWORD`.

Para un APK instalable: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

PC y móvil no tienen que estar en la misma Wi‑Fi.

---

## 6. Copia de seguridad

Los datos están en `data/seguimiento.json` (o en el disco de Render).
Copie ese archivo de vez en cuando.

---

## Si algo falla

- «No se pudo conectar»: compruebe la URL (https, sin barra final) y que Render esté despierto.
- Contraseña incorrecta: use `APP_PASSWORD` o `afid2026` si no la cambió.
- Factura sin QR: complete IBAN, nombre, Rue Es Crès 3 y 2830 Courrendlin en **Mon entreprise**.
- En Android, active «tráfico HTTP» solo si usa un túnel http; con Render (https) no hace falta.
