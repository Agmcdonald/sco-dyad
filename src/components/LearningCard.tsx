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
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";
import { showSuccess } from "@/utils/toast";
import { parseFilename, generateSuggestedFilename } from "@/lib/parser";
import { getKnowledgeSuggestions, searchKnowledgeBase } from "@/lib/knowledgeBase";
import Suggestions, { Suggestion } from "./Suggestions";

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
  const { knowledgeBase } = useKnowledgeBase();

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

  // Generate publisher options from existing comics and knowledge base
  const publisherOptions: ComboboxOption[] = useMemo(() => {
    const publishersFromComics = [...new Set(comics.map(c => c.publisher))];
    const publishersFromKnowledge = [...new Set(knowledgeBase.map(entry => entry.publisher))];
    
    const allPublishers = [...new Set([...publishersFromComics, ...publishersFromKnowledge])];
    
    return allPublishers.map(publisher => ({
      label: publisher,
      value: publisher
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [comics, knowledgeBase]);

  // Generate series options from existing comics and knowledge base
  const seriesOptions: ComboboxOption[] = useMemo(() => {
    const seriesFromComics = [...new Set(comics.map(c => c.series))];
    const seriesFromKnowledge = [...new Set(knowledgeBase.map(entry => entry.series))];
    
    const allSeries = [...new Set([...seriesFromComics, ...seriesFromKnowledge])];
    
    return allSeries.map(series => ({
      label: series,
      value: series
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [comics, knowledgeBase]);

  useEffect(() => {
    // Get knowledge base suggestions
    const knowledgeMatches = searchKnowledgeBase(parsedInfo);
    const bestMatch = knowledgeMatches.length > 0 ? knowledgeMatches[0] : null;

    form.reset({
      series: parsedInfo.series || "",
      issue: parsedInfo.issue || "",
      year: parsedInfo.year || new Date().getFullYear(),
      volume: parsedInfo.volume || (bestMatch?.volume) || "",
      publisher: bestMatch?.publisher || "",
    });
  }, [parsedInfo, form]);

  const suggestions: Suggestion[] = useMemo(() => {
    const suggs: Suggestion[] = [];
    
    // Add parsed suggestions
    if (parsedInfo.series) suggs.push({ label: "Series", value: parsedInfo.series, field: "series" });
    if (parsedInfo.issue) suggs.push({ label: "Issue", value: parsedInfo.issue, field: "issue" });
    if (parsedInfo.year) suggs.push({ label: "Year", value: String(parsedInfo.year), field: "year" });
    if (parsedInfo.volume) suggs.push({ label: "Volume", value: parsedInfo.volume, field: "volume" });
    
    // Add knowledge base suggestions
    const knowledgeSuggestions = getKnowledgeSuggestions(parsedInfo);
    suggs.push(...knowledgeSuggestions);
    
    return suggs;
  }, [parsedInfo]);

  // Generate suggested clean filename
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
    showSuccess(`'${values.series} #${values.issue}' added to library.`);
  };

  const handleSkip = () => {
    skipFile(file);
    showSuccess(`Skipped file: ${file.name}`);
  };

  // Get knowledge base matches for display
  const knowledgeMatches = useMemo(() => searchKnowledgeBase(parsedInfo), [parsedInfo]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="truncate">{file.name}</span>
              {knowledgeMatches.length > 0 && (
                <div className="text-sm font-normal text-muted-foreground">
                  {knowledgeMatches.length} potential match{knowledgeMatches.length !== 1 ? 'es' : ''} found
                </div>
              )}
            </CardTitle>
            {/* Show suggested clean filename */}
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
              
              {/* Knowledge Base Matches */}
              {knowledgeMatches.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Knowledge Base Matches:</h4>
                  {knowledgeMatches.slice(0, 3).map((match, index) => (
                    <div key={index} className="p-2 bg-muted/50 rounded text-xs">
                      <div className="font-medium">{match.series}</div>
                      <div className="text-muted-foreground">{match.publisher}</div>
                      <div className="text-muted-foreground">Vol: {match.volume}</div>
                      <div className="text-right">
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          match.confidence === 'High' ? 'bg-green-100 text-green-800' :
                          match.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {match.confidence}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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