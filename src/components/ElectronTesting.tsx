import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useElectron } from '@/hooks/useElectron';
import { useElectronFileService } from '@/services/electronFileService';
import { showSuccess, showError } from '@/utils/toast';

const ElectronTesting = () => {
  const { isElectron, electronAPI } = useElectron();
  const fileService = useElectronFileService();
  const [testPath, setTestPath] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);

  if (!isElectron || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const testScanFolder = async () => {
    if (!fileService || !testPath) return;

    try {
      showSuccess(`Scanning folder: ${testPath}`);
      const files = await fileService.scanFolder(testPath);
      setTestResults(files);
      showSuccess(`Found ${files.length} comic files`);
    } catch (error) {
      showError(`Scan failed: ${error.message}`);
      console.error('Scan error:', error);
    }
  };

  const testExtractCover = async (filePath: string) => {
    if (!electronAPI) return;

    try {
      showSuccess(`Extracting cover from: ${filePath}`);
      const coverPath = await electronAPI.extractCover(filePath);
      showSuccess(`Cover extracted to: ${coverPath}`);
    } catch (error) {
      showError(`Cover extraction failed: ${error.message}`);
      console.error('Cover extraction error:', error);
    }
  };

  const testReadFile = async (filePath: string) => {
    if (!electronAPI) return;

    try {
      const fileInfo = await electronAPI.readComicFile(filePath);
      console.log('File info:', fileInfo);
      showSuccess(`File read successfully. Check console for details.`);
    } catch (error) {
      showError(`File read failed: ${error.message}`);
      console.error('File read error:', error);
    }
  };

  return (
    <Card className="fixed bottom-4 left-4 w-96 z-50 max-h-96 overflow-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Electron Testing (Dev Mode)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="/path/to/test/folder"
            value={testPath}
            onChange={(e) => setTestPath(e.target.value)}
            className="text-xs"
          />
          <Button size="sm" onClick={testScanFolder}>
            Scan
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium">Found Files:</div>
            {testResults.slice(0, 3).map((file, index) => (
              <div key={index} className="text-xs p-2 bg-muted rounded">
                <div className="font-medium truncate">{file.name}</div>
                <div className="text-muted-foreground truncate">{file.path}</div>
                <div className="flex gap-1 mt-1">
                  <Button size="sm" variant="outline" className="text-xs h-6" 
                    onClick={() => testReadFile(file.path)}>
                    Read
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-6"
                    onClick={() => testExtractCover(file.path)}>
                    Cover
                  </Button>
                </div>
              </div>
            ))}
            {testResults.length > 3 && (
              <div className="text-xs text-muted-foreground">
                ...and {testResults.length - 3} more files
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ElectronTesting;