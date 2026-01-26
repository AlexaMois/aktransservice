import { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { Header } from '@/components/Header';
import { SearchAndFilters } from '@/components/SearchAndFilters';
import { KanbanColumn } from '@/components/KanbanColumn';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { AddTaskModal } from '@/components/AddTaskModal';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const STATUSES: TaskStatus[] = ['ideas', 'planned', 'in-progress', 'completed'];

const Index = () => {
  const { tasks, addTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
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

      // Owner filter
      if (ownerFilter && task.owner !== ownerFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, ownerFilter]);

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

  const handleAddTask = (data: {
    title: string;
    description: string;
    author: string;
    priority: TaskPriority;
    inputDataDescription: string;
    fileName?: string;
    fileUrl?: string;
  }) => {
    addTask({
      title: data.title,
      description: data.description,
      author: data.author || 'Аноним',
      priority: data.priority,
      inputDataDescription: data.inputDataDescription,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col gap-6">
        <SearchAndFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          ownerFilter={ownerFilter}
          onOwnerFilterChange={setOwnerFilter}
          owners={owners}
          onAddClick={() => setIsAddModalOpen(true)}
        />

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-[calc(100vh-220px)]">
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
      </main>

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
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
