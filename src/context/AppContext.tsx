import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { QueuedFile, Comic, NewComic, ApiUsageStats } from '@/types';
import { useElectronDatabaseService } from '@/services/electronDatabaseService';
import { useElectron } from '@/hooks/useElectron';
import { useSettings } from '@/context/SettingsContext';
import { formatPath } from '@/lib/formatter';
import { showSuccess, showError } from '@/utils/toast';
import { useActionLog } from './hooks/useActionLog';
import { useFileQueue } from './hooks/useFileQueue';
import { useComicLibrary } from './hooks/useComicLibrary';
import { useReadingList } from './hooks/useReadingList';
import { useRecentlyRead } from './hooks/useRecentlyRead';
import { useKnowledgeBase } from './KnowledgeBaseContext';

interface AppContextType {
  comics: Comic[];
  readingComic: Comic | null;
  setReadingComic: (comic: Comic | null) => void;

  readingContext: { comicList: Comic[]; currentIndex: number } | null;
  setReadingContext: (ctx: { comicList: Comic[]; currentIndex: number } | null) => void;
  openComicForReading: (comic: Comic, comicList?: Comic[], currentIndex?: number) => void;

  addComic: (comicData: NewComic, originalFile: QueuedFile) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { comics, setComics, refreshComics } = useComicLibrary();
  const { addToRecentlyRead } = useRecentlyRead();
  const { settings } = useSettings();
  const { electronAPI, isElectron } = useElectron();
  const databaseService = useElectronDatabaseService();
  const { logAction } = useActionLog();
  const { addToKnowledgeBase } = useKnowledgeBase();

  const [readingComic, setReadingComic] = useState<Comic | null>(null);
  const [readingContext, setReadingContext] = useState<{ comicList: Comic[]; currentIndex: number } | null>(null);

  const openComicForReading = useCallback(
    (comic: Comic, comicList?: Comic[], currentIndex?: number) => {
      const isPdf = comic.filePath?.toLowerCase().endsWith(".pdf");

      if (isPdf && !isElectron) {
        showError("Reading PDFs is only supported in the desktop app.");
        return;
      }
      if (isPdf && isElectron && electronAPI && comic.filePath) {
        electronAPI.openPdf(comic.filePath)
          .then(r => r.success ? addToRecentlyRead(comic) : showError("Could not open PDF"))
          .catch(err => showError(err.message));
        return;
      }

      setReadingComic(comic);
      setReadingContext(
        comicList && currentIndex !== undefined ? { comicList, currentIndex } : null
      );
    },
    [isElectron, electronAPI, addToRecentlyRead]
  );

  const addComic = useCallback(async (comicData: NewComic, originalFile: QueuedFile) => {
    addToKnowledgeBase({
      series: comicData.series,
      publisher: comicData.publisher,
      startYear: comicData.year,
      volumes: [{ volume: comicData.volume, year: comicData.year }]
    });

    // ✅ Step 2.5 — sanitize filenames
    const sanitizedComicData = {
      ...comicData,
      issue: (comicData.issue ?? "").toString().replace(/[^0-9a-zA-Z]/g, ""),
      series: (comicData.series ?? "").toString().replace(/[<>:"/\\|?*\u0000-\u001F]/g, " "),
      title: (comicData.title ?? "").toString().replace(/[<>:"/\\|?*\u0000-\u001F]/g, " "),
    };

    if (/#\$\{?issue\}?/.test(settings.fileNameFormat)) {
      console.warn("[FilenameFormat] Fixed '$' in issue token. Should be '#{issue}'.");
      settings.fileNameFormat = settings.fileNameFormat.replace(/#\$\{?issue\}?/g, "#{issue}");
    }

    const fileExtension = originalFile.name.substring(originalFile.name.lastIndexOf('.'));
    const folderPart = formatPath(settings.folderNameFormat, sanitizedComicData);
    const filePart = formatPath(settings.fileNameFormat, sanitizedComicData) + fileExtension;

    try {
      const savedComic = await databaseService.saveComic({
        ...comicData,
        filePath: `${folderPart}/${filePart}`
      });
      await refreshComics();
      logAction('success', `Added '${savedComic.series} #${savedComic.issue}'`);
      showSuccess(`Added '${savedComic.series} #${savedComic.issue}' to library`);
    } catch (err: any) {
      console.error(err);
      showError(`Failed to add comic: ${err.message}`);
    }
  }, [databaseService, refreshComics, logAction, showSuccess, showError, addToKnowledgeBase, settings]);

  return (
    <AppContext.Provider
      value={{
        comics,
        readingComic,
        setReadingComic,
        readingContext,
        setReadingContext,
        openComicForReading,
        addComic,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
};