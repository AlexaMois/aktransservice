import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, ExternalLink, Table, Database, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { initGoogleSheets, getGSheetsId, setGSheetsId, isGSheetsMode } from '@/lib/api/gsheets';
import { supabase } from '@/integrations/supabase/client';

interface MigrationSetupProps {
  onComplete: () => void;
}

export function MigrationSetup({ onComplete }: MigrationSetupProps) {
  const [loading, setLoading] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [step, setStep] = useState<'initial' | 'migrating' | 'complete'>('initial');
  const [manualId, setManualId] = useState('');
  
  const isConfigured = isGSheetsMode();
  const currentId = getGSheetsId();

  const handleMigrate = async () => {
    setLoading(true);
    setStep('migrating');
    
    try {
      // Fetch existing data from Supabase
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (tasksError) throw tasksError;

      const { data: announcements, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false });
      
      if (announcementsError) throw announcementsError;

      // Initialize Google Sheets and migrate data
      const url = await initGoogleSheets(tasks || [], announcements || []);
      
      setSpreadsheetUrl(url);
      setStep('complete');
      toast.success('Миграция завершена успешно!');
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Ошибка при миграции: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setStep('initial');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectExisting = () => {
    if (!manualId.trim()) {
      toast.error('Введите ID таблицы');
      return;
    }
    
    // Extract ID from URL if full URL is provided
    let id = manualId.trim();
    const urlMatch = id.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
      id = urlMatch[1];
    }
    
    setGSheetsId(id);
    toast.success('Google Таблица подключена');
    onComplete();
  };

  const handleDisconnect = () => {
    localStorage.removeItem('GOOGLE_SHEETS_ID');
    toast.success('Отключено от Google Таблицы');
    window.location.reload();
  };

  if (isConfigured) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <CardTitle>Google Sheets подключен</CardTitle>
          </div>
          <CardDescription>
            Приложение использует Google Таблицу как источник данных
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <Label className="text-xs text-muted-foreground">ID таблицы</Label>
            <p className="font-mono text-sm">{currentId}</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a 
                href={`https://docs.google.com/spreadsheets/d/${currentId}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Открыть таблицу
              </a>
            </Button>
            <Button onClick={onComplete}>
              Перейти к приложению
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="destructive" onClick={handleDisconnect}>
              Отключить
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'complete') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <CardTitle>Миграция завершена!</CardTitle>
          </div>
          <CardDescription>
            Все данные перенесены в Google Таблицу
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Table className="h-4 w-4" />
            <AlertDescription>
              Теперь все данные хранятся и читаются из Google Таблицы. 
              Вы можете редактировать данные напрямую в таблице.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={spreadsheetUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Открыть таблицу
              </a>
            </Button>
            <Button onClick={onComplete}>
              Продолжить работу
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Table className="h-5 w-5" />
          Настройка Google Sheets
        </CardTitle>
        <CardDescription>
          Перенесите данные из внутренней базы в Google Таблицу
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Option 1: Migrate */}
        <div className="space-y-4">
          <h3 className="font-medium">Вариант 1: Создать новую таблицу и мигрировать данные</h3>
          <p className="text-sm text-muted-foreground">
            Будет создана новая Google Таблица в вашей папке Google Drive, 
            и все существующие данные будут перенесены туда.
          </p>
          <Button 
            onClick={handleMigrate} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Миграция...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                <ArrowRight className="h-4 w-4 mr-2" />
                <Table className="h-4 w-4 mr-2" />
                Начать миграцию
              </>
            )}
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">или</span>
          </div>
        </div>

        {/* Option 2: Connect existing */}
        <div className="space-y-4">
          <h3 className="font-medium">Вариант 2: Подключить существующую таблицу</h3>
          <p className="text-sm text-muted-foreground">
            Если у вас уже есть Google Таблица с правильной структурой, 
            введите её ID или URL.
          </p>
          <div className="space-y-2">
            <Label htmlFor="sheet-id">ID или URL таблицы</Label>
            <Input
              id="sheet-id"
              placeholder="https://docs.google.com/spreadsheets/d/... или ID"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={handleConnectExisting}
            disabled={!manualId.trim()}
            className="w-full"
          >
            Подключить таблицу
          </Button>
        </div>

        <Alert>
          <AlertDescription className="text-xs">
            <strong>Важно:</strong> Убедитесь, что Service Account имеет доступ к папке 
            Google Drive и права на редактирование таблиц.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
