import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2 } from "lucide-react";
import { Comic, Creator } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";
import { showSuccess } from "@/utils/toast";
import { creatorRoles } from "@/lib/constants";
import { Textarea } from "./ui/textarea";

interface BulkEditComicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedComics: string[];
  comics: Comic[];
}

const BulkEditComicsModal = ({ isOpen, onClose, selectedComics, comics }: BulkEditComicsModalProps) => {
  const { updateComic, addToKnowledgeBase } = useAppContext();
  const { knowledgeBase } = useKnowledgeBase();
  
  const initializedRef = useRef(false);
  
  const [series, setSeries] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [publisher, setPublisher] = useState("");
  const [genre, setGenre] = useState("");
  const [volume, setVolume] = useState("");
  const [creators, setCreators] = useState<Creator[]>([]);
  
  const [updateSeries, setUpdateSeries] = useState(false);
  const [updateTitle, setUpdateTitle] = useState(false);
  const [updateSummary, setUpdateSummary] = useState(false);
  const [updatePublisher, setUpdatePublisher] = useState(false);
  const [updateGenre, setUpdateGenre] = useState(false);
  const [updateVolume, setUpdateVolume] = useState(false);
  const [updateCreators, setUpdateCreators] = useState(false);

  const publisherOptions = (() => {
    const publishersFromComics = [...new Set(comics.map(c => c.publisher))];
    const publishersFromKnowledge = [...new Set(knowledgeBase.series.map(entry => entry.publisher))];
    const commonPublishers = ['Marvel Comics', 'DC Comics', 'Image Comics', 'Dark Horse Comics', 'IDW Publishing'];
    const allPublishers = [...new Set([...publishersFromComics, ...publishersFromKnowledge, ...commonPublishers])];
    
    return allPublishers
      .filter(pub => pub && pub.trim() !== '')
      .sort();
  })();

  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      initializedRef.current = true;
      
      const selectedComicObjects = comics.filter(c => selectedComics.includes(c.id));
      if (selectedComicObjects.length > 0) {
        const findMostCommon = (field: keyof Comic) => {
          const values = selectedComicObjects.map(c => c[field]).filter(Boolean) as string[];
          const counts = values.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          return Object.entries(counts).sort(([,a], [,b]) => b - a)[0]?.[0] || '';
        };

        setSeries(findMostCommon('series'));
        setPublisher(findMostCommon('publisher'));
        setGenre(findMostCommon('genre'));
        setVolume(findMostCommon('volume'));
        setTitle("");
        setSummary("");
        setCreators([]);
      }
    }
    
    if (!isOpen) {
      initializedRef.current = false;
    }
  }, [isOpen, comics, selectedComics]);

  const addCreator = () => setCreators(prev => [...prev, { name: "", role: "Writer" }]);
  const removeCreator = (index: number) => setCreators(prev => prev.filter((_, i) => i !== index));
  const updateCreatorName = (index: number, name: string) => setCreators(prev => prev.map((c, i) => i === index ? { ...c, name } : c));
  const updateCreatorRole = (index: number, role: string) => setCreators(prev => prev.map((c, i) => i === index ? { ...c, role } : c));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let updatedCount = 0;
    const selectedComicObjects = comics.filter(c => selectedComics.includes(c.id));

    for (const comic of selectedComicObjects) {
      const updates: Partial<Comic> = {};
      let hasUpdates = false;

      if (updateSeries && series.trim()) { updates.series = series.trim(); hasUpdates = true; }
      if (updateTitle && title.trim()) { updates.title = title.trim(); hasUpdates = true; }
      if (updateSummary && summary.trim()) { updates.summary = summary.trim(); hasUpdates = true; }
      if (updatePublisher && publisher.trim()) { updates.publisher = publisher.trim(); hasUpdates = true; }
      if (updateGenre && genre.trim()) { updates.genre = genre.trim(); hasUpdates = true; }
      if (updateVolume && volume.trim()) { updates.volume = volume.trim(); hasUpdates = true; }
      if (updateCreators) {
        const validCreators = creators.filter(c => c.name.trim() !== '');
        updates.creators = validCreators;
        hasUpdates = true;
      }

      if (hasUpdates) {
        await updateComic({ ...comic, ...updates });
        updatedCount++;
        if (updates.publisher || updates.series) {
          addToKnowledgeBase({
            series: updates.series || comic.series,
            publisher: updates.publisher || comic.publisher,
            startYear: comic.year,
            volumes: [{ volume: updates.volume || comic.volume, year: comic.year }]
          });
        }
      }
    }
    showSuccess(`Updated ${updatedCount} comics with bulk changes.`);
    handleClose();
  };

  const handleClose = () => {
    setUpdateSeries(false);
    setUpdateTitle(false);
    setUpdateSummary(false);
    setUpdatePublisher(false);
    setUpdateGenre(false);
    setUpdateVolume(false);
    setUpdateCreators(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Edit Comics</DialogTitle>
          <DialogDescription>
            Update common fields across {selectedComics.length} selected comics. 
            Only enabled fields will be updated.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[60vh] p-4">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox id="update-series" checked={updateSeries} onCheckedChange={(c) => setUpdateSeries(Boolean(c))} className="mt-2" />
                <div className="flex-1">
                  <Label htmlFor="series-input">Series</Label>
                  <Input id="series-input" value={series} onChange={(e) => setSeries(e.target.value)} placeholder="Enter series name..." disabled={!updateSeries} />
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox id="update-title" checked={updateTitle} onCheckedChange={(c) => setUpdateTitle(Boolean(c))} className="mt-2" />
                <div className="flex-1">
                  <Label htmlFor="title-input">Title</Label>
                  <Input id="title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter issue title..." disabled={!updateTitle} />
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox id="update-publisher" checked={updatePublisher} onCheckedChange={(c) => setUpdatePublisher(Boolean(c))} className="mt-2" />
                <div className="flex-1">
                  <Label htmlFor="publisher-input">Publisher</Label>
                  <Input id="publisher-input" value={publisher} onChange={(e) => setPublisher(e.target.value)} list="publisher-options-bulk" placeholder="Type or select publisher..." disabled={!updatePublisher} />
                  <datalist id="publisher-options-bulk">
                    {publisherOptions.map((option) => <option key={option} value={option} />)}
                  </datalist>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox id="update-genre" checked={updateGenre} onCheckedChange={(c) => setUpdateGenre(Boolean(c))} className="mt-2" />
                <div className="flex-1">
                  <Label htmlFor="genre-input">Genre</Label>
                  <Input id="genre-input" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g., Superhero, Horror, Sci-Fi" disabled={!updateGenre} />
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox id="update-volume" checked={updateVolume} onCheckedChange={(c) => setUpdateVolume(Boolean(c))} className="mt-2" />
                <div className="flex-1">
                  <Label htmlFor="volume-input">Volume</Label>
                  <Input id="volume-input" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="e.g., 2016" disabled={!updateVolume} />
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox id="update-summary" checked={updateSummary} onCheckedChange={(c) => setUpdateSummary(Boolean(c))} className="mt-2" />
                <div className="flex-1">
                  <Label htmlFor="summary-input">Summary</Label>
                  <Textarea id="summary-input" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Enter a brief summary..." disabled={!updateSummary} />
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox id="update-creators" checked={updateCreators} onCheckedChange={(c) => setUpdateCreators(Boolean(c))} className="mt-2" />
                <div className="flex-1">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Creators</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addCreator} disabled={!updateCreators}>
                        <Plus className="h-4 w-4 mr-2" /> Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {creators.map((creator, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input placeholder="Creator Name" value={creator.name} onChange={(e) => updateCreatorName(index, e.target.value)} className="flex-1" disabled={!updateCreators} />
                          <Select value={creator.role} onValueChange={(value) => updateCreatorRole(index, value)} disabled={!updateCreators}>
                            <SelectTrigger className="flex-1"><SelectValue placeholder="Role" /></SelectTrigger>
                            <SelectContent>
                              {creatorRoles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeCreator(index)} disabled={!updateCreators}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={!updateSeries && !updateTitle && !updateSummary && !updatePublisher && !updateGenre && !updateVolume && !updateCreators}>
              Update {selectedComics.length} Comics
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditComicsModal;