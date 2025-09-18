import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useElectron } from '@/hooks/useElectron';

export default function ComicReader({ comic, comicIndex, comicList }: any) {
  const { electronAPI, isElectron } = useElectron();
  const { readingContext } = useAppContext();

  const [pages, setPages] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");
  const [currentPage, setCurrentPage] = useState(1);

  const imageRefs = useRef<Record<string, string>>({});
  const fetchedPages = useRef<Set<number>>(new Set());

  const comicId = comic.id;
  const comicFilePath = comic.filePath;
  const isCbr = comic.filePath?.toLowerCase().endsWith('.cbr');

  const stableComicList = useMemo(() => comicList, [comicList?.length, comicList?.[0]?.id]);

  const fetchPages = useCallback(async () => {
    if (!electronAPI || !comicFilePath) {
      setIsLoading(false);
      setReaderError("Missing file path.");
      return;
    }

    try {
      setIsLoading(true);
      setReaderError(null);
      setPages([]);

      if (isCbr) {
        setLoadingMessage("Preparing comic archive...");
        const { tempDir, pages: pageList } = await electronAPI.prepareCbrForReading(comicFilePath);
        setTotalPages(pageList.length);

        for (let i = 0; i < pageList.length; i += 7) {
          const chunk = pageList.slice(i, i + 7);
          setPages(prev => [...prev, ...chunk]);
          await new Promise(r => setTimeout(r, 10));
        }
      } else {
        const pageList = await electronAPI.getComicPages(comicFilePath);
        setTotalPages(pageList.length);

        for (let i = 0; i < pageList.length; i += 7) {
          const chunk = pageList.slice(i, i + 7);
          setPages(prev => [...prev, ...chunk]);
          await new Promise(r => setTimeout(r, 10));
        }
      }
    } catch (err: any) {
      console.error("fetchPages failed", err);
      setReaderError(err.message || "Could not load comic");
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [electronAPI, comicFilePath, isCbr]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages, comicId]);

  useEffect(() => {
    if (stableComicList && comicIndex >= 0 && comicIndex < stableComicList.length) {
      const newComic = stableComicList[comicIndex];
      if (newComic.id !== comic.id) {
        setCurrentPage(newComic.lastReadPage || 1);

        Object.values(imageRefs.current).forEach(url => {
          if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        });
        imageRefs.current = {};

        setPages([]);
        fetchedPages.current.clear();
        setIsLoading(true);
        setLoadingMessage("Loading pages…");
        setReaderError(null);
      }
    }
  }, [comicIndex, stableComicList, comic.id]);

  return (
    <div className="comic-reader">
      <h2>{comic.series} #{comic.issue}</h2>
      {readerError && <p className="error">{readerError}</p>}
      {isLoading && <p>{loadingMessage}</p>}
      {/* Render pages here */}
    </div>
  );
}