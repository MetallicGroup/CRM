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
  FileEdit,
  Target,
  TrendingUp,
  Handshake,
  PhoneCall,
  Download,
  Eye,
  Receipt,
  Clock,
  ListTodo,
  FileStack,
  Megaphone,
  MessageCircle,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useState, useCallback } from 'react';
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
      { icon: MessageCircle, label: 'Chat', href: '/chat' },
      { icon: ListTodo, label: 'Task-uri / proiecte', href: '/taskuri' },
      { icon: Home, label: 'Dashboard', href: '/' },
      { icon: UserPlus, label: 'Clienți', href: '/clienti' },
      { icon: FileEdit, label: 'Ofertare', href: '/ofertare' },
      { icon: Clock, label: 'Follow-up', href: '/followup' },
      { icon: FileStack, label: 'Documentație', href: '/documentatie' },
      { icon: TrendingUp, label: 'Vânzări', href: '/vanzari' },
      { icon: Target, label: 'Target-uri', href: '/targeturi' },
      { icon: Handshake, label: 'Parteneri', href: '/parteneri' },
      { icon: Eye, label: 'Urmăriri Clienți', href: '/admin/urmariri', adminOnly: true },
      { icon: Megaphone, label: 'Marketing', href: '/marketing' },
    ],
  },
  {
    title: 'Financiar',
    icon: Calculator,
    adminOnly: true,
    defaultOpen: false,
    items: [
      { icon: LayoutDashboard, label: 'Raport Financiar', href: '/profitabilitate/raport' },
      { icon: Users, label: 'Angajați', href: '/profitabilitate/angajati' },
      { icon: Truck, label: 'Distribuitori', href: '/profitabilitate/distribuitori' },
      { icon: Building2, label: 'Showroom-uri', href: '/profitabilitate/showroom-uri' },
      { icon: Receipt, label: 'Cheltuieli', href: '/cheltuieli' },
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
    ],
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, isAdmin, logout } = useAuth();
  const [openSections, setOpenSections] = useState<string[]>(['CRM']);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEnter = useCallback(() => setIsExpanded(true), []);
  const handleLeave = useCallback(() => setIsExpanded(false), []);

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
  const allItems = filteredSections.flatMap(s =>
    s.items.filter((item) => !item.adminOnly || isAdmin)
  );

  return (
    <aside
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => setIsExpanded(true)}
      className={cn(
        "flex h-full flex-col flex-shrink-0 border-r border-[#1f2933] bg-gradient-to-b from-[#050608] via-[#070910] to-[#050608] text-slate-200 overflow-hidden",
        "transition-[width] duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center border-b border-[#111827] flex-shrink-0",
        isExpanded ? "px-3" : "justify-center px-2"
      )}>
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#fbbf24]/20 flex-shrink-0">
          <span className="text-lg font-bold text-[#fbbf24]">M</span>
        </div>
        {isExpanded && (
          <div className="flex flex-col ml-3 overflow-hidden">
            <span className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase truncate">
              Metallic Group
            </span>
            <span className="text-lg font-bold tracking-tight text-[#fbbf24]">CRM</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        {isExpanded ? (
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
                        <section.icon className="h-4 w-4 flex-shrink-0" />
                        {section.title}
                      </div>
                      <ChevronDown className={cn(
                        "h-4 w-4 flex-shrink-0 transition-transform",
                        (isOpen || hasActiveItem) && "rotate-180"
                      )} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1 pl-4">
                    {section.items
                      .filter((item) => !item.adminOnly || isAdmin)
                      .map((item) => {
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
                            <item.icon className="h-4 w-4 flex-shrink-0" />
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
        ) : (
          <nav className="flex flex-col items-center gap-1 px-2">
            {allItems.map((item) => {
              const isActive =
                location === item.href ||
                (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} title={item.label}>
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-[#fbbf24] text-black shadow-lg shadow-yellow-500/20"
                        : "text-slate-300 hover:bg-[#1f2937] hover:text-[#fbbf24]"
                    )}
                    data-testid={`nav-${
                      item.href.replace(/\//g, "-").slice(1) || "dashboard"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* User footer */}
      <div className="border-t border-[#111827] p-3 flex-shrink-0">
        <div className={cn(
          "flex items-center gap-2",
          isExpanded ? "justify-between" : "justify-center"
        )}>
          <div className={cn(
            "flex items-center gap-3 min-w-0",
            isExpanded && "flex-1"
          )}>
            <div className="h-8 w-8 rounded-full bg-[#fbbf24]/20 flex-shrink-0 flex items-center justify-center text-[#fbbf24] text-xs font-bold">
              {getInitials()}
            </div>
            {isExpanded && (
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className="text-sm font-medium truncate">
                  {user ? `${user.firstName} ${user.lastName}` : 'Utilizator'}
                </span>
                <span className="text-xs text-slate-400 truncate">
                  {user?.email || ''}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Deconectare"
            className="flex-shrink-0 h-8 w-8"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
