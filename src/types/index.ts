export interface Creator {
  name: string;
  role: string;
}

export interface NewComic {
  series: string;
  issue: string;
  year: number;
  publisher: string;
  volume: string;
  title?: string; // Name of the specific issue
  publicationDate?: string; // Specific publication date, e.g., "2023-10-25"
  summary?: string;
  creators?: Creator[];
  rating?: number;
  genre?: string;
  characters?: string;
  price?: string; // Issue price
  barcode?: string; // Issue barcode
  languageCode?: string; // Language code
  countryCode?: string; // Series country code
}

export interface Comic extends NewComic {
  id: string;
  coverUrl: string;
  dateAdded: Date;
  filePath?: string;
  metadataLastChecked?: string;
  ignoreInScans?: boolean;
  isSeriesCover?: boolean; // Whether this comic's cover should be used for the series
}

export interface ReadingListItem {
  id: string;
  comicId: string;
  title: string;
  series: string;
  issue: string;
  publisher: string;
  year: number;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  dateAdded: Date;
  rating?: number; // 0-6 rating system
  dateCompleted?: Date;
}

export interface RecentlyReadComic {
  id: string;
  comicId: string;
  title: string;
  series: string;
  issue: string;
  publisher: string;
  year: number;
  coverUrl: string;
  dateRead: Date;
  rating?: number; // 0-6 rating system
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
  volume?: string | null;
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
  marvelPublicKey: string;
  marvelPrivateKey: string;
  keepOriginalFiles: boolean;
  autoScanOnStartup: boolean;
  folderNameFormat: string;
  fileNameFormat: string;
  libraryPath: string;
  gcdDbPath?: string;
  gcdIssuesPath?: string;
  gcdSequencesPath?: string;
}

export interface ComicKnowledge {
  series: string;
  publisher: string;
  startYear: number;
  volumes: Array<{
    volume: string;
    year: number;
  }>;
}