import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize, 
  BookOpen,
  Settings
} from "lucide-react";
import { Comic } from "@/types";

interface ComicReaderProps {
  comic: Comic;
  onClose: () => void;
}

const ComicReader = ({ comic, onClose }: ComicReaderProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [fitMode, setFitMode] = useState<'width' | 'height' | 'page'>('width');

  // Mock pages - in a real app, these would come from the comic file
  const totalPages = 22;
  const mockPages = Array.from({ length: totalPages }, (_, i) => ({
    id: i + 1,
    url: 'placeholder.svg', // In reality, this would be extracted from the comic file
    width: 1200,
    height: 1800
  }));

  const currentPageData = mockPages[currentPage - 1];

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleZoomIn = () => {
    setZoom(Math.min(300, zoom + 25));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(50, zoom - 25));
  };

  const handleRotate = () => {
    setRotation((rotation + 90) % 360);
  };

  const handleFitMode = () => {
    const modes: Array<'width' | 'height' | 'page'> = ['width', 'height', 'page'];
    const currentIndex = modes.indexOf(fitMode);
    setFitMode(modes[(currentIndex + 1) % modes.length]);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-gray-800">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
          <div>
            <h2 className="font-semibold">{comic.series} #{comic.issue}</h2>
            <p className="text-sm text-gray-300">{comic.publisher} • {comic.year}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Page {currentPage} of {totalPages}
          </Badge>
          <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Reader Area */}
      <div className="flex-1 flex">
        {/* Comic Page Display */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
          <div 
            className="transition-transform duration-200"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              maxWidth: fitMode === 'width' ? '100%' : 'auto',
              maxHeight: fitMode === 'height' ? '100%' : 'auto',
            }}
          >
            <img
              src={currentPageData.url}
              alt={`Page ${currentPage}`}
              className="max-w-full max-h-full object-contain"
              style={{
                width: fitMode === 'page' ? 'auto' : '100%',
                height: fitMode === 'page' ? '100vh' : 'auto',
              }}
            />
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-80 bg-white border-l flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-2">Reading Controls</h3>
            
            {/* Navigation */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Page Navigation</label>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={prevPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm flex-1 text-center">
                    {currentPage} / {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Page Slider */}
              <div>
                <Slider
                  value={[currentPage]}
                  onValueChange={([value]) => setCurrentPage(value)}
                  max={totalPages}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Zoom Controls */}
              <div>
                <label className="text-sm font-medium mb-2 block">Zoom: {zoom}%</label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Slider
                    value={[zoom]}
                    onValueChange={([value]) => setZoom(value)}
                    max={300}
                    min={50}
                    step={25}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* View Controls */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRotate}>
                  <RotateCw className="h-4 w-4 mr-2" />
                  Rotate
                </Button>
                <Button variant="outline" size="sm" onClick={handleFitMode}>
                  <Maximize className="h-4 w-4 mr-2" />
                  Fit {fitMode}
                </Button>
              </div>
            </div>
          </div>

          {/* Comic Info */}
          <div className="p-4 flex-1">
            <h4 className="font-semibold mb-2">Comic Information</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Series:</span> {comic.series}
              </div>
              <div>
                <span className="font-medium">Issue:</span> #{comic.issue}
              </div>
              <div>
                <span className="font-medium">Publisher:</span> {comic.publisher}
              </div>
              <div>
                <span className="font-medium">Year:</span> {comic.year}
              </div>
              <div>
                <span className="font-medium">Volume:</span> {comic.volume}
              </div>
            </div>

            {comic.summary && (
              <div className="mt-4">
                <h5 className="font-medium mb-2">Summary</h5>
                <p className="text-sm text-muted-foreground">{comic.summary}</p>
              </div>
            )}
          </div>

          {/* Reading Progress */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Reading Progress</span>
              <span>{Math.round((currentPage / totalPages) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentPage / totalPages) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Info */}
      <div className="bg-gray-900 text-white px-4 py-2 text-xs text-center">
        <span className="text-gray-400">
          Use arrow keys to navigate • Space for next page • ESC to exit
        </span>
      </div>
    </div>
  );
};

export default ComicReader;