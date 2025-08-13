import LearningCard from "@/components/LearningCard";

const unknownFiles = [
  { id: 1, fileName: "ASM_1_1963.cbr" },
  { id: 2, fileName: "Detective Comics v1 27.cbz" },
  { id: 3, fileName: "Action_Comics_1.cbz" },
];

const Learning = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning</h1>
          <p className="text-muted-foreground mt-2">
            Teach the sorter about these {unknownFiles.length} unmapped files.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {unknownFiles.map((file) => (
          <LearningCard key={file.id} fileName={file.fileName} />
        ))}
      </div>
    </div>
  );
};

export default Learning;