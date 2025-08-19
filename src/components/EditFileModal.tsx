import { useEffect, useMemo } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { QueuedFile } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { useSelection } from "@/context/SelectionContext";
import { showSuccess } from "@/utils/toast";
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";

const formSchema = z.object({
  series: z.string().min(1, "Series is required"),
  issue: z.string().min(1, "Issue is required"),
  year: z.coerce.number().min(1900, "Invalid year"),
  publisher: z.string().min(1, "Publisher is required"),
});

interface EditFileModalProps {
  file: QueuedFile;
  isOpen: boolean;
  onClose: () => void;
}

const extractComboboxValue = (val: any): string => {
  if (!val && val !== "") return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    if ("value" in val && typeof val.value === "string") return val.value;
    if ("label" in val && typeof val.label === "string") return val.label;
  }
  return String(val);
};

const EditFileModal = ({ file, isOpen, onClose }: EditFileModalProps) => {
  const { updateFile, comics } = useAppContext();
  const { setSelectedItem } = useSelection();
  const { knowledgeBase, addToKnowledgeBase } = useKnowledgeBase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      series: file.series || "",
      issue: file.issue || "",
      year: file.year || new Date().getFullYear(),
      publisher: file.publisher || "",
    },
  });

  // Generate publisher options from existing comics + knowledge base
  const publisherOptions: ComboboxOption[] = useMemo(() => {
    const publishersFromComics = [...new Set(comics.map(c => c.publisher))].filter(Boolean) as string[];
    const publishersFromKnowledge = [...new Set(knowledgeBase.map(entry => entry.publisher))].filter(Boolean) as string[];
    const all = [...new Set([...publishersFromComics, ...publishersFromKnowledge])];
    return all.map(publisher => ({ label: publisher, value: publisher })).sort((a,b) => a.label.localeCompare(b.label));
  }, [comics, knowledgeBase]);

  // Generate series options from existing comics + knowledge base
  const seriesOptions: ComboboxOption[] = useMemo(() => {
    const seriesFromComics = [...new Set(comics.map(c => c.series))].filter(Boolean) as string[];
    const seriesFromKnowledge = [...new Set(knowledgeBase.map(entry => entry.series))].filter(Boolean) as string[];
    const all = [...new Set([...seriesFromComics, ...seriesFromKnowledge])];
    return all.map(s => ({ label: s, value: s })).sort((a,b) => a.label.localeCompare(b.label));
  }, [comics, knowledgeBase]);

  useEffect(() => {
    form.reset({
      series: file.series || "",
      issue: file.issue || "",
      year: file.year || new Date().getFullYear(),
      publisher: file.publisher || "",
    });
  }, [file, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const updatedFileData = { 
        ...file, 
        ...values, 
        confidence: "High" as const,
        status: "Pending" as const
    };
    updateFile(updatedFileData);
    setSelectedItem({ ...updatedFileData, type: 'file' });

    // Add to knowledge base if series/publisher are new
    try {
      addToKnowledgeBase({
        series: values.series,
        publisher: values.publisher,
        startYear: values.year,
        volumes: values.year ? [{ volume: String(values.year), year: values.year }] : []
      });
    } catch (err) {
      console.warn("Failed to add KB entry:", err);
    }

    showSuccess("File details updated.");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Correct File Match</DialogTitle>
          <DialogDescription>
            Edit the detected details for this file. Click save when you're done.
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
                      value={typeof field.value === 'object' && field.value !== null ? (field.value.value ?? field.value.label ?? '') : (field.value ?? '')}
                      onValueChange={(v) => field.onChange(extractComboboxValue(v))}
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
                      value={typeof field.value === 'object' && field.value !== null ? (field.value.value ?? field.value.label ?? '') : (field.value ?? '')}
                      onValueChange={(v) => field.onChange(extractComboboxValue(v))}
                      placeholder="Select or type publisher..."
                      emptyText="No publishers found."
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

export default EditFileModal;