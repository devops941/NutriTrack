import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  UtensilsCrossed,
  ScanLine,
  Scale,
  TrendingUp,
  Target,
  FileSpreadsheet,
  User,
  ChevronLeft,
  ChevronRight,
  Leaf
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    group: 'My Nutrition',
    items: [
      { name: 'Food Diary', path: '/diary', icon: BookOpen },
      { name: 'Meal Planner', path: '/planner', icon: CalendarDays },
    ],
  },
  {
    group: 'Food Intelligence',
    items: [
      { name: 'Food Library', path: '/foods', icon: UtensilsCrossed },
      { name: 'Label Scanner', path: '/scanner', icon: ScanLine },
      { name: 'Product Comparison', path: '/compare', icon: Scale },
    ],
  },
  {
    group: 'Analysis',
    items: [
      { name: 'Nutrient Trends', path: '/analytics', icon: TrendingUp },
      { name: 'Target Settings', path: '/targets', icon: Target },
    ],
  },
  {
    group: 'Reports',
    items: [
      { name: 'Export Reports', path: '/reports', icon: FileSpreadsheet },
    ],
  },
  {
    group: 'Personal',
    items: [
      { name: 'Profile & Settings', path: '/profile', icon: User },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white border-r border-mutedGrey-border transition-all duration-300 z-30 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-mutedGrey-border bg-forest-50/50">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-forest text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Leaf className="w-6 h-6 text-sage-light" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight text-forest font-editorial">
                NutriTrack
              </span>
              <span className="text-[10px] text-mutedGrey uppercase tracking-wider font-medium">
                Food Intelligence
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-mutedGrey hover:text-forest hover:bg-forest-50 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAVIGATION_GROUPS.map((grp) => (
          <div key={grp.group} className="space-y-1">
            {!collapsed && (
              <h3 className="px-3 text-[11px] font-semibold text-mutedGrey uppercase tracking-wider mb-2">
                {grp.group}
              </h3>
            )}
            {grp.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                      isActive
                        ? 'bg-forest text-white shadow-sm font-semibold'
                        : 'text-charcoal-light hover:bg-forest-50 hover:text-forest'
                    } ${collapsed ? 'justify-center' : 'space-x-3'}`
                  }
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? '' : 'stroke-[1.75]'}`} />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-mutedGrey-border bg-ivory/50">
        {!collapsed ? (
          <div className="flex items-center space-x-2 text-xs text-mutedGrey">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>System Online</span>
          </div>
        ) : (
          <div className="flex justify-center" title="System Online">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
        )}
      </div>
    </aside>
  );
};
