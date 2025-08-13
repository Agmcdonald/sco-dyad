import { Comic, QueuedFile } from "@/types";

// A simple function to remove characters that are invalid in file/folder names
const sanitize = (name: string): string => {
  return name.replace(/[<>:"/\\|?*]/g, '');
};

type ComicData = Omit<Comic, 'id' | 'coverUrl'> | Omit<QueuedFile, 'id' | 'path' | 'name' | 'status' | 'confidence'>;

export const formatPath = (
  format: string,
  comicData: ComicData
): string => {
  let path = format;

  const replacements: Record<string, string | number | null | undefined> = {
    '{series}': comicData.series,
    '{issue}': comicData.issue,
    '{year}': comicData.year,
    '{publisher}': comicData.publisher,
    '{volume}': (comicData as Comic).volume, // Assuming volume is present
  };

  for (const placeholder in replacements) {
    const value = replacements[placeholder];
    if (value !== null && value !== undefined) {
      path = path.replace(new RegExp(placeholder, 'g'), sanitize(String(value)));
    }
  }

  return path;
};