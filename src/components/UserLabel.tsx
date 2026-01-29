/**
 * User display label for header
 * Shows current user info based on app mode
 */

import { User, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getDisplayName, getUserRole, getAppMode, hasAdminUI } from '@/lib/appMode';

export function UserLabel() {
  const displayName = getDisplayName();
  const role = getUserRole();
  const isPublic = getAppMode() === 'public';
  const showAdminBadge = hasAdminUI();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border">
      <User className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">
        {displayName}
      </span>
      {showAdminBadge && (
        <Badge variant="secondary" className="text-xs gap-1">
          <Shield className="h-3 w-3" />
          Админ
        </Badge>
      )}
      {isPublic && (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Публичный доступ
        </Badge>
      )}
    </div>
  );
}
