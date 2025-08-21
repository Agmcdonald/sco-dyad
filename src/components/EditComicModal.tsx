import { useEffect, useState, useRef, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2 } from "lucide-react";
import { Comic, Creator } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { showSuccess, showError } from "@/utils/toast";
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";

const creatorRoles = ["Writer", "Pencils", "Inks", "Colors", "Letters", "Editor", "Cover Artist", "Artist"];

interface EditComicModalProps {
  comic: Comic;
  isOpen: boolean;
  onClose: () => void;
}

const EditComicModal = ({ comic, isOpen, onClose }: EditComicModalProps) => {
  const { updateComic, comics } = useAppContext();
  const { knowledgeBase, addToKnowledgeBase } = useKnowledgeBase();
  const initializedRef = useRef<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    series: "",
    issue: "",
    year: new Date().getFullYear(),
    publisher: "",
    volume: "",
    genre: "",
    price: "",
    publicationDate: "",
    summary: "",
    creators: [] as Creator[]
  });

  // Generate options for datalists
  const publisherOptions = useMemo(() => {
    const publishersFromComics = [...new Set(comics.map(c => c.publisher))].filter(Boolean) as string[];
    const publishersFromKb = [...new Set(knowledgeBase.map(k => k.publisher))].filter(Boolean) as string[];
    const commonPublishers = ['Marvel Comics', 'DC Comics', 'Image Comics', 'Dark Horse Comics', 'IDW Publishing'];
    return [...new Set([...publishersFromComics, ...publishersFromKb, ...commonPublishers])].sort();
  }, [comics, knowledgeBase]);

  const seriesOptions = useMemo(() => {
    const seriesFromComics = [...new Set(comics.map(c => c.series))].filter(Boolean) as string[];
    const seriesFromKb = [...new Set(knowledgeBase.map(k => k.series))].filter(Boolean) as string[];
    return [...new Set([...seriesFromComics, ...seriesFromKb])].sort();
  }, [comics, knowledgeBase]);

  // Initialize form data only when modal opens with a new comic
  useEffect(() => {
    if (isOpen && comic && comic.id !== initializedRef.current) {
      console.log('[EDIT-COMIC] Initializing form with comic:', comic.id);
      initializedRef.current = comic.id;
      
      setFormData({
        title: comic.title || "",
        series: comic.series || "",
        issue: comic.issue || "",
        year: comic.year || new Date().getFullYear(),
        publisher: comic.publisher || "",
        volume: comic.volume || "",
        genre: comic.genre || "",
        price: comic.price || "",
        publicationDate: comic.publicationDate || "",
        summary: comic.summary || "",
        creators: comic.creators ? [...comic.creators] : []
      });
    }
    
    // Reset the ref when modal closes
    if (!isOpen) {
      initializedRef.current = null;
    }
  }, [isOpen, comic?.id]); // Only depend on isOpen and comic.id

  const handleInputChange = (field: string, value: any) => {
    console.log(`[EDIT-COMIC] Updating field ${field} with value:`, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddCreator = () => {
    console.log('[EDIT-COMIC] Adding new creator');
    setFormData(prev => ({
      ...prev,
      creators: [...prev.creators, { name: "", role: "Writer" }]
    }));
  };

  const handleRemoveCreator = (index: number) => {
    console.log('[EDIT-COMIC] Removing creator at index:', index);
    setFormData(prev => ({
      ...prev,
      creators: prev.creators.filter((_, i) => i !== index)
    }));
  };

  const handleCreatorChange = (index: number, field: 'name' | 'role', value: string) => {
    console.log(`[EDIT-COMIC] Updating creator ${index} field ${field} with:`, value);
    setFormData(prev => ({
      ...prev,
      creators: prev.creators.map((creator, i) => 
        i === index ? { ...creator, [field]: value } : creator
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[EDIT-COMIC] Submitting form with data:', formData);

    // Basic validation
    if (!formData.series.trim()) {
      showError("Series is required");
      return;
    }
    if (!formData.issue.trim()) {
      showError("Issue is required");
      return;
    }
    if (!formData.publisher.trim()) {
      showError("Publisher is required");
      return;
    }

    try {
      const updated = { ...comic, ...formData };
      await updateComic(updated);
      
      addToKnowledgeBase({
        series: formData.series,
        publisher: formData.publisher,
        startYear: formData.year,
        volumes: formData.volume ? [{ volume: formData.volume, year: formData.year }] : []
      });
      
      showSuccess("Comic details updated.");
      onClose();
    } catch (err) {
      console.error("Failed to update comic:", err);
      showError("Failed to save changes.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Metadata</DialogTitle>
          <DialogDescription>
            Make changes to the comic details here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[60vh] p-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Story Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., The Dark Knight Returns"
                />
              </div>

              <div>
                <Label htmlFor="series">Series *</Label>
                <Input
                  id="series"
                  value={formData.series}
                  onChange={(e) => handleInputChange('series', e.target.value)}
                  placeholder="Type or select series..."
                  list="series-options-edit"
                  required
                />
                <datalist id="series-options-edit">
                  {seriesOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issue">Issue *</Label>
                  <Input
                    id="issue"
                    value={formData.issue}
                    onChange={(e) => handleInputChange('issue', e.target.value)}
                    placeholder="e.g., 001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleInputChange('year', parseInt(e.target.value) || new Date().getFullYear())}
                    placeholder="e.g., 2025"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="publisher">Publisher *</Label>
                <Input
                  id="publisher"
                  value={formData.publisher}
                  onChange={(e) => handleInputChange('publisher', e.target.value)}
                  placeholder="Type or select publisher..."
                  list="publisher-options-edit"
                  required
                />
                <datalist id="publisher-options-edit">
                  {publisherOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="volume">Volume</Label>
                  <Input
                    id="volume"
                    value={formData.volume}
                    onChange={(e) => handleInputChange('volume', e.target.value)}
                    placeholder="e.g., 2016"
                  />
                </div>
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    value={formData.genre}
                    onChange={(e) => handleInputChange('genre', e.target.value)}
                    placeholder="e.g., Superhero, Horror, Sci-Fi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="e.g., $3.99"
                  />
                </div>
                <div>
                  <Label htmlFor="publicationDate">Publication Date</Label>
                  <Input
                    id="publicationDate"
                    value={formData.publicationDate}
                    onChange={(e) => handleInputChange('publicationDate', e.target.value)}
                    placeholder="e.g., 2023-10-25"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  placeholder="Enter a brief summary..."
                  className="resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Creators</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddCreator}>
                    <Plus className="h-4 w-4 mr-2" /> Add Creator
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.creators.map((creator, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Creator Name"
                        value={creator.name}
                        onChange={(e) => handleCreatorChange(index, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <Select 
                        value={creator.role} 
                        onValueChange={(value) => handleCreatorChange(index, 'role', value)}
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
                        onClick={() => handleRemoveCreator(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {formData.creators.length === 0 && (
                    <p className="text-sm text-muted-foreground">No creators added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditComicModal;