import { useState } from 'react';
import { Task } from '@/entities/task';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Calendar, User, ExternalLink, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { LinkifiedText } from '@/components/LinkifiedText';
import { AnnouncementDetailModal } from '@/components/AnnouncementDetailModal';

interface AnnouncementsListProps {
  announcements: Task[];
  loading: boolean;
  isUnread?: (announcement: Task) => boolean;
  onUpdateAnnouncement?: (id: string, updates: Partial<Task>) => Promise<Task>;
}

export function AnnouncementsList({ 
  announcements, 
  loading, 
  isUnread,
  onUpdateAnnouncement,
}: AnnouncementsListProps) {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Task | null>(null);

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
          Объявления появятся здесь, когда они будут опубликованы.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {announcements.map((announcement) => (
          <AnnouncementCard 
            key={announcement.id} 
            announcement={announcement} 
            isNew={isUnread?.(announcement)}
            onClick={() => setSelectedAnnouncement(announcement)}
          />
        ))}
      </div>

      <AnnouncementDetailModal
        announcement={selectedAnnouncement}
        open={!!selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
        onSave={onUpdateAnnouncement}
      />
    </>
  );
}

interface AnnouncementCardProps {
  announcement: Task;
  isNew?: boolean;
  onClick: () => void;
}

function AnnouncementCard({ announcement, isNew, onClick }: AnnouncementCardProps) {
  return (
    <Card 
      className={`transition-all hover:shadow-md cursor-pointer ${isNew ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${isNew ? 'bg-primary/20' : 'bg-primary/10'}`}>
            <Megaphone className={`h-4 w-4 sm:h-5 sm:w-5 ${isNew ? 'text-primary' : 'text-primary'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2 flex-wrap">
              <CardTitle className="text-sm sm:text-lg leading-tight break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {announcement.title}
              </CardTitle>
              {isNew && (
                <Badge variant="default" className="shrink-0 text-[10px] px-1.5 py-0">
                  Новое
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{new Date(announcement.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              {announcement.author && (
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{announcement.author}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3">
        <div className="text-sm text-foreground whitespace-pre-wrap break-words line-clamp-3" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          <LinkifiedText text={announcement.summary} />
        </div>
        
        {announcement.url && (
          <a 
            href={announcement.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm"
            onClick={(e) => e.stopPropagation()}
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
