import { Home, Users, Building2, Truck, Settings, UserCog, LogOut } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

interface MenuItem {
  icon: typeof Home;
  label: string;
  href: string;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Angajați', href: '/angajati', adminOnly: true },
  { icon: Building2, label: 'Showroom-uri', href: '/showroom-regional', adminOnly: true },
  { icon: Truck, label: 'Distribuitori', href: '/distributori', adminOnly: true },
  { icon: Settings, label: 'Setări', href: '/settings', adminOnly: true },
  { icon: UserCog, label: 'Utilizatori', href: '/utilizatori', adminOnly: true },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, isAdmin, logout } = useAuth();

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = () => {
    if (!user) return 'U';
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b px-6">
        <span className="text-lg font-bold tracking-tight text-sidebar-primary-foreground">CRM Metallic Group</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {filteredMenuItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  data-testid={`nav-${item.href.replace('/', '') || 'dashboard'}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary flex-shrink-0 flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold">
              {getInitials()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">
                {user ? `${user.firstName} ${user.lastName}` : 'Utilizator'}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.email || ''}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Deconectare"
            className="flex-shrink-0"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
