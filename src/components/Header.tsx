import { Laptop } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { FeedbackModal } from './FeedbackModal';

interface HeaderProps {
  onLogout?: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  // Always show feedback in public mode
  const showFeedback = true;
  
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
          
          <div className="flex items-center gap-1 sm:gap-2">
            {showFeedback && <FeedbackModal />}
            {onLogout && <UserMenu onLogout={onLogout} />}
          </div>
        </div>
      </div>
    </header>
  );
}
