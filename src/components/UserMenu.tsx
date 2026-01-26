import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, Shield, ExternalLink, Table } from 'lucide-react';
import { getSession, clearSession, isAdmin } from '@/lib/auth/session';

interface UserMenuProps {
  onLogout: () => void;
}

// Google Sheets URL from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function UserMenu({ onLogout }: UserMenuProps) {
  const session = getSession();
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  
  // Fetch spreadsheet ID for admin users
  useEffect(() => {
    if (!isAdmin() || !session) return;
    
    // Encode session for header (base64url to avoid non-ASCII issues)
    const encodeSession = (s: typeof session) => {
      const json = JSON.stringify(s);
      const bytes = new TextEncoder().encode(json);
      let binary = '';
      for (const b of bytes) binary += String.fromCharCode(b);
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    };
    
    const fetchSpreadsheetInfo = async () => {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/gsheets-api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'X-App-Session': encodeSession(session),
          },
          body: JSON.stringify({ action: 'getSpreadsheetUrl', entity: 'admin' }),
        });
        const result = await response.json();
        if (result.success && result.data?.url) {
          setSpreadsheetUrl(result.data.url);
        }
      } catch (error) {
        console.error('Failed to fetch spreadsheet URL:', error);
      }
    };
    
    fetchSpreadsheetInfo();
  }, []);
  
  if (!session) return null;

  const handleLogout = () => {
    clearSession();
    onLogout();
  };

  const handleOpenSpreadsheet = () => {
    if (spreadsheetUrl) {
      window.open(spreadsheetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{session.name}</span>
          {isAdmin() && (
            <Badge variant="secondary" className="ml-1 hidden sm:flex">
              <Shield className="h-3 w-3 mr-1" />
              Админ
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{session.name}</span>
            <span className="text-xs text-muted-foreground font-normal">
              {isAdmin() ? 'Администратор' : 'Пользователь'}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin() && spreadsheetUrl && (
          <>
            <DropdownMenuItem onClick={handleOpenSpreadsheet}>
              <Table className="mr-2 h-4 w-4" />
              Открыть таблицу
              <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
