import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Stethoscope,
  FileText,
  LogOut,
  ScanLine,
  ChevronLeft,
  Receipt,
} from 'lucide-react';

const mainNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Recent Entries', url: '/recent', icon: Users },
  { title: 'Patients', url: '/patients', icon: Users },
  { title: 'New Visit', url: '/visits/new', icon: UserPlus },
];

const adminNavItems = [
  { title: 'Doctors', url: '/doctors', icon: Stethoscope },
  { title: 'Billing', url: '/billing', icon: Receipt },
  { title: 'Reports', url: '/reports', icon: FileText },
];

export function AppSidebar() {
  const { role, signOut, user } = useAuth();
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const isAdmin = role === 'admin';

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar
      className="border-r-0"
      style={{
        background: 'var(--gradient-sidebar)',
      }}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <ScanLine className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">Chhaya Diagnostic Center</span>
              <span className="text-xs text-sidebar-foreground/60">Tracking System</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">
            {!collapsed && 'Main Menu'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      onClick={handleLinkClick}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/50">
              {!collapsed && 'Administration'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        onClick={handleLinkClick}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && user && (
          <div className="mb-3 truncate text-xs text-sidebar-foreground/60">
            {user.email}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            onClick={signOut}
            className="flex-1 justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-2">Sign out</span>}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
