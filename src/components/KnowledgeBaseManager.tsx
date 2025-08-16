import { useState, useMemo, useEffect } from "react";
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
import { Search, Database, TrendingUp, Plus, Download, Upload, Edit, Trash2, Loader2 } from "lucide-react";
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";
import { ComicKnowledge } from "@/types";
import { showSuccess, showError } from "@/utils/toast";

const KnowledgeBaseManager = () => {
  const { knowledgeBase, isLoading, updateKnowledgeBase, deleteSeries } = useKnowledgeBase();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPublisher, setSelectedPublisher] = useState<string>("");
  const [editingSeries, setEditingSeries] = useState<ComicKnowledge | null>(null);
  const [deletingSeries, setDeletingSeries] = useState<ComicKnowledge | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Get statistics
  const stats = useMemo(() => {
    const totalSeries = knowledgeBase.length;
    const totalVolumes = knowledgeBase.reduce((sum, series) => sum + series.volumes.length, 0);
    const publishers = new Set(knowledgeBase.map(s => s.publisher));
    const publisherStats = Array.from(publishers).map(publisher => ({
      name: publisher,
      seriesCount: knowledgeBase.filter(s => s.publisher === publisher).length,
      volumeCount: knowledgeBase
        .filter(s => s.publisher === publisher)
        .reduce((sum, s) => sum + s.volumes.length, 0)
    })).sort((a, b) => b.seriesCount - a.seriesCount);

    return {
      totalSeries,
      totalVolumes,
      totalPublishers: publishers.size,
      publisherStats
    };
  }, [knowledgeBase]);

  // Filter data based on search and publisher
  const filteredData = useMemo(() => {
    let filtered = knowledgeBase;

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
  }, [searchTerm, selectedPublisher, knowledgeBase]);

  const handleEditSeries = (series: ComicKnowledge) => {
    setEditingSeries(JSON.parse(JSON.stringify(series))); // Deep copy
    setIsEditDialogOpen(true);
  };

  const handleDeleteSeries = (series: ComicKnowledge) => {
    setDeletingSeries(series);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (editingSeries) {
      const originalSeries = knowledgeBase.find(s => s.series === editingSeries.series);
      if (originalSeries) {
        const updatedKB = knowledgeBase.map(s => s.series === originalSeries.series ? editingSeries : s);
        await updateKnowledgeBase(updatedKB);
      }
      setIsEditDialogOpen(false);
      setEditingSeries(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingSeries) {
      await deleteSeries(deletingSeries.series);
      setIsDeleteDialogOpen(false);
      setDeletingSeries(null);
    }
  };

  const addVolume = () => {
    if (editingSeries) {
      setEditingSeries({
        ...editingSeries,
        volumes: [...editingSeries.volumes, { volume: '', year: new Date().getFullYear() }]
      });
    }
  };

  const removeVolume = (volumeIndex: number) => {
    if (editingSeries) {
      setEditingSeries({
        ...editingSeries,
        volumes: editingSeries.volumes.filter((_, index) => index !== volumeIndex)
      });
    }
  };

  const updateVolume = (volumeIndex: number, field: 'volume' | 'year', value: string | number) => {
    if (editingSeries) {
      const updatedVolumes = editingSeries.volumes.map((vol, index) => 
        index === volumeIndex ? { ...vol, [field]: value } : vol
      );
      setEditingSeries({ ...editingSeries, volumes: updatedVolumes });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Manager</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

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
                {stats.publisherStats
                  .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
                  .map(pub => (
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
                    <TableRow key={`${series.series}-${index}`}>
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
                            onClick={() => handleEditSeries(series)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSeries(series)}
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
                      {knowledgeBase
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
          
          {editingSeries && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="series">Series Name</Label>
                  <Input
                    id="series"
                    value={editingSeries.series}
                    onChange={(e) => setEditingSeries({ ...editingSeries, series: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="publisher">Publisher</Label>
                  <Input
                    id="publisher"
                    value={editingSeries.publisher}
                    onChange={(e) => setEditingSeries({ ...editingSeries, publisher: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="startYear">Start Year</Label>
                <Input
                  id="startYear"
                  type="number"
                  value={editingSeries.startYear}
                  onChange={(e) => setEditingSeries({ ...editingSeries, startYear: parseInt(e.target.value) || 0 })}
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
                  {editingSeries.volumes.map((volume, index) => (
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
              Are you sure you want to delete "{deletingSeries?.series}"? 
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