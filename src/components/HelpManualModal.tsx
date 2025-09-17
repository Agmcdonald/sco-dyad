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
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Super Comic Organizer - Complete User Manual</DialogTitle>
          <DialogDescription>
            A comprehensive guide to all features and functions of the Super Comic Organizer application.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="getting-started">
              <AccordionTrigger>🚀 Getting Started</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Quick Start Guide</h4>
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                      <li><strong>Set Library Path:</strong> Go to Settings → Library and set where you want your organized comics stored.</li>
                      <li><strong>Add Comics:</strong> Use "Add Files" or "Scan Folder" from Dashboard or Organize page.</li>
                      <li><strong>Process Files:</strong> Click "Start Processing" to automatically analyze and organize your comics.</li>
                      <li><strong>Review Results:</strong> Check the Learning page for any files that need manual review.</li>
                      <li><strong>Browse & Read:</strong> Use the Library to browse your collection and click any comic to read it!</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-semibold">Supported File Formats</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>CBR</strong> - Comic Book RAR archive files</li>
                      <li><strong>CBZ</strong> - Comic Book ZIP archive files</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="navigation">
              <AccordionTrigger>🧭 Navigation & Interface</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Smart Sidebar Navigation</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Auto-Collapse:</strong> Automatically collapses to icons when Inspector panel is open, maximizing content space.</li>
                      <li><strong>Manual Override:</strong> Use "Expand/Collapse Sidebar" buttons to manually control sidebar state.</li>
                      <li><strong>Tooltip Navigation:</strong> Hover over collapsed icons to see page names and navigation hints.</li>
                      <li><strong>Visual Feedback:</strong> Active page highlighting with smooth transitions.</li>
                      <li><strong>Theme Toggle:</strong> Light/dark mode switcher always accessible at sidebar bottom.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Keyboard Shortcuts</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Page Navigation:</strong> <kbd>Ctrl+1</kbd> Dashboard, <kbd>Ctrl+2</kbd> Library, <kbd>Ctrl+3</kbd> Organize, etc.</li>
                      <li><strong>Comic Reader:</strong> <kbd>→</kbd>/<kbd>Space</kbd> next page, <kbd>←</kbd> previous page, <kbd>R</kbd> mark read/unread, <kbd>Esc</kbd> close</li>
                      <li><strong>Knowledge Base:</strong> <kbd>N</kbd>/<kbd>J</kbd> next search result, <kbd>P</kbd>/<kbd>K</kbd> previous search result</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="dashboard">
              <AccordionTrigger>📊 Dashboard & Analytics</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Overview Cards</h4>
                    <p className="text-sm">Real-time statistics showing files in queue, comics in library, items needing review, and processing errors.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Dashboard Tabs</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Overview:</strong> Quick stats, progress indicators, and quick action buttons.</li>
                      <li><strong>Insights:</strong> Deep collection analytics with interactive charts showing:
                        <ul className="list-disc pl-5 mt-1">
                          <li>Publisher distribution analysis</li>
                          <li>Decade-based collection trends</li>
                          <li>Most collected series</li>
                          <li>Collection growth patterns</li>
                          <li>Series completion tracking</li>
                        </ul>
                      </li>
                      <li><strong>Reading:</strong> Personal reading list management and recently read comics.</li>
                      <li><strong>Health:</strong> Automated library health monitoring with actionable recommendations.</li>
                      <li><strong>Activity:</strong> Complete chronological log of all application operations.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Comic Vine Status Widget</h4>
                    <p className="text-sm">When API key is configured, displays real-time Comic Vine processing status, rate limits (200/hour), and enhancement statistics. Click for detailed management options.</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="library">
              <AccordionTrigger>📚 Library Management</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Browsing & Navigation</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Search & Filter:</strong> Search by series/publisher, sort by various criteria, filter by read status and ratings.</li>
                      <li><strong>View Modes:</strong> Switch between Grid, Series (grouped by series), and Publisher views.</li>
                      <li><strong>Cover Size:</strong> Adjustable slider for comic cover display size.</li>
                      <li><strong>Quick Actions:</strong> Hover over covers to reveal "Read" button for instant comic reader access.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Inspector Panel</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Detailed View:</strong> Click any comic to view complete metadata, summary, creators, and publication details.</li>
                      <li><strong>Quick Actions:</strong> Read comic, edit details, add to reading list, rate comic, or delete from library.</li>
                      <li><strong>Metadata Management:</strong> Edit all comic information including custom summaries and creator details.</li>
                      <li><strong>Cover Management:</strong> Fix or update comic cover images.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Bulk Operations</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Selection Mode:</strong> Enable to select multiple comics for batch operations.</li>
                      <li><strong>Bulk Actions:</strong> Edit metadata, add to reading list, delete, or mark as read for multiple comics.</li>
                      <li><strong>Smart Filters:</strong> Use filters to select specific subsets of your collection for bulk operations.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="comic-reader">
              <AccordionTrigger>📖 Comic Reader</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Reading Experience</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Full-Screen Reader:</strong> Immersive reading experience with auto-hiding controls.</li>
                      <li><strong>Page Navigation:</strong> Arrow buttons, keyboard controls, or progress slider for easy page turning.</li>
                      <li><strong>View Modes:</strong> Switch between single-page and double-page spread viewing.</li>
                      <li><strong>Page Controls:</strong> Rotate pages, zoom, and fullscreen mode support.</li>
                      <li><strong>Thumbnail Strip:</strong> Toggle thumbnail view for quick page navigation.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Progress Tracking</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Auto-Save Progress:</strong> Remembers your last read page for each comic.</li>
                      <li><strong>Auto-Mark as Read:</strong> Automatically marks comics as read when you reach the final page.</li>
                      <li><strong>Reading History:</strong> Tracks when and how much of each comic you've read.</li>
                      <li><strong>Series Progression:</strong> Automatically suggests next issue in series when you finish reading.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">In-Reader Actions</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Rating System:</strong> Rate comics 0-6 using emoji system (😴💤😐🙂😍🤩) directly while reading.</li>
                      <li><strong>Read Status:</strong> Toggle read/unread status with visual indicators.</li>
                      <li><strong>Quick Rating:</strong> Rate and review comics without leaving the reader.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Keyboard Controls</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><kbd>→</kbd> or <kbd>Space</kbd> - Next page</li>
                      <li><kbd>←</kbd> - Previous page</li>
                      <li><kbd>R</kbd> - Toggle read/unread status</li>
                      <li><kbd>Esc</kbd> - Close reader and return to library</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reading-list">
              <AccordionTrigger>📋 Reading List & Ratings</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Personal Reading Management</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Reading List:</strong> Curate a personal list of comics you want to read with priority levels.</li>
                      <li><strong>Progress Tracking:</strong> Mark items as completed and track reading dates.</li>
                      <li><strong>Recently Read:</strong> Automatic history of comics you've finished with reading dates.</li>
                      <li><strong>Quick Add:</strong> Add comics to reading list directly from library browser.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">6-Tier Rating System</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>😴 Terrible (0):</strong> Waste of time</li>
                      <li><strong>💤 Poor (1):</strong> Disappointing</li>
                      <li><strong>😐 Okay (2):</strong> Mediocre</li>
                      <li><strong>🙂 Good (3):</strong> Enjoyable</li>
                      <li><strong>😍 Great (4):</strong> Highly recommend</li>
                      <li><strong>🤩 Masterpiece (5):</strong> All-time favorite</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Reading Analytics</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Reading Progress:</strong> Visual indicators of reading list completion.</li>
                      <li><strong>Rating Distribution:</strong> Overview of how you rate your collection.</li>
                      <li><strong>Reading History:</strong> Track your reading habits over time.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="organize">
              <AccordionTrigger>🗂️ File Organization</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Adding Files</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Add Files:</strong> Select individual comic files to add to processing queue.</li>
                      <li><strong>Scan Folder:</strong> Automatically detect and add all comics from a selected folder.</li>
                      <li><strong>Drag & Drop:</strong> (Web mode) Drag files directly onto the page.</li>
                      <li><strong>Format Support:</strong> CBR and CBZ comic archive formats.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Intelligent Processing</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Smart Filename Parsing:</strong> Automatically extracts series, issue, year, publisher, and volume information.</li>
                      <li><strong>Knowledge Base Matching:</strong> Cross-references against built-in and personal knowledge databases.</li>
                      <li><strong>Confidence Scoring:</strong> Rates matches as High/Medium/Low confidence to help identify uncertain results.</li>
                      <li><strong>Batch Processing:</strong> Process multiple files simultaneously with real-time progress tracking.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">File Queue Management</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Status Indicators:</strong> Clear visual status for Pending, Success, Warning, and Error states.</li>
                      <li><strong>Bulk Actions:</strong> Select multiple files for batch editing, confirmation, or removal.</li>
                      <li><strong>Inspector Integration:</strong> Click files to view and edit details before processing.</li>
                      <li><strong>Error Recovery:</strong> Retry failed files or manually correct problematic entries.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="comic-vine">
              <AccordionTrigger>🌐 Comic Vine Integration</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">API Setup</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Free API Key:</strong> Register at Comic Vine to get a free API key.</li>
                      <li><strong>Configuration:</strong> Enter API key in Settings → Metadata Sources → Comic Vine API.</li>
                      <li><strong>Test Connection:</strong> Verify API key functionality with built-in connection test.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Intelligent Metadata Enhancement</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Smart Merging:</strong> Only updates empty or placeholder fields, preserving your custom data.</li>
                      <li><strong>Rich Summaries:</strong> Fetches detailed plot summaries and character information.</li>
                      <li><strong>Creator Information:</strong> Adds writer, artist, and other creator details.</li>
                      <li><strong>Publication Data:</strong> Enhanced publication dates, prices, and other metadata.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Rate Limiting & Management</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>200 Requests/Hour:</strong> Automatic rate limit compliance with visual tracking.</li>
                      <li><strong>Queue Management:</strong> Batch processing with intelligent request scheduling.</li>
                      <li><strong>Status Tracking:</strong> Monitor pending, fetched, failed, and skipped comics.</li>
                      <li><strong>Manual Controls:</strong> Skip, retry, or reset processing status for individual comics.</li>
                      <li><strong>Failed Request Retry:</strong> Automatic 24-hour retry delay for failed requests.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Processing Options</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Batch Processing:</strong> Process up to 50 comics at once with progress monitoring.</li>
                      <li><strong>Manual Enhancement:</strong> "Scan for Details" button for individual comics.</li>
                      <li><strong>Bulk Reset:</strong> Reset Comic Vine status for multiple comics to reprocess them.</li>
                      <li><strong>Skip Processing:</strong> Mark comics to skip Comic Vine processing permanently.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="learning">
              <AccordionTrigger>🎓 Learning & Manual Correction</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Manual Mapping Interface</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Review Queue:</strong> Files that couldn't be automatically processed with high confidence.</li>
                      <li><strong>Smart Suggestions:</strong> Intelligent recommendations based on filename analysis.</li>
                      <li><strong>Form Assistance:</strong> Auto-complete and suggestion system for faster data entry.</li>
                      <li><strong>Knowledge Base Integration:</strong> Suggestions from your personal and system knowledge bases.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Status Filtering</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Warning Filter:</strong> Low confidence matches that need verification.</li>
                      <li><strong>Error Filter:</strong> Files that completely failed to process.</li>
                      <li><strong>Batch Review:</strong> Process multiple similar issues efficiently.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Knowledge Base Growth</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Learning System:</strong> Each manual correction improves future automatic processing.</li>
                      <li><strong>Pattern Recognition:</strong> System learns from your corrections to handle similar files better.</li>
                      <li><strong>Personal Database:</strong> Builds your custom knowledge base over time.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="knowledge">
              <AccordionTrigger>🧠 Knowledge Base Management</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Series & Publishers Database</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Series Management:</strong> View, edit, and add comic series information with publisher associations.</li>
                      <li><strong>Volume Tracking:</strong> Manage different volumes and runs of the same series.</li>
                      <li><strong>Publisher Information:</strong> Maintain accurate publisher data for better matching.</li>
                      <li><strong>Search & Edit:</strong> Quick search and edit functionality for large databases.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Creator Database</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Creator Profiles:</strong> Manage writers, artists, colorists, and other creators.</li>
                      <li><strong>Role Tracking:</strong> Associate creators with their specific roles and contributions.</li>
                      <li><strong>Notes System:</strong> Add personal notes and additional information about creators.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Advanced Editing</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>In-App Editor:</strong> Safe, user-friendly interface for knowledge base editing.</li>
                      <li><strong>Keyboard Navigation:</strong> <kbd>N</kbd>/<kbd>J</kbd> for next match, <kbd>P</kbd>/<kbd>K</kbd> for previous.</li>
                      <li><strong>Search Integration:</strong> Quick search across series and creators.</li>
                      <li><strong>Backup Integration:</strong> Knowledge base included in library export/import.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="library-health">
              <AccordionTrigger>⚡ Library Health & Analytics</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Health Scoring System</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>0-100% Health Score:</strong> Overall library quality assessment.</li>
                      <li><strong>Excellent (90-100%):</strong> Well-maintained library with minimal issues.</li>
                      <li><strong>Good (70-89%):</strong> Mostly healthy with minor issues to address.</li>
                      <li><strong>Fair (50-69%):</strong> Some quality issues that need attention.</li>
                      <li><strong>Needs Attention (&lt;50%):</strong> Significant issues requiring immediate action.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Automated Issue Detection</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Missing Metadata:</strong> Comics without valid publication years or other key information.</li>
                      <li><strong>Duplicate Detection:</strong> Potential duplicate comics with same series/issue combinations.</li>
                      <li><strong>Processing Errors:</strong> Files that failed during automatic processing.</li>
                      <li><strong>Low Confidence Matches:</strong> Comics with uncertain metadata that need verification.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Actionable Recommendations</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Direct Links:</strong> Click recommendations to go directly to relevant pages.</li>
                      <li><strong>Prioritized Issues:</strong> Critical errors shown first, followed by warnings and suggestions.</li>
                      <li><strong>Progress Tracking:</strong> Watch health score improve as you address issues.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="maintenance">
              <AccordionTrigger>🔧 Maintenance & Tools</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Library Statistics</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Collection Metrics:</strong> Total comics, files in queue, recent actions, and unique series count.</li>
                      <li><strong>Processing Statistics:</strong> Success rates, error counts, and processing efficiency.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Backup & Restore Tools</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Export Library:</strong> Create complete backup including comics, reading lists, and knowledge base.</li>
                      <li><strong>Import Library:</strong> Restore from backup or merge collections from other instances.</li>
                      <li><strong>Smart Merging:</strong> Handles duplicate detection during import operations.</li>
                      <li><strong>JSON Format:</strong> Human-readable backup format for advanced users.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Duplicate Detection</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Smart Comparison:</strong> Advanced algorithms to identify potential duplicates.</li>
                      <li><strong>Side-by-Side Review:</strong> Compare suspected duplicates with detailed information.</li>
                      <li><strong>Bulk Actions:</strong> Remove multiple duplicates efficiently.</li>
                      <li><strong>False Positive Protection:</strong> Careful analysis to avoid removing legitimate variants.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Metadata Enrichment Scanner</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Missing Details Detection:</strong> Scans library for comics with incomplete information.</li>
                      <li><strong>Automated Enhancement:</strong> Attempts to fill missing summaries, creators, and cover dates.</li>
                      <li><strong>Progress Tracking:</strong> Visual progress indicators during scanning operations.</li>
                      <li><strong>Respect Ignore Flag:</strong> Skips comics marked to be ignored in scans.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">System Maintenance</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Index Rebuilding:</strong> Refresh library search indices for optimal performance.</li>
                      <li><strong>Temporary File Cleanup:</strong> Remove accumulated temporary files and caches.</li>
                      <li><strong>Cover Migration:</strong> Organize and optimize cover image storage.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="activity">
              <AccordionTrigger>📋 Activity Monitoring</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Complete Action History</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Chronological Log:</strong> Every file operation and system event with timestamps.</li>
                      <li><strong>Action Types:</strong> Success, Error, Warning, and Info events with color-coded indicators.</li>
                      <li><strong>Detailed Messages:</strong> Specific information about what happened during each operation.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Undo Functionality</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Recent Action Undo:</strong> Reverse certain operations when possible.</li>
                      <li><strong>Smart Undo:</strong> Context-aware undo that understands operation dependencies.</li>
                      <li><strong>Safety Checks:</strong> Prevents undo operations that could cause data loss.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Error Tracking</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Error Classification:</strong> Different error types with appropriate handling recommendations.</li>
                      <li><strong>Debugging Information:</strong> Detailed error messages to help identify problems.</li>
                      <li><strong>Pattern Recognition:</strong> Identify recurring issues for systematic resolution.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="settings">
              <AccordionTrigger>⚙️ Settings & Configuration</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">General Settings</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Theme Control:</strong> Toggle between light and dark modes with system preference detection.</li>
                      <li><strong>Keyboard Shortcuts:</strong> Complete reference of all available keyboard shortcuts.</li>
                      <li><strong>Interface Preferences:</strong> Customize sidebar behavior and layout options.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Library Configuration</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Library Path:</strong> Set root folder for organized comics with folder browser.</li>
                      <li><strong>File Operations:</strong> Choose between copying (keep originals) or moving files.</li>
                      <li><strong>Folder Structure:</strong> Automatic organization by publisher and series.</li>
                    </ul>
                    <div className="pl-4 mt-2 text-xs space-y-1 text-muted-foreground bg-muted/50 p-2 rounded-md">
                      <p><strong>Library Path:</strong> Main folder where organized comics are stored, sorted into publisher/series subfolders.</p>
                      <p><strong>File Operations:</strong> Copy mode leaves originals untouched; Move mode relocates files to library.</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold">Metadata Sources</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Comic Vine Integration:</strong> Configure Comic Vine API for enhanced metadata fetching.</li>
                      <li><strong>Enable/Disable Toggle:</strong> Enable or disable Comic Vine integration while keeping your API key saved.</li>
                      <li><strong>API Key Management:</strong> Secure storage and validation of Comic Vine API credentials.</li>
                      <li><strong>Connection Testing:</strong> Built-in test to verify API functionality.</li>
                      <li><strong>Rate Limit Monitoring:</strong> Real-time tracking of API usage and limits.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="troubleshooting">
              <AccordionTrigger>🔍 Troubleshooting & Tips</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Common Issues</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Comics Won't Open:</strong> Ensure files are valid CBR/CBZ format and not corrupted.</li>
                      <li><strong>Processing Errors:</strong> Check file permissions and ensure library path is accessible.</li>
                      <li><strong>Missing Covers:</strong> Use "Fix Cover" option in Inspector or Maintenance tools.</li>
                      <li><strong>Slow Performance:</strong> Run maintenance tools to clean up temporary files and rebuild indices.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Best Practices</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Regular Backups:</strong> Export your library regularly to protect against data loss.</li>
                      <li><strong>Consistent Naming:</strong> Use consistent filename patterns for better automatic processing.</li>
                      <li><strong>Review Low Confidence:</strong> Check and correct Warning-status files for better library quality.</li>
                      <li><strong>Monitor Health:</strong> Regular health checks help maintain collection quality.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Performance Tips</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Batch Operations:</strong> Process multiple files together for efficiency.</li>
                      <li><strong>Comic Vine Limits:</strong> Be mindful of 200/hour API rate limits for metadata enhancement.</li>
                      <li><strong>Large Collections:</strong> Use filters and search to navigate large libraries efficiently.</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="advanced">
              <AccordionTrigger>🔧 Advanced: Manual Knowledge Base Editing</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-destructive">⚠️ Warning: Advanced Users Only</h4>
                    <p className="text-sm text-muted-foreground">
                      Manual editing can cause issues if format is incorrect. Always use the in-app Knowledge Base editor when possible. Back up your `userKnowledgeBase.json` file before making manual changes.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Knowledge Base File Structure</h4>
                    <p className="text-sm">
                      The application stores your personal knowledge base in `userKnowledgeBase.json`, containing series and creator information that improves with each manual correction.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold">File Locations</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Windows:</strong> `%APPDATA%\super-comic-organizer\userKnowledgeBase.json`</li>
                      <li><strong>macOS:</strong> `~/Library/Application Support/super-comic-organizer/userKnowledgeBase.json`</li>
                      <li><strong>Linux:</strong> `~/.config/super-comic-organizer/userKnowledgeBase.json`</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Manual Editing Process</h4>
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                      <li><strong>Backup First:</strong> Always create a backup copy before editing.</li>
                      <li><strong>Use JSON Editor:</strong> Use a proper JSON editor with syntax validation.</li>
                      <li><strong>Maintain Structure:</strong> Preserve the `series` and `creators` array structure.</li>
                      <li><strong>Restart Required:</strong> Close and restart the application to load changes.</li>
                      <li><strong>Validate Changes:</strong> Test with a small batch of files to ensure changes work correctly.</li>
                    </ol>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose}>Close Manual</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HelpManualModal;