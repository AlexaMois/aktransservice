import { Laptop } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';

/**
 * Get user info from localStorage
 * Format: "Фамилия Имя - Роль"
 */
function getUserDisplay(): { name: string; roleLabel: string } {
  if (typeof window === 'undefined') {
    return { name: 'Гость', roleLabel: '' };
  }
  
  const name = localStorage.getItem('user_name');
  const role = localStorage.getItem('user_role');
  
  if (!name) {
    return { name: 'Гость', roleLabel: '' };
  }
  
  const roleLabel = role === 'admin' ? 'Админ' : 'Пользователь';
  return { name, roleLabel };
}

export function Header() {
  const { name, roleLabel } = getUserDisplay();
  
  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-primary rounded-lg shrink-0">
              <Laptop className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-foreground truncate">
                Цифровизация АкТрансСервис
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Публичное пространство управления цифровой трансформацией
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <FeedbackModal />
            {/* User display: Name - Role */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border">
              <span className="text-sm font-medium text-foreground">
                {name}
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
      </div>
    </header>
  );
}