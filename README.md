# AKTU-VAULT

A fast, zero-bloat academic resource portal built for **Dr. A.P.J. Abdul Kalam Technical University (AKTU)** B.Tech engineering students to browse syllabus notes, Quantums, and Previous Year Question Papers (PYQs).

## Key Features

- **Multi-Theme UI Architecture:** Seamlessly switch between a high-contrast **Neo-Brutalism** bento interface and a nostalgic **Windows 98** desktop experience without interrupting active audio or reading sessions.
- **Custom PDF.js Canvas Viewer:** Renders multi-page study documents directly onto protected HTML5 `<canvas>` elements with zoom controls, light/dark reading modes, and a distraction-free **Complete Screen `[F]`** mode.
- **Encrypted In-App Offline Vault (`IndexedDB`):** Save PDFs inside the browser `IndexedDB` using byte-level XOR obfuscation with live streaming progress (`%`) so notes open instantly without internet—without exposing raw `.pdf` files to the device file manager.
- **Auto-Resume Reading:** Automatically tracks the last read page per document in `localStorage` and surfaces a theme-aware **Continue Studying** quick-resume banner.
- **Web Audio API Synthesizer & Study Ambience:** Zero-dependency procedural UI sound effects (`soundEngine.js`) paired with background Brown/Pink/Tape focus noise generators.
- **Keyboard-First Navigation:** Navigate departments, years, subjects, and viewer modes using number keys (`1-6`), arrow keys, `/`, `F`, and `Esc`.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS
- **Document Rendering:** Mozilla `pdf.js` (Canvas API)
- **Client Persistence:** `IndexedDB` (obfuscated binary blobs) + `localStorage`
- **Audio Engine:** Native Web Audio API (`AudioContext` oscillators & noise buffers)
- **Deployment:** Cloudflare Pages (`public/_redirects` SPA routing)

## Local Development

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Build production bundle
npm run build
```

## Cloudflare Pages Deployment

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **SPA Routing:** Handled automatically via `public/_redirects` (`/* /index.html 200`).
