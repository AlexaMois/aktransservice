import { useState } from 'react';
import { TaskStatus, TaskPriority, TaskType, ImportanceRating, Department, STATUS_LABELS, PRIORITY_LABELS, TASK_TYPE_LABELS, IMPORTANCE_LABELS, DEPARTMENT_LABELS } from '@/entities/task';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Search, X, Plus, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: TaskStatus | 'all';
  onStatusFilterChange: (status: TaskStatus | 'all') => void;
  priorityFilter: TaskPriority | 'all';
  onPriorityFilterChange: (priority: TaskPriority | 'all') => void;
  taskTypeFilter: TaskType | 'all';
  onTaskTypeFilterChange: (type: TaskType | 'all') => void;
  importanceFilter: ImportanceRating | 'all';
  onImportanceFilterChange: (importance: ImportanceRating | 'all') => void;
  departmentFilter: Department | 'all';
  onDepartmentFilterChange: (department: Department | 'all') => void;
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
  importanceFilter,
  onImportanceFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  owners,
  onAddClick,
}: SearchAndFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const activeFiltersCount = [
    statusFilter !== 'all',
    priorityFilter !== 'all',
    taskTypeFilter !== 'all',
    importanceFilter !== 'all',
    departmentFilter !== 'all',
    ownerFilter !== '',
  ].filter(Boolean).length;

  const hasFilters = searchQuery || activeFiltersCount > 0;

  const clearFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
    onPriorityFilterChange('all');
    onTaskTypeFilterChange('all');
    onImportanceFilterChange('all');
    onDepartmentFilterChange('all');
    onOwnerFilterChange('');
  };

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Task type filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Тип записи</label>
        <Select value={taskTypeFilter} onValueChange={(v) => onTaskTypeFilterChange(v as TaskType | 'all')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Все типы" />
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
      </div>

      {/* Status filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Статус</label>
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as TaskStatus | 'all')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Все статусы" />
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
      </div>

      {/* Importance filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Важность</label>
        <Select value={importanceFilter} onValueChange={(v) => onImportanceFilterChange(v as ImportanceRating | 'all')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Любая важность" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Любая важность</SelectItem>
            {Object.entries(IMPORTANCE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Department filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Отдел</label>
        <Select value={departmentFilter} onValueChange={(v) => onDepartmentFilterChange(v as Department | 'all')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Все отделы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все отделы</SelectItem>
            {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Owner filter */}
      {owners.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Владелец</label>
          <Select value={ownerFilter || 'all'} onValueChange={(v) => onOwnerFilterChange(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Все владельцы" />
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
        </div>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Сбросить фильтры
        </Button>
      )}
    </div>
  );

  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-4 shadow-sm">
      {/* Mobile layout */}
      <div className="flex flex-col gap-3 sm:hidden">
        {/* Search and Add row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Поиск..."
              className="pl-10"
            />
          </div>
          <Button onClick={onAddClick} size="icon" className="shrink-0">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* Filter button */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Фильтры
              </span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
            <SheetHeader className="mb-4">
              <SheetTitle>Фильтры</SheetTitle>
            </SheetHeader>
            <FilterContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:flex flex-wrap gap-3 items-center">
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

        {/* Department filter */}
        <Select value={departmentFilter} onValueChange={(v) => onDepartmentFilterChange(v as Department | 'all')}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Отдел" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все отделы</SelectItem>
            {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
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