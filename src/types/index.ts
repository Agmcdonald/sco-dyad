export interface Comic {
  id: number;
  coverUrl: string;
  series: string;
  issue: string;
  year: number;
  publisher: string;
  volume: string;
  summary?: string;
}

export type FileStatus = "Pending" | "Success" | "Warning" | "Error";
export type Confidence = "High" | "Medium" | "Low";

export interface QueuedFile {
  id: number;
  name: string;
  path: string; // Full path of the file
  series: string | null;
  issue: string | null;
  year: number | null;
  publisher: string | null;
  confidence: Confidence | null;
  status: FileStatus;
}

export type SelectableItem = (Comic & { type: 'comic' }) | (QueuedFile & { type: 'file' });

export type ActionType = "success" | "error" | "info";

export interface RecentAction {
  id: number;
  type: ActionType;
  text: string;
  time: string;
}

export type UndoableAction =
  | { type: 'ADD_COMIC'; comicId: number; originalFile: QueuedFile }
  | { type: 'SKIP_FILE'; skippedFile: QueuedFile }
  | null;