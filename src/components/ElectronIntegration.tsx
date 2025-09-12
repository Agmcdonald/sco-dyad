import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElectron, useElectronFileHandlers, useElectronNavigation } from '@/hooks/useElectron';
import { useElectronFileService } from '@/services/electronFileService';
import { showSuccess, showError } from '@/utils/toast';

const ElectronIntegration = () => {
  const { isElectron, electronAPI } = useElectron();
  const fileService = useElectronFileService();
  const navigate = useNavigate();

  // Handle file and folder selection from menu
  useElectronFileHandlers();
  useElectronNavigation();

  useEffect(() => {
    if (!electronAPI) return;

    // Handle files selected from menu
    const handleFilesSelected = async (filePaths: string[]) => {
      if (!fileService) return;

      try {
        showSuccess(`Processing ${filePaths.length} selected files...`);
        
        // Navigate to organize page first
        navigate('/app/organize');
        
        // Add a small delay to ensure the page has loaded and context is available
        setTimeout(() => {
          // Convert file paths to QueuedFile objects
          const queuedFiles = filePaths.map((filePath, index) => ({
            id: `electron-file-${Date.now()}-${index}`,
            name: filePath.split(/[\\/]/).pop() || 'Unknown File',
            path: filePath,
            series: null,
            issue: null,
            year: null,
            publisher: null,
            confidence: null as any,
            status: 'Pending' as any
          }));

          // Dispatch a custom event that the Organize page can listen for
          window.dispatchEvent(new CustomEvent('electron-files-added', { 
            detail: { files: queuedFiles } 
          }));
        }, 100);
        
      } catch (error) {
        showError('Failed to process selected files');
        console.error('Error processing files:', error);
      }
    };

    // Handle folder selected from menu
    const handleFolderSelected = async (folderPath: string) => {
      if (!fileService) return;

      try {
        showSuccess(`Scanning folder: ${folderPath}`);
        
        // Navigate to organize page first
        navigate('/app/organize');
        
        // Add a small delay to ensure the page has loaded and context is available
        setTimeout(async () => {
          try {
            const fileInfos = await fileService.scanFolder(folderPath);
            
            // Convert file infos to QueuedFile objects
            const queuedFiles = fileInfos.map((fileInfo, index) => ({
              id: `electron-folder-${Date.now()}-${index}`,
              name: fileInfo.name,
              path: fileInfo.path,
              series: null,
              issue: null,
              year: null,
              publisher: null,
              confidence: null as any,
              status: 'Pending' as any
            }));

            // Dispatch a custom event that the Organize page can listen for
            window.dispatchEvent(new CustomEvent('electron-files-added', { 
              detail: { files: queuedFiles } 
            }));
            
            showSuccess(`Found ${fileInfos.length} comic files in folder`);
          } catch (error) {
            showError('Failed to scan folder');
            console.error('Error scanning folder:', error);
          }
        }, 100);
        
      } catch (error) {
        showError('Failed to scan folder');
        console.error('Error scanning folder:', error);
      }
    };

    // Handle navigation from menu
    const handleNavigateTo = (path: string) => {
      navigate(path);
    };

    electronAPI.onFilesSelected(handleFilesSelected);
    electronAPI.onFolderSelected(handleFolderSelected);
    electronAPI.onNavigateTo(handleNavigateTo);

    return () => {
      electronAPI.removeAllListeners('files-selected');
      electronAPI.removeAllListeners('folder-selected');
      electronAPI.removeAllListeners('navigate-to');
    };
  }, [electronAPI, fileService, navigate]);

  return (
    <>
      {/* Show Electron status in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            isElectron 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isElectron ? 'Electron Mode' : 'Web Mode'}
          </div>
        </div>
      )}
    </>
  );
};

export default ElectronIntegration;