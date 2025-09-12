import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Calendar, User, Hash, Building, Eye, EyeOff } from "lucide-react";
import { QueuedFile } from "@/types";
import { parseFilename } from "@/lib/parser";

interface FilePreviewProps {
  file: QueuedFile;
}

const FilePreview = ({ file }: FilePreviewProps) => {
  const [showRawData, setShowRawData] = useState(false);
  const parsed = parseFilename(file.path);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Success': return 'bg-green-100 text-green-800';
      case 'Warning': return 'bg-yellow-100 text-yellow-800';
      case 'Error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: string | null) => {
    switch (confidence) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">File Preview</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRawData(!showRawData)}
          >
            {showRawData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showRawData ? 'Hide' : 'Show'} Raw Data
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Filename:</span>
          </div>
          <p className="text-sm text-muted-foreground break-all pl-6">{file.name}</p>
        </div>

        <Separator />

        {/* Processing Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge className={getStatusColor(file.status)}>
            {file.status}
          </Badge>
        </div>

        {file.confidence && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Confidence:</span>
            <Badge className={getConfidenceColor(file.confidence)}>
              {file.confidence}
            </Badge>
          </div>
        )}

        <Separator />

        {/* Detected Information */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Detected Information</h4>
          
          {file.series && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Series:</span>
              <span>{file.series}</span>
            </div>
          )}

          {file.issue && (
            <div className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Issue:</span>
              <span>#{file.issue}</span>
            </div>
          )}

          {file.year && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Year:</span>
              <span>{file.year}</span>
            </div>
          )}

          {file.publisher && (
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Publisher:</span>
              <span>{file.publisher}</span>
            </div>
          )}

          {!file.series && !file.issue && !file.year && !file.publisher && (
            <p className="text-sm text-muted-foreground italic">No information detected yet</p>
          )}
        </div>

        {/* Raw Parsed Data */}
        {showRawData && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Raw Parsed Data</h4>
              <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono space-y-1">
                <div><span className="text-muted-foreground">Path:</span> {file.path}</div>
                <div><span className="text-muted-foreground">Parsed Series:</span> {parsed.series || 'null'}</div>
                <div><span className="text-muted-foreground">Parsed Issue:</span> {parsed.issue || 'null'}</div>
                <div><span className="text-muted-foreground">Parsed Year:</span> {parsed.year || 'null'}</div>
                <div><span className="text-muted-foreground">Parsed Volume:</span> {parsed.volume || 'null'}</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FilePreview;