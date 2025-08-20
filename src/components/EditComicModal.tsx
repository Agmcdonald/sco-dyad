import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
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
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { Comic } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { showSuccess, showError } from "@/utils/toast";
import { useElectron } from "@/hooks/useElectron";
import { useGcdDatabaseService } from "@/services/gcdDatabaseService";
import { RefreshCw, Loader2 } from "lucide-react";
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";

const formSchema = z.object({
  series: z.string().min(1, "Series is required"),
  issue: z.string().min(1, "Issue is required"),
  year: z.coerce.number().min(1900, "Invalid year"),
  publisher: z.string().min(1, "Publisher is required"),
  volume: z.string(),
  summary: z.string().optional(),
});

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
      series: comic.series,
      issue: comic.issue,
      year: comic.year,
      publisher: comic.publisher,
      volume: comic.volume,
      summary: comic.summary || "",
    },
  });

  useEffect(() => {
    form.reset({
      series: comic?.series || "",
      issue: comic.issue,
      year: comic.year,
      publisher: comic?.publisher || "",
      volume: comic.volume,
      summary: comic.summary || "",
    });
  }, [comic, form]);

  const publisherOptions: ComboboxOption[] = useMemo(() => {
    const publishersFromComics = [...new Set(comics.map(c => c.publisher))].filter(Boolean) as string[];
    const publishersFromKb = [...new Set(knowledgeBase.map(k => k.publisher))].filter(Boolean) as string[];
    const merged = [...new Set([...publishersFromComics, ...publishersFromKb, 'Unknown Publisher'])];
    return merged.map(publisher => ({
      label: publisher,
      value: publisher
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [comics, knowledgeBase]);

  const seriesOptions: ComboboxOption[] = useMemo(() => {
    const seriesFromComics = [...new Set(comics.map(c => c.series))].filter(Boolean) as string[];
    const seriesFromKb = [...new Set(knowledgeBase.map(k => k.series))].filter(Boolean) as string[];
    const merged = [...new Set([...seriesFromComics, ...seriesFromKb])];
    return merged.map(series => ({
      label: series,
      value: series
    })).sort((a, b) => a.label.localeCompare(b.label));
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

      form.reset({
        series: seriesMatch.name,
        issue: comic.issue,
        year: parseInt(issueDetails.publication_date?.substring(0, 4), 10) || comic.year,
        publisher: seriesMatch.publisher,
        volume: String(seriesMatch.year_began),
        summary: issueDetails.synopsis || comic.summary,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="series"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Series</FormLabel>
                  <FormControl>
                    <Combobox
                      options={seriesOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select or type series..."
                      emptyText="No series found."
                    />
                  </FormControl>
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
                      <Input {...field} />
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
                      <Input type="number" {...field} />
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
                    <Combobox
                      options={publisherOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select or type publisher..."
                      emptyText="No publishers found."
                    />
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
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditComicModal;