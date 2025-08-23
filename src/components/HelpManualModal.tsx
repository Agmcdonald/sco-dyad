import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface HelpManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpManualModal = ({ isOpen, onClose }: HelpManualModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>User Manual</DialogTitle>
          <DialogDescription>
            A guide to the features and functions of the Super Comic Organizer application.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="dashboard">
              <AccordionTrigger>Dashboard</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <p>The Dashboard provides a high-level overview of your comic collection and processing queue.</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><strong>Overview Cards:</strong> Quick stats on files in queue, comics in library, items needing review, and processing errors.</li>
                    <li><strong>Insights Tab:</strong> Detailed analytics and charts about your collection, including top publishers, popular decades, and most collected series.</li>
                    <li><strong>Reading Tab:</strong> Manage your reading list and view recently read comics.</li>
                    <li><strong>Health Tab:</strong> Scans your library for potential issues like missing data or duplicates and provides recommendations.</li>
                    <li><strong>Activity Tab:</strong> A log of recent actions performed in the application.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="library">
              <AccordionTrigger>Library</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <p>The Library is where you can browse, search, and manage your organized comic collection.</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><strong>Search & Filter:</strong> Use the search bar to find comics by series or publisher. Use the dropdowns to sort your collection in various ways.</li>
                    <li><strong>View Modes:</strong> Switch between Grid, Series, and Publisher views to organize your browsing experience.</li>
                    <li><strong>Cover Size:</strong> Use the slider to adjust the size of the comic covers in the grid view.</li>
                    <li><strong>Inspector Panel:</strong> Click on a comic to view its detailed information in the Inspector panel on the right. From there, you can edit details, read the comic, or delete it.</li>
                    <li><strong>Bulk Actions:</strong> Enable "Selection Mode" to select multiple comics and perform actions like bulk editing or adding to your reading list.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="organize">
              <AccordionTrigger>Organize</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <p>The Organize page is the starting point for adding and processing your comic files.</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><strong>Add Files:</strong> Use the "Add Files" or "Scan Folder" buttons (or drag-and-drop in web mode) to add your comic files to the processing queue.</li>
                    <li><strong>File Queue:</strong> A list of all files waiting to be processed. You can select files to view their details in the Inspector.</li>
                    <li><strong>File Processor:</strong> This tool intelligently analyzes filenames to detect series, issue, year, and publisher. It uses the Knowledge Base and online scrapers to enrich the data.</li>
                    <li><strong>Bulk Actions:</strong> Select multiple files in the queue to perform actions like bulk editing, confirming matches, or removing them.</li>
                    <li><strong>Supported Formats:</strong> Currently supports CBR and CBZ comic archive formats.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="learning">
              <AccordionTrigger>Learning</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <p>The Learning page is where you manually correct comics that the system couldn't identify with high confidence.</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><strong>Manual Mapping:</strong> For each unmapped file, you are presented with a form to fill in the correct details.</li>
                    <li><strong>Suggestions:</strong> The system provides suggestions based on its analysis of the filename to help you fill out the form faster.</li>
                    <li><strong>Knowledge Base Growth:</strong> When you save a mapping, the information is added to your personal Knowledge Base, helping the system become smarter for future processing.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="knowledge">
              <AccordionTrigger>Knowledge Base</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <p>The Knowledge Base is the local database of comic series and creator information that the app uses for matching.</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><strong>Series & Publishers:</strong> View, edit, and add new comic series information. This helps the processor correctly identify series and their associated publishers and volumes.</li>
                    <li><strong>Creators:</strong> Manage a list of creators (writers, artists, etc.). This data is used to enrich comic details.</li>
                    <li><strong>Manual Edits:</strong> You can manually fine-tune the data to improve the accuracy of the automated processing.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="maintenance">
              <AccordionTrigger>Maintenance</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <p>This page contains tools for maintaining the health and integrity of your library.</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><strong>Duplicate Detector:</strong> Scans your library for potential duplicate issues and allows you to review and remove them.</li>
                    <li><strong>Backup & Restore:</strong> Export your entire library database as a JSON file for backup, or import a backup to restore your collection.</li>
                    <li><strong>Local Database Importer:</strong> (Advanced) Build a local, high-speed database from Grand Comics Database (GCD) data dumps for offline metadata enrichment.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="settings">
              <AccordionTrigger>Settings</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <p>Configure the application to suit your preferences.</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><strong>General:</strong> Change the application's theme (light/dark mode).</li>
                    <li><strong>Library:</strong> Set the root folder where your organized comics are stored and configure how original files are handled (move vs. copy).</li>
                    <li><strong>Scrapers:</strong> (Coming Soon) Enter API keys for online databases like Comic Vine to enhance metadata fetching.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HelpManualModal;