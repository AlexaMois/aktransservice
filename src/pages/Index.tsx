import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Task, TaskStatus, TaskPriority, TaskType, EffectType, ImportanceRating } from '@/types/task';
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
import { Loader2, Map, Megaphone, Zap, FolderOpen } from 'lucide-react';

const STATUSES: TaskStatus[] = ['ideas', 'planned', 'in-progress', 'completed'];

const Index = () => {
  const { tasks, loading, addTask, refetch } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('roadmap');
  
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
      
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="roadmap" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Дорожная карта</span>
              <span className="sm:hidden">Карта</span>
            </TabsTrigger>
            <TabsTrigger value="in-progress" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">В работе</span>
              <span className="sm:hidden">В работе</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Объявления</span>
              <span className="sm:hidden">Объявл.</span>
            </TabsTrigger>
            <TabsTrigger value="sections" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Разделы</span>
              <span className="sm:hidden">Ещё</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roadmap" className="space-y-4">
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
              <div className="flex-1 min-h-0">
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
            )}
          </TabsContent>

          <TabsContent value="in-progress">
            <InProgressView 
              tasks={tasks} 
              loading={loading}
              onTaskClick={setSelectedTask}
            />
          </TabsContent>

          <TabsContent value="announcements">
            <AnnouncementsPage />
          </TabsContent>

          <TabsContent value="sections">
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
