# api/convert.py
import json
import os
import sys
import tempfile
import traceback
from http.server import BaseHTTPRequestHandler

try:
    from markitdown import MarkItDown
    MARKITDOWN_AVAILABLE = True
except ImportError:
    MARKITDOWN_AVAILABLE = False


class handler(BaseHTTPRequestHandler):
    """
    Vercel Python Runtime expects a class named `handler`
    that extends BaseHTTPRequestHandler.
    """

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if not MARKITDOWN_AVAILABLE:
            self._json_error(500, "markitdown not installed in this runtime")
            return

        try:
            content_type = self.headers.get("Content-Type", "")
            content_length = int(self.headers.get("Content-Length", 0) or 0)

            if content_length == 0:
                self._json_error(400, "Empty request body")
                return

            if content_length > 52_428_800:  # 50MB
                self._json_error(413, "File too large. Max 50MB.")
                return

            raw_body = self.rfile.read(content_length)

            import io
            import cgi

            fs = cgi.FieldStorage(
                fp=io.BytesIO(raw_body),
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": content_type,
                    "CONTENT_LENGTH": str(len(raw_body)),
                },
                keep_blank_values=True,
            )

            if "file" not in fs:
                self._json_error(400, "Missing 'file' field")
                return

            item = fs["file"]
            filename: str = item.filename or "upload.bin"
            file_bytes: bytes = item.file.read()

            if len(file_bytes) == 0:
                self._json_error(400, "Empty file")
                return

            _, ext = os.path.splitext(filename)
            with tempfile.NamedTemporaryFile(suffix=ext or ".bin", delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name

            try:
                md = MarkItDown()
                result = md.convert(tmp_path)
                markdown_text: str = result.text_content or ""
            finally:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

            self._json_ok({
                "markdown": markdown_text,
                "filename": os.path.splitext(filename)[0] + ".md",
                "original_filename": filename,
                "char_count": len(markdown_text),
            })

        except Exception:
            tb = traceback.format_exc()
            print(f"[convert] unhandled error:\n{tb}", file=sys.stderr)
            self._json_error(500, "Conversion failed. Check server logs.")

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json_ok(self, data: dict):
        body = json.dumps(data).encode()
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json_error(self, code: int, message: str):
        body = json.dumps({"error": message}).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)# api/convert.py
import json
import os
import sys
import tempfile
import traceback
from http.server import BaseHTTPRequestHandler

try:
    from markitdown import MarkItDown
    MARKITDOWN_AVAILABLE = True
except ImportError:
    MARKITDOWN_AVAILABLE = False


class handler(BaseHTTPRequestHandler):
    """
    Vercel Python Runtime expects a class named `handler`
    that extends BaseHTTPRequestHandler.
    """

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if not MARKITDOWN_AVAILABLE:
            self._json_error(500, "markitdown not installed in this runtime")
            return

        try:
            content_type = self.headers.get("Content-Type", "")
            content_length = int(self.headers.get("Content-Length", 0) or 0)

            if content_length == 0:
                self._json_error(400, "Empty request body")
                return

            if content_length > 52_428_800:  # 50MB
                self._json_error(413, "File too large. Max 50MB.")
                return

            raw_body = self.rfile.read(content_length)

            import io
            import cgi

            fs = cgi.FieldStorage(
                fp=io.BytesIO(raw_body),
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": content_type,
                    "CONTENT_LENGTH": str(len(raw_body)),
                },
                keep_blank_values=True,
            )

            if "file" not in fs:
                self._json_error(400, "Missing 'file' field")
                return

            item = fs["file"]
            filename: str = item.filename or "upload.bin"
            file_bytes: bytes = item.file.read()

            if len(file_bytes) == 0:
                self._json_error(400, "Empty file")
                return

            _, ext = os.path.splitext(filename)
            with tempfile.NamedTemporaryFile(suffix=ext or ".bin", delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name

            try:
                md = MarkItDown()
                result = md.convert(tmp_path)
                markdown_text: str = result.text_content or ""
            finally:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

            self._json_ok({
                "markdown": markdown_text,
                "filename": os.path.splitext(filename)[0] + ".md",
                "original_filename": filename,
                "char_count": len(markdown_text),
            })

        except Exception:
            tb = traceback.format_exc()
            print(f"[convert] unhandled error:\n{tb}", file=sys.stderr)
            self._json_error(500, "Conversion failed. Check server logs.")

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json_ok(self, data: dict):
        body = json.dumps(data).encode()
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json_error(self, code: int, message: str):
        body = json.dumps({"error": message}).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)