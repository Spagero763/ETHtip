import { Gift } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <Gift className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {`EthTip`}
          </h1>
        </div>
        <p className='text-sm text-muted-foreground'>The frictionless tipping app</p>
      </div>
    </header>
  );
}
