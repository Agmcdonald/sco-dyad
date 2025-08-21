import { useState, useEffect } from "react";
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
  
  // Form state
  const [formData, setFormData] = useState({
    publisher: "",
    genre: "",
    volume: "",
  });
  
  const [enabledFields, setEnabledFields] = useState({
    publisher: false,
    genre: false,
    volume: false,
    creators: false,
  });
  
  const [creators, setCreators] = useState<Creator[]>([]);

  const selectedComicObjects = comics.filter(c => selectedComics.includes(c.id));

  // Generate publisher options from existing comics and knowledge base
  const publisherOptions = (() => {
    const publishersFromComics = [...new Set(comics.map(c => c.publisher))];
    const publishersFromKnowledge = [...new Set(knowledgeBase.map(entry => entry.publisher))];
    const commonPublishers = ['Marvel Comics', 'DC Comics', 'Image Comics', 'Dark Horse Comics', 'IDW Publishing'];
    const allPublishers = [...new Set([...publishersFromComics, ...publishersFromKnowledge, ...commonPublishers])];
    
    return allPublishers
      .filter(publisher => publisher && publisher.trim() !== '')
      .sort();
  })();

  // Initialize form values when modal opens
  useEffect(() => {
    if (isOpen && selectedComicObjects.length > 0) {
      // Find most common values
      const publishers = selectedComicObjects.map(c => c.publisher).filter(Boolean);
      const publisherCounts = publishers.reduce((acc, pub) => {
        acc[pub!] = (acc[pub!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mostCommonPublisher = Object.entries(publisherCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

      const genres = selectedComicObjects.map(c => c.genre).filter(Boolean);
      const genreCounts = genres.reduce((acc, genre) => {
        acc[genre!] = (acc[genre!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mostCommonGenre = Object.entries(genreCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

      const volumes = selectedComicObjects.map(c => c.volume).filter(Boolean);
      const volumeCounts = volumes.reduce((acc, vol) => {
        acc[vol!] = (acc[vol!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mostCommonVolume = Object.entries(volumeCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

      setFormData({
        publisher: mostCommonPublisher,
        genre: mostCommonGenre,
        volume: mostCommonVolume,
      });

      // Reset creators to empty
      setCreators([]);
    }
  }, [isOpen, selectedComics, comics]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleField = (fieldName: keyof typeof enabledFields) => {
    setEnabledFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const addCreator = () => {
    setCreators(prev => [...prev, { name: "", role: "Writer" }]);
  };

  const removeCreator = (index: number) => {
    setCreators(prev => prev.filter((_, i) => i !== index));
  };

  const updateCreator = (index: number, field: 'name' | 'role', value: string) => {
    setCreators(prev => prev.map((creator, i) => 
      i === index ? { ...creator, [field]: value } : creator
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let updatedCount = 0;

    for (const comic of selectedComicObjects) {
      const updates: Partial<Comic> = {};
      let hasUpdates = false;

      if (enabledFields.publisher && formData.publisher.trim()) {
        updates.publisher = formData.publisher.trim();
        hasUpdates = true;
      }

      if (enabledFields.genre && formData.genre.trim()) {
        updates.genre = formData.genre.trim();
        hasUpdates = true;
      }

      if (enabledFields.volume && formData.volume.trim()) {
        updates.volume = formData.volume.trim();
        hasUpdates = true;
      }

      if (enabledFields.creators && creators.length > 0) {
        // Filter out empty creators
        const validCreators = creators.filter(c => c.name.trim() !== '');
        if (validCreators.length > 0) {
          updates.creators = validCreators;
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        await updateComic({ ...comic, ...updates });
        updatedCount++;

        // Add to knowledge base if publisher was updated
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
    setEnabledFields({
      publisher: false,
      genre: false,
      volume: false,
      creators: false,
    });
    setCreators([]);
    setFormData({
      publisher: "",
      genre: "",
      volume: "",
    });
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
                  checked={enabledFields.publisher}
                  onCheckedChange={() => toggleField('publisher')}
                  className="mt-2"
                />
                <div className="flex-1">
                  <Label htmlFor="publisher-input">Publisher</Label>
                  <Input
                    id="publisher-input"
                    value={formData.publisher}
                    onChange={(e) => handleInputChange('publisher', e.target.value)}
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
                  checked={enabledFields.genre}
                  onCheckedChange={() => toggleField('genre')}
                  className="mt-2"
                />
                <div className="flex-1">
                  <Label htmlFor="genre-input">Genre</Label>
                  <Input
                    id="genre-input"
                    value={formData.genre}
                    onChange={(e) => handleInputChange('genre', e.target.value)}
                    placeholder="e.g., Superhero, Horror, Sci-Fi"
                  />
                </div>
              </div>

              {/* Volume Field */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="update-volume"
                  checked={enabledFields.volume}
                  onCheckedChange={() => toggleField('volume')}
                  className="mt-2"
                />
                <div className="flex-1">
                  <Label htmlFor="volume-input">Volume</Label>
                  <Input
                    id="volume-input"
                    value={formData.volume}
                    onChange={(e) => handleInputChange('volume', e.target.value)}
                    placeholder="e.g., 2016"
                  />
                </div>
              </div>

              {/* Creators Field */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="update-creators"
                  checked={enabledFields.creators}
                  onCheckedChange={() => toggleField('creators')}
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
                            onChange={(e) => updateCreator(index, 'name', e.target.value)}
                            className="flex-1"
                          />
                          <Select 
                            value={creator.role} 
                            onValueChange={(value) => updateCreator(index, 'role', value)}
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
                  {enabledFields.publisher && formData.publisher && (
                    <div>• Publisher: {formData.publisher}</div>
                  )}
                  {enabledFields.genre && formData.genre && (
                    <div>• Genre: {formData.genre}</div>
                  )}
                  {enabledFields.volume && formData.volume && (
                    <div>• Volume: {formData.volume}</div>
                  )}
                  {enabledFields.creators && creators.length > 0 && (
                    <div>• Creators: {creators.filter(c => c.name.trim()).length} creator(s)</div>
                  )}
                  {!Object.values(enabledFields).some(enabled => enabled) && (
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
              disabled={!Object.values(enabledFields).some(enabled => enabled)}
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