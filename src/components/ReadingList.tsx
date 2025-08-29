import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Plus, X, Clock } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import AddToReadingListModal from "./AddToReadingListModal";
import RatingSelector from "./RatingSelector";
import { RATING_EMOJIS } from "@/lib/ratings";
import { getCoverUrl } from "@/lib/cover";

const ReadingList = () => {
  const { 
    readingList, 
    toggleReadingItemCompleted, 
    removeFromReadingList, 
    recentlyRead,
    updateComicRating,
    comics // Add comics to get current ratings
  } = useAppContext();
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("recently-read");

  // Auto-show completed when a comic is marked as read
  useEffect(() => {
    const hasNewlyCompleted = readingList.some(item => 
      item.completed && 
      item.dateCompleted && 
      new Date().getTime() - new Date(item.dateCompleted).getTime() < 5000 // Within last 5 seconds
    );
    
    if (hasNewlyCompleted && !showCompleted) {
      setShowCompleted(true);
    }
  }, [readingList, showCompleted]);

  const filteredList = readingList.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.series.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompleted = showCompleted || !item.completed;
    return matchesSearch && matchesCompleted;
  });

  // Enhanced reading list with current comic ratings
  const enhancedReadingList = useMemo(() => {
    return filteredList.map(item => {
      const comic = comics.find(c => c.id === item.comicId);
      return {
        ...item,
        currentRating: comic?.rating // Get current rating from comic
      };
    });
  }, [filteredList, comics]);

  // Enhanced recently read with current comic ratings
  const enhancedRecentlyRead = useMemo(() => {
    return recentlyRead.map(item => {
      const comic = comics.find(c => c.id === item.comicId);
      return {
        ...item,
        currentRating: comic?.rating, // Get current rating from comic
        coverUrlResolved: getCoverUrl(item.coverUrl)
      };
    });
  }, [recentlyRead, comics]);

  const handleRatingChange = async (itemId: string, rating: number, isRecentlyRead = false) => {
    console.log(`[READING-LIST] Rating change for item ${itemId}: ${rating}`);
    const list = isRecentlyRead ? recentlyRead : readingList;
    const item = list.find((i: any) => i.id === itemId);
    if (item) {
      console.log(`[READING-LIST] Found item, updating comic ${item.comicId} with rating ${rating}`);
      await updateComicRating(item.comicId, rating);
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
                  Reading & Recently Read
                </CardTitle>
                <CardDescription>
                  Track comics you want to read and rate the ones you've finished
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
                <div className="text-lg font-bold text-orange-600">{recentlyRead.length}</div>
                <div className="text-xs text-muted-foreground">Recently Read</div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="recently-read">Recently Read</TabsTrigger>
                <TabsTrigger value="reading-list">Reading List</TabsTrigger>
              </TabsList>

              <TabsContent value="recently-read" className="space-y-4">
                <div className="space-y-3">
                  {enhancedRecentlyRead.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No recently read comics</p>
                      <p className="text-sm">Comics you read will appear here</p>
                    </div>
                  ) : (
                    enhancedRecentlyRead.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-12 h-16 bg-muted rounded flex-shrink-0 overflow-hidden">
                          <img 
                            src={item.coverUrlResolved} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">
                              {item.title}
                              {item.currentRating !== undefined && (
                                <span className="ml-3 text-lg" title={RATING_EMOJIS[item.currentRating as keyof typeof RATING_EMOJIS]?.label}>
                                  {RATING_EMOJIS[item.currentRating as keyof typeof RATING_EMOJIS]?.emoji}
                                </span>
                              )}
                            </h4>
                          </div>
                          <div className="text-sm text-muted-foreground mb-3">
                            {item.publisher} • {item.year} • Read {new Date(item.dateRead).toLocaleDateString()}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-2">Rate this comic:</div>
                            <RatingSelector 
                              currentRating={item.currentRating} 
                              onRatingChange={(rating) => handleRatingChange(item.id, rating, true)}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reading-list" className="space-y-4">
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
                  {enhancedReadingList.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No comics in your reading list</p>
                      <p className="text-sm">Add comics from your library to get started</p>
                    </div>
                  ) : (
                    enhancedReadingList.map((item) => (
                      <div key={item.id} className={`flex items-center gap-4 p-4 border rounded-lg ${item.completed ? 'opacity-60' : ''}`}>
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => toggleReadingItemCompleted(item.id)}
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium ${item.completed ? 'line-through' : ''}`}>
                              {item.title}
                              {item.currentRating !== undefined && (
                                <span className="ml-3 text-lg" title={RATING_EMOJIS[item.currentRating as keyof typeof RATING_EMOJIS]?.label}>
                                  {RATING_EMOJIS[item.currentRating as keyof typeof RATING_EMOJIS]?.emoji}
                                </span>
                              )}
                            </h4>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.publisher} • {item.year}
                          </div>
                          {item.completed && (
                            <div className="mt-3">
                              <div className="text-xs text-muted-foreground mb-2">Rate this comic:</div>
                              <RatingSelector 
                                currentRating={item.currentRating} 
                                onRatingChange={(rating) => handleRatingChange(item.id, rating, false)}
                                size="sm"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
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
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <AddToReadingListModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default ReadingList;