import {
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";

function kind(mimeType: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType === "application/vnd.google-apps.folder") return "folder";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || ["csv", "xls", "xlsx", "numbers"].includes(ext))
    return "sheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint") || ["ppt", "pptx", "key"].includes(ext))
    return "slides";
  if (mimeType.includes("document") || mimeType.includes("msword") || mimeType.startsWith("text/") || ["doc", "docx", "pages", "txt"].includes(ext))
    return "doc";
  if (["zip", "rar", "7z", "gz"].includes(ext) || mimeType.includes("zip")) return "archive";
  return "file";
}

const ICONS = {
  folder: { Icon: Folder, color: "text-slate-500 dark:text-slate-400" },
  pdf: { Icon: FileText, color: "text-red-600 dark:text-red-400" },
  image: { Icon: FileImage, color: "text-violet-600 dark:text-violet-400" },
  video: { Icon: FileVideo, color: "text-violet-600 dark:text-violet-400" },
  audio: { Icon: FileAudio, color: "text-violet-600 dark:text-violet-400" },
  sheet: { Icon: FileSpreadsheet, color: "text-emerald-600 dark:text-emerald-400" },
  slides: { Icon: Presentation, color: "text-amber-600 dark:text-amber-400" },
  doc: { Icon: FileText, color: "text-blue-600 dark:text-blue-400" },
  archive: { Icon: FileArchive, color: "text-slate-500 dark:text-slate-400" },
  file: { Icon: File, color: "text-slate-500 dark:text-slate-400" },
} as const;

export function FileIcon({
  mimeType,
  name,
  className,
}: {
  mimeType: string;
  name: string;
  className?: string;
}) {
  const { Icon, color } = ICONS[kind(mimeType, name)];
  return <Icon className={cn("h-4 w-4 shrink-0", color, className)} aria-hidden />;
}
