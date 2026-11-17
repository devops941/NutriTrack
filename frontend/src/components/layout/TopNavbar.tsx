import React, { useState } from 'react';
import { Bell, Search, PlusCircle, ScanLine, Calculator, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import { NutrientCalculatorModal } from '../nutrition/NutrientCalculatorModal';

interface TopNavbarProps {
  collapsed: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    }
    clearAuth();
    navigate('/login');
  };

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <>
      <header
        className={`fixed top-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-mutedGrey-border z-20 transition-all duration-300 flex items-center justify-between px-6 ${
          collapsed ? 'left-20' : 'left-64'
        }`}
      >
        {/* Search & Date Greeting */}
        <div className="flex items-center space-x-6">
          <div>
            <h2 className="text-sm font-semibold text-charcoal">Daily Nutrition Log</h2>
            <p className="text-xs text-mutedGrey">{currentDate}</p>
          </div>

          <div className="hidden md:flex items-center relative w-72">
            <Search className="w-4 h-4 text-mutedGrey absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search verified food master..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-ivory rounded-full border border-mutedGrey-border focus:outline-none focus:border-forest text-charcoal"
            />
          </div>
        </div>

        {/* Quick Actions & Profile */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={() => setIsCalcOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-forest bg-forest-50 hover:bg-forest-100 rounded-lg transition-colors border border-sage/40"
            title="Open Nutrient Calculator"
          >
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">Calculator</span>
          </button>

          <Link
            to="/scanner"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-forest bg-forest-50 hover:bg-forest-100 rounded-lg transition-colors border border-sage/40"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan Label</span>
          </Link>

          <Link
            to="/diary"
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-forest hover:bg-forest-dark rounded-lg shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Quick Log</span>
          </Link>

          {/* Notifications */}
          <button
            className="p-2 rounded-lg text-charcoal-light hover:bg-ivory relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-mutedGrey" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-terracotta"></span>
          </button>

          {/* User Avatar & Profile Link */}
          <Link
            to="/profile"
            className="flex items-center space-x-2 pl-2 border-l border-mutedGrey-border hover:opacity-85 transition-opacity"
            title="Manage Profile"
          >
            <div className="w-8 h-8 rounded-full bg-forest text-sage-light flex items-center justify-center font-bold text-xs shadow-sm">
              {initials}
            </div>
            <div className="hidden lg:block text-left">
              <span className="block text-xs font-semibold text-charcoal leading-none">
                {user?.fullName || 'NutriTrack User'}
              </span>
              <span className="text-[10px] text-mutedGrey">
                {user?.roles?.[0] ? user.roles[0].replace('_', ' ') : 'Member'}
              </span>
            </div>
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-1.5 text-mutedGrey hover:text-terracotta rounded-lg hover:bg-terracotta/10 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Nutrient Calculator Modal */}
      <NutrientCalculatorModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
    </>
  );
};
