import { Map } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-primary rounded-lg shrink-0">
            <Map className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-foreground truncate">
              Roadmap АкТрансСервис
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Публичная дорожная карта проекта
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
