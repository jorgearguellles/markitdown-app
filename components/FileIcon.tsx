import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileAudio,
  FileArchive,
  FileCode,
  File,
} from "lucide-react";

type FileIconProps = {
  filename: string;
  size?: number;
};

function getIconForExtension(ext: string) {
  const e = ext.toLowerCase();
  if ([".pdf", ".doc", ".docx", ".pptx", ".epub"].includes(e)) return FileText;
  if ([".xlsx", ".xls", ".csv"].includes(e)) return FileSpreadsheet;
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(e)) return FileImage;
  if ([".mp3", ".wav"].includes(e)) return FileAudio;
  if ([".zip"].includes(e)) return FileArchive;
  if ([".html", ".htm", ".xml", ".json", ".md", ".txt"].includes(e)) return FileCode;
  return File;
}

export function FileIcon({ filename, size = 24 }: FileIconProps) {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  const Icon = getIconForExtension(ext);

  return (
    <div className="w-10 h-10 bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
      <Icon size={size} className="text-acid" strokeWidth={1.5} />
    </div>
  );
}
