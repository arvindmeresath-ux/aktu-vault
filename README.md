# 🚀 AKTU-VAULT (AKTU Study Portal)

[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-teal.svg)](https://tailwindcss.com/)
[![Cloudflare Pages](https://img.shields.io/badge/Hosting-Cloudflare%2520Pages-orange.svg)](https://pages.cloudflare.com/)

A lightning-fast, zero-bloat academic resource portal built for **Dr. A.P.J. Abdul Kalam Technical University (AKTU)** B.Tech engineering students to seamlessly browse syllabus notes, Quantums, and Previous Year Question Papers (PYQs).

---

## ✨ Key Features

*   **Multi-Theme UI Architecture**
    *   Seamlessly switch between high-contrast **Neo-Brutalism**, nostalgic **Windows 98**, **Modern Dark OLED**, **CRT Terminal Glow**, **Dark Academia**, and **Kawaii Bento** aesthetics without interrupting active audio or reading sessions.
*   **Custom PDF.js Canvas Viewer**
    *   Renders multi-page study documents directly onto protected HTML5 `<canvas>` elements.
    *   Includes zoom controls, light/dark/sepia reading modes, page rotation, white-margin auto-trimming, and a distraction-free **Complete Screen `[F]`** mode.
*   **Encrypted In-App Offline Vault (`IndexedDB`)**
    *   Save PDFs securely inside the browser `IndexedDB` using byte-level obfuscation with live streaming progress (`%`).
    *   Access notes instantly offline without internet dependencies or exposing raw `.pdf` files to the device file manager.
*   **Auto-Resume Reading & Pinned Toolbox**
    *   Automatically tracks the last read page per document in `localStorage` and surfaces a theme-aware **Continue Studying** quick-resume banner.
    *   Bookmark critical notes for quick access in your personal toolbox.
*   **Web Audio API Synthesizer & Study Ambience**
    *   Zero-dependency procedural UI sound effects (`soundEngine.js`) paired with background Brown/Pink/Tape focus noise generators and integrated Lofi radio streaming.
*   **Keyboard-First Power Navigation**
    *   Effortlessly navigate departments, years, subjects, and viewer modes using dedicated hotkeys (`1-6`, arrow keys, `/` for search, `F` for fullscreen, and `Esc`).

---

## 🛠️ Tech Stack

*   **Frontend:** React 19, Vite, Tailwind CSS
*   **Document Rendering:** Mozilla `pdf.js` (HTML5 Canvas API)
*   **Client Persistence:** `IndexedDB` (obfuscated binary blobs) + `localStorage`
*   **Audio Engine:** Native Web Audio API (`AudioContext` oscillators & noise buffers)
*   **Deployment & Routing:** Cloudflare Pages (`public/_redirects` SPA routing)

---

## ⌨️ Keyboard Shortcuts Reference

*   `1 – 6`: Quick branch/tab selection
*   `Arrow Keys`: Navigate through lists and menus
*   `/`: Focus quick-search bar
*   `F`: Toggle distraction-free Complete Screen mode in the PDF viewer
*   `Esc` / `Backspace`: Close modals or return to the previous directory level

---

## 🚀 Local Development & Setup

Follow these steps to set up and run the project locally on your machine[cite: 9]:

```bash
# Clone the repository
git clone [https://github.com/arvindmeresath-ux/aktu-vault.git](https://github.com/arvindmeresath-ux/aktu-vault.git)
cd aktu-vault

# Install dependencies
npm install

# Start the local Vite development server
npm run dev

# Build the production-ready bundle
npm run build