export interface NewComic {
  series: string;
  issue: string;
  year: number;
  publisher: string;
  volume: string;
  summary?: string;
}

export interface Comic extends NewComic {
  id: string;
  coverUrl: string;
  dateAdded: Date;
}

export type FileStatus = "Pending" | "Success" | "Warning" | "Error";
export type Confidence = "High" | "Medium" | "Low";

export interface QueuedFile {
  id: string;
  name: string;
  path: string;
  series: string | null;
  issue: string | null;
  year: number | null;
  publisher: string | null;
  confidence: Confidence | null;
  status: FileStatus;
  pageCount?: number;
}

export type SelectableItem = (Comic & { type: 'comic' }) | (QueuedFile & { type: 'file' });

export type ActionType = "success" | "error" | "info" | "warning";

export type UndoPayload =
  | { type: 'ADD_COMIC'; payload: { comicId: string, originalFile: QueuedFile } }
  | { type: 'SKIP_FILE'; payload: { skippedFile: QueuedFile } };

export interface RecentAction {
  id: number;
  type: ActionType;
  message: string;
  timestamp: Date;
  undo?: UndoPayload;
}

export interface AppSettings {
  comicVineApiKey: string;
  keepOriginalFiles: boolean;
  autoScanOnStartup: boolean;
  folderNameFormat: string;
  fileNameFormat: string;
}