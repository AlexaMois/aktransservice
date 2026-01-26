import { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, TaskType, EffectType, ImportanceRating, STATUS_LABELS } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { Header } from '@/components/Header';
import { SearchAndFilters } from '@/components/SearchAndFilters';
import { KanbanColumn } from '@/components/KanbanColumn';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { AddTaskModal } from '@/components/AddTaskModal';
import { AnnouncementsPage } from '@/components/AnnouncementsPage';
import { InProgressView } from '@/components/InProgressView';
import { AdditionalSectionsPage } from '@/components/AdditionalSectionsPage';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Map, Megaphone, Zap, FolderOpen } from 'lucide-react';
import { TaskCard } from '@/components/TaskCard';

const STATUSES: TaskStatus[] = ['ideas', 'planned', 'in-progress', 'completed'];

const Index = () => {
  const { tasks, loading, addTask, refetch } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('roadmap');
  const [mobileStatusFilter, setMobileStatusFilter] = useState<TaskStatus>('ideas');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState<TaskType | 'all'>('all');
  const [effectTypeFilter, setEffectTypeFilter] = useState<EffectType | 'all'>('all');
  const [importanceFilter, setImportanceFilter] = useState<ImportanceRating | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState('');

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
          task.description.toLowerCase().includes(query) ||
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

      return true;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, taskTypeFilter, effectTypeFilter, importanceFilter, ownerFilter]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      'ideas': [],
      'planned': [],
      'in-progress': [],
      'completed': [],
    };
    
    filteredTasks.forEach((task) => {
      grouped[task.status].push(task);
    });

    return grouped;
  }, [filteredTasks]);

  const handleAddTask = async (data: {
    title: string;
    description: string;
    task_type: TaskType;
    author: string;
    priority: TaskPriority;
    effect_type?: EffectType;
    importance?: ImportanceRating;
    input_data_description?: string;
    problem_description?: string;
    file_name?: string;
    file_url?: string;
  }) => {
    await addTask({
      title: data.title,
      description: data.description,
      task_type: data.task_type,
      author: data.author || 'Аноним',
      priority: data.priority,
      effect_type: data.effect_type || null,
      importance: data.importance || null,
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile tabs - stacked */}
          <TabsList className="grid w-full grid-cols-2 gap-1 h-auto p-1 sm:grid-cols-4 sm:h-10">
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
              ownerFilter={ownerFilter}
              onOwnerFilterChange={setOwnerFilter}
              owners={owners}
              onAddClick={() => setIsAddModalOpen(true)}
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Mobile view - single column with status selector */}
                <div className="block md:hidden">
                  <div className="mb-4">
                    <Select 
                      value={mobileStatusFilter} 
                      onValueChange={(v) => setMobileStatusFilter(v as TaskStatus)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABELS[status]} ({tasksByStatus[status].length})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    {tasksByStatus[mobileStatusFilter].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => setSelectedTask(task)}
                      />
                    ))}
                    {tasksByStatus[mobileStatusFilter].length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Нет задач в этом статусе
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
      />

      <AddTaskModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddTask}
      />
    </div>
  );
};

export default Index;
