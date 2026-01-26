import { Task, TaskStatus, STATUS_LABELS } from '@/types/task';
import { TaskCard } from './TaskCard';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const statusColors: Record<TaskStatus, string> = {
  'ideas': 'bg-chart-3/20 border-chart-3',
  'planned': 'bg-chart-1/20 border-chart-1',
  'in-progress': 'bg-primary/20 border-primary',
  'completed': 'bg-green-500/20 border-green-500',
};

const statusHeaderColors: Record<TaskStatus, string> = {
  'ideas': 'text-chart-5',
  'planned': 'text-chart-5',
  'in-progress': 'text-primary',
  'completed': 'text-green-600',
};

export function KanbanColumn({ status, tasks, onTaskClick }: KanbanColumnProps) {
  return (
    <div className="flex flex-col bg-accent/30 rounded-xl min-w-[300px] max-w-[320px] w-full">
      <div className={`px-4 py-3 border-b-2 ${statusColors[status]} rounded-t-xl`}>
        <div className="flex items-center justify-between">
          <h2 className={`font-semibold ${statusHeaderColors[status]}`}>
            {STATUS_LABELS[status]}
          </h2>
          <span className="text-xs font-medium bg-background/80 text-foreground px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)} 
            />
          ))}
          
          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Нет задач
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
