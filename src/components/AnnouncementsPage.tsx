import { Announcement } from '@/types/task';
import { useAnnouncements } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, Calendar, Users, ExternalLink, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function AnnouncementsPage() {
  const { announcements, loading } = useAnnouncements();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="px-3 sm:px-6">
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3">
              <Skeleton className="h-16 sm:h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-10 sm:py-12 px-4">
        <Megaphone className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">Нет объявлений</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Объявления появятся здесь, когда администратор их опубликует.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((announcement) => (
        <AnnouncementCard key={announcement.id} announcement={announcement} />
      ))}
    </div>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
            <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm sm:text-lg leading-tight">{announcement.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{new Date(announcement.published_at).toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{announcement.target_audience === 'all' ? 'Для всех' : announcement.target_audience}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3">
        <p className="text-sm text-foreground whitespace-pre-wrap">{announcement.description}</p>
        
        {announcement.document_url && (
          <a 
            href={announcement.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span>Открыть документ</span>
            <ExternalLink className="h-4 w-4 shrink-0" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
