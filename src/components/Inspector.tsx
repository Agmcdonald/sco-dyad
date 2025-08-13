import { useSelection } from "@/context/SelectionContext";
import ComicInspector from "./ComicInspector";

const Inspector = () => {
  const { selectedItem } = useSelection();

  if (!selectedItem) {
    return (
      <aside className="h-full bg-background border-l flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Inspector</h3>
        </div>
        <div className="flex-1 p-4">
          <p className="text-sm text-muted-foreground">
            Select an item to see details.
          </p>
        </div>
      </aside>
    );
  }

  switch (selectedItem.type) {
    case 'comic':
      return <ComicInspector comic={selectedItem} />;
    case 'file':
      // This will be built out later
      return (
        <aside className="h-full bg-background border-l flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold">File Details</h3>
          </div>
          <div className="flex-1 p-4">
            <p className="text-sm font-medium">File Selected:</p>
            <p className="text-sm text-muted-foreground break-all">{selectedItem.name}</p>
          </div>
        </aside>
      );
    default:
      return null;
  }
};

export default Inspector;