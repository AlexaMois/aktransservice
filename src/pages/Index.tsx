import { useState, useMemo, useCallback } from 'react';
import { Task, TaskStatus, TaskPriority, TaskType, EffectType, ImportanceRating, DigitizationSection, STATUS_LABELS } from '@/types/task';
import { useGSheetsTasks } from '@/hooks/useGSheetsTasks';
import { isGSheetsMode } from '@/lib/api/gsheets';
import { useSwipe } from '@/hooks/useSwipe';
import { Header } from '@/components/Header';
import { SearchAndFilters } from '@/components/SearchAndFilters';
import { KanbanColumn } from '@/components/KanbanColumn';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { AddTaskModal } from '@/components/AddTaskModal';
import { AnnouncementsPage } from '@/components/AnnouncementsPage';
import { InProgressView } from '@/components/InProgressView';
import { AdditionalSectionsPage } from '@/components/AdditionalSectionsPage';
import { MigrationSetup } from '@/components/MigrationSetup';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Map, Megaphone, Zap, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { TaskCard } from '@/components/TaskCard';
import { Button } from '@/components/ui/button';

const STATUSES: TaskStatus[] = ['ideas', 'planned', 'in-progress', 'review', 'completed'];

const Index = () => {
  const { tasks, loading, addTask, updateTask, refetch, syncStatus, lastSyncTime, manualSync } = useGSheetsTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [defaultTaskType, setDefaultTaskType] = useState<TaskType>('idea');
  const [activeTab, setActiveTab] = useState('roadmap');
  const [mobileStatusFilter, setMobileStatusFilter] = useState<TaskStatus>('ideas');
  const [showMigration, setShowMigration] = useState(false); // Migration is now done via secrets
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState<TaskType | 'all'>('all');
  const [effectTypeFilter, setEffectTypeFilter] = useState<EffectType | 'all'>('all');
  const [importanceFilter, setImportanceFilter] = useState<ImportanceRating | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState<DigitizationSection | 'all'>('all');

  // Swipe navigation for mobile
  const currentStatusIndex = STATUSES.indexOf(mobileStatusFilter);
  
  const goToNextStatus = useCallback(() => {
    if (currentStatusIndex < STATUSES.length - 1) {
      setMobileStatusFilter(STATUSES[currentStatusIndex + 1]);
    }
  }, [currentStatusIndex]);

  const goToPrevStatus = useCallback(() => {
    if (currentStatusIndex > 0) {
      setMobileStatusFilter(STATUSES[currentStatusIndex - 1]);
    }
  }, [currentStatusIndex]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: goToNextStatus,
    onSwipeRight: goToPrevStatus,
    minSwipeDistance: 50,
  });

  // Get unique owners for filter dropdown
  const owners = useMemo(() => {
    const ownerSet = new Set<string>();
    tasks.forEach((task) => {
      if (task.owner) ownerSet.add(task.owner);
    });
    return Array.from(ownerSet).sort();
  }, [tasks]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          task.title.toLowerCase().includes(query) ||
          task.summary.toLowerCase().includes(query) ||
          (task.description?.toLowerCase().includes(query) ?? false) ||
          task.author.toLowerCase().includes(query) ||
          (task.owner?.toLowerCase().includes(query) ?? false);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      // Task type filter
      if (taskTypeFilter !== 'all' && task.task_type !== taskTypeFilter) {
        return false;
      }

      // Effect type filter
      if (effectTypeFilter !== 'all' && task.effect_type !== effectTypeFilter) {
        return false;
      }

      // Importance filter
      if (importanceFilter !== 'all' && task.importance !== importanceFilter) {
        return false;
      }

      // Owner filter
      if (ownerFilter && task.owner !== ownerFilter) {
        return false;
      }

      // Section filter
      if (sectionFilter !== 'all' && task.digitization_section !== sectionFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, taskTypeFilter, effectTypeFilter, importanceFilter, ownerFilter, sectionFilter]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      'ideas': [],
      'planned': [],
      'in-progress': [],
      'review': [],
      'completed': [],
    };
    
    filteredTasks.forEach((task) => {
      grouped[task.status].push(task);
    });

    return grouped;
  }, [filteredTasks]);

  const handleOpenAddModal = (type: TaskType = 'idea') => {
    setDefaultTaskType(type);
    setIsAddModalOpen(true);
  };

  const handleAddTask = async (data: {
    title: string;
    summary: string;
    description?: string;
    task_type: TaskType;
    author: string;
    priority: TaskPriority;
    effect_type?: EffectType;
    importance?: ImportanceRating;
    digitization_section?: DigitizationSection;
    url?: string;
    input_data_description?: string;
    problem_description?: string;
    file_name?: string;
    file_url?: string;
  }) => {
    await addTask({
      title: data.title,
      summary: data.summary,
      description: data.description || null,
      task_type: data.task_type,
      author: data.author || 'Аноним',
      priority: data.priority,
      effect_type: data.effect_type || null,
      importance: data.importance || null,
      digitization_section: data.digitization_section || null,
      url: data.url || null,
      input_data_description: data.input_data_description || null,
      problem_description: data.problem_description || null,
      file_name: data.file_name || null,
      file_url: data.file_url || null,
      owner: null,
      linked_idea_id: null,
      linked_problem_id: null,
      result_before: null,
      result_action: null,
      result_after: null,
    });
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    refetch();
  };

  // Show migration setup if not configured
  if (showMigration) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-3 sm:px-4 py-8">
          <MigrationSetup onComplete={() => {
            setShowMigration(false);
            refetch();
          }} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab header with sync status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            {/* Mobile tabs - stacked */}
            <TabsList className="grid w-full grid-cols-2 gap-1 h-auto p-1 sm:grid-cols-4 sm:h-10 sm:w-auto">
              <TabsTrigger value="roadmap" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm sm:py-1.5">
                <Map className="h-4 w-4" />
                <span>Дорожная карта</span>
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm sm:py-1.5">
                <Zap className="h-4 w-4" />
                <span>В работе</span>
              </TabsTrigger>
              <TabsTrigger value="announcements" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm sm:py-1.5">
                <Megaphone className="h-4 w-4" />
                <span>Объявления</span>
              </TabsTrigger>
              <TabsTrigger value="sections" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm sm:py-1.5">
                <FolderOpen className="h-4 w-4" />
                <span>Разделы</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Sync status indicator */}
            <SyncStatusIndicator
              status={syncStatus}
              lastSyncTime={lastSyncTime}
              onManualSync={manualSync}
              pollingInterval={30000}
            />
          </div>

          <TabsContent value="roadmap" className="space-y-4 mt-4">
            <SearchAndFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              taskTypeFilter={taskTypeFilter}
              onTaskTypeFilterChange={setTaskTypeFilter}
              effectTypeFilter={effectTypeFilter}
              onEffectTypeFilterChange={setEffectTypeFilter}
              importanceFilter={importanceFilter}
              onImportanceFilterChange={setImportanceFilter}
              sectionFilter={sectionFilter}
              onSectionFilterChange={setSectionFilter}
              ownerFilter={ownerFilter}
              onOwnerFilterChange={setOwnerFilter}
              owners={owners}
              onAddClick={() => handleOpenAddModal('idea')}
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Mobile view - single column with swipe */}
                <div className="block md:hidden">
                  {/* Status navigation */}
                  <div className="mb-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToPrevStatus}
                      disabled={currentStatusIndex === 0}
                      className="shrink-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex-1 text-center">
                      <div className="font-medium text-foreground">
                        {STATUS_LABELS[mobileStatusFilter]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tasksByStatus[mobileStatusFilter].length} задач • Свайп ← →
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToNextStatus}
                      disabled={currentStatusIndex === STATUSES.length - 1}
                      className="shrink-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Status dots indicator */}
                  <div className="flex justify-center gap-1.5 mb-4">
                    {STATUSES.map((status, index) => (
                      <button
                        key={status}
                        onClick={() => setMobileStatusFilter(status)}
                        className={`h-2 rounded-full transition-all ${
                          index === currentStatusIndex 
                            ? 'w-6 bg-primary' 
                            : 'w-2 bg-muted-foreground/30'
                        }`}
                        aria-label={STATUS_LABELS[status]}
                      />
                    ))}
                  </div>
                  
                  {/* Swipeable task list */}
                  <div 
                    className="space-y-3 min-h-[200px]"
                    {...swipeHandlers}
                  >
                    {tasksByStatus[mobileStatusFilter].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => setSelectedTask(task)}
                      />
                    ))}
                    {tasksByStatus[mobileStatusFilter].length === 0 && (
                      <div className="text-center py-8">
                        {mobileStatusFilter === 'ideas' ? (
                          <Button 
                            variant="outline" 
                            onClick={() => handleOpenAddModal('idea')}
                            className="gap-2"
                          >
                            Добавить идею
                          </Button>
                        ) : mobileStatusFilter === 'planned' ? (
                          <Button 
                            variant="outline" 
                            onClick={() => handleOpenAddModal('task')}
                            className="gap-2"
                          >
                            Добавить задачу
                          </Button>
                        ) : (
                          <p className="text-muted-foreground text-sm">Нет задач в этом статусе</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop view - kanban */}
                <div className="hidden md:block flex-1 min-h-0">
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="flex gap-4 pb-4">
                      {STATUSES.map((status) => (
                        <KanbanColumn
                          key={status}
                          status={status}
                          tasks={tasksByStatus[status]}
                          onTaskClick={setSelectedTask}
                          onAddClick={(type) => handleOpenAddModal(type)}
                        />
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="in-progress" className="mt-4">
            <InProgressView 
              tasks={tasks} 
              loading={loading}
              onTaskClick={setSelectedTask}
            />
          </TabsContent>

          <TabsContent value="announcements" className="mt-4">
            <AnnouncementsPage />
          </TabsContent>

          <TabsContent value="sections" className="mt-4">
            <AdditionalSectionsPage />
          </TabsContent>
        </Tabs>
      </main>

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        allTasks={tasks}
        onTaskUpdate={handleTaskUpdate}
        onUpdateTask={updateTask}
      />

      <AddTaskModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddTask}
        defaultTaskType={defaultTaskType}
      />
    </div>
  );
};

export default Index;
