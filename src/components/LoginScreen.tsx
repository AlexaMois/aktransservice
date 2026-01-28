import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, LogIn, AlertCircle, ShieldAlert } from 'lucide-react';
import { loginWithUserId } from '@/lib/auth/api';
import { setSession, UserSession } from '@/lib/auth/session';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsAccessDenied(false);

    if (!userId.trim()) {
      setError('Введите ваш ID');
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginWithUserId({
        user_id: userId.trim(),
      });

      if (!result.success || !result.user) {
        if (result.code === 'ACCESS_DENIED') {
          setIsAccessDenied(true);
          setError(result.error || 'Доступ запрещён');
        } else {
          setError(result.error || 'Ошибка входа');
        }
        return;
      }

      // Save session
      const session: UserSession = {
        user_id: result.user.user_id,
        name: result.user.name,
        role: result.user.role,
      };
      setSession(session);
      onLoginSuccess();
    } catch (err) {
      console.error('Login error:', err);
      setError('Ошибка соединения. Проверьте интернет и попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Вход в систему</CardTitle>
          <CardDescription className="text-base">
            Введите ваш ID для доступа к порталу цифровизации
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAccessDenied ? (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>
                  <strong>Доступ запрещён.</strong>
                  <br />
                  Вы не входите в список разрешённых пользователей.
                  <br />
                  Обратитесь к администратору для получения доступа.
                </AlertDescription>
              </Alert>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="userId">Ваш ID (Telegram ID)</Label>
              <Input
                id="userId"
                type="text"
                placeholder="Например: 306664248"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setIsAccessDenied(false);
                  setError('');
                }}
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Узнать свой Telegram ID можно через бота @userinfobot
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Проверяем...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Войти
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
