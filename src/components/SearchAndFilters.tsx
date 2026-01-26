import { TaskStatus, TaskPriority, STATUS_LABELS, PRIORITY_LABELS } from '@/types/task';
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
  ownerFilter,
  onOwnerFilterChange,
  owners,
  onAddClick,
}: SearchAndFiltersProps) {
  const hasFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || ownerFilter;

  const clearFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
    onPriorityFilterChange('all');
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
            placeholder="Поиск задач..."
            className="pl-10"
          />
        </div>

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

        {/* Priority filter */}
        <Select value={priorityFilter} onValueChange={(v) => onPriorityFilterChange(v as TaskPriority | 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Приоритет" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все приоритеты</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Owner filter */}
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
          Добавить идею
        </Button>
      </div>
    </div>
  );
}
