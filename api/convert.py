# api/convert.py
# Vercel Python serverless function
# Runtime: python3.12
import json
import os
import sys
import tempfile
import traceback
from http.server import BaseHTTPRequestHandler
import cgi

# markitdown is installed via requirements.txt
try:
    from markitdown import MarkItDown
except ImportError:
    MarkItDown = None


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        self._handle()

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _handle(self):
        if MarkItDown is None:
            self._error(500, "markitdown package not installed")
            return

        content_type = self.headers.get("Content-Type", "")
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            import io
            fs = cgi.FieldStorage(
                fp=io.BytesIO(body),
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": content_type,
                    "CONTENT_LENGTH": str(len(body)),
                },
                keep_blank_values=True,
            )

            if "file" not in fs:
                self._error(400, "Missing 'file' field in form data")
                return

            file_item = fs["file"]
            filename: str = file_item.filename or "upload.bin"
            file_bytes: bytes = file_item.file.read()

            if len(file_bytes) == 0:
                self._error(400, "Empty file received")
                return

            if len(file_bytes) > 50 * 1024 * 1024:
                self._error(413, "File too large. Max 50MB.")
                return

            _, ext = os.path.splitext(filename)
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name

            try:
                md = MarkItDown()
                result = md.convert(tmp_path)
                markdown_text = result.text_content
            finally:
                os.unlink(tmp_path)

            payload = json.dumps({
                "markdown": markdown_text,
                "filename": os.path.splitext(filename)[0] + ".md",
                "original_filename": filename,
                "char_count": len(markdown_text),
            })

            self.send_response(200)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload.encode())))
            self.end_headers()
            self.wfile.write(payload.encode())

        except Exception as e:
            tb = traceback.format_exc()
            print(f"[convert] error: {tb}", file=sys.stderr)
            self._error(500, f"Conversion failed: {str(e)}")

    def _error(self, code: int, message: str):
        payload = json.dumps({"error": message})
        self.send_response(code)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload.encode())))
        self.end_headers()
        self.wfile.write(payload.encode())
