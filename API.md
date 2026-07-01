# PDF Pilot — API Reference

Backend REST API for the PDF Pilot app. This document lists every endpoint the
frontend can call: method, path, auth, request body/fields, and example response.

## Base URL

```
http://localhost:5000
```

Set this per environment (dev / staging / prod). All paths below are relative to it.

## Authentication

Auth uses a **JWT bearer token**. Get one from `POST /api/auth/login`, then send it
on protected endpoints:

```
Authorization: Bearer <token>
```

Endpoints that require the token are marked **🔒 Auth required** below. All others are public.

## Conventions

- **File uploads** use `multipart/form-data`. The **field name matters** — it is
  given in each endpoint (e.g. `pdf`, `file`, `document`, `images`, `docx`, `excel`).
- **JSON bodies** use `Content-Type: application/json`.
- Array params sent over `multipart/form-data` (e.g. `pages`, `order`) must be a
  **JSON string**, e.g. `pages=[1,2]`.
- Most tools respond with a **job** object:
  ```json
  { "jobId": "6a45...", "status": "done", "downloadUrl": "/uploads/output/xxxx.pdf" }
  ```
  A `downloadUrl` starting with `/uploads/...` is **relative to the Base URL** —
  prepend the Base URL to download (files are served statically from `/uploads`).
- `compress` and `repair` stream the resulting PDF back directly
  (`Content-Type: application/pdf`) instead of a JSON job.
- Errors return a JSON object with `error` or `message` and an appropriate HTTP status
  (`400` validation, `401` unauthorized, `404` not found, `422`/`500` processing error).

---

## Health

### `GET /`
Health check.
```json
{ "success": true, "message": "PDF Pilot Backend Running" }
```

---

## Auth — `/api/auth`

### `POST /api/auth/signup`
JSON body:
| Field | Type | Required |
|---|---|---|
| `name` | string | yes |
| `email` | string | yes |
| `password` | string | yes |

`201` → `{ "success": true, "user": { "_id", "name", "email", "plan" } }`

### `POST /api/auth/login`
JSON body: `email`, `password`.
`200` → `{ "success": true, "token": "<JWT>", "user": { ... } }`

### `GET /api/auth/me` 🔒 Auth required
`200` → `{ "success": true, "user": { ... } }`

### `POST /api/auth/logout`
`200` → `{ "success": true, "message": "Logged out successfully" }`

---

## PDF tools — `/api/pdf`  (all `multipart/form-data`)

### `POST /api/pdf/split`
| Field | Type | Notes |
|---|---|---|
| `pdf` | file | required |
| `mode` | string | `"range"` or `"nPages"` |
| `range` | string | required if `mode=range`, e.g. `"1-3,5"` |
| `n` | int | required if `mode=nPages` (pages per chunk) |

`200` → `{ "jobId", "status", "files": [ { "filename", "downloadUrl" } ] }`

### `POST /api/pdf/extract-pages`
`pdf` (file), `pages` (JSON array, e.g. `[1,3]`). → `{ jobId, status, downloadUrl }`

### `POST /api/pdf/rotate`
`pdf` (file), `pages` (JSON array), `angle` (`90` | `180` | `270`). → job

### `POST /api/pdf/organize`
`pdf` (file), `order` (JSON array of 1-based page order, e.g. `[2,1,3]`). → job

### `POST /api/pdf/remove-pages`
`pdf` (file), `pages` (JSON array to remove). → job

### `POST /api/pdf/ocr`
`pdf` (file). Runs OCR and returns a searchable PDF. → job

### `POST /api/pdf/protect`
`pdf` (file), `password` (string). Password-protects the PDF. → job

### `POST /api/pdf/unlock`
`pdf` (file), `password` (string). Removes the password. → job

### `POST /api/pdf/watermark`
| Field | Type | Default |
|---|---|---|
| `pdf` | file | required |
| `watermarkText` | string | `"CONFIDENTIAL"` |
| `position` | string | `"center"` |
| `opacity` | number | `0.3` |
| `fontSize` | number | `40` |
| `fontColor` | string (hex) | `"#808080"` |
| `rotation` | number | `45` |
| `scale` | number | `0.5` |
| `pages` | string | `"all"` |

→ job

### `POST /api/pdf/crop`
| Field | Type | Default |
|---|---|---|
| `pdf` | file | required |
| `top` / `bottom` / `left` / `right` | number | `0` |
| `unit` | string | `"points"` |
| `pages` | string | `"all"` |

→ job

### `POST /api/pdf/edit`
`pdf` (file). Optional `image` (file). Text overlay fields (defaults shown):
`text=""`, `x=100`, `y=500`, `fontSize=20`, `fontColor="#000000"`, `width=150`,
`height=150`, `pages="1"`. → job

### `POST /api/pdf/redact`
`pdf` (file). → job

### `POST /api/pdf/page-numbers`
| Field | Type | Default |
|---|---|---|
| `pdf` | file | required |
| `position` | string | `"bottom right"` |
| `startNumber` | number | `1` |
| `fontSize` | number | `12` |
| `fontColor` | string (hex) | `"#000000"` |
| `margin` | number | `20` |
| `pages` | string | `"all"` |

→ job

### `POST /api/pdf/compare`
`pdf1` (file), `pdf2` (file).
`200` → `{ "jobId", "status", "comparison": { "pageCount1", "pageCount2", "differences", "pages": [...] } }`

### `POST /api/pdf/sign`
| Field | Type | Notes |
|---|---|---|
| `pdf` | file | required |
| `type` | string | `"drawn"` \| `"typed"` \| `"image"` |
| `text` | string | required when `type=typed` |
| `signatureImage` | file | required when `type=image` |
| `signatureData` | string | signature payload |
| `page`, `x`, `y`, `width`, `height` | number | placement |

→ job

### `POST /api/pdf/compress`
`file` (pdf). **Returns the compressed PDF directly** (`application/pdf`).

### `POST /api/pdf/repair`
`file` (pdf). **Returns the repaired PDF directly** (`application/pdf`).

---

## Conversions — `/api/convert` (and `/api`)  (`multipart/form-data` unless noted)

| Endpoint | Field | Notes |
|---|---|---|
| `POST /api/convert/pdf-to-word` | `pdf` (file) | → `{ jobId, downloadUrl }` |
| `POST /api/convert/pdf-to-excel` | `pdf` (file) | → job |
| `POST /api/convert/pdf-to-ppt` | `pdf` (file) | → job |
| `POST /api/convert/pdf-to-png` | `file` (pdf) | → `{ jobId, images: [url, ...] }` (full URLs) |
| `POST /api/convert/pdf-to-jpg` | `file` (pdf) | → `{ jobId, downloadUrls: [url, ...] }` (full URLs) |
| `POST /api/convert/jpg-to-pdf` | `images` (file[]) | up to 20 `.jpg`/`.jpeg` |
| `POST /api/convert/png-to-pdf` | `images` (file[]) | up to 20 `.png` |
| `POST /api/convert/ppt-to-pdf` | `ppt` (file) | `.pptx` only |
| `POST /api/convert/word-to-pdf` | `docx` (file) | `.docx` |
| `POST /api/convert/excel-to-pdf` | `excel` (file) | `.xlsx` |

### `POST /api/convert/html-to-pdf`  (JSON)
Body: **either** `{ "html": "<h1>..</h1>" }` **or** `{ "url": "https://..." }` (not both).
→ `{ jobId, status, downloadUrl }`

---

## AI tools — `/api/ai`

### `POST /api/ai/chat` 🔒 Auth required  (`multipart/form-data`)
`document` (file), `question` (string).
`200` → `{ "jobId", "status", "question", "answer" }`

### `POST /api/ai/extract` 🔒 Auth required  (`multipart/form-data`)
`document` (file). Extracts structured data (invoice/receipt/table) as JSON.
`200` → `{ "jobId", "status", "extractedData": { ... } }`

### `POST /api/ai/generate` 🔒 Auth required  (JSON)
Body: `prompt` (string, required), `documentType` (string, default `"Document"`).
`200` → `{ "jobId", "status", "documentType", "content" }`

### `POST /api/ai/summarize`  (`multipart/form-data`)
`document` (file). → `{ "jobId", "status", "summary" }`

### `POST /api/ai/explain`  (`multipart/form-data`)
`document` (file). → `{ "jobId", "status", "explanation" }`

### `POST /api/ai/translate`  (`multipart/form-data`)
`document` (file), `targetLanguage` (string, e.g. `"Spanish"`).
→ `{ "jobId", "status", "targetLanguage", "translatedContent" }`

---

## Files — `/api/files`

### `POST /api/files/upload`  (`multipart/form-data`)
`file` (any). Stores the file and records metadata.
`200` → `{ "fileId", "status", "file": { "originalName", "mimeType", "size", ... } }`

### `GET /api/files/:id/download`
Downloads a previously uploaded file by its `fileId`.
`200` → file stream · `404` → `{ "error": "File record not found in database" }`

---

## Jobs — `/api`

### `GET /api/jobs/:id`
Job status by id.
`200` → job object · `404` → `{ "message": "Job not found" }`

### `GET /api/jobs` 🔒 Auth required
Returns the authenticated user's job history.

---

## Plans — `/api/plans`

### `GET /api/plans`
Returns the available subscription plans, sorted by price (ascending). Public.
`200` →
```json
{
  "status": "success",
  "count": 3,
  "plans": [
    {
      "_id": "…",
      "name": "Free",                       // "Free" | "Pro" | "Team"
      "price": 0,
      "dailyLimit": 10,
      "monthlyLimit": 100,
      "supportedFeatures": ["split", "merge", "..."],
      "maxUploadSize": "10MB",
      "createdAt": "…",
      "updatedAt": "…"
    }
  ]
}
```
> Note: the `plans` array is populated from the `Plan` collection in MongoDB, so
> it is only non-empty once plan documents have been seeded into the database.
> Each user also has a `plan` field (default `"free"`) returned by the auth endpoints.

---

## Quick examples

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'

# Split a PDF (pages 1-3)
curl -X POST http://localhost:5000/api/pdf/split \
  -F pdf=@document.pdf -F mode=range -F range=1-3

# Rotate pages 1 and 2 by 90°
curl -X POST http://localhost:5000/api/pdf/rotate \
  -F pdf=@document.pdf -F 'pages=[1,2]' -F angle=90

# AI summarize (no auth)
curl -X POST http://localhost:5000/api/ai/summarize -F document=@document.pdf

# AI chat (auth required)
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Authorization: Bearer <token>" \
  -F document=@document.pdf -F "question=What is this about?"

# Download a job result (relative downloadUrl -> prepend base URL)
curl -O http://localhost:5000/uploads/output/conv-123.pdf
```
