import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  TrendingUp, 
  Handshake, 
  Calculator,
  Receipt,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Key
} from 'lucide-react';

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Clienți', href: '/clienti' },
  { icon: Target, label: 'Target-uri', href: '/targeturi' },
  { icon: TrendingUp, label: 'Vânzări', href: '/vanzari' },
  { icon: Handshake, label: 'Parteneri', href: '/parteneri' },
  { icon: Receipt, label: 'Cheltuieli', href: '/cheltuieli', adminOnly: true },
  { icon: Calculator, label: 'Profitabilitate', href: '/profitabilitate', adminOnly: true },
];

export function Header() {
  const [location, setLocation] = useLocation();
  const { user, isAdmin, logout, refreshUser } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleOpenProfile = () => {
    setProfileData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    });
    setIsProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      
      await refreshUser();
      toast.success('Profil actualizat cu succes');
      setIsProfileOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Eroare la actualizare');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Parolele nu coincid');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Parola nouă trebuie să aibă minim 6 caractere');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      
      toast.success('Parola a fost schimbată cu succes');
      setIsPasswordOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Eroare la schimbarea parolei');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const getInitials = () => {
    if (!user) return 'U';
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div className="ml-2">
                <span className="text-xl font-bold text-blue-900">METALLIC</span>
                <span className="text-xl font-light text-gray-600 ml-1">GROUP</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {filteredNavItems.map((item) => {
              const isActive = location === item.href || 
                (item.href !== '/' && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex flex-col items-center px-4 py-2 rounded-lg transition-colors cursor-pointer",
                      isActive 
                        ? "bg-blue-600 text-white" 
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                    data-testid={`nav-${item.href.replace('/', '') || 'dashboard'}`}
                  >
                    <item.icon className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    {getInitials()}
                  </div>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user?.role === 'ADMIN' ? 'Administrator' : 'Agent'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Contul meu</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleOpenProfile} data-testid="menu-profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsPasswordOpen(true)} data-testid="menu-password">
                  <Key className="mr-2 h-4 w-4" />
                  <span>Schimbă Parola</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => setLocation('/utilizatori')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Administrare Utilizatori</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Deconectare</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profilul Meu</DialogTitle>
            <DialogDescription>
              Actualizează informațiile tale de profil
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prenume</Label>
                <Input
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  data-testid="input-profile-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label>Nume</Label>
                <Input
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  data-testid="input-profile-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                data-testid="input-profile-email"
              />
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p><strong>Rol:</strong> {user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'AGENT' ? 'Agent' : 'Special'}</p>
              <p><strong>Cont creat:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ro-RO') : '-'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleSaveProfile} disabled={isLoading} data-testid="button-save-profile">
              {isLoading ? 'Se salvează...' : 'Salvează'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schimbă Parola</DialogTitle>
            <DialogDescription>
              Introdu parola curentă și parola nouă
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Parola curentă</Label>
              <Input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Parola nouă</Label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmă parola nouă</Label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleChangePassword} disabled={isLoading} data-testid="button-change-password">
              {isLoading ? 'Se schimbă...' : 'Schimbă Parola'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
