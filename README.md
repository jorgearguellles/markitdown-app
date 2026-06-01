# MarkItDown Web App

Convert **any file** to clean Markdown in your browser.  
Powered by [microsoft/markitdown](https://github.com/microsoft/markitdown).

## Supported formats

| Category | Formats |
|----------|---------|
| Documents | PDF, DOCX, DOC, PPTX, XLSX, XLS |
| Web | HTML, HTM, XML |
| Text | TXT, MD, CSV, JSON |
| Images | JPG, PNG, GIF, WEBP (OCR via markitdown) |
| Audio | MP3, WAV (transcription via markitdown) |
| Archives | ZIP, EPUB |

## Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: Python serverless function (`api/convert.py`) using `markitdown`
- **Deploy**: Vercel (free tier — frontend + Python serverless)

## Local development

### Prerequisites
- Node.js 18+
- Python 3.11+

### Install & run

```bash
cd markitdown-app

# Frontend
npm install

# Python (recommended: use a venv)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Full stack (Next.js + /api/convert) — recommended
npm i -g vercel
vercel dev
```

Open **http://localhost:3000**.

### `npm run dev` (recommended for local)

Works out of the box: Next.js serves `/api/convert` and calls Python (`markitdown`) via your `.venv`:

```bash
source .venv/bin/activate   # must have: pip install -r requirements.txt
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:3000).

## Deploy to Vercel

```bash
# One-time setup
npm i -g vercel
vercel login

# Deploy
vercel --prod
```

Vercel auto-detects:
- `package.json` → Next.js build
- `api/convert.py` → Python 3.12 serverless function
- `requirements.txt` → auto-installed in the function runtime

### Environment variables

None required for basic operation.

Optional (for markitdown AI features):
```
OPENAI_API_KEY=sk-...   # enables image description via GPT-4V
```

## Architecture

```
Browser
  ↓  FormData (file)
POST /api/convert        ← Vercel Python serverless (60s timeout, 1GB RAM)
  ↓  markitdown.convert(tmp_file)
  ↓  JSON { markdown, filename, char_count }
Browser download / copy
```

Files are **never stored** — processed in memory via temp files that are deleted immediately after conversion.

## Limits (Vercel free tier)

| Limit | Value |
|-------|-------|
| Max file size | 50MB (enforced client + server) |
| Function timeout | 60s |
| Function memory | 1024MB |
| Monthly invocations | 100k (Hobby plan) |

## Local API testing

```bash
curl -X POST http://localhost:3000/api/convert \
  -F "file=@/path/to/your/file.pdf" \
  | jq .
```
