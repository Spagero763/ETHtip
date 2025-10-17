import { Button } from '@/components/ui/button';
import { Cog } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto flex h-20 items-center justify-end px-4 text-sm md:px-6">
        <Button variant="outline" asChild>
          <a
            href="https://account.base.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Cog className="mr-2 h-4 w-4" />
            Manage Permissions
          </a>
        </Button>
      </div>
    </footer>
  );
}
