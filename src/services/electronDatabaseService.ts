import { useElectron } from '@/hooks/useElectron';
import { Comic, NewComic } from '@/types';

/**
 * @hook useElectronDatabaseService
 * @summary A custom hook that provides a stable interface to the Electron database APIs.
 * @description This hook abstracts the `useElectron` hook and returns a set of functions
 * for interacting with the comic book database in the main process. It returns `null`
 * if the Electron API is not available (e.g., when running in a standard web browser).
 * @returns {object | null} An object containing database service functions, or `null`.
 */
export const useElectronDatabaseService = () => {
  const { electronAPI } = useElectron();

  if (!electronAPI) {
    return null;
  }

  return {
    /**
     * Saves a new comic to the database.
     * @param {NewComic} comic - The comic data to save.
     * @returns {Promise<Comic>} The newly saved comic, including its generated ID.
     */
    saveComic: (comic: NewComic): Promise<Comic> => {
      return electronAPI.saveComic(comic);
    },
    /**
     * Retrieves all comics from the database.
     * @returns {Promise<Comic[]>} A promise that resolves to an array of all comics.
     */
    getComics: (): Promise<Comic[]> => {
      return electronAPI.getComics();
    },
    /**
     * Updates an existing comic in the database.
     * @param {Comic} comic - The comic data to update. Must include an `id`.
     * @returns {Promise<Comic>} The updated comic data.
     */
    updateComic: (comic: Comic): Promise<Comic> => {
      return electronAPI.updateComic(comic);
    },
    /**
     * Updates multiple comics in a single batch operation.
     * @param {(Partial<Comic> & { id: string })[]} updates - An array of comic updates.
     * @returns {Promise<number>} The number of comics that were successfully updated.
     */
    batchUpdateComics: (updates: (Partial<Comic> & { id: string })[]): Promise<number> => {
      return electronAPI.batchUpdateComics(updates);
    },
    /**
     * Deletes a comic from the database and optionally its associated file.
     * @param {string} comicId - The ID of the comic to delete.
     * @param {string} [filePath] - The path to the comic file to delete.
     * @returns {Promise<boolean>} `true` if the deletion was successful.
     */
    deleteComic: (comicId: string, filePath?: string): Promise<boolean> => {
      return electronAPI.deleteComic(comicId, filePath);
    },
    /**
     * Imports a list of comics into the database.
     * @param {Comic[]} comics - An array of comic objects to import.
     * @returns {Promise<{ added: number; skipped: number }>} A report of added and skipped comics.
     */
    importComics: (comics: Comic[]): Promise<{ added: number; skipped: number }> => {
      return electronAPI.importComics(comics);
    }
  };
};