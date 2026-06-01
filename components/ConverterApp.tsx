"use client";
// components/ConverterApp.tsx

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  RefreshCw,
  Copy,
  CheckCheck,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { FileIcon } from "./FileIcon";
import { MarkdownPreview } from "./MarkdownPreview";
import { StatsBar } from "./StatsBar";

// ─── Types ───────────────────────────────────────────────────────────────────

type ConversionState =
  | { status: "idle" }
  | { status: "converting"; filename: string; progress: number }
  | {
      status: "done";
      markdown: string;
      filename: string;
      originalFilename: string;
      charCount: number;
      elapsed: number;
    }
  | { status: "error"; message: string };

const ACCEPTED_FORMATS: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "text/plain": [".txt", ".md"],
  "text/html": [".html", ".htm"],
  "text/csv": [".csv"],
  "application/json": [".json"],
  "application/xml": [".xml"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "application/zip": [".zip"],
  "application/epub+zip": [".epub"],
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ConverterApp() {
  const [state, setState] = useState<ConversionState>({ status: "idle" });
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"raw" | "preview">("raw");
  const startTimeRef = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const simulateProgress = useCallback((filename: string) => {
    let progress = 0;
    startTimeRef.current = Date.now();

    setState({ status: "converting", filename, progress: 0 });

    // Simulate progress — jumps fast then slows near 90% waiting for real response
    progressIntervalRef.current = setInterval(() => {
      progress += progress < 60 ? Math.random() * 12 : Math.random() * 3;
      if (progress >= 90) {
        clearInterval(progressIntervalRef.current!);
        progress = 90;
      }
      setState((prev) =>
        prev.status === "converting"
          ? { ...prev, progress: Math.min(progress, 90) }
          : prev
      );
    }, 200);
  }, []);

  const stopProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  }, []);

  const convertFile = useCallback(
    async (file: File) => {
      simulateProgress(file.name);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/convert", {
          method: "POST",
          body: formData,
        });

        stopProgress();

        const data = await res.json();

        if (!res.ok) {
          setState({ status: "error", message: data.error || "Conversion failed" });
          return;
        }

        const elapsed = (Date.now() - startTimeRef.current) / 1000;

        setState({
          status: "done",
          markdown: data.markdown,
          filename: data.filename,
          originalFilename: data.original_filename,
          charCount: data.char_count,
          elapsed,
        });
      } catch (err) {
        stopProgress();
        setState({
          status: "error",
          message: "Network error — make sure the API is running.",
        });
      }
    },
    [simulateProgress, stopProgress]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      convertFile(acceptedFiles[0]);
    },
    [convertFile]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    disabled: state.status === "converting",
  });

  const handleDownload = useCallback(() => {
    if (state.status !== "done") return;
    const blob = new Blob([state.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = state.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const handleCopy = useCallback(async () => {
    if (state.status !== "done") return;
    await navigator.clipboard.writeText(state.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [state]);

  const handleReset = useCallback(() => {
    setState({ status: "idle" });
    setActiveTab("raw");
    setCopied(false);
  }, []);

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-acid flex items-center justify-center">
            <Zap size={14} className="text-ink" strokeWidth={2.5} />
          </div>
          <span className="font-mono text-sm font-medium tracking-widest uppercase text-paper">
            MarkItDown
          </span>
        </div>
        <span className="font-mono text-xs text-[#444] tracking-wider">
          powered by microsoft/markitdown
        </span>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8 max-w-5xl mx-auto w-full">
        {/* Hero text — only when idle */}
        <AnimatePresence>
          {state.status === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center"
            >
              <h1 className="font-mono text-4xl md:text-6xl font-medium text-paper tracking-tight mb-3">
                ANY FILE →{" "}
                <span className="text-acid">.MD</span>
              </h1>
              <p className="text-[#666] text-sm font-mono">
                PDF · DOCX · XLSX · PPTX · Images · Audio · HTML · CSV · EPUB
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop zone */}
        <AnimatePresence mode="wait">
          {state.status === "idle" && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="w-full max-w-2xl"
            >
              <div
                {...getRootProps()}
                className={`
                  relative border-2 border-dashed rounded-sm
                  transition-all duration-200 cursor-crosshair
                  min-h-[280px] flex flex-col items-center justify-center gap-5 p-10
                  ${isDragActive && !isDragReject
                    ? "border-acid bg-[#c8f13508] drop-active"
                    : isDragReject
                    ? "border-rust bg-[#d4420a08]"
                    : "border-[#2a2a2a] hover:border-[#444] bg-[#0d0d0d]"
                  }
                `}
              >
                <input {...getInputProps()} />

                {/* Corner decorations */}
                <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[#444]" />
                <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#444]" />
                <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[#444]" />
                <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[#444]" />

                <div
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${isDragActive && !isDragReject
                      ? "bg-acid"
                      : isDragReject
                      ? "bg-rust"
                      : "bg-[#1a1a1a]"
                    }
                  `}
                >
                  <FileText
                    size={24}
                    className={
                      isDragActive && !isDragReject
                        ? "text-ink"
                        : isDragReject
                        ? "text-paper"
                        : "text-[#555]"
                    }
                  />
                </div>

                <div className="text-center">
                  {isDragReject ? (
                    <p className="font-mono text-rust text-sm">
                      Unsupported format or file too large (max 50MB)
                    </p>
                  ) : isDragActive ? (
                    <p className="font-mono text-acid text-sm tracking-wider animate-pulse">
                      RELEASE TO CONVERT
                    </p>
                  ) : (
                    <>
                      <p className="font-mono text-paper text-sm mb-1">
                        Drop your file here
                      </p>
                      <p className="font-mono text-[#555] text-xs">
                        or{" "}
                        <span className="text-acid underline underline-offset-2 cursor-pointer">
                          browse
                        </span>{" "}
                        — max 50MB
                      </p>
                    </>
                  )}
                </div>

                {/* Format grid */}
                <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                  {["PDF", "DOCX", "XLSX", "PPTX", "HTML", "CSV", "IMG", "MP3", "EPUB"].map(
                    (fmt) => (
                      <span
                        key={fmt}
                        className="font-mono text-[10px] px-2 py-0.5 border border-[#2a2a2a] text-[#555] tracking-wider"
                      >
                        {fmt}
                      </span>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Converting state */}
          {state.status === "converting" && (
            <motion.div
              key="converting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-2xl flex flex-col items-center gap-6"
            >
              <div className="flex items-center gap-3">
                <FileIcon filename={state.filename} size={32} />
                <div>
                  <p className="font-mono text-paper text-sm">{state.filename}</p>
                  <p className="font-mono text-[#555] text-xs">Converting...</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#111] h-px relative overflow-hidden">
                <motion.div
                  className="h-full bg-acid absolute left-0 top-0"
                  animate={{ width: `${state.progress}%` }}
                  transition={{ duration: 0.2 }}
                />
                {/* Glow effect */}
                <motion.div
                  className="absolute top-[-2px] h-[5px] w-8 bg-acid/60 blur-sm"
                  animate={{ left: `${Math.max(0, state.progress - 4)}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              <p className="font-mono text-[#444] text-xs">
                {Math.round(state.progress)}% — analyzing structure
              </p>
            </motion.div>
          )}

          {/* Error state */}
          {state.status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-2xl flex flex-col items-center gap-4"
            >
              <div className="flex items-center gap-2 text-rust">
                <AlertTriangle size={18} />
                <span className="font-mono text-sm">Conversion failed</span>
              </div>
              <p className="font-mono text-xs text-[#666] max-w-sm text-center">
                {state.message}
              </p>
              <button
                onClick={handleReset}
                className="font-mono text-xs text-acid border border-acid/30 px-4 py-2 hover:bg-acid hover:text-ink transition-colors"
              >
                TRY AGAIN
              </button>
            </motion.div>
          )}

          {/* Done state */}
          {state.status === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex flex-col gap-4"
            >
              {/* Top bar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-acid rounded-full" />
                  <span className="font-mono text-xs text-[#666]">
                    {state.originalFilename}
                  </span>
                  <span className="font-mono text-xs text-[#444]">→</span>
                  <span className="font-mono text-xs text-acid">{state.filename}</span>
                </div>

                <StatsBar
                  charCount={state.charCount}
                  elapsed={state.elapsed}
                />
              </div>

              {/* Tab switcher */}
              <div className="flex gap-0 border-b border-[#1a1a1a]">
                {(["raw", "preview"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      font-mono text-xs px-4 py-2 uppercase tracking-wider transition-colors
                      ${activeTab === tab
                        ? "text-acid border-b-2 border-acid -mb-px"
                        : "text-[#444] hover:text-[#888]"
                      }
                    `}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Output panel */}
              <div className="relative bg-[#080808] border border-[#1a1a1a] rounded-sm overflow-hidden">
                {activeTab === "raw" ? (
                  <pre className="font-mono text-xs text-[#aaa] p-6 overflow-auto max-h-[500px] leading-relaxed whitespace-pre-wrap break-words">
                    {state.markdown}
                  </pre>
                ) : (
                  <div className="md-preview p-6 overflow-auto max-h-[500px] text-sm">
                    <MarkdownPreview content={state.markdown} />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 bg-acid text-ink font-mono text-xs px-5 py-2.5 hover:bg-[#d4f53f] transition-colors font-medium tracking-wider"
                >
                  <Download size={13} />
                  DOWNLOAD {state.filename}
                </button>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 border border-[#2a2a2a] text-paper font-mono text-xs px-5 py-2.5 hover:border-[#444] transition-colors tracking-wider"
                >
                  {copied ? (
                    <>
                      <CheckCheck size={13} className="text-acid" />
                      COPIED
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      COPY
                    </>
                  )}
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 border border-[#1a1a1a] text-[#555] font-mono text-xs px-5 py-2.5 hover:text-paper hover:border-[#333] transition-colors tracking-wider"
                >
                  <RefreshCw size={13} />
                  CONVERT ANOTHER
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] px-6 py-3 flex items-center justify-between">
        <span className="font-mono text-[10px] text-[#333] tracking-wider">
          FILES NEVER STORED — PROCESSED IN MEMORY
        </span>
        <a
          href="https://github.com/microsoft/markitdown"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] text-[#333] hover:text-acid transition-colors tracking-wider"
        >
          GITHUB ↗
        </a>
      </footer>
    </div>
  );
}
