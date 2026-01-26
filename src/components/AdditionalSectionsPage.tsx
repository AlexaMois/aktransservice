import { useDigitizationQueue, useNotAutomating, useExperiments } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListTodo, XCircle, FlaskConical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function AdditionalSectionsPage() {
  return (
    <Tabs defaultValue="queue" className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1">
        <TabsTrigger value="queue" className="flex items-center gap-1.5 py-2.5 px-2 text-xs sm:text-sm sm:gap-2 sm:px-3">
          <ListTodo className="h-4 w-4 shrink-0" />
          <span className="truncate">Очередь</span>
        </TabsTrigger>
        <TabsTrigger value="not-automating" className="flex items-center gap-1.5 py-2.5 px-2 text-xs sm:text-sm sm:gap-2 sm:px-3">
          <XCircle className="h-4 w-4 shrink-0" />
          <span className="truncate">Не автомат.</span>
        </TabsTrigger>
        <TabsTrigger value="experiments" className="flex items-center gap-1.5 py-2.5 px-2 text-xs sm:text-sm sm:gap-2 sm:px-3">
          <FlaskConical className="h-4 w-4 shrink-0" />
          <span className="truncate">Экспер.</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="queue" className="mt-4">
        <DigitizationQueueSection />
      </TabsContent>
      <TabsContent value="not-automating" className="mt-4">
        <NotAutomatingSection />
      </TabsContent>
      <TabsContent value="experiments" className="mt-4">
        <ExperimentsSection />
      </TabsContent>
    </Tabs>
  );
}

function DigitizationQueueSection() {
  const { items, loading } = useDigitizationQueue();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (items.length === 0) {
    return (
      <EmptyState 
        icon={<ListTodo className="h-10 w-10 sm:h-12 sm:w-12" />}
        title="Очередь пуста"
        description="Здесь будут отображаться процессы и направления, запланированные на будущее."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4 px-1">
        Процессы и направления, запланированные на будущее (без сроков и обязательств).
      </p>
      {items.map((item, index) => (
        <Card key={item.id}>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">{index + 1}</Badge>
              <CardTitle className="text-sm sm:text-base">{item.title}</CardTitle>
            </div>
          </CardHeader>
          {item.description && (
            <CardContent className="px-3 sm:px-6 pb-3">
              <p className="text-xs sm:text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function NotAutomatingSection() {
  const { items, loading } = useNotAutomating();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (items.length === 0) {
    return (
      <EmptyState 
        icon={<XCircle className="h-10 w-10 sm:h-12 sm:w-12" />}
        title="Список пуст"
        description="Здесь будут отображаться процессы, которые осознанно не автоматизируются."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4 px-1">
        Процессы, которые осознанно не автоматизируются, с пояснением причины.
      </p>
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base flex items-start gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span>{item.title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Причина: </span>
              {item.reason}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ExperimentsSection() {
  const { items, loading } = useExperiments();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (items.length === 0) {
    return (
      <EmptyState 
        icon={<FlaskConical className="h-10 w-10 sm:h-12 sm:w-12" />}
        title="Нет экспериментов"
        description="Здесь будут отображаться тестируемые идеи без гарантий внедрения."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4 px-1">
        Тестируемые идеи без гарантий внедрения. Помечены как экспериментальные.
      </p>
      {items.map((item) => (
        <Card key={item.id} className="border-dashed">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base flex items-start gap-2 flex-wrap">
              <FlaskConical className="h-4 w-4 text-chart-1 shrink-0 mt-0.5" />
              <span className="flex-1">{item.title}</span>
              <Badge variant="outline" className="text-chart-1 border-chart-1/30 bg-chart-1/10 text-xs">
                Эксперимент
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 sm:px-6 pb-3">
            {item.description && (
              <p className="text-xs sm:text-sm text-muted-foreground">{item.description}</p>
            )}
            {item.hypothesis && (
              <div className="text-xs sm:text-sm">
                <span className="font-medium text-foreground">Гипотеза: </span>
                <span className="text-muted-foreground">{item.hypothesis}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="px-3 sm:px-6">
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3">
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center py-10 sm:py-12 px-4">
      <div className="text-muted-foreground mb-4 flex justify-center">{icon}</div>
      <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
    </div>
  );
}
