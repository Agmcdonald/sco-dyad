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

const creatorRoles = ["Writer", "Pencils", "Inks", "Colors", "Letters", "Editor", "Cover Artist", "Artist"];

interface BulkEditComicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedComics: string[];
  comics: Comic[];
}

const BulkEditComicsModal = ({ isOpen, onClose, selectedComics, comics }: BulkEditComicsModalProps) => {
  const { updateComic } = useAppContext();
  const { knowledgeBase, addToKnowledgeBase } = useKnowledgeBase();
  const initializedRef = useRef(false);
  
  // Simple state variables - same pattern as the working test
  const [publisher, setPublisher] = useState("");
  const [genre, setGenre] = useState("");
  const [volume, setVolume] = useState("");
  const [creators, setCreators] = useState<Creator[]>([]);
  
  // Checkbox states
  const [updatePublisher, setUpdatePublisher] = useState(false);
  const [updateGenre, setUpdateGenre] = useState(false);
  const [updateVolume, setUpdateVolume] = useState(false);
  const [updateCreators, setUpdateCreators] = useState(false);

  const selectedComicObjects = comics.filter(c => selectedComics.includes(c.id));

  // Generate publisher options
  const publisherOptions = (() => {
    const publishersFromComics = [...new Set(comics.map(c => c.publisher))];
    const publishersFromKnowledge = [...new Set(knowledgeBase.series.map(entry => entry.publisher))];
    const commonPublishers = ['Marvel Comics', 'DC Comics', 'Image Comics', 'Dark Horse Comics', 'IDW Publishing'];
    const allPublishers = [...new Set([...publishersFromComics, ...publishersFromKnowledge, ...commonPublishers])];
    
    return allPublishers
      .filter(pub => pub && pub.trim() !== '')
      .sort();
  })();

  // Initialize form values ONLY when modal first opens
  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      console.log("Initializing bulk edit form values");
      initializedRef.current = true;
      
      if (selectedComicObjects.length > 0) {
        // Find most common publisher
        const publishers = selectedComicObjects.map(c => c.publisher).filter(Boolean);
        const publisherCounts = publishers.reduce((acc, pub) => {
          acc[pub!] = (acc[pub!] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const mostCommonPublisher = Object.entries(publisherCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

        // Find most common genre
        const genres = selectedComicObjects.map(c => c.genre).filter(Boolean);
        const genreCounts = genres.reduce((acc, g) => {
          acc[g!] = (acc[g!] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const mostCommonGenre = Object.entries(genreCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

        // Find most common volume
        const volumes = selectedComicObjects.map(c => c.volume).filter(Boolean);
        const volumeCounts = volumes.reduce((acc, v) => {
          acc[v!] = (acc[v!] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const mostCommonVolume = Object.entries(volumeCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

        setPublisher(mostCommonPublisher);
        setGenre(mostCommonGenre);
        setVolume(mostCommonVolume);
        setCreators([]);
      }
    }
    
    // Reset when modal closes
    if (!isOpen) {
      initializedRef.current = false;
    }
  }, [isOpen]); // Only depend on isOpen

  const addCreator = () => {
    console.log("Adding creator");
    setCreators(prev => [...prev, { name: "", role: "Writer" }]);
  };

  const removeCreator = (index: number) => {
    console.log("Removing creator at index:", index);
    setCreators(prev => prev.filter((_, i) => i !== index));
  };

  const updateCreatorName = (index: number, name: string) => {
    console.log("Updating creator name at index:", index, "to:", name);
    setCreators(prev => prev.map((creator, i) => 
      i === index ? { ...creator, name } : creator
    ));
  };

  const updateCreatorRole = (index: number, role: string) => {
    console.log("Updating creator role at index:", index, "to:", role);
    setCreators(prev => prev.map((creator, i) => 
      i === index ? { ...creator, role } : creator
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let updatedCount = 0;

    for (const comic of selectedComicObjects) {
      const updates: Partial<Comic> = {};
      let hasUpdates = false;

      if (updatePublisher && publisher.trim()) {
        updates.publisher = publisher.trim();
        hasUpdates = true;
      }

      if (updateGenre && genre.trim()) {
        updates.genre = genre.trim();
        hasUpdates = true;
      }

      if (updateVolume && volume.trim()) {
        updates.volume = volume.trim();
        hasUpdates = true;
      }

      if (updateCreators && creators.length > 0) {
        const validCreators = creators.filter(c => c.name.trim() !== '');
        if (validCreators.length > 0) {
          updates.creators = validCreators;
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        await updateComic({ ...comic, ...updates });
        updatedCount++;

        if (updates.publisher) {
          addToKnowledgeBase({
            series: comic.series,
            publisher: updates.publisher,
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
    console.log("Closing bulk edit modal");
    setUpdatePublisher(false);
    setUpdateGenre(false);
    setUpdateVolume(false);
    setUpdateCreators(false);
    setCreators([]);
    setPublisher("");
    setGenre("");
    setVolume("");
    initializedRef.current = false;
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
              {/* Publisher Field */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="update-publisher"
                  checked={updatePublisher}
                  onCheckedChange={(checked) => {
                    console.log("Publisher checkbox changed:", checked);
                    setUpdatePublisher(Boolean(checked));
                  }}
                  className="mt-2"
                />
                <div className="flex-1">
                  <Label htmlFor="publisher-input">Publisher</Label>
                  <Input
                    id="publisher-input"
                    value={publisher}
                    onChange={(e) => {
                      console.log("Publisher input changed:", e.target.value);
                      setPublisher(e.target.value);
                    }}
                    list="publisher-options-bulk"
                    placeholder="Type or select publisher..."
                  />
                  <datalist id="publisher-options-bulk">
                    {publisherOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Genre Field */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="update-genre"
                  checked={updateGenre}
                  onCheckedChange={(checked) => {
                    console.log("Genre checkbox changed:", checked);
                    setUpdateGenre(Boolean(checked));
                  }}
                  className="mt-2"
                />
                <div className="flex-1">
                  <Label htmlFor="genre-input">Genre</Label>
                  <Input
                    id="genre-input"
                    value={genre}
                    onChange={(e) => {
                      console.log("Genre input changed:", e.target.value);
                      setGenre(e.target.value);
                    }}
                    placeholder="e.g., Superhero, Horror, Sci-Fi"
                  />
                </div>
              </div>

              {/* Volume Field */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="update-volume"
                  checked={updateVolume}
                  onCheckedChange={(checked) => {
                    console.log("Volume checkbox changed:", checked);
                    setUpdateVolume(Boolean(checked));
                  }}
                  className="mt-2"
                />
                <div className="flex-1">
                  <Label htmlFor="volume-input">Volume</Label>
                  <Input
                    id="volume-input"
                    value={volume}
                    onChange={(e) => {
                      console.log("Volume input changed:", e.target.value);
                      setVolume(e.target.value);
                    }}
                    placeholder="e.g., 2016"
                  />
                </div>
              </div>

              {/* Creators Field */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="update-creators"
                  checked={updateCreators}
                  onCheckedChange={(checked) => {
                    console.log("Creators checkbox changed:", checked);
                    setUpdateCreators(Boolean(checked));
                  }}
                  className="mt-2"
                />
                <div className="flex-1">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Creators</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addCreator}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Creator
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {creators.map((creator, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder="Creator Name"
                            value={creator.name}
                            onChange={(e) => updateCreatorName(index, e.target.value)}
                            className="flex-1"
                          />
                          <Select 
                            value={creator.role} 
                            onValueChange={(value) => updateCreatorRole(index, value)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              {creatorRoles.map(role => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeCreator(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {creators.length === 0 && (
                        <p className="text-sm text-muted-foreground">No creators added yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview of changes */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <Label className="text-sm font-medium">Preview of changes:</Label>
                <div className="text-sm text-muted-foreground mt-1">
                  {updatePublisher && publisher && (
                    <div>• Publisher: {publisher}</div>
                  )}
                  {updateGenre && genre && (
                    <div>• Genre: {genre}</div>
                  )}
                  {updateVolume && volume && (
                    <div>• Volume: {volume}</div>
                  )}
                  {updateCreators && creators.length > 0 && (
                    <div>• Creators: {creators.filter(c => c.name.trim()).length} creator(s)</div>
                  )}
                  {!updatePublisher && !updateGenre && !updateVolume && !updateCreators && (
                    <div>No fields selected for update</div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!updatePublisher && !updateGenre && !updateVolume && !updateCreators}
            >
              Update {selectedComics.length} Comics
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditComicsModal;