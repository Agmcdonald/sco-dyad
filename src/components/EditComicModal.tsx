import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Comic } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/context/AppContext";
import { creatorRoles } from "@/lib/constants";
import { CONTENT_RATINGS } from "@/lib/ratings";
import { Trash2 } from "lucide-react";

interface EditComicModalProps {
  comic: Comic;
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  series: z.string().min(1, "Series is required"),
  issue: z.string().min(1, "Issue number is required"),
  year: z.coerce.number().min(1900, "Invalid year"),
  publisher: z.string().min(1, "Publisher is required"),
  volume: z.string(),
  title: z.string().optional(),
  publicationDate: z.string().optional(),
  summary: z.string().optional(),
  genre: z.string().optional(),
  characters: z.string().optional(),
  price: z.string().optional(),
  barcode: z.string().optional(),
  languageCode: z.string().optional(),
  countryCode: z.string().optional(),
  contentRating: z.string().optional(),
  creators: z.array(
    z.object({
      name: z.string().min(1, "Creator name is required"),
      role: z.string().min(1, "Creator role is required"),
    })
  ).optional(),
});

const EditComicModal = ({ comic, isOpen, onClose }: EditComicModalProps) => {
  const { updateComic } = useAppContext();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      series: comic.series || "",
      issue: comic.issue || "",
      year: comic.year || new Date().getFullYear(),
      publisher: comic.publisher || "",
      volume: comic.volume || "",
      title: comic.title || "",
      publicationDate: comic.publicationDate || "",
      summary: comic.summary || "",
      genre: comic.genre || "",
      characters: comic.characters || "",
      price: comic.price || "",
      barcode: comic.barcode || "",
      languageCode: comic.languageCode || "",
      countryCode: comic.countryCode || "",
      contentRating: comic.contentRating || "",
      creators: comic.creators || [],
    },
  });

  // Removed the useEffect that was causing the form to reset on every render.
  // The defaultValues in useForm are sufficient for initial setup.

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const updatedValues = { ...values };
    if (updatedValues.contentRating === "none" || updatedValues.contentRating === "") {
      updatedValues.contentRating = undefined;
    }
    
    await updateComic({ ...comic, ...updatedValues });
    onClose();
  };

  const addCreator = () => {
    const creators = form.getValues("creators") || [];
    form.setValue("creators", [...creators, { name: "", role: "" }]);
  };

  const removeCreator = (index: number) => {
    const creators = form.getValues("creators") || [];
    form.setValue("creators", creators.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Comic: {comic.series} #{comic.issue}</DialogTitle>
          <DialogDescription>
            Make changes to the comic's metadata. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <FormField control={form.control} name="series" render={({ field }) => (
                  <FormItem><FormLabel>Series</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="issue" render={({ field }) => (
                  <FormItem><FormLabel>Issue</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="publisher" render={({ field }) => (
                  <FormItem><FormLabel>Publisher</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="volume" render={({ field }) => (
                  <FormItem><FormLabel>Volume</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="year" render={({ field }) => (
                  <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="publicationDate" render={({ field }) => (
                  <FormItem><FormLabel>Publication Date</FormLabel><FormControl><Input placeholder="YYYY-MM-DD" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              {/* Additional Info */}
              <div className="space-y-4">
                <FormField control={form.control} name="genre" render={({ field }) => (
                  <FormItem><FormLabel>Genre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>Price</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="barcode" render={({ field }) => (
                  <FormItem><FormLabel>Barcode</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="languageCode" render={({ field }) => (
                  <FormItem><FormLabel>Language</FormLabel><FormControl><Input placeholder="e.g., en-US" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="countryCode" render={({ field }) => (
                  <FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="e.g., US" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField
                  control={form.control}
                  name="contentRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content Rating</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a content rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Rating</SelectItem>
                          {Object.entries(CONTENT_RATINGS).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>
                              {key} - {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Summary & Characters */}
              <div className="space-y-4">
                <FormField control={form.control} name="summary" render={({ field }) => (
                  <FormItem><FormLabel>Summary</FormLabel><FormControl><Textarea className="h-32" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="characters" render={({ field }) => (
                  <FormItem><FormLabel>Characters</FormLabel><FormControl><Textarea placeholder="Comma-separated list" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Creators */}
            <div>
              <h3 className="text-lg font-medium mb-4">Creators</h3>
              {form.watch("creators")?.map((_, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-4">
                  <FormField control={form.control} name={`creators.${index}.name`} render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`creators.${index}.role`} render={({ field }) => (
                    <FormItem><FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {creatorRoles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeCreator(index)} className="self-end">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addCreator}>Add Creator</Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditComicModal;