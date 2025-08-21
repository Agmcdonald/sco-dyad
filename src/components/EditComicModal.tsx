import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Comic } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { showSuccess, showError } from "@/utils/toast";
import { useElectron } from "@/hooks/useElectron";
import { useGcdDatabaseService } from "@/services/gcdDatabaseService";
import { RefreshCw, Loader2, Plus, Trash2 } from "lucide-react";
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";

const formSchema = z.object({
  series: z.string().min(1, "Series is required"),
  issue: z.string().min(1, "Issue is required"),
  year: z.coerce.number().min(1900, "Invalid year"),
  publisher: z.string().min(1, "Publisher is required"),
  volume: z.string(),
  summary: z.string().optional(),
  title: z.string().optional(),
  price: z.string().optional(),
  genre: z.string().optional(),
  publicationDate: z.string().optional(),
  creators: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    role: z.string().min(1, "Role is required"),
  })).optional(),
});

const creatorRoles = ["Writer", "Pencils", "Inks", "Colors", "Letters", "Editor", "Cover Artist", "Artist"];

interface EditComicModalProps {
  comic: Comic;
  isOpen: boolean;
  onClose: () => void;
}

const EditComicModal = ({ comic, isOpen, onClose }: EditComicModalProps) => {
  const { updateComic, comics } = useAppContext();
  const { isElectron } = useElectron();
  const gcdDbService = useGcdDatabaseService();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { knowledgeBase, addToKnowledgeBase } = useKnowledgeBase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      series: "",
      issue: "",
      year: new Date().getFullYear(),
      publisher: "",
      volume: "",
      summary: "",
      title: "",
      price: "",
      genre: "",
      publicationDate: "",
      creators: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "creators",
  });

  // Reset form when comic changes or modal opens
  useEffect(() => {
    if (comic && isOpen) {
      console.log('[EDIT-COMIC] Resetting form with comic data:', comic);
      form.reset({
        series: comic.series || "",
        issue: comic.issue || "",
        year: comic.year || new Date().getFullYear(),
        publisher: comic.publisher || "",
        volume: comic.volume || "",
        summary: comic.summary || "",
        title: comic.title || "",
        price: comic.price || "",
        genre: comic.genre || "",
        publicationDate: comic.publicationDate || "",
        creators: comic.creators || [],
      });
    }
  }, [comic, isOpen, form]);

  const publisherOptions = useMemo(() => {
    const publishersFromComics = [...new Set(comics.map(c => c.publisher))].filter(Boolean) as string[];
    const publishersFromKb = [...new Set(knowledgeBase.map(k => k.publisher))].filter(Boolean) as string[];
    return [...new Set([...publishersFromComics, ...publishersFromKb, 'Unknown Publisher'])].sort();
  }, [comics, knowledgeBase]);

  const seriesOptions = useMemo(() => {
    const seriesFromComics = [...new Set(comics.map(c => c.series))].filter(Boolean) as string[];
    const seriesFromKb = [...new Set(knowledgeBase.map(k => k.series))].filter(Boolean) as string[];
    return [...new Set([...seriesFromComics, ...seriesFromKb])].sort();
  }, [comics, knowledgeBase]);

  const handleRefreshFromDb = async () => {
    if (!gcdDbService) {
      showError("Local database is not connected.");
      return;
    }
    setIsRefreshing(true);
    try {
      const seriesResults = await gcdDbService.searchSeries(comic.series);
      if (seriesResults.length === 0) {
        showError(`Could not find series "${comic.series}" in the local database.`);
        return;
      }
      
      const seriesMatch = seriesResults[0];
      const issueDetails = await gcdDbService.getIssueDetails(seriesMatch.id, comic.issue);
      if (!issueDetails) {
        showError(`Could not find issue #${comic.issue} for "${comic.series}" in the database.`);
        return;
      }

      const creators = await gcdDbService.getIssueCreators(issueDetails.id);

      form.reset({
        series: seriesMatch.name,
        issue: comic.issue,
        year: parseInt(issueDetails.publication_date?.substring(0, 4), 10) || comic.year,
        publisher: seriesMatch.publisher,
        volume: String(seriesMatch.year_began),
        summary: issueDetails.synopsis || comic.summary,
        title: issueDetails.title || comic.title,
        publicationDate: issueDetails.publication_date || comic.publicationDate,
        price: issueDetails.price || comic.price,
        genre: issueDetails.genre || comic.genre,
        creators: creators.length > 0 ? creators : comic.creators,
      });

      showSuccess("Form data refreshed from local database.");

    } catch (error) {
      console.error("Error refreshing from DB:", error);
      showError("An error occurred while refreshing data.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('[EDIT-COMIC] Submitting form with values:', values);
    const updated = { ...comic, ...values };
    try {
      await updateComic(updated);
      addToKnowledgeBase({
        series: values.series,
        publisher: values.publisher,
        startYear: values.year,
        volumes: values.volume ? [{ volume: values.volume, year: values.year }] : []
      });
      showSuccess("Comic details updated.");
      onClose();
    } catch (err) {
      console.error("Failed to update comic:", err);
      showError("Failed to save changes.");
    }
  };

  const handleAddCreator = () => {
    console.log('[EDIT-COMIC] Adding new creator');
    append({ name: "", role: "Writer" });
  };

  const handleRemoveCreator = (index: number) => {
    console.log('[EDIT-COMIC] Removing creator at index:', index);
    remove(index);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Edit Metadata</DialogTitle>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={handleRefreshFromDb} 
              disabled={!isElectron || isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
          <DialogDescription>
            Make changes to the comic details here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[60vh] p-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Story Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., The Dark Knight Returns" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="series"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Series</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          list="series-options-edit" 
                          placeholder="Type or select series..." 
                        />
                      </FormControl>
                      <datalist id="series-options-edit">
                        {seriesOptions.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="issue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issue</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 001" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} placeholder="e.g., 2025" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="publisher"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publisher</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          list="publisher-options-edit" 
                          placeholder="Type or select publisher..." 
                        />
                      </FormControl>
                      <datalist id="publisher-options-edit">
                        {publisherOptions.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="genre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Genre</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Superhero" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., $3.99" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="publicationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publication Date</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 2023-10-25" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Summary</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter a brief summary..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Creators</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddCreator}>
                      <Plus className="h-4 w-4 mr-2" /> Add Creator
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name={`creators.${index}.name`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input placeholder="Creator Name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`creators.${index}.role`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {creatorRoles.map(role => (
                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                    {fields.length === 0 && (
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
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditComicModal;