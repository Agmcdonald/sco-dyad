import { useEffect, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { Comic } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { showSuccess } from "@/utils/toast";
import { useKnowledgeBase } from "@/context/KnowledgeBaseContext";

const creatorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
});

const formSchema = z.object({
  series: z.string().min(1, "Series is required"),
  issue: z.string().min(1, "Issue is required"),
  year: z.coerce.number().min(1900, "Invalid year"),
  publisher: z.string().min(1, "Publisher is required"),
  volume: z.string().min(1, "Volume is required"),
  title: z.string().optional(),
  summary: z.string().optional(),
  creators: z.array(creatorSchema).optional(),
});

const creatorRoles = ["Writer", "Pencils", "Inks", "Colors", "Letters", "Editor", "Cover Artist", "Artist"];

interface EditComicModalProps {
  comic: Comic;
  isOpen: boolean;
  onClose: () => void;
}

const EditComicModal = ({ comic, isOpen, onClose }: EditComicModalProps) => {
  const { updateComic, comics } = useAppContext();
  const { knowledgeBase, addCreatorsToKnowledgeBase } = useKnowledgeBase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      series: comic.series || "",
      issue: comic.issue || "",
      year: comic.year || new Date().getFullYear(),
      publisher: comic.publisher || "",
      volume: comic.volume || "",
      title: comic.title || "",
      summary: comic.summary || "",
      creators: comic.creators || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "creators",
  });

  useEffect(() => {
    if (comic) {
      form.reset({
        series: comic.series || "",
        issue: comic.issue || "",
        year: comic.year || new Date().getFullYear(),
        publisher: comic.publisher || "",
        volume: comic.volume || "",
        title: comic.title || "",
        summary: comic.summary || "",
        creators: comic.creators || [],
      });
    }
  }, [comic.id, form.reset]);

  const publisherOptions = useMemo(() => {
    const publishersFromComics = [...new Set(comics.map(c => c.publisher))].filter(Boolean) as string[];
    const publishersFromKnowledge = [...new Set(knowledgeBase.series.map(entry => entry.publisher))].filter(Boolean) as string[];
    return [...new Set([...publishersFromComics, ...publishersFromKnowledge])].sort();
  }, [comics, knowledgeBase.series]);

  const seriesOptions = useMemo(() => {
    const seriesFromComics = [...new Set(comics.map(c => c.series))].filter(Boolean) as string[];
    const seriesFromKnowledge = [...new Set(knowledgeBase.series.map(entry => entry.series))].filter(Boolean) as string[];
    return [...new Set([...seriesFromComics, ...seriesFromKnowledge])].sort();
  }, [comics, knowledgeBase.series]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const updatedComicData = { 
        ...comic, 
        ...values, 
    };
    updateComic(updatedComicData);

    if (values.creators && values.creators.length > 0) {
      addCreatorsToKnowledgeBase(values.creators);
    }

    showSuccess("Comic details updated.");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Comic Details</DialogTitle>
          <DialogDescription>
            Edit the details for this comic. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[60vh] p-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="series"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Series</FormLabel>
                      <FormControl>
                        <>
                          <Input {...field} list="series-options-comic" placeholder="Type or select series..." />
                          <datalist id="series-options-comic">
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
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., The Last Hunt" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
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
                    name="volume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume</FormLabel>
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
                          <Input {...field} list="publisher-options-comic" placeholder="Type or select publisher..." />
                          <datalist id="publisher-options-comic">
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
                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Summary</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Enter a brief summary..." className="h-24" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Creators</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", role: "Writer" })}>
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
                                <Input {...field} placeholder="Creator Name" />
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
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