import { Header } from '@/components/app/header';
import { Footer } from '@/components/app/footer';
import { Tipper } from '@/components/app/tipper';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-body">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
          <Tipper />
        </div>
      </main>
      <Footer />
    </div>
  );
}
