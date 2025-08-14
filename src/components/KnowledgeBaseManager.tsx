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
import { Search, Database, TrendingUp, Plus, Download, Upload } from "lucide-react";
import { comicsKnowledgeData } from "@/data/comicsKnowledge";
import { showSuccess, showError } from "@/utils/toast";

const KnowledgeBaseManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPublisher, setSelectedPublisher] = useState<string>("");

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
    </Card>
  );
};

export default KnowledgeBaseManager;