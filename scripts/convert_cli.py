#!/usr/bin/env python3
"""CLI entrypoint for local dev (called from app/api/convert/route.ts)."""
import json
import os
import sys


def convert_file(file_path: str, original_filename: str) -> dict:
    from markitdown import MarkItDown

    md = MarkItDown()
    result = md.convert(file_path)
    markdown_text = result.text_content or ""
    return {
        "markdown": markdown_text,
        "filename": os.path.splitext(original_filename)[0] + ".md",
        "original_filename": original_filename,
        "char_count": len(markdown_text),
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: convert_cli.py <path> <original_filename>"}))
        sys.exit(1)
    try:
        print(json.dumps(convert_file(sys.argv[1], sys.argv[2])))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
