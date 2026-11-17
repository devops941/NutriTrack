import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Droplets,
  Plus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Utensils,
  Clock,
  Sparkles,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  PieChart as PieChartIcon,
  Search,
  X,
  ArrowRight,
  FileText,
  ScanLine,
  Scale,
  RefreshCw,
  Award,
  Info,
  ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine
} from 'recharts';
import { mealService, DailyDiarySummary, Meal } from '../../services/mealService';
import { profileService, ProfileData } from '../../services/profileService';
import { foodService, FoodItem } from '../../services/foodService';
import { analyticsService, AnalyticsSummary, DailyTrendPoint } from '../../services/analyticsService';
import { useAuthStore } from '../../store/authStore';

export const DashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [diary, setDiary] = useState<DailyDiarySummary | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Selected date state
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Daily Water Tracker State (Persisted in localStorage by date)
  const waterStorageKey = `nutritrack_water_${selectedDate}`;
  const [waterMl, setWaterMl] = useState<number>(() => {
    const saved = localStorage.getItem(waterStorageKey);
    return saved ? parseInt(saved, 10) : 1500;
  });

  useEffect(() => {
    const saved = localStorage.getItem(waterStorageKey);
    setWaterMl(saved ? parseInt(saved, 10) : 1500);
  }, [selectedDate, waterStorageKey]);

  const updateWater = (delta: number) => {
    const updated = Math.max(0, Math.min(5000, waterMl + delta));
    setWaterMl(updated);
    localStorage.setItem(waterStorageKey, updated.toString());
  };

  const resetWater = () => {
    setWaterMl(0);
    localStorage.setItem(waterStorageKey, '0');
  };

  // Quick Log Modal State
  const [isQuickLogOpen, setIsQuickLogOpen] = useState<boolean>(false);
  const [quickMealType, setQuickMealType] = useState<string>('lunch');
  const [searchFoodQuery, setSearchFoodQuery] = useState<string>('');
  const [availableFoods, setAvailableFoods] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [foodQuantityGrams, setFoodQuantityGrams] = useState<number>(100);
  const [loggingFood, setLoggingFood] = useState<boolean>(false);
  const [quickLogSuccess, setQuickLogSuccess] = useState<string | null>(null);

  // Date Navigation
  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Main Data Fetching
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [diaryRes, profileRes, analyticsRes] = await Promise.allSettled([
        mealService.getDailyMeals(selectedDate),
        profileService.getProfile(),
        analyticsService.getSummary(7),
      ]);

      if (diaryRes.status === 'fulfilled' && diaryRes.value) {
        setDiary(diaryRes.value);
      }
      if (profileRes.status === 'fulfilled' && profileRes.value) {
        setProfile(profileRes.value);
      }
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        setAnalytics(analyticsRes.value);
      }
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate]);

  // Load foods for quick log modal
  useEffect(() => {
    if (isQuickLogOpen && availableFoods.length === 0) {
      foodService.listFoods({ limit: 50 }).then((res) => {
        const list = res.items || res.foods || [];
        setAvailableFoods(list);
        if (list.length > 0 && !selectedFood) {
          setSelectedFood(list[0]);
        }
      }).catch((err) => console.warn('Failed to load foods for quick log:', err));
    }
  }, [isQuickLogOpen, availableFoods.length, selectedFood]);

  // Filtered foods for quick log
  const filteredFoods = useMemo(() => {
    if (!searchFoodQuery.trim()) return availableFoods.slice(0, 15);
    const q = searchFoodQuery.toLowerCase();
    return availableFoods.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.brand && f.brand.toLowerCase().includes(q)) ||
        (f.categoryName && f.categoryName.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [availableFoods, searchFoodQuery]);

  // Handle Quick Meal Logging
  const handleQuickLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood) return;

    setLoggingFood(true);
    try {
      await mealService.logMeal({
        mealType: quickMealType,
        dateStr: selectedDate,
        items: [
          {
            foodId: selectedFood.id,
            quantity: Number(foodQuantityGrams),
            unit: 'g',
          },
        ],
      });

      setQuickLogSuccess(`Logged ${foodQuantityGrams}g of ${selectedFood.name} to ${quickMealType.toUpperCase()}!`);
      setTimeout(() => setQuickLogSuccess(null), 3500);
      setIsQuickLogOpen(false);

      // Refresh daily diary and analytics
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to quick log meal:', err);
    } finally {
      setLoggingFood(false);
    }
  };

  // Calculations for Metrics & Goals
  const dailyTotals = diary?.dailyTotals || {};
  const consumedCalories = Math.round(dailyTotals.energyKcal || 0);
  const targetCalories = profile?.dailyCalorieGoal || 2110;
  const calPercent = Math.min(Math.round((consumedCalories / targetCalories) * 100), 100);

  const consumedProtein = Number((dailyTotals.proteinG || 0).toFixed(1));
  const targetProtein = 54.0;
  const proteinPercent = Math.min(Math.round((consumedProtein / targetProtein) * 100), 100);

  const consumedCarbs = Number((dailyTotals.carbohydrateG || 0).toFixed(1));
  const targetCarbs = 260.0;
  const carbsPercent = Math.min(Math.round((consumedCarbs / targetCarbs) * 100), 100);

  const consumedFat = Number((dailyTotals.fatG || 0).toFixed(1));
  const targetFat = 30.0;
  const fatPercent = Math.min(Math.round((consumedFat / targetFat) * 100), 100);

  const consumedFiber = Number((dailyTotals.fiberG || 0).toFixed(1));
  const meals = diary?.meals || [];

  // Caloric Macronutrient Split Data (4 kcal/g protein, 4 kcal/g carbs, 9 kcal/g fat)
  const proteinKcal = Math.round(consumedProtein * 4);
  const carbsKcal = Math.round(consumedCarbs * 4);
  const fatKcal = Math.round(consumedFat * 9);
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal;

  const macroDonutData = useMemo(() => {
    if (totalMacroKcal === 0) {
      return [
        { name: 'Carbohydrates', value: 55, color: '#4A7C59' },
        { name: 'Protein', value: 20, color: '#1B3A2C' },
        { name: 'Fat', value: 25, color: '#C25E3E' },
      ];
    }
    return [
      { name: 'Carbohydrates', value: carbsKcal, color: '#4A7C59' },
      { name: 'Protein', value: proteinKcal, color: '#1B3A2C' },
      { name: 'Fat', value: fatKcal, color: '#C25E3E' },
    ];
  }, [carbsKcal, proteinKcal, fatKcal, totalMacroKcal]);

  const carbsShare = totalMacroKcal > 0 ? ((carbsKcal / totalMacroKcal) * 100).toFixed(1) : '0.0';
  const proteinShare = totalMacroKcal > 0 ? ((proteinKcal / totalMacroKcal) * 100).toFixed(1) : '0.0';
  const fatShare = totalMacroKcal > 0 ? ((fatKcal / totalMacroKcal) * 100).toFixed(1) : '0.0';

  // 7-Day Trend Chart Data
  const trendData = useMemo(() => {
    if (!analytics?.trendSeries || analytics.trendSeries.length === 0) {
      // Fallback 7-day window ending at selectedDate
      const pts = [];
      const base = new Date(selectedDate);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split('T')[0];
        const dayLabel = `${d.getMonth() + 1}/${d.getDate()}`;
        pts.push({
          date: iso,
          displayDate: dayLabel,
          calories: iso === selectedDate ? consumedCalories : 0,
        });
      }
      return pts;
    }

    return analytics.trendSeries.map((pt) => {
      const parts = pt.date.split('-');
      const monthDay = parts.length === 3 ? `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}` : pt.date;
      return {
        date: pt.date,
        displayDate: monthDay,
        calories: pt.date === selectedDate ? consumedCalories : Math.round(pt.calories || 0),
      };
    });
  }, [analytics, selectedDate, consumedCalories]);

  const avgCalories = useMemo(() => {
    const logged = trendData.filter((d) => d.calories > 0);
    if (logged.length === 0) return consumedCalories;
    const sum = logged.reduce((acc, curr) => acc + curr.calories, 0);
    return Math.round(sum / logged.length);
  }, [trendData, consumedCalories]);

  // Overall Health / Adherence Quality Score Calculation
  const adherenceScore = useMemo(() => {
    if (consumedCalories === 0) return 0;
    let score = 100;
    // Calorie deviation
    const calDiffRatio = Math.abs(consumedCalories - targetCalories) / targetCalories;
    if (calDiffRatio > 0.15) score -= 15;
    if (calDiffRatio > 0.3) score -= 15;
    // Protein target achievement
    if (consumedProtein < targetProtein * 0.8) score -= 15;
    // Fat upper limit penalty
    if (consumedFat > targetFat * 1.5) score -= 20;
    // Fiber achievement
    if (consumedFiber >= 25) score += 5;
    return Math.max(10, Math.min(100, Math.round(score)));
  }, [consumedCalories, targetCalories, consumedProtein, targetProtein, consumedFat, targetFat, consumedFiber]);

  const getMealTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'breakfast':
        return 'bg-amber-500';
      case 'morning_snack':
      case 'snack':
        return 'bg-emerald-600';
      case 'lunch':
        return 'bg-forest';
      case 'evening_snack':
        return 'bg-amber-600';
      case 'dinner':
        return 'bg-indigo-700';
      default:
        return 'bg-charcoal';
    }
  };

  // Preview macros for quick log food selection
  const previewMultiplier = (foodQuantityGrams || 100) / 100;
  const previewKcal = selectedFood ? Math.round((selectedFood.nutrients?.energyKcal || 0) * previewMultiplier) : 0;
  const previewP = selectedFood ? ((selectedFood.nutrients?.proteinG || 0) * previewMultiplier).toFixed(1) : '0.0';
  const previewC = selectedFood ? ((selectedFood.nutrients?.carbohydrateG || 0) * previewMultiplier).toFixed(1) : '0.0';
  const previewF = selectedFood ? ((selectedFood.nutrients?.fatG || 0) * previewMultiplier).toFixed(1) : '0.0';

  return (
    <div className="space-y-8 animate-fadeIn w-full pb-16">
      {/* Success Notification Banner */}
      {quickLogSuccess && (
        <div className="bg-forest-800 text-white px-5 py-3.5 rounded-2xl flex items-center justify-between shadow-organic animate-fadeIn">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            <span className="text-sm font-semibold">{quickLogSuccess}</span>
          </div>
          <button onClick={() => setQuickLogSuccess(null)} className="text-forest-100 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Welcome Banner & Global Dashboard Controls */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-mutedGrey-border shadow-organic flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-forest bg-forest-50 px-3 py-1 rounded-full border border-sage/40">
              Food Intelligence Platform
            </span>
            <span className="text-xs font-medium text-mutedGrey flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-forest" /> Engine Active
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold font-editorial text-forest mt-3">
            Welcome, {profile?.displayName || user?.fullName || 'Nutritionist'}
          </h1>
          <p className="text-sm text-mutedGrey mt-1 max-w-xl leading-relaxed">
            Deterministic nutrient analysis, daily calorie balance, macronutrient distribution, and hydration tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Interactive Date Selector */}
          <div className="flex items-center space-x-1.5 bg-ivory p-1.5 rounded-2xl border border-mutedGrey-border shadow-sm">
            <button
              onClick={() => changeDate(-1)}
              className="p-1.5 rounded-xl hover:bg-white text-mutedGrey hover:text-charcoal transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex items-center bg-white px-3 py-1.5 rounded-xl border border-mutedGrey-border hover:border-forest/60 transition-colors shadow-sm">
              <CalendarIcon className="w-3.5 h-3.5 text-forest mr-2 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="text-xs font-bold font-mono text-charcoal bg-transparent cursor-pointer focus:outline-none"
                title="Select date"
              />
            </div>

            <button
              onClick={() => changeDate(1)}
              className="p-1.5 rounded-xl hover:bg-white text-mutedGrey hover:text-charcoal transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-1.5 text-xs font-semibold text-forest bg-white rounded-xl border border-sage/40 hover:bg-forest-50 transition-colors shadow-sm"
            >
              Today
            </button>
          </div>

          {/* Quick Log Meal Button (Modal Trigger) */}
          <button
            onClick={() => setIsQuickLogOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-forest-800 text-white rounded-2xl text-xs font-bold hover:bg-forest transition-all shadow-sm hover:shadow active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Log Meal</span>
          </button>

          {/* Refresh Data Button */}
          <button
            onClick={() => {
              setRefreshing(true);
              loadDashboardData();
            }}
            disabled={refreshing || loading}
            className="p-2.5 bg-ivory text-charcoal border border-mutedGrey-border rounded-2xl hover:bg-white transition-colors shadow-sm"
            title="Refresh Dashboard Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing || loading ? 'animate-spin text-forest' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Nutrient KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Calories Card */}
        <div className="bg-white p-5 rounded-2xl border border-mutedGrey-border shadow-card hover:border-forest/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mutedGrey uppercase tracking-wider">Energy Consumed</span>
            <div className="p-2 bg-forest-50 text-forest rounded-xl">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-editorial text-charcoal">
              {consumedCalories.toLocaleString()}
            </span>
            <span className="text-xs text-mutedGrey ml-1.5">/ {targetCalories.toLocaleString()} kcal</span>
          </div>
          <div className="mt-3 w-full bg-ivory rounded-full h-2.5 overflow-hidden border border-mutedGrey-border">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                consumedCalories > targetCalories ? 'bg-terracotta' : 'bg-forest-800'
              }`}
              style={{ width: `${Math.min(calPercent, 100)}%` }}
            ></div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-mutedGrey">
            <span>{calPercent}% of target</span>
            <span className="font-semibold text-charcoal">
              {targetCalories - consumedCalories > 0
                ? `${(targetCalories - consumedCalories).toLocaleString()} kcal left`
                : `${(consumedCalories - targetCalories).toLocaleString()} kcal over`}
            </span>
          </div>
        </div>

        {/* Protein Card */}
        <div className="bg-white p-5 rounded-2xl border border-mutedGrey-border shadow-card hover:border-forest/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mutedGrey uppercase tracking-wider">Protein</span>
            <div className="p-2 bg-forest-50 text-forest-800 rounded-xl">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-editorial text-charcoal">{consumedProtein}</span>
            <span className="text-xs text-mutedGrey ml-1.5">/ {targetProtein} g</span>
          </div>
          <div className="mt-3 w-full bg-ivory rounded-full h-2.5 overflow-hidden border border-mutedGrey-border">
            <div
              className="bg-forest-700 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(proteinPercent, 100)}%` }}
            ></div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-mutedGrey">
            <span>{proteinPercent}% of RDA allowance</span>
            <span className="font-semibold text-forest-800">
              {consumedProtein >= targetProtein ? 'RDA Achieved' : `${(targetProtein - consumedProtein).toFixed(1)}g to goal`}
            </span>
          </div>
        </div>

        {/* Carbohydrates Card */}
        <div className="bg-white p-5 rounded-2xl border border-mutedGrey-border shadow-card hover:border-forest/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mutedGrey uppercase tracking-wider">Carbohydrates</span>
            <div className="p-2 bg-amber-50 text-amber-800 rounded-xl">
              <Wheat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-editorial text-charcoal">{consumedCarbs}</span>
            <span className="text-xs text-mutedGrey ml-1.5">/ {targetCarbs} g</span>
          </div>
          <div className="mt-3 w-full bg-ivory rounded-full h-2.5 overflow-hidden border border-mutedGrey-border">
            <div
              className="bg-amber-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(carbsPercent, 100)}%` }}
            ></div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-mutedGrey">
            <span>{carbsPercent}% of daily budget</span>
            <span className="font-semibold text-charcoal">
              {targetCarbs - consumedCarbs > 0 ? `${(targetCarbs - consumedCarbs).toFixed(1)}g left` : 'Budget full'}
            </span>
          </div>
        </div>

        {/* Total Fat Card */}
        <div className="bg-white p-5 rounded-2xl border border-mutedGrey-border shadow-card hover:border-forest/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mutedGrey uppercase tracking-wider">Total Fat</span>
            <div className="p-2 bg-terracotta/10 text-terracotta rounded-xl">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-editorial text-charcoal">{consumedFat}</span>
            <span className="text-xs text-mutedGrey ml-1.5">/ {targetFat} g max</span>
          </div>
          <div className="mt-3 w-full bg-ivory rounded-full h-2.5 overflow-hidden border border-mutedGrey-border">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                consumedFat > targetFat ? 'bg-terracotta' : 'bg-sage-dark'
              }`}
              style={{ width: `${Math.min(fatPercent, 100)}%` }}
            ></div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-mutedGrey">
            <span>{fatPercent}% of upper limit</span>
            <span className={`font-semibold ${consumedFat > targetFat ? 'text-terracotta' : 'text-forest'}`}>
              {consumedFat > targetFat ? 'Limit Exceeded' : `${(targetFat - consumedFat).toFixed(1)}g remaining`}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row: 7-Day Calorie Trend + Caloric Macronutrient Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Caloric Intake Trend Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-mutedGrey-border shadow-organic flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-forest" />
                  <h3 className="text-base font-bold text-charcoal font-editorial">7-Day Calorie Intake Trend</h3>
                </div>
                <p className="text-xs text-mutedGrey mt-0.5">
                  Visual caloric distribution vs daily target benchmark ({targetCalories} kcal)
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-forest-50 text-forest px-3 py-1 rounded-xl border border-sage/30 font-semibold">
                  7-Day Avg: {avgCalories} kcal
                </span>
                <Link
                  to="/analytics"
                  className="text-xs font-semibold text-forest hover:text-forest-dark hover:underline flex items-center gap-1"
                >
                  Deep Analytics <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-60 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashboardCalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#244C3B" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#244C3B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                    domain={[0, (dataMax: number) => Math.max(dataMax + 300, targetCalories + 400)]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${value} kcal`, 'Calories Consumed']}
                    labelFormatter={(label: any) => `Date: ${label}`}
                  />
                  <ReferenceLine
                    y={targetCalories}
                    stroke="#C25E3E"
                    strokeDasharray="4 4"
                    label={{
                      value: `Target ${targetCalories} kcal`,
                      fill: '#C25E3E',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="calories"
                    stroke="#244C3B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#dashboardCalGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-mutedGrey-border flex items-center justify-between text-[11px] text-mutedGrey">
            <span>Green curve indicates verified meal energy logging.</span>
            <span className="font-medium text-charcoal">Baseline: ICMR-NIN 2020 RDA</span>
          </div>
        </div>

        {/* Caloric Macronutrient Split (Donut Chart) (1 Column) */}
        <div className="bg-white rounded-3xl p-6 border border-mutedGrey-border shadow-organic flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <PieChartIcon className="w-4 h-4 text-forest" />
                <h3 className="text-base font-bold text-charcoal font-editorial">Macronutrient Split</h3>
              </div>
              <span className="text-[11px] font-semibold text-mutedGrey bg-ivory px-2 py-0.5 rounded-lg border border-mutedGrey-border">
                Atwater 4-4-9
              </span>
            </div>
            <p className="text-xs text-mutedGrey mb-4">
              Energy contribution ratio from carbohydrates, protein, and dietary fat.
            </p>

            {/* Donut Chart */}
            <div className="h-44 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {macroDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '10px',
                      border: '1px solid #E5E7EB',
                      fontSize: '11px',
                    }}
                    formatter={(val: any, name: any) => [`${val} kcal (${totalMacroKcal > 0 ? Math.round((Number(val) / totalMacroKcal) * 100) : 0}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold font-editorial text-charcoal">
                  {totalMacroKcal > 0 ? `${totalMacroKcal}` : `${consumedCalories}`}
                </span>
                <span className="text-[10px] text-mutedGrey">Macro kcal</span>
              </div>
            </div>

            {/* Macro Breakdown Pills */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-ivory border border-mutedGrey-border">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4A7C59]"></span>
                  <span className="font-semibold text-charcoal">Carbohydrates</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-forest">{consumedCarbs}g</span>
                  <span className="text-mutedGrey ml-1.5 text-[11px]">({carbsShare}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-ivory border border-mutedGrey-border">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1B3A2C]"></span>
                  <span className="font-semibold text-charcoal">Protein</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-forest">{consumedProtein}g</span>
                  <span className="text-mutedGrey ml-1.5 text-[11px]">({proteinShare}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-ivory border border-mutedGrey-border">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C25E3E]"></span>
                  <span className="font-semibold text-charcoal">Total Fat</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-terracotta">{consumedFat}g</span>
                  <span className="text-mutedGrey ml-1.5 text-[11px]">({fatShare}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wellness & Target Adherence Row: Hydration Tracker & Health Quality Index */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Hydration Tracker */}
        <div className="bg-white rounded-3xl p-6 border border-mutedGrey-border shadow-organic">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-charcoal font-editorial">Daily Hydration Tracker</h3>
                <p className="text-xs text-mutedGrey">Recommended intake: 2,500 ml (~10 glasses)</p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
              {waterMl} / 2,500 ml
            </span>
          </div>

          {/* Water Progress Bar */}
          <div className="mt-2 w-full bg-ivory rounded-full h-3.5 overflow-hidden border border-mutedGrey-border relative">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Math.round((waterMl / 2500) * 100), 100)}%` }}
            ></div>
          </div>

          {/* Glasses Visualizer & Quick Buttons */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-mutedGrey-border">
            <div className="flex items-center space-x-2 text-xs text-charcoal">
              <span className="font-semibold">{Math.round(waterMl / 250)}</span>
              <span className="text-mutedGrey">of 10 glasses logged</span>
              <span className="text-[11px] text-blue-600 font-semibold">({Math.round((waterMl / 2500) * 100)}%)</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => updateWater(250)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold border border-blue-200 transition-colors"
                title="Add 1 glass (250 ml)"
              >
                +250 ml
              </button>
              <button
                onClick={() => updateWater(500)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold border border-blue-200 transition-colors"
                title="Add 1 bottle (500 ml)"
              >
                +500 ml
              </button>
              <button
                onClick={() => updateWater(-250)}
                disabled={waterMl <= 0}
                className="px-2.5 py-1.5 bg-ivory hover:bg-mutedGrey-light text-mutedGrey rounded-xl text-xs font-medium border border-mutedGrey-border transition-colors disabled:opacity-40"
                title="Subtract 250 ml"
              >
                -250 ml
              </button>
              <button
                onClick={resetWater}
                className="text-[11px] text-mutedGrey hover:text-terracotta underline ml-1"
                title="Reset water for selected day"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Nutritional Health & Adherence Quality Index */}
        <div className="bg-white rounded-3xl p-6 border border-mutedGrey-border shadow-organic flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-forest-50 text-forest-800 rounded-xl">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-charcoal font-editorial">Dietary Quality Index</h3>
                  <p className="text-xs text-mutedGrey">Deterministic compliance scoring</p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 bg-forest-50 border border-sage/40 px-3 py-1 rounded-xl">
                <Award className="w-4 h-4 text-forest-800" />
                <span className="text-sm font-bold text-forest-800 font-editorial">{adherenceScore} / 100</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-ivory border border-mutedGrey-border">
                <span className="text-mutedGrey block text-[11px]">Caloric Balance</span>
                <span className="font-semibold text-charcoal mt-0.5 block">
                  {consumedCalories === 0
                    ? 'Awaiting Logs'
                    : consumedCalories <= targetCalories
                    ? `${targetCalories - consumedCalories} kcal deficit`
                    : `${consumedCalories - targetCalories} kcal surplus`}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-ivory border border-mutedGrey-border">
                <span className="text-mutedGrey block text-[11px]">Protein Target</span>
                <span className="font-semibold text-charcoal mt-0.5 block">
                  {consumedProtein >= targetProtein ? 'RDA Achieved (100%)' : `${proteinPercent}% of daily RDA`}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-ivory border border-mutedGrey-border">
                <span className="text-mutedGrey block text-[11px]">Dietary Fiber</span>
                <span className="font-semibold text-charcoal mt-0.5 block">
                  {consumedFiber}g recorded (30g goal)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-ivory border border-mutedGrey-border">
                <span className="text-mutedGrey block text-[11px]">Fat Limit Status</span>
                <span className={`font-semibold mt-0.5 block ${consumedFat > targetFat ? 'text-terracotta' : 'text-forest'}`}>
                  {consumedFat > targetFat ? 'Exceeded Limit' : 'Compliant'}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-mutedGrey flex items-center gap-1.5 pt-3 border-t border-mutedGrey-border">
            <Info className="w-3.5 h-3.5 text-sage-dark flex-shrink-0" />
            Adherence score evaluates macro adequacy against ICMR-NIN sedentary allowances.
          </p>
        </div>
      </div>

      {/* Two Column Layout: Meals Timeline & Intake Observations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Meals Timeline (2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-mutedGrey-border shadow-organic">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center space-x-2">
                <Utensils className="w-4 h-4 text-forest" />
                <h3 className="text-base font-bold text-charcoal font-editorial">Meals Timeline</h3>
              </div>
              <p className="text-xs text-mutedGrey mt-0.5">
                {selectedDate} • Item-level nutrient snapshots with verified source attribution
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsQuickLogOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-forest-800 bg-forest-50 hover:bg-forest-100 rounded-xl transition-colors border border-sage/40 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Log</span>
              </button>
              <Link
                to="/diary"
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-mutedGrey hover:text-charcoal bg-ivory rounded-xl transition-colors border border-mutedGrey-border"
              >
                <span>Full Diary</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-mutedGrey flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-5 h-5 text-forest animate-spin" />
              <span>Loading logged meals from database...</span>
            </div>
          ) : meals.length === 0 ? (
            <div className="p-8 rounded-2xl bg-ivory/50 border border-dashed border-mutedGrey-border text-center space-y-3">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto text-forest shadow-sm border border-mutedGrey-border">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-charcoal">No meals logged yet today</h4>
                <p className="text-xs text-mutedGrey max-w-sm mx-auto mt-1">
                  Track your nutrition by logging your breakfast, lunch, dinner, or snacks from the verified food master database.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setIsQuickLogOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-forest-800 text-white rounded-xl text-xs font-semibold hover:bg-forest transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Your First Meal</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {meals.map((meal) => {
                const itemsText =
                  meal.items && meal.items.length > 0
                    ? meal.items.map((it) => `${it.foodNameSnapshot} (${it.quantity}${it.unit})`).join(' + ')
                    : 'Custom logged meal';

                const mealKcal = meal.mealTotals?.energyKcal || 0;
                const mealP = meal.mealTotals?.proteinG || 0;
                const mealC = meal.mealTotals?.carbohydrateG || 0;
                const mealF = meal.mealTotals?.fatG || 0;

                return (
                  <div
                    key={meal.id}
                    className="p-4 rounded-2xl bg-ivory/70 border border-mutedGrey-border flex items-center justify-between hover:bg-ivory transition-colors shadow-xs"
                  >
                    <div className="flex items-center space-x-3.5">
                      <span className={`w-3 h-3 rounded-full ${getMealTypeColor(meal.mealType)} flex-shrink-0`}></span>
                      <div>
                        <h4 className="text-sm font-semibold text-charcoal capitalize">
                          {meal.mealType.replace('_', ' ')}
                        </h4>
                        <p className="text-xs text-mutedGrey line-clamp-1">{itemsText}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <span className="text-sm font-bold text-forest-800">{mealKcal} kcal</span>
                      <span className="block text-[11px] text-mutedGrey font-mono">
                        P: {mealP}g | C: {mealC}g | F: {mealF}g
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Informative Insights & Data Completeness (1 column) */}
        <div className="bg-white rounded-3xl p-6 border border-mutedGrey-border shadow-organic flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Sparkles className="w-4 h-4 text-forest" />
              <h3 className="text-base font-bold text-charcoal font-editorial">Intake Observations</h3>
            </div>
            <p className="text-xs text-mutedGrey mb-4">Traceable descriptive summaries</p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-forest-50/70 border border-sage/40 text-xs">
                <span className="font-semibold text-forest-800 block mb-1">Dietary Fiber Attainment</span>
                <p className="text-charcoal leading-relaxed">
                  Recorded fiber is currently <strong>{consumedFiber}g</strong> today. Recommended daily allowance is 30g.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-ivory border border-mutedGrey-border text-xs">
                <span className="font-semibold text-charcoal block mb-1">Data Completeness Status</span>
                <p className="text-mutedGrey leading-relaxed">
                  {meals.length === 0
                    ? 'No food intake recorded yet for today. Use Quick Log or Food Diary to begin tracking.'
                    : `All ${meals.length} logged meal(s) have complete macronutrient entries with verified source attribution.`}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-xs">
                <span className="font-semibold text-amber-900 block mb-1">Micronutrient Surveillance</span>
                <p className="text-charcoal leading-relaxed">
                  Sodium intake is monitored to remain within standard safety thresholds (&lt; 2,000 mg/day).
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-mutedGrey-border text-[11px] text-mutedGrey flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-sage-dark flex-shrink-0 mt-0.5" />
            <p className="leading-normal">
              NutriTrack provides standardized tracking context. It is not intended for medical diagnosis or clinical diet prescription.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Tools & Platform Shortcuts Row */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-charcoal font-editorial">Quick Feature Navigation</h3>
          <span className="text-xs text-mutedGrey">1-Click Launch</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Label Scanner Shortcut */}
          <Link
            to="/scanner"
            className="group p-5 bg-white rounded-2xl border border-mutedGrey-border hover:border-forest/60 hover:shadow-organic transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center group-hover:bg-forest-800 group-hover:text-white transition-colors">
              <ScanLine className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-charcoal mt-3 group-hover:text-forest transition-colors">
              Food Label Scanner
            </h4>
            <p className="text-xs text-mutedGrey mt-1 leading-relaxed">
              Extract verified nutrients directly from packaged nutrition facts with OpenCV & OCR.
            </p>
            <span className="inline-flex items-center text-xs font-semibold text-forest mt-3 gap-1">
              Open Scanner <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          {/* Product Comparison Matrix Shortcut */}
          <Link
            to="/compare"
            className="group p-5 bg-white rounded-2xl border border-mutedGrey-border hover:border-forest/60 hover:shadow-organic transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center group-hover:bg-forest-800 group-hover:text-white transition-colors">
              <Scale className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-charcoal mt-3 group-hover:text-forest transition-colors">
              Product Comparison
            </h4>
            <p className="text-xs text-mutedGrey mt-1 leading-relaxed">
              Compare 2 to 4 food products side-by-side with metric normalization & delta badges.
            </p>
            <span className="inline-flex items-center text-xs font-semibold text-forest mt-3 gap-1">
              Compare Foods <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          {/* Smart Meal Planner Shortcut */}
          <Link
            to="/planner"
            className="group p-5 bg-white rounded-2xl border border-mutedGrey-border hover:border-forest/60 hover:shadow-organic transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center group-hover:bg-forest-800 group-hover:text-white transition-colors">
              <Utensils className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-charcoal mt-3 group-hover:text-forest transition-colors">
              Smart Meal Planner
            </h4>
            <p className="text-xs text-mutedGrey mt-1 leading-relaxed">
              Generate structured, balanced daily meal schedules aligned to your RDA caloric target.
            </p>
            <span className="inline-flex items-center text-xs font-semibold text-forest mt-3 gap-1">
              Plan Meals <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          {/* Reports & Exports Shortcut */}
          <Link
            to="/reports"
            className="group p-5 bg-white rounded-2xl border border-mutedGrey-border hover:border-forest/60 hover:shadow-organic transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center group-hover:bg-forest-800 group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-charcoal mt-3 group-hover:text-forest transition-colors">
              Export Dossiers
            </h4>
            <p className="text-xs text-mutedGrey mt-1 leading-relaxed">
              Generate print-ready ReportLab PDF, formatted Excel workbooks, and CSV analytics.
            </p>
            <span className="inline-flex items-center text-xs font-semibold text-forest mt-3 gap-1">
              Download Reports <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>
      </div>

      {/* Interactive Quick Log Meal Modal */}
      {isQuickLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-mutedGrey-border relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-mutedGrey-border">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-forest-50 text-forest rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-charcoal font-editorial">Quick Log Meal</h3>
                  <p className="text-xs text-mutedGrey">Direct entry for {selectedDate}</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickLogOpen(false)}
                className="p-1.5 text-mutedGrey hover:text-charcoal rounded-xl hover:bg-ivory transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleQuickLogSubmit} className="mt-5 space-y-4">
              {/* Meal Slot Selector */}
              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-1.5">
                  Meal Slot
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setQuickMealType(slot)}
                      className={`py-2 text-xs font-bold rounded-xl capitalize transition-all border ${
                        quickMealType === slot
                          ? 'bg-forest-800 text-white border-forest-800 shadow-sm'
                          : 'bg-ivory text-charcoal border-mutedGrey-border hover:bg-white'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food Search & Selection */}
              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-1.5">
                  Select Food Item
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-mutedGrey absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search verified food master..."
                    value={searchFoodQuery}
                    onChange={(e) => setSearchFoodQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-mutedGrey-border bg-ivory focus:bg-white focus:outline-none focus:border-forest transition-colors"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto border border-mutedGrey-border rounded-xl divide-y divide-mutedGrey-border/60 bg-white">
                  {filteredFoods.length === 0 ? (
                    <div className="p-3 text-center text-xs text-mutedGrey">No matching foods found</div>
                  ) : (
                    filteredFoods.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFood(f)}
                        className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          selectedFood?.id === f.id ? 'bg-forest-50 font-semibold text-forest' : 'hover:bg-ivory'
                        }`}
                      >
                        <div>
                          <span className="font-medium text-charcoal">{f.name}</span>
                          {f.brand && <span className="text-[10px] text-mutedGrey ml-1.5">({f.brand})</span>}
                        </div>
                        <span className="text-[11px] text-mutedGrey">{f.nutrients?.energyKcal || 0} kcal / 100g</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-charcoal uppercase tracking-wider">
                    Quantity (grams)
                  </label>
                  <div className="flex space-x-1.5">
                    {[50, 100, 150, 200].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFoodQuantityGrams(g)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${
                          foodQuantityGrams === g
                            ? 'bg-forest-800 text-white border-forest-800'
                            : 'bg-ivory text-mutedGrey border-mutedGrey-border hover:bg-white'
                        }`}
                      >
                        {g}g
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  value={foodQuantityGrams}
                  onChange={(e) => setFoodQuantityGrams(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-mutedGrey-border bg-ivory focus:bg-white focus:outline-none focus:border-forest transition-colors font-mono"
                  required
                />
              </div>

              {/* Dynamic Macro Preview Box */}
              {selectedFood && (
                <div className="p-3 bg-ivory rounded-2xl border border-mutedGrey-border text-xs">
                  <span className="text-[11px] font-bold text-mutedGrey uppercase tracking-wider block mb-1">
                    Calculated Intake Preview ({foodQuantityGrams}g of {selectedFood.name}):
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center mt-2">
                    <div className="bg-white p-2 rounded-xl border border-mutedGrey-border">
                      <span className="block text-[10px] text-mutedGrey">Energy</span>
                      <span className="font-bold text-forest">{previewKcal} kcal</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-mutedGrey-border">
                      <span className="block text-[10px] text-mutedGrey">Protein</span>
                      <span className="font-bold text-charcoal">{previewP}g</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-mutedGrey-border">
                      <span className="block text-[10px] text-mutedGrey">Carbs</span>
                      <span className="font-bold text-charcoal">{previewC}g</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-mutedGrey-border">
                      <span className="block text-[10px] text-mutedGrey">Fat</span>
                      <span className="font-bold text-charcoal">{previewF}g</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsQuickLogOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-mutedGrey hover:text-charcoal bg-ivory rounded-xl border border-mutedGrey-border hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loggingFood || !selectedFood}
                  className="px-5 py-2 text-xs font-bold text-white bg-forest-800 hover:bg-forest rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loggingFood ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Logging...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log to Diary</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
