import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { QueuedFile } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";
import { showSuccess } from "@/utils/toast";

const formSchema = z.object({
  publisher: z.string().optional(),
  year: z.coerce.number().min(1900).optional(),
  volume: z.string().optional(),
});

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFiles: string[];
  files: QueuedFile[];
}

const BulkEditModal = ({ isOpen, onClose, selectedFiles, files }: BulkEditModalProps) => {
  const { updateFile, comics } = useAppContext();
  const { knowledgeBase } = useKnowledgeBase();
  const [enabledFields, setEnabledFields] = useState({
    publisher: false,
    year: false,
    volume: false,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      publisher: "",
      year: new Date().getFullYear(),
      volume: "",
    },
  });

  const selectedFileObjects = files.filter(f => selectedFiles.includes(f.id));

  // Generate publisher options from existing comics and knowledge base
  const publisherOptions: ComboboxOption[] = (() => {
    const publishersFromComics = [...new Set(comics.map(c => c.publisher))];
    const publishersFromKnowledge = [...new Set(knowledgeBase.series.map(entry => entry.publisher))];
    
    // Add some common publishers if not already present
    const commonPublishers = ['Marvel Comics', 'DC Comics', 'Image Comics', 'Dark Horse Comics', 'IDW Publishing'];
    const allPublishers = [...new Set([...publishersFromComics, ...publishersFromKnowledge, ...commonPublishers])];
    
    return allPublishers
      .filter(publisher => publisher && publisher.trim() !== '')
      .map(publisher => ({
        label: publisher,
        value: publisher
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  })();

  // Initialize form values when modal opens
  useEffect(() => {
    if (isOpen && selectedFileObjects.length > 0) {
      // Find most common publisher
      const publishers = selectedFileObjects.map(f => f.publisher).filter(Boolean);
      const publisherCounts = publishers.reduce((acc, pub) => {
        acc[pub!] = (acc[pub!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mostCommonPublisher = Object.entries(publisherCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

      // Find most common year
      const years = selectedFileObjects.map(f => f.year).filter(Boolean);
      const yearCounts = years.reduce((acc, year) => {
        acc[year!] = (acc[year!] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      const mostCommonYear = Object.entries(yearCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || new Date().getFullYear();

      form.reset({
        publisher: mostCommonPublisher,
        year: Number(mostCommonYear),
        volume: "",
      });
    }
  }, [isOpen, selectedFiles, files, form]);

  const toggleField = (fieldName: keyof typeof enabledFields) => {
    setEnabledFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    let updatedCount = 0;

    selectedFileObjects.forEach(file => {
      const updates: Partial<QueuedFile> = {};
      let hasUpdates = false;

      if (enabledFields.publisher && values.publisher) {
        updates.publisher = values.publisher;
        hasUpdates = true;
      }

      if (enabledFields.year && values.year) {
        updates.year = values.year;
        hasUpdates = true;
      }

      if (enabledFields.volume && values.volume) {
        updates.volume = values.volume;
        hasUpdates = true;
      }

      if (hasUpdates) {
        updateFile({ ...file, ...updates });
        updatedCount++;
      }
    });

    showSuccess(`Updated ${updatedCount} files with bulk changes.`);
    handleClose();
  };

  const handleClose = () => {
    setEnabledFields({
      publisher: false,
      year: false,
      volume: false,
    });
    form.reset();
    onClose();
  };

  // Watch form values for preview
  const watchedValues = form.watch();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Edit Files</DialogTitle>
          <DialogDescription>
            Update common fields across {selectedFiles.length} selected files. 
            Only enabled fields will be updated.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Publisher Field */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="update-publisher"
                checked={enabledFields.publisher}
                onCheckedChange={() => toggleField('publisher')}
                className="mt-2"
              />
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="publisher"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publisher</FormLabel>
                      <FormControl>
                        <Combobox
                          options={publisherOptions}
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          placeholder="Select or type publisher..."
                          emptyText="No publishers found."
                          disabled={!enabledFields.publisher}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Year Field */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="update-year"
                checked={enabledFields.year}
                onCheckedChange={() => toggleField('year')}
                className="mt-2"
              />
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 2012"
                          disabled={!enabledFields.year}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
                <FormField
                  control={form.control}
                  name="volume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volume</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 2012"
                          disabled={!enabledFields.volume}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Preview of changes */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium">Preview of changes:</Label>
              <div className="text-sm text-muted-foreground mt-1">
                {enabledFields.publisher && watchedValues.publisher && (
                  <div>• Publisher: {watchedValues.publisher}</div>
                )}
                {enabledFields.year && watchedValues.year && (
                  <div>• Year: {watchedValues.year}</div>
                )}
                {enabledFields.volume && watchedValues.volume && (
                  <div>• Volume: {watchedValues.volume}</div>
                )}
                {!Object.values(enabledFields).some(enabled => enabled) && (
                  <div>No fields selected for update</div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!Object.values(enabledFields).some(enabled => enabled)}
              >
                Update {selectedFiles.length} Files
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditModal;