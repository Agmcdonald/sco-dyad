const Inspector = () => {
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
};

export default Inspector;