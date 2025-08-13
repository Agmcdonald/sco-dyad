import { useEffect } from "react";
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
import { Comic } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { showSuccess } from "@/utils/toast";

const formSchema = z.object({
  series: z.string().min(1, "Series is required"),
  issue: z.string().min(1, "Issue is required"),
  year: z.coerce.number().min(1900, "Invalid year"),
  publisher: z.string().min(1, "Publisher is required"),
  volume: z.string(),
});

interface EditComicModalProps {
  comic: Comic;
  isOpen: boolean;
  onClose: () => void;
}

const EditComicModal = ({ comic, isOpen, onClose }: EditComicModalProps) => {
  const { updateComic } = useAppContext();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      series: comic.series,
      issue: comic.issue,
      year: comic.year,
      publisher: comic.publisher,
      volume: comic.volume,
    },
  });

  useEffect(() => {
    form.reset({
      series: comic.series,
      issue: comic.issue,
      year: comic.year,
      publisher: comic.publisher,
      volume: comic.volume,
    });
  }, [comic, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updateComic({ ...comic, ...values });
    showSuccess("Comic details updated.");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Metadata</DialogTitle>
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
                    <Input {...field} />
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
                    <Input {...field} />
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