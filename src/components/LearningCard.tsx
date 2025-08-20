import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { QueuedFile, NewComic } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { showSuccess } from "@/utils/toast";
import { parseFilename, generateSuggestedFilename } from "@/lib/parser";
import Suggestions, { Suggestion } from "./Suggestions";
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";

interface LearningCardProps {
  file: QueuedFile;
}

const formSchema = z.object({
  publisher: z.string().min(1, "Publisher is required"),
  series: z.string().min(1, "Series is required"),
  volume: z.string().min(1, "Volume is required"),
  issue: z.string().min(1, "Issue is required"),
  year: z.coerce.number().min(1900, "Invalid year"),
});

type FormSchemaType = z.infer<typeof formSchema>;

const LearningCard = ({ file }: LearningCardProps) => {
  const { addComic, removeFile, skipFile, comics } = useAppContext();
  const { knowledgeBase, addToKnowledgeBase } = useKnowledgeBase();

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      publisher: "",
      series: "",
      volume: "",
      issue: "",
      year: new Date().getFullYear(),
    },
  });

  const parsedInfo = useMemo(() => parseFilename(file.path), [file.path]);

  const publisherOptions: ComboboxOption[] = useMemo(() => {
    const publishersFromComics = [...new Set(comics.map(c => c.publisher))];
    const publishersFromKb = [...new Set(knowledgeBase.map(k => k.publisher))];
    const merged = [...new Set([...publishersFromComics, ...publishersFromKb])];
    return merged.map(publisher => ({
      label: publisher,
      value: publisher
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [comics, knowledgeBase]);

  const seriesOptions: ComboboxOption[] = useMemo(() => {
    const seriesFromComics = [...new Set(comics.map(c => c.series))];
    const seriesFromKb = [...new Set(knowledgeBase.map(k => k.series))];
    const merged = [...new Set([...seriesFromComics, ...seriesFromKb])];
    return merged.map(series => ({
      label: series,
      value: series
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [comics, knowledgeBase]);

  useEffect(() => {
    form.reset({
      series: parsedInfo.series || "",
      issue: parsedInfo.issue || "",
      year: parsedInfo.year || new Date().getFullYear(),
      volume: parsedInfo.volume || "",
      publisher: parsedInfo.publisher || "",
    });
  }, [parsedInfo, form]);

  const suggestions: Suggestion[] = useMemo(() => {
    const suggs: Suggestion[] = [];
    if (parsedInfo.series) suggs.push({ label: "Series", value: parsedInfo.series, field: "series" });
    if (parsedInfo.issue) suggs.push({ label: "Issue", value: parsedInfo.issue, field: "issue" });
    if (parsedInfo.year) suggs.push({ label: "Year", value: String(parsedInfo.year), field: "year" });
    if (parsedInfo.volume) suggs.push({ label: "Volume", value: parsedInfo.volume, field: "volume" });
    if (parsedInfo.publisher) suggs.push({ label: "Publisher", value: parsedInfo.publisher, field: "publisher" });
    return suggs;
  }, [parsedInfo]);

  const suggestedFilename = useMemo(() => {
    return generateSuggestedFilename(parsedInfo);
  }, [parsedInfo]);

  const handleSuggestionClick = (field: string, value: string) => {
    form.setValue(field as keyof FormSchemaType, value, { shouldValidate: true });
  };

  const onSubmit = (values: FormSchemaType) => {
    const comicData: NewComic = {
      series: values.series,
      issue: values.issue,
      year: values.year,
      publisher: values.publisher,
      volume: values.volume,
      summary: `Manually mapped from file: ${file.name}`,
    };
    
    addComic(comicData, file);
    removeFile(file.id);

    addToKnowledgeBase({
      series: values.series,
      publisher: values.publisher,
      startYear: values.year,
      volumes: [{ volume: values.volume, year: values.year }]
    });

    showSuccess(`'${values.series} #${values.issue}' added to library.`);
  };

  const handleSkip = () => {
    skipFile(file);
    showSuccess(`Skipped file: ${file.name}`);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="truncate">{file.name}</span>
            </CardTitle>
            {suggestedFilename && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Suggested format:</span> {suggestedFilename}
              </div>
            )}
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="aspect-w-2 aspect-h-3 rounded-lg bg-muted flex items-center justify-center mb-4">
                <span className="text-sm text-muted-foreground">No Preview</span>
              </div>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="volume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volume</FormLabel>
                      <FormControl><Input placeholder="e.g., 2016" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="issue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue</FormLabel>
                      <FormControl><Input placeholder="e.g., 001" {...field} /></FormControl>
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
                      <FormControl><Input type="number" placeholder="e.g., 2025" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Suggestions suggestions={suggestions} onSuggestionClick={handleSuggestionClick} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleSkip}>Skip</Button>
            <Button type="submit">Save Mapping</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default LearningCard;