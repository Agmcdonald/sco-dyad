import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { BookOpen, Plus, X, Star } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import AddToReadingListModal from "./AddToReadingListModal";

const ReadingList = () => {
  const { 
    readingList, 
    toggleReadingItemCompleted, 
    removeFromReadingList, 
    setReadingItemPriority 
  } = useAppContext();
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredList = readingList.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.series.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompleted = showCompleted || !item.completed;
    return matchesSearch && matchesCompleted;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const completedCount = readingList.filter(item => item.completed).length;
  const totalCount = readingList.length;

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Reading List
                </CardTitle>
                <CardDescription>
                  Track comics you want to read and mark your progress
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{totalCount - completedCount}</div>
                <div className="text-sm text-muted-foreground">to read</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Overview */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 border rounded-lg">
                <div className="text-lg font-bold text-blue-600">{totalCount}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-lg font-bold text-green-600">{completedCount}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-lg font-bold text-orange-600">{totalCount - completedCount}</div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search reading list..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-completed"
                  checked={showCompleted}
                  onCheckedChange={(checked) => setShowCompleted(Boolean(checked))}
                />
                <label htmlFor="show-completed" className="text-sm">
                  Show completed
                </label>
              </div>
            </div>

            {/* Reading List Items */}
            <div className="space-y-3">
              {filteredList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No comics in your reading list</p>
                  <p className="text-sm">Add comics from your library to get started</p>
                </div>
              ) : (
                filteredList.map((item) => (
                  <div key={item.id} className={`flex items-center gap-4 p-4 border rounded-lg ${item.completed ? 'opacity-60' : ''}`}>
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleReadingItemCompleted(item.id)}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium ${item.completed ? 'line-through' : ''}`}>
                          {item.title}
                        </h4>
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.publisher} • {item.year}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!item.completed && (
                        <select
                          value={item.priority}
                          onChange={(e) => setReadingItemPriority(item.id, e.target.value as any)}
                          className="text-xs border rounded px-2 py-1 bg-background"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromReadingList(item.id)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add from Library
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Star className="h-4 w-4 mr-2" />
                Add Wishlist Item
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <AddToReadingListModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default ReadingList;