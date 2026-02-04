import { 
  Home, 
  Users, 
  Building2, 
  Truck, 
  Settings, 
  UserCog, 
  LogOut,
  LayoutDashboard,
  Calculator,
  ChevronDown,
  UserPlus,
  FileText,
  Target,
  Handshake,
  PhoneCall,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MenuItem {
  icon: typeof Home;
  label: string;
  href: string;
  adminOnly?: boolean;
}

interface MenuSection {
  title: string;
  icon: typeof Home;
  items: MenuItem[];
  adminOnly?: boolean;
  defaultOpen?: boolean;
}

const menuSections: MenuSection[] = [
  {
    title: 'CRM',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { icon: Home, label: 'Dashboard', href: '/' },
      { icon: UserPlus, label: 'Clienți', href: '/clienti' },
      { icon: FileText, label: 'Oferte', href: '/oferte' },
      { icon: Target, label: 'Target-uri', href: '/targeturi' },
      { icon: Handshake, label: 'Parteneri', href: '/parteneri' },
    ],
  },
  {
    title: 'Financiar',
    icon: Calculator,
    adminOnly: true,
    defaultOpen: false,
    items: [
      { icon: LayoutDashboard, label: 'Raport Financiar', href: '/financiar' },
      { icon: Users, label: 'Angajați', href: '/financiar/angajati' },
      { icon: Building2, label: 'Showroom-uri', href: '/financiar/showroom-uri' },
      { icon: Truck, label: 'Distribuitori', href: '/financiar/distribuitori' },
      { icon: Settings, label: 'Setări Financiar', href: '/financiar/setari' },
    ],
  },
  {
    title: 'Administrare',
    icon: UserCog,
    adminOnly: true,
    defaultOpen: false,
    items: [
      { icon: UserCog, label: 'Utilizatori', href: '/utilizatori' },
      { icon: PhoneCall, label: 'Apeluri Clienți', href: '/admin/apeluri' },
    ],
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, isAdmin, logout } = useAuth();
  const [openSections, setOpenSections] = useState<string[]>(['CRM']);

  const toggleSection = (title: string) => {
    setOpenSections(prev => 
      prev.includes(title) 
        ? prev.filter(s => s !== title)
        : [...prev, title]
    );
  };

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

  const filteredSections = menuSections.filter(section => !section.adminOnly || isAdmin);

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b px-6">
        <span className="text-lg font-bold tracking-tight text-sidebar-primary-foreground">Metallic Group</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-2 px-2">
          {filteredSections.map((section) => {
            const isOpen = openSections.includes(section.title);
            const hasActiveItem = section.items.some(item => 
              location === item.href || (item.href !== '/' && location.startsWith(item.href))
            );

            return (
              <Collapsible
                key={section.title}
                open={isOpen || hasActiveItem}
                onOpenChange={() => toggleSection(section.title)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                      hasActiveItem 
                        ? "text-sidebar-primary-foreground" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <section.icon className="h-4 w-4" />
                      {section.title}
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      (isOpen || hasActiveItem) && "rotate-180"
                    )} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1 pl-4">
                  {section.items.map((item) => {
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
                          data-testid={`nav-${item.href.replace(/\//g, '-').slice(1) || 'dashboard'}`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </div>
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
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
