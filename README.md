




folder structure information

config/
└── Database connection & environment configuration

models/
└── MongoDB schemas (User, File, Job)

routes/
└── API endpoints (/auth, /pdf, /ai)

controllers/
└── Business logic for each route

middleware/
└── JWT auth, upload handling, validation

uploads/
└── Uploaded PDFs and generated files

app.js
└── Main Express application entry point

.env
└── Secrets, Mongo URI, API keys

README.md
└── Project documentation


## System prerequisites (production)

All endpoints run on the bundled Node dependencies — **no external system
packages are required**. Notes:

- **word-to-pdf / excel-to-pdf** convert with `mammoth` / `exceljs` and render
  to PDF with headless Chromium (Puppeteer). Puppeteer downloads its own
  Chromium; on Windows the app will also use an installed Chrome/Edge if found.
  This is cross-platform and safe for unattended/server use (no Microsoft
  Office required).
- **compress** (`POST /api/pdf/compress`) uses **Ghostscript when it is
  installed** (best compression — it downsamples images) and automatically
  **falls back to a pure-Node pdf-lib re-save** when Ghostscript is absent, so
  the endpoint always works. To enable the higher-quality path, install
  Ghostscript and make sure `gs` (Linux/macOS) or `gswin64c` (Windows) is on
  the PATH:

  ```bash
  sudo apt install -y ghostscript      # Ubuntu / Debian
  brew install ghostscript             # macOS
  # Windows: https://ghostscript.com/releases/gsdnld.html
  ```

- **repair** (`POST /api/pdf/repair`) is pure Node (pdf-lib) — no dependency.

On Linux/containers, Puppeteer's Chromium needs a few shared libraries; the
standard set is installed automatically by most Node/Puppeteer base images
(e.g. `ghcr.io/puppeteer/puppeteer`).