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

interface FieldUpdate {
  field: keyof Pick<QueuedFile, 'publisher' | 'year' | 'volume'>;
  enabled: boolean;
  value: string | number;
}

const BulkEditModal = ({ isOpen, onClose, selectedFiles, files }: BulkEditModalProps) => {
  const { updateFile, comics } = useAppContext();
  const { knowledgeBase } = useKnowledgeBase();
  const [fieldUpdates, setFieldUpdates] = useState<Record<string, FieldUpdate>>({
    publisher: { field: 'publisher', enabled: false, value: '' },
    year: { field: 'year', enabled: false, value: new Date().getFullYear() },
    volume: { field: 'volume', enabled: false, value: '' },
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
    const publishersFromKnowledge = [...new Set(knowledgeBase.map(entry => entry.publisher))];
    const allPublishers = [...new Set([...publishersFromComics, ...publishersFromKnowledge])];
    
    return allPublishers.map(publisher => ({
      label: publisher,
      value: publisher
    })).sort((a, b) => a.label.localeCompare(b.label));
  })();

  // Auto-detect common values from selected files
  useEffect(() => {
    if (selectedFileObjects.length > 0) {
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

      setFieldUpdates(prev => ({
        ...prev,
        publisher: { ...prev.publisher, value: mostCommonPublisher },
        year: { ...prev.year, value: Number(mostCommonYear) },
      }));
    }
  }, [selectedFileObjects, form]);

  const toggleField = (fieldName: string, enabled: boolean) => {
    setFieldUpdates(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], enabled }
    }));
  };

  const updateFieldValue = (fieldName: string, value: string | number) => {
    setFieldUpdates(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], value }
    }));
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    let updatedCount = 0;

    selectedFileObjects.forEach(file => {
      const updates: Partial<QueuedFile> = {};
      let hasUpdates = false;

      if (fieldUpdates.publisher.enabled && values.publisher) {
        updates.publisher = values.publisher;
        hasUpdates = true;
      }

      if (fieldUpdates.year.enabled && values.year) {
        updates.year = values.year;
        hasUpdates = true;
      }

      if (fieldUpdates.volume.enabled && values.volume) {
        updates.volume = values.volume;
        hasUpdates = true;
      }

      if (hasUpdates) {
        updateFile({ ...file, ...updates });
        updatedCount++;
      }
    });

    showSuccess(`Updated ${updatedCount} files with bulk changes.`);
    onClose();
  };

  const handleClose = () => {
    setFieldUpdates({
      publisher: { field: 'publisher', enabled: false, value: '' },
      year: { field: 'year', enabled: false, value: new Date().getFullYear() },
      volume: { field: 'volume', enabled: false, value: '' },
    });
    onClose();
  };

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
                checked={fieldUpdates.publisher.enabled}
                onCheckedChange={(checked) => toggleField('publisher', !!checked)}
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
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateFieldValue('publisher', value);
                          }}
                          placeholder="Select or type publisher..."
                          emptyText="No publishers found."
                          disabled={!fieldUpdates.publisher.enabled}
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
                checked={fieldUpdates.year.enabled}
                onCheckedChange={(checked) => toggleField('year', !!checked)}
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
                          disabled={!fieldUpdates.year.enabled}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            updateFieldValue('year', parseInt(e.target.value) || new Date().getFullYear());
                          }}
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
                checked={fieldUpdates.volume.enabled}
                onCheckedChange={(checked) => toggleField('volume', !!checked)}
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
                          disabled={!fieldUpdates.volume.enabled}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            updateFieldValue('volume', e.target.value);
                          }}
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
                {Object.entries(fieldUpdates)
                  .filter(([, update]) => update.enabled)
                  .map(([field, update]) => (
                    <div key={field}>
                      • {field.charAt(0).toUpperCase() + field.slice(1)}: {update.value}
                    </div>
                  ))}
                {Object.values(fieldUpdates).every(update => !update.enabled) && (
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
                disabled={Object.values(fieldUpdates).every(update => !update.enabled)}
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