import { existsSync } from "fs";
import { unlink, writeFile } from "fs/promises";
import { spawn } from "child_process";
import { tmpdir } from "os";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024;

function resolvePython(): string {
  const root = process.cwd();
  const candidates = [
    join(root, ".venv", "bin", "python3"),
    join(root, ".venv", "bin", "python"),
    "python3",
    "python",
  ];
  for (const bin of candidates) {
    if (bin.includes("/") && existsSync(bin)) return bin;
    if (!bin.includes("/")) return bin;
  }
  return "python3";
}

function runPythonConvert(
  filePath: string,
  originalFilename: string
): Promise<Record<string, unknown>> {
  const python = resolvePython();
  const script = join(process.cwd(), "scripts", "convert_cli.py");

  return new Promise((resolve, reject) => {
    const proc = spawn(python, [script, filePath, originalFilename], {
      cwd: process.cwd(),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Python exited with code ${code}`));
        return;
      }
      try {
        const data = JSON.parse(stdout) as Record<string, unknown>;
        if (data.error) {
          reject(new Error(String(data.error)));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error(stderr.trim() || "Invalid JSON from converter"));
      }
    });
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Missing 'file' field in form data" }, { status: 400 });
  }

  if (file.size === 0) {
    return Response.json({ error: "Empty file received" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File too large. Max 50MB." }, { status: 413 });
  }

  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : "";
  const tmpPath = join(tmpdir(), `markitdown-${Date.now()}${ext}`);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tmpPath, buffer);
    const data = await runPythonConvert(tmpPath, file.name);
    return Response.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Conversion failed";
    const hint =
      message.includes("No module named") || message.includes("markitdown")
        ? `${message} — run: pip install -r requirements.txt (or activate .venv)`
        : message;
    console.error("[api/convert]", err);
    return Response.json({ error: hint }, { status: 500 });
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
