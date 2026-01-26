import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, LogIn, AlertCircle } from 'lucide-react';
import { loginWithAccessCode } from '@/lib/auth/api';
import { setSession, UserSession } from '@/lib/auth/session';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Введите ваше имя');
      return;
    }

    if (!accessCode.trim()) {
      setError('Введите код доступа');
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginWithAccessCode({
        name: name.trim(),
        access_code: accessCode.trim(),
      });

      if (!result.success || !result.user) {
        setError(result.error || 'Код не подошёл. Проверьте и попробуйте снова.');
        return;
      }

      // Save session
      const session: UserSession = {
        user_id: result.user.user_id,
        name: result.user.name,
        role: result.user.role,
        access_code: accessCode.trim(),
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
          <CardTitle className="text-2xl">Привет!</CardTitle>
          <CardDescription className="text-base">
            Введите имя, чтобы в карточках было видно, кто написал, и код доступа для входа.
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
              <Label htmlFor="name">Ваше имя</Label>
              <Input
                id="name"
                type="text"
                placeholder="Например: Иван Петров"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessCode">Код доступа</Label>
              <Input
                id="accessCode"
                type="password"
                placeholder="Введите код"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                disabled={isLoading}
              />
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
                  Продолжить
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
