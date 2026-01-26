import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';

interface UserNamePromptProps {
  open: boolean;
  onSubmit: (name: string) => void;
}

export function UserNamePrompt({ open, onSubmit }: UserNamePromptProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Привет!
          </DialogTitle>
          <DialogDescription>
            Напиши, пожалуйста, своё имя. Так мы сможем показывать тебе актуальные объявления и удобнее работать дальше.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userName">Ваше имя</Label>
            <Input
              id="userName"
              placeholder="Например: Иван Петров"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!name.trim()}>
              Продолжить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
