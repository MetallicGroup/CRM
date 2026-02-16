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
  FileEdit,
  Target,
  TrendingUp,
  Handshake,
  PhoneCall,
  Download,
  Eye,
  Receipt,
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
      { icon: FileEdit, label: 'Ofertare', href: '/ofertare' },
      { icon: TrendingUp, label: 'Vânzări', href: '/vanzari' },
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
      { icon: LayoutDashboard, label: 'Raport Financiar', href: '/profitabilitate/raport' },
      { icon: Receipt, label: 'Cheltuieli', href: '/cheltuieli' },
      { icon: Users, label: 'Angajați', href: '/profitabilitate/angajati' },
      { icon: Building2, label: 'Showroom-uri', href: '/profitabilitate/showroom-uri' },
      { icon: Truck, label: 'Distribuitori', href: '/profitabilitate/distribuitori' },
      { icon: Settings, label: 'Setări Financiar', href: '/profitabilitate/setari' },
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
      { icon: Download, label: 'Exporturi', href: '/admin/exporturi' },
      { icon: Eye, label: 'Urmăriri Clienți', href: '/admin/urmariri' },
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

  const filteredSections = menuSections.filter((section) => !section.adminOnly || isAdmin);

  return (
    <div className="flex h-full w-64 flex-col border-r border-[#1f2933] bg-gradient-to-b from-[#050608] via-[#070910] to-[#050608] text-slate-200">
      <div className="flex h-16 items-center border-b border-[#111827] px-6">
        <div className="flex flex-col">
          <span className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase">
            Metallic Group
          </span>
          <span className="text-lg font-bold tracking-tight text-[#fbbf24]">CRM</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-3 px-3">
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
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold tracking-wide transition-all duration-200",
                      hasActiveItem
                        ? "bg-[#111827] text-[#fbbf24] shadow-sm"
                        : "text-slate-400 hover:bg-[#111827]/70 hover:text-slate-100"
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
                    const isActive =
                      location === item.href ||
                      (item.href !== "/" && location.startsWith(item.href));
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-all duration-200",
                            isActive
                              ? "bg-[#fbbf24] text-black shadow-lg shadow-yellow-500/20"
                              : "text-slate-300 hover:bg-[#1f2937] hover:text-[#fbbf24]"
                          )}
                          data-testid={`nav-${
                            item.href.replace(/\//g, "-").slice(1) || "dashboard"
                          }`}
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
