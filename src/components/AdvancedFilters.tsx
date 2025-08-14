import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { QueuedFile, FileStatus, Confidence } from "@/types";

interface FilterOptions {
  status: FileStatus[];
  confidence: Confidence[];
  publisher: string[];
  hasIssue: boolean | null;
  hasYear: boolean | null;
}

interface AdvancedFiltersProps {
  files: QueuedFile[];
  onFiltersChange: (filteredFiles: QueuedFile[]) => void;
}

const AdvancedFilters = ({ files, onFiltersChange }: AdvancedFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: [],
    confidence: [],
    publisher: [],
    hasIssue: null,
    hasYear: null
  });

  // Get unique values for filter options
  const uniquePublishers = [...new Set(files.map(f => f.publisher).filter(Boolean))];
  const statusCounts = files.reduce((acc, file) => {
    acc[file.status] = (acc[file.status] || 0) + 1;
    return acc;
  }, {} as Record<FileStatus, number>);

  const confidenceCounts = files.reduce((acc, file) => {
    if (file.confidence) {
      acc[file.confidence] = (acc[file.confidence] || 0) + 1;
    }
    return acc;
  }, {} as Record<Confidence, number>);

  const applyFilters = () => {
    let filtered = files;

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(file => filters.status.includes(file.status));
    }

    // Confidence filter
    if (filters.confidence.length > 0) {
      filtered = filtered.filter(file => 
        file.confidence && filters.confidence.includes(file.confidence)
      );
    }

    // Publisher filter
    if (filters.publisher.length > 0) {
      filtered = filtered.filter(file => 
        file.publisher && filters.publisher.includes(file.publisher)
      );
    }

    // Has issue filter
    if (filters.hasIssue !== null) {
      filtered = filtered.filter(file => 
        filters.hasIssue ? !!file.issue : !file.issue
      );
    }

    // Has year filter
    if (filters.hasYear !== null) {
      filtered = filtered.filter(file => 
        filters.hasYear ? !!file.year : !file.year
      );
    }

    onFiltersChange(filtered);
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      confidence: [],
      publisher: [],
      hasIssue: null,
      hasYear: null
    });
    onFiltersChange(files);
  };

  const updateFilter = <K extends keyof FilterOptions>(
    key: K, 
    value: FilterOptions[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const toggleArrayFilter = <T extends string>(
    key: keyof FilterOptions,
    value: T
  ) => {
    const currentArray = filters[key] as T[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray as FilterOptions[keyof FilterOptions]);
  };

  const hasActiveFilters = 
    filters.status.length > 0 ||
    filters.confidence.length > 0 ||
    filters.publisher.length > 0 ||
    filters.hasIssue !== null ||
    filters.hasYear !== null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Advanced Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? 'Hide' : 'Show'} Filters
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="space-y-4">
          {/* Status Filter */}
          <div>
            <h4 className="font-medium text-sm mb-2">Status</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.status.includes(status as FileStatus)}
                    onCheckedChange={() => toggleArrayFilter('status', status as FileStatus)}
                  />
                  <label htmlFor={`status-${status}`} className="text-sm">
                    {status} ({count})
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Confidence Filter */}
          {Object.keys(confidenceCounts).length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Confidence</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(confidenceCounts).map(([confidence, count]) => (
                  <div key={confidence} className="flex items-center space-x-2">
                    <Checkbox
                      id={`confidence-${confidence}`}
                      checked={filters.confidence.includes(confidence as Confidence)}
                      onCheckedChange={() => toggleArrayFilter('confidence', confidence as Confidence)}
                    />
                    <label htmlFor={`confidence-${confidence}`} className="text-sm">
                      {confidence} ({count})
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publisher Filter */}
          {uniquePublishers.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Publisher</h4>
              <div className="flex flex-wrap gap-2">
                {uniquePublishers.slice(0, 5).map((publisher) => (
                  <div key={publisher} className="flex items-center space-x-2">
                    <Checkbox
                      id={`publisher-${publisher}`}
                      checked={filters.publisher.includes(publisher)}
                      onCheckedChange={() => toggleArrayFilter('publisher', publisher)}
                    />
                    <label htmlFor={`publisher-${publisher}`} className="text-sm">
                      {publisher}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Completeness Filters */}
          <div>
            <h4 className="font-medium text-sm mb-2">Data Completeness</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-issue"
                  checked={filters.hasIssue === true}
                  onCheckedChange={(checked) => 
                    updateFilter('hasIssue', checked ? true : null)
                  }
                />
                <label htmlFor="has-issue" className="text-sm">Has Issue Number</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-year"
                  checked={filters.hasYear === true}
                  onCheckedChange={(checked) => 
                    updateFilter('hasYear', checked ? true : null)
                  }
                />
                <label htmlFor="has-year" className="text-sm">Has Year</label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={applyFilters} size="sm">
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearFilters} size="sm">
              Clear All
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AdvancedFilters;