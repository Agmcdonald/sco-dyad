import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Suggestions, { Suggestion } from "./Suggestions";
import { QueuedFile } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { showSuccess } from "@/utils/toast";

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

const mockSuggestions: Suggestion[] = [
    { label: "Series", value: "The Wicked + The Divine", field: "series" },
    { label: "Publisher", value: "Image Comics", field: "publisher" },
    { label: "Year", value: "2014", field: "year" },
];

const LearningCard = ({ file }: LearningCardProps) => {
  const { addComic, removeFile } = useAppContext();

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

  const onSubmit = (values: FormSchemaType) => {
    addComic({
      ...values,
      summary: `Manually mapped from file: ${file.name}`,
    }, file.name);
    removeFile(file.id);
    showSuccess(`'${values.series} #${values.issue}' added to library.`);
  };

  const handleSkip = () => {
    removeFile(file.id, 'skip');
    showSuccess(`Skipped file: ${file.name}`);
  };

  const handleSuggestionClick = (field: string, value: string) => {
    form.setValue(field as keyof FormSchemaType, value, { shouldValidate: true });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>{file.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="aspect-w-2 aspect-h-3 rounded-lg bg-muted flex items-center justify-center">
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
                      <FormControl><Input placeholder="e.g., DC Comics" {...field} /></FormControl>
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
                      <FormControl><Input placeholder="e.g., Batman" {...field} /></FormControl>
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
                      <FormControl><Input placeholder="e.g., 125" {...field} /></FormControl>
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
                      <FormControl><Input type="number" placeholder="e.g., 2022" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Suggestions suggestions={mockSuggestions} onSuggestionClick={handleSuggestionClick} />
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