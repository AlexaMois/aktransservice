import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle, AlertCircle } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function SetupAdmin() {
  const [secretKey, setSecretKey] = useState('');
  const [adminName, setAdminName] = useState('Администратор');
  const [adminAccessCode, setAdminAccessCode] = useState('');
  const [staffAccessCode, setStaffAccessCode] = useState('akts2026');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!secretKey.trim()) {
      setError('Введите секретный ключ');
      return;
    }

    if (!adminAccessCode.trim()) {
      setError('Введите код доступа для администратора');
      return;
    }

    if (!staffAccessCode.trim()) {
      setError('Введите общий код доступа для сотрудников');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/gsheets-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'X-App-Secret-Key': secretKey.trim(),
        },
        body: JSON.stringify({
          action: 'seed',
          entity: 'users',
          data: {
            admin_name: adminName.trim(),
            admin_access_code: adminAccessCode.trim(),
            user_access_code: staffAccessCode.trim(),
          },
        }),
      });

      const result = await response.json();

      if (!result.success) {
        if (response.status === 409) {
          setError('Администратор уже создан');
        } else if (response.status === 403) {
          setError('Неверный секретный ключ');
        } else {
          setError(result.error || 'Ошибка создания администратора');
        }
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error('Setup error:', err);
      setError('Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Готово!</h2>
            <p className="text-muted-foreground mb-4">
              Администратор создан.
              <br />
              Код администратора: <strong>{adminAccessCode}</strong>
              <br />
              Общий код для сотрудников: <strong>{staffAccessCode}</strong>
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Перейти на главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Настройка администратора</CardTitle>
          <CardDescription>
            Создайте первого администратора для системы. Этот шаг можно выполнить только один раз.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="secretKey">Секретный ключ (APP_SECRET_KEY)</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="Введите секретный ключ"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Ключ, который вы установили в настройках проекта
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminName">Имя администратора</Label>
              <Input
                id="adminName"
                type="text"
                placeholder="Администратор"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminAccessCode">Код доступа для входа</Label>
              <Input
                id="adminAccessCode"
                type="text"
                placeholder="Придумайте код доступа"
                value={adminAccessCode}
                onChange={(e) => setAdminAccessCode(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Этот код будет использоваться для входа в систему
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffAccessCode">Общий код для сотрудников</Label>
              <Input
                id="staffAccessCode"
                type="text"
                placeholder="Например: akts2026"
                value={staffAccessCode}
                onChange={(e) => setStaffAccessCode(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                По этому коду сотрудники смогут входить, а система создаст им отдельные профили по имени
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создание...
                </>
              ) : (
                'Создать администратора'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
