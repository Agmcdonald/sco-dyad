import { useLocation } from "react-router-dom";
import LearningCard from "@/components/LearningCard";
import { useAppContext } from "@/context/AppContext";

const Learning = () => {
  const { files } = useAppContext();
  const location = useLocation();
  const focusedFileId = location.state?.fileId;

  let unmappedFiles = files.filter(file => file.status === 'Warning' || file.status === 'Error');

  if (focusedFileId) {
    unmappedFiles = unmappedFiles.filter(file => file.id === focusedFileId);
  }

  const getTitle = () => {
    if (focusedFileId && unmappedFiles.length > 0) {
      return "Manual Mapping";
    }
    return "Learning";
  };

  const getDescription = () => {
    if (focusedFileId && unmappedFiles.length > 0) {
      return `Correct the details for the selected file below.`;
    }
    if (unmappedFiles.length > 0) {
      return `Teach the sorter about these ${unmappedFiles.length} unmapped files.`;
    }
    return "There are no files currently needing manual review.";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{getTitle()}</h1>
          <p className="text-muted-foreground mt-2">{getDescription()}</p>
        </div>
      </div>

      {unmappedFiles.length > 0 ? (
        <div className="space-y-8">
          {unmappedFiles.map((file) => (
            <LearningCard key={file.id} file={file} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center rounded-lg border-2 border-dashed border-muted-foreground/50 p-12 h-96">
            <h3 className="text-lg font-semibold">All Clear!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                {focusedFileId ? "This file has already been processed." : "Run the organizer to find more files to map."}
            </p>
        </div>
      )}
    </div>
  );
};

export default Learning;