import { Map } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Map className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Roadmap АкТрансСервис
            </h1>
            <p className="text-sm text-muted-foreground">
              Публичная дорожная карта проекта
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
