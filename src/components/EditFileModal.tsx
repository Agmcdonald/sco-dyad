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

  useEffect(() => {
    form.reset({
      series: file?.series || "",
      issue: file.issue || "",
      year: file.year || new Date().getFullYear(),
      publisher: file?.publisher || "",
    });
  }, [file, form]);

  const publisherOptions = useMemo(() => {
    const publishersFromComics = [...new Set(comics.map(c => c.publisher))].filter(Boolean) as string[];
    const publishersFromKnowledge = [...new Set(knowledgeBase.map(entry => entry.publisher))].filter(Boolean) as string[];
    return [...new Set([...publishersFromComics, ...publishersFromKnowledge])].sort();
  }, [comics, knowledgeBase]);

  const seriesOptions = useMemo(() => {
    const seriesFromComics = [...new Set(comics.map(c => c.series))].filter(Boolean) as string[];
    const seriesFromKnowledge = [...new Set(knowledgeBase.map(entry => entry.series))].filter(Boolean) as string[];
    return [...new Set([...seriesFromComics, ...seriesFromKnowledge])].sort();
  }, [comics, knowledgeBase]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const updatedFileData = { 
        ...file, 
        ...values, 
        confidence: "High" as const,
        status: "Pending" as const
    };
    updateFile(updatedFileData);
    setSelectedItem({ ...updatedFileData, type: 'file' });

    addToKnowledgeBase({
      series: values.series,
      publisher: values.publisher,
      startYear: values.year,
      volumes: values.year ? [{ volume: String(values.year), year: values.year }] : []
    });

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
                    <>
                      <Input {...field} list="series-options-file" placeholder="Type or select series..." />
                      <datalist id="series-options-file">
                        {seriesOptions.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </>
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
                    <>
                      <Input {...field} list="publisher-options-file" placeholder="Type or select publisher..." />
                      <datalist id="publisher-options-file">
                        {publisherOptions.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </>
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