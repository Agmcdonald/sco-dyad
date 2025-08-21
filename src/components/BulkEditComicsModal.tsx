import { useState } from "react";
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
import { Comic } from "@/types";

interface BulkEditComicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedComics: string[];
  comics: Comic[];
}

const BulkEditComicsModal = ({ isOpen, onClose, selectedComics, comics }: BulkEditComicsModalProps) => {
  const [testValue, setTestValue] = useState("test");

  console.log("BulkEditComicsModal render - testValue:", testValue);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Input change event:", e.target.value);
    setTestValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with value:", testValue);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Test Bulk Edit</DialogTitle>
          <DialogDescription>
            Testing input functionality for {selectedComics.length} comics
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Label htmlFor="test-input">Test Input</Label>
          <Input
            id="test-input"
            value={testValue}
            onChange={handleInputChange}
            placeholder="Type here to test..."
            className="mt-2"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Current value: "{testValue}"
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Test Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditComicsModal;