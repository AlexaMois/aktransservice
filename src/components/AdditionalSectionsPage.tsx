import { useDigitizationQueue, useNotAutomating, useExperiments } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListTodo, XCircle, FlaskConical, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function AdditionalSectionsPage() {
  return (
    <Tabs defaultValue="queue" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="queue" className="flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          <span className="hidden sm:inline">Очередь цифровизации</span>
          <span className="sm:hidden">Очередь</span>
        </TabsTrigger>
        <TabsTrigger value="not-automating" className="flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Что не автоматизируем</span>
          <span className="sm:hidden">Не авто</span>
        </TabsTrigger>
        <TabsTrigger value="experiments" className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4" />
          <span className="hidden sm:inline">Эксперименты</span>
          <span className="sm:hidden">Экспер.</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="queue">
        <DigitizationQueueSection />
      </TabsContent>
      <TabsContent value="not-automating">
        <NotAutomatingSection />
      </TabsContent>
      <TabsContent value="experiments">
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
        icon={<ListTodo className="h-12 w-12" />}
        title="Очередь пуста"
        description="Здесь будут отображаться процессы и направления, запланированные на будущее."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground mb-4">
        Процессы и направления, запланированные на будущее (без сроков и обязательств).
      </p>
      {items.map((item, index) => (
        <Card key={item.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="shrink-0">{index + 1}</Badge>
              <CardTitle className="text-base">{item.title}</CardTitle>
            </div>
          </CardHeader>
          {item.description && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.description}</p>
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
        icon={<XCircle className="h-12 w-12" />}
        title="Список пуст"
        description="Здесь будут отображаться процессы, которые осознанно не автоматизируются."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground mb-4">
        Процессы, которые осознанно не автоматизируются, с пояснением причины.
      </p>
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              {item.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
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
        icon={<FlaskConical className="h-12 w-12" />}
        title="Нет экспериментов"
        description="Здесь будут отображаться тестируемые идеи без гарантий внедрения."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground mb-4">
        Тестируемые идеи без гарантий внедрения. Помечены как экспериментальные.
      </p>
      {items.map((item) => (
        <Card key={item.id} className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-chart-1" />
              {item.title}
              <Badge variant="outline" className="ml-auto text-chart-1 border-chart-1/30 bg-chart-1/10">
                Эксперимент
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            {item.hypothesis && (
              <div className="text-sm">
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
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-muted-foreground mb-4 flex justify-center">{icon}</div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
