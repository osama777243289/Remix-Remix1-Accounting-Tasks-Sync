import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Activity,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
} from 'lucide-react';
import { Booking, Hall, Account, StandardCostTemplate, Transaction, Service } from '../types';
import { usePermissions } from '../lib/permissions';
import BookingAlerts from './BookingAlerts';
import DashboardStatsCards from './DashboardStatsCards';
import ProfitabilityDashboardCard from './ProfitabilityDashboardCard';
import BudgetVarianceCard from './BudgetVarianceCard';

interface DashboardTopCardsRowProps {
  bookings: Booking[];
  halls: Hall[];
  accounts: Account[];
  transactions: Transaction[];
  services: Service[];
  standardCosts: StandardCostTemplate[];
  currentDate: Date;
  globalCurrencySymbol: string;
  onPreviewBooking: (bookingId: string) => void;
  selectedStatType: any;
  onSelectedStatTypeChange: (type: any) => void;
  depositFilter: any;
  onDepositFilterChange: (filter: any) => void;
}

type TabType = 'alerts' | 'stats' | 'profitability' | 'variance';

export default function DashboardTopCardsRow({
  bookings,
  halls,
  accounts,
  transactions,
  services,
  standardCosts,
  currentDate,
  globalCurrencySymbol,
  onPreviewBooking,
  selectedStatType,
  onSelectedStatTypeChange,
  depositFilter,
  onDepositFilterChange,
}: DashboardTopCardsRowProps) {
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabType | null>(null);

  const canViewAlerts = hasPermission('view-dashboard');
  const canViewStats = hasPermission('card-booking-stats');
  const canViewProfitability = hasPermission('view-sensitive-financial-totals');
  const canViewVariance = hasPermission('view-sensitive-financial-totals');

  // Quick calculate alerts count for the badge
  const totalAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = bookings.filter((b) => {
      if (b.status === 'cancelled' || b.status === 'completed') return false;
      const totalPaid = (b.paidAmount || 0) + (b.subsequentPayments || 0);
      const remaining = b.totalPrice - totalPaid;
      if (remaining <= 0) return false;
      if (!b.days || b.days.length === 0) return false;
      const firstDay = b.days[0].date;
      if (!firstDay) return false;
      const bDate = new Date(firstDay);
      if (isNaN(bDate.getTime())) return false;
      bDate.setHours(0, 0, 0, 0);
      return bDate < today;
    }).length;

    const approaching = bookings.filter((b) => {
      if (b.status === 'cancelled' || b.status === 'completed') return false;
      const totalPaid = (b.paidAmount || 0) + (b.subsequentPayments || 0);
      const remaining = b.totalPrice - totalPaid;
      if (remaining <= 0) return false;
      if (!b.days || b.days.length === 0) return false;
      const firstDay = b.days[0].date;
      if (!firstDay) return false;
      const bDate = new Date(firstDay);
      if (isNaN(bDate.getTime())) return false;
      bDate.setHours(0, 0, 0, 0);
      if (bDate < today) return false;
      const diffTime = bDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }).length;

    const needAccrual = bookings.filter((b) => {
      if (b.status === 'cancelled' || b.revenueAccrued) return false;
      if (!b.days || b.days.length === 0) return false;
      const lastDay = b.days[b.days.length - 1].date;
      const bDate = new Date(lastDay);
      bDate.setHours(0, 0, 0, 0);
      return bDate <= today;
    }).length;

    const pendingInsurance = bookings.filter((b) => {
      if (b.status === 'cancelled' || b.insuranceRefunded) return false;
      if (!b.insuranceAmount || b.insuranceAmount <= 0) return false;
      if (!b.days || b.days.length === 0) return false;
      const lastDay = b.days[b.days.length - 1].date;
      const bDate = new Date(lastDay);
      bDate.setHours(0, 0, 0, 0);
      return bDate <= today;
    }).length;

    const pendingMortgage = bookings.filter((b) => {
      if (b.status === 'cancelled') return false;
      const hasUnreturnedCash = b.mortgageAmount && b.mortgageAmount > 0 && b.mortgageStatus !== 'returned';
      const hasUnreturnedPhysical = b.pledgesDescription && b.pledgesDescription.trim() !== '' && b.pledgeStatus !== 'returned';
      if (!hasUnreturnedCash && !hasUnreturnedPhysical) return false;
      if (!b.days || b.days.length === 0) return false;
      const lastDay = b.days[b.days.length - 1].date;
      const bDate = new Date(lastDay);
      bDate.setHours(0, 0, 0, 0);
      return bDate <= today;
    }).length;

    return overdue + approaching + needAccrual + pendingInsurance + pendingMortgage;
  }, [bookings]);

  const monthName = currentDate.toLocaleDateString('ar-SA', {
    month: 'long',
    year: 'numeric',
  });

  const toggleTab = (tab: TabType) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  const tabsConfig = [
    {
      id: 'alerts' as TabType,
      allowed: canViewAlerts,
      icon: AlertTriangle,
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      activeRing: 'ring-2 ring-rose-500 border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20',
      title: 'مركز التنبيهات',
      subtitle: totalAlerts > 0 ? `${totalAlerts} تنبيه مستحق` : 'مستوفية الدفع',
      badge: totalAlerts > 0 ? `${totalAlerts} تنبيه` : null,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
    },
    {
      id: 'stats' as TabType,
      allowed: canViewStats,
      icon: Activity,
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      activeRing: 'ring-2 ring-indigo-500 border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/20',
      title: `إحصائيات ${monthName}`,
      subtitle: 'الأداء والتدفقات النقدية',
      badge: null,
      badgeColor: 'bg-indigo-600 text-white',
    },
    {
      id: 'profitability' as TabType,
      allowed: canViewProfitability,
      icon: Target,
      iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      activeRing: 'ring-2 ring-sky-500 border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-sky-950/20',
      title: 'الأرباح التقديرية',
      subtitle: 'التكاليف المعيارية للشهر',
      badge: null,
      badgeColor: 'bg-sky-600 text-white',
    },
    {
      id: 'variance' as TabType,
      allowed: canViewVariance,
      icon: TrendingUp,
      iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      activeRing: 'ring-2 ring-violet-500 border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20',
      title: 'مقارنة التكاليف',
      subtitle: 'المعيارية والفعلية',
      badge: null,
      badgeColor: 'bg-violet-600 text-white',
    },
  ];

  const visibleTabs = tabsConfig.filter((t) => t.allowed);

  if (visibleTabs.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-1.5" dir="rtl">
      {/* 1. Horizontal Compact Tabs Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 w-full">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <motion.button
              key={tab.id}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleTab(tab.id)}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all text-right flex items-center justify-between gap-2 shadow-xs cursor-pointer select-none group ${
                isActive
                  ? tab.activeRing
                  : 'bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${tab.iconBg}`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                      {tab.title}
                    </span>
                    {tab.badge && (
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.2 rounded-full shrink-0 ${tab.badgeColor}`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate mt-0.5">
                    {tab.subtitle}
                  </p>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 shrink-0 ${
                  isActive ? 'bg-slate-200/70 dark:bg-slate-800 rotate-180 text-slate-700 dark:text-slate-100' : ''
                }`}
              >
                <ChevronDown className="w-3 h-3" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 2. Full-Width Expanded Content Below the Horizontal Row */}
      <AnimatePresence mode="wait">
        {activeTab && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full overflow-hidden"
          >
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-2 sm:p-3 shadow-sm relative">
              {/* Close Button Header */}
              <div className="flex justify-between items-center px-2 py-1 mb-2 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  عرض تفاصيل: {tabsConfig.find((t) => t.id === activeTab)?.title}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab(null)}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  title="طي وإغلاق العرض"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>طي العرض</span>
                </button>
              </div>

              {/* Render Selected Component */}
              {activeTab === 'alerts' && (
                <BookingAlerts
                  bookings={bookings}
                  halls={halls}
                  onPreviewBooking={onPreviewBooking}
                  globalCurrencySymbol={globalCurrencySymbol}
                  defaultCollapsed={false}
                />
              )}

              {activeTab === 'stats' && (
                <DashboardStatsCards
                  bookings={bookings}
                  halls={halls}
                  globalCurrencySymbol={globalCurrencySymbol}
                  onPreviewBooking={onPreviewBooking}
                  currentDate={currentDate}
                  selectedStatType={selectedStatType}
                  onSelectedStatTypeChange={onSelectedStatTypeChange}
                  depositFilter={depositFilter}
                  onDepositFilterChange={onDepositFilterChange}
                  standardCosts={standardCosts}
                  defaultExpanded={true}
                />
              )}

              {activeTab === 'profitability' && (
                <ProfitabilityDashboardCard
                  bookings={bookings}
                  halls={halls}
                  globalCurrencySymbol={globalCurrencySymbol}
                  onPreviewBooking={onPreviewBooking}
                  currentDate={currentDate}
                  standardCosts={standardCosts}
                  services={services}
                  defaultExpanded={true}
                />
              )}

              {activeTab === 'variance' && (
                <BudgetVarianceCard
                  bookings={bookings}
                  accounts={accounts}
                  standardCosts={standardCosts}
                  transactions={transactions}
                  services={services}
                  currentDate={currentDate}
                  defaultExpanded={true}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
