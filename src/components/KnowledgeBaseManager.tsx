import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Search, Database, TrendingUp, Plus, Download, Upload, Edit, Trash2 } from "lucide-react";
import { comicsKnowledgeData } from "@/data/comicsKnowledge";
import { showSuccess, showError } from "@/utils/toast";

interface EditSeriesData {
  series: string;
  publisher: string;
  startYear: number;
  volumes: Array<{ volume: string; year: number }>;
}

const KnowledgeBaseManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPublisher, setSelectedPublisher] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<EditSeriesData | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Get statistics
  const stats = useMemo(() => {
    const totalSeries = comicsKnowledgeData.length;
    const totalVolumes = comicsKnowledgeData.reduce((sum, series) => sum + series.volumes.length, 0);
    const publishers = new Set(comicsKnowledgeData.map(s => s.publisher));
    const publisherStats = Array.from(publishers).map(publisher => ({
      name: publisher,
      seriesCount: comicsKnowledgeData.filter(s => s.publisher === publisher).length,
      volumeCount: comicsKnowledgeData
        .filter(s => s.publisher === publisher)
        .reduce((sum, s) => sum + s.volumes.length, 0)
    })).sort((a, b) => b.seriesCount - a.seriesCount);

    return {
      totalSeries,
      totalVolumes,
      totalPublishers: publishers.size,
      publisherStats
    };
  }, []);

  // Filter data based on search and publisher
  const filteredData = useMemo(() => {
    let filtered = comicsKnowledgeData;

    if (selectedPublisher) {
      filtered = filtered.filter(series => series.publisher === selectedPublisher);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(series => 
        series.series.toLowerCase().includes(term) ||
        series.publisher.toLowerCase().includes(term)
      );
    }

    return filtered.slice(0, 100); // Limit for performance
  }, [searchTerm, selectedPublisher]);

  const handleExportKnowledge = () => {
    const blob = new Blob([JSON.stringify(comicsKnowledgeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comics-knowledge-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess("Knowledge base exported successfully");
  };

  const handleImportKnowledge = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            if (Array.isArray(data) && data.length > 0) {
              showSuccess(`Import would add ${data.length} series to knowledge base (feature not fully implemented)`);
            } else {
              showError("Invalid knowledge base file format");
            }
          } catch (error) {
            showError("Failed to parse knowledge base file");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleEditSeries = (index: number) => {
    const originalIndex = comicsKnowledgeData.findIndex(item => 
      filteredData[index] && item.series === filteredData[index].series && item.publisher === filteredData[index].publisher
    );
    
    if (originalIndex !== -1) {
      setEditingIndex(originalIndex);
      setEditData({ ...comicsKnowledgeData[originalIndex] });
      setIsEditDialogOpen(true);
    }
  };

  const handleDeleteSeries = (index: number) => {
    const originalIndex = comicsKnowledgeData.findIndex(item => 
      filteredData[index] && item.series === filteredData[index].series && item.publisher === filteredData[index].publisher
    );
    
    if (originalIndex !== -1) {
      setDeleteIndex(originalIndex);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editData) {
      // In a real implementation, this would update the actual knowledge base
      // For now, we'll just show a success message since the data is imported
      showSuccess(`Series "${editData.series}" would be updated (feature requires backend implementation)`);
      
      // Note: To fully implement this, you'd need:
      // 1. A way to persist changes to the knowledge base
      // 2. Update the comicsKnowledgeData array
      // 3. Possibly save to a user-specific knowledge base file
      
      setIsEditDialogOpen(false);
      setEditingIndex(null);
      setEditData(null);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteIndex !== null) {
      const seriesName = comicsKnowledgeData[deleteIndex].series;
      
      // In a real implementation, this would remove from the actual knowledge base
      showSuccess(`Series "${seriesName}" would be deleted (feature requires backend implementation)`);
      
      // Note: To fully implement this, you'd need:
      // 1. Remove from comicsKnowledgeData array
      // 2. Update the knowledge base file
      // 3. Refresh the component state
      
      setIsDeleteDialogOpen(false);
      setDeleteIndex(null);
    }
  };

  const addVolume = () => {
    if (editData) {
      setEditData({
        ...editData,
        volumes: [...editData.volumes, { volume: '', year: new Date().getFullYear() }]
      });
    }
  };

  const removeVolume = (volumeIndex: number) => {
    if (editData) {
      setEditData({
        ...editData,
        volumes: editData.volumes.filter((_, index) => index !== volumeIndex)
      });
    }
  };

  const updateVolume = (volumeIndex: number, field: 'volume' | 'year', value: string | number) => {
    if (editData) {
      const updatedVolumes = editData.volumes.map((vol, index) => 
        index === volumeIndex ? { ...vol, [field]: value } : vol
      );
      setEditData({ ...editData, volumes: updatedVolumes });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Knowledge Base Manager
            </CardTitle>
            <CardDescription>
              Manage and explore the comic series knowledge database
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportKnowledge}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportKnowledge}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="series">Series Browser</TabsTrigger>
            <TabsTrigger value="publishers">Publishers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{stats.totalSeries}</div>
                <div className="text-sm text-muted-foreground">Total Series</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{stats.totalVolumes}</div>
                <div className="text-sm text-muted-foreground">Total Volumes</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{stats.totalPublishers}</div>
                <div className="text-sm text-muted-foreground">Publishers</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Top Publishers by Series Count</h4>
              <div className="space-y-2">
                {stats.publisherStats.slice(0, 10).map((publisher, index) => (
                  <div key={publisher.name} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">#{index + 1}</span>
                      <span>{publisher.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{publisher.seriesCount} series</Badge>
                      <Badge variant="outline">{publisher.volumeCount} volumes</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="series" className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search series..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="px-3 py-2 border rounded-md"
                value={selectedPublisher}
                onChange={(e) => setSelectedPublisher(e.target.value)}
              >
                <option value="">All Publishers</option>
                {stats.publisherStats.map(pub => (
                  <option key={pub.name} value={pub.name}>{pub.name}</option>
                ))}
              </select>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Series</TableHead>
                    <TableHead>Publisher</TableHead>
                    <TableHead>Start Year</TableHead>
                    <TableHead>Volumes</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((series, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{series.series}</TableCell>
                      <TableCell>{series.publisher}</TableCell>
                      <TableCell>{series.startYear}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{series.volumes.length}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSeries(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSeries(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredData.length === 100 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing first 100 results. Use search to narrow down.
              </p>
            )}
          </TabsContent>

          <TabsContent value="publishers" className="space-y-4">
            <div className="grid gap-4">
              {stats.publisherStats.map((publisher) => (
                <Card key={publisher.name}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{publisher.name}</CardTitle>
                      <div className="flex gap-2">
                        <Badge>{publisher.seriesCount} series</Badge>
                        <Badge variant="outline">{publisher.volumeCount} volumes</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {comicsKnowledgeData
                        .filter(s => s.publisher === publisher.name)
                        .slice(0, 10)
                        .map((series, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {series.series}
                          </Badge>
                        ))}
                      {publisher.seriesCount > 10 && (
                        <Badge variant="outline" className="text-xs">
                          +{publisher.seriesCount - 10} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Edit Series Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Series Information</DialogTitle>
            <DialogDescription>
              Update the series details and volume information.
            </DialogDescription>
          </DialogHeader>
          
          {editData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="series">Series Name</Label>
                  <Input
                    id="series"
                    value={editData.series}
                    onChange={(e) => setEditData({ ...editData, series: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="publisher">Publisher</Label>
                  <Input
                    id="publisher"
                    value={editData.publisher}
                    onChange={(e) => setEditData({ ...editData, publisher: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="startYear">Start Year</Label>
                <Input
                  id="startYear"
                  type="number"
                  value={editData.startYear}
                  onChange={(e) => setEditData({ ...editData, startYear: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Volumes</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addVolume}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Volume
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {editData.volumes.map((volume, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        placeholder="Volume"
                        value={volume.volume}
                        onChange={(e) => updateVolume(index, 'volume', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Year"
                        value={volume.year}
                        onChange={(e) => updateVolume(index, 'year', parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVolume(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Series</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteIndex !== null ? comicsKnowledgeData[deleteIndex]?.series : ''}"? 
              This action cannot be undone and will remove the series from the knowledge base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default KnowledgeBaseManager;