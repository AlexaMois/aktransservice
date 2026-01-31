import { Laptop } from 'lucide-react';

/**
 * Get user identity from localStorage
 * Format: "[Name] • [Role]" or "Гость" if not logged in
 */
function getUserIdentity(): { displayName: string; roleLabel: string | null } {
  if (typeof window === 'undefined') {
    return { displayName: 'Гость', roleLabel: null };
  }
  
  const userName = localStorage.getItem('user_name');
  const userRole = localStorage.getItem('user_role');
  
  if (!userName) {
    return { displayName: 'Гость', roleLabel: null };
  }
  
  // Map role to Russian label
  const roleLabel = userRole === 'admin' ? 'Админ' : 'Пользователь';
  
  return { displayName: userName, roleLabel };
}

export function Header() {
  const { displayName, roleLabel } = getUserIdentity();
  
  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Left side: Company name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-primary rounded-lg shrink-0">
              <Laptop className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <h1 className="text-base sm:text-xl font-bold text-foreground truncate">
              Цифровизация АкТрансСервис
            </h1>
          </div>
          
          {/* Right side: User identity - always visible */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border">
            <span className="text-sm font-medium text-foreground">
              {displayName}
            </span>
            {roleLabel && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {roleLabel}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
