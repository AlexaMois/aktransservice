/**
 * Toggle between digitization and personal task modes
 */

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Building2, User } from 'lucide-react';
import type { TaskScope } from '@/entities/task';
import { TASK_SCOPE_LABELS } from '@/entities/task';

interface TaskScopeToggleProps {
  value: TaskScope;
  onChange: (value: TaskScope) => void;
}

export function TaskScopeToggle({ value, onChange }: TaskScopeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(val) => val && onChange(val as TaskScope)}
      className="bg-muted p-1 rounded-lg"
    >
      <ToggleGroupItem
        value="digitization"
        aria-label={TASK_SCOPE_LABELS.digitization}
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5 gap-1.5"
      >
        <Building2 className="h-4 w-4" />
        <span className="hidden sm:inline">{TASK_SCOPE_LABELS.digitization}</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="personal"
        aria-label={TASK_SCOPE_LABELS.personal}
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5 gap-1.5"
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">{TASK_SCOPE_LABELS.personal}</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
