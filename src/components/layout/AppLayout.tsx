import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Menu } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { role } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          {/* Mobile header */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-card px-4 lg:hidden">
            <SidebarTrigger className="-ml-2">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex flex-1 items-center justify-between">
              <span className="font-semibold">X-Ray Center</span>
              {role && (
                <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                  {role}
                </Badge>
              )}
            </div>
          </header>
          
          {/* Main content */}
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
