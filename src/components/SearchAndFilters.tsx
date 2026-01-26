import { TaskStatus, TaskPriority, TaskType, EffectType, ImportanceRating, STATUS_LABELS, PRIORITY_LABELS, TASK_TYPE_LABELS, EFFECT_TYPE_LABELS, IMPORTANCE_LABELS } from '@/types/task';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Plus } from 'lucide-react';

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: TaskStatus | 'all';
  onStatusFilterChange: (status: TaskStatus | 'all') => void;
  priorityFilter: TaskPriority | 'all';
  onPriorityFilterChange: (priority: TaskPriority | 'all') => void;
  taskTypeFilter: TaskType | 'all';
  onTaskTypeFilterChange: (type: TaskType | 'all') => void;
  effectTypeFilter: EffectType | 'all';
  onEffectTypeFilterChange: (effect: EffectType | 'all') => void;
  importanceFilter: ImportanceRating | 'all';
  onImportanceFilterChange: (importance: ImportanceRating | 'all') => void;
  ownerFilter: string;
  onOwnerFilterChange: (owner: string) => void;
  owners: string[];
  onAddClick: () => void;
}

export function SearchAndFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  taskTypeFilter,
  onTaskTypeFilterChange,
  effectTypeFilter,
  onEffectTypeFilterChange,
  importanceFilter,
  onImportanceFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  owners,
  onAddClick,
}: SearchAndFiltersProps) {
  const hasFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || taskTypeFilter !== 'all' || effectTypeFilter !== 'all' || importanceFilter !== 'all' || ownerFilter;

  const clearFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
    onPriorityFilterChange('all');
    onTaskTypeFilterChange('all');
    onEffectTypeFilterChange('all');
    onImportanceFilterChange('all');
    onOwnerFilterChange('');
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск..."
            className="pl-10"
          />
        </div>

        {/* Task type filter */}
        <Select value={taskTypeFilter} onValueChange={(v) => onTaskTypeFilterChange(v as TaskType | 'all')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as TaskStatus | 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Effect type filter */}
        <Select value={effectTypeFilter} onValueChange={(v) => onEffectTypeFilterChange(v as EffectType | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Тип эффекта" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все эффекты</SelectItem>
            {Object.entries(EFFECT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Importance filter */}
        <Select value={importanceFilter} onValueChange={(v) => onImportanceFilterChange(v as ImportanceRating | 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Важность" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Вся важность</SelectItem>
            {Object.entries(IMPORTANCE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Owner filter */}
        {owners.length > 0 && (
          <Select value={ownerFilter || 'all'} onValueChange={(v) => onOwnerFilterChange(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Владелец" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все владельцы</SelectItem>
              {owners.map((owner) => (
                <SelectItem key={owner} value={owner}>
                  {owner}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="h-4 w-4 mr-1" />
            Сбросить
          </Button>
        )}

        {/* Add button */}
        <Button onClick={onAddClick} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" />
          Добавить
        </Button>
      </div>
    </div>
  );
}
