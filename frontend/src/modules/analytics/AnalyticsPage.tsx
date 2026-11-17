import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Calendar, 
  Activity, 
  AlertCircle, 
  RefreshCw, 
  Info, 
  Flame, 
  Dna, 
  Wheat, 
  Droplet,
  Sparkles,
  CheckCircle2,
  CalendarDays,
  BarChart3,
  LineChart as LucideLineChart,
  AreaChart as LucideAreaChart,
  Layers,
  PieChart as LucidePieChart
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  ReferenceLine,
  Legend
} from 'recharts';
import { analyticsService, AnalyticsSummary } from '../../services/analyticsService';

type TrendMetricKey = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sodium';
type ChartType = 'area' | 'bar' | 'line' | 'stacked';
type MacroViewType = 'donut' | 'bars';

interface MetricMeta {
  label: string;
  unit: string;
  dataKey: string;
  color: string;
  targetRda: number;
  statKey: string;
}

const TREND_METRICS: Record<TrendMetricKey, MetricMeta> = {
  calories: { label: 'Calories', unit: 'kcal', dataKey: 'calories', color: '#244C3B', targetRda: 2110, statKey: 'energyKcal' },
  protein: { label: 'Protein', unit: 'g', dataKey: 'protein', color: '#1B4D3E', targetRda: 60, statKey: 'proteinG' },
  carbs: { label: 'Carbohydrates', unit: 'g', dataKey: 'carbs', color: '#6A8E6A', targetRda: 260, statKey: 'carbohydrateG' },
  fat: { label: 'Total Fat', unit: 'g', dataKey: 'fat', color: '#C97857', targetRda: 50, statKey: 'fatG' },
  fiber: { label: 'Dietary Fiber', unit: 'g', dataKey: 'fiber', color: '#2F6A4F', targetRda: 30, statKey: 'fiberG' },
  sodium: { label: 'Sodium', unit: 'mg', dataKey: 'sodium', color: '#4B5563', targetRda: 2000, statKey: 'sodiumMg' },
};

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [timeframeMode, setTimeframeMode] = useState<'7' | '14' | '30' | 'custom'>('7');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [selectedMetric, setSelectedMetric] = useState<TrendMetricKey>('calories');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [macroViewType, setMacroViewType] = useState<MacroViewType>('donut');

  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [seedingDemo, setSeedingDemo] = useState<boolean>(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (timeframeMode !== 'custom') {
      loadAnalytics();
    }
  }, [timeframeMode]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      let res: AnalyticsSummary;
      if (timeframeMode === 'custom') {
        res = await analyticsService.getDailyRange(customStartDate, customEndDate);
      } else {
        const numDays = parseInt(timeframeMode, 10);
        res = await analyticsService.getSummary(numDays);
      }
      setData(res);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to load intake analytics. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) return;
    loadAnalytics();
  };

  const handleSeedDemoData = async () => {
    try {
      setSeedingDemo(true);
      setErrorMsg(null);
      setSeedSuccessMsg(null);
      const res = await analyticsService.seedDemoData();
      setSeedSuccessMsg(res.message || 'Sample 7-day nutritional intake history loaded successfully!');
      setTimeframeMode('7');
      await loadAnalytics();
    } catch (err: any) {
      console.error('Failed to seed demo data:', err);
      setErrorMsg('Failed to seed sample history.');
    } finally {
      setSeedingDemo(false);
    }
  };

  const macroColors = {
    carbs: '#A9BDA9',    // Sage
    protein: '#244C3B',  // Forest Green
    fat: '#C97857',      // Terracotta
  };

  const pieData = data?.macroDistribution ? [
    { name: 'Carbohydrates', value: data.macroDistribution.carbsCalories, grams: data.macroDistribution.carbsGrams, percentage: data.macroDistribution.carbsPercentage, color: macroColors.carbs },
    { name: 'Protein', value: data.macroDistribution.proteinCalories, grams: data.macroDistribution.proteinGrams, percentage: data.macroDistribution.proteinPercentage, color: macroColors.protein },
    { name: 'Fat', value: data.macroDistribution.fatCalories, grams: data.macroDistribution.fatGrams, percentage: data.macroDistribution.fatPercentage, color: macroColors.fat },
  ] : [];

  const handlePointClick = (state: any) => {
    if (state && state.activePayload && state.activePayload.length > 0) {
      const clickedDate = state.activePayload[0].payload.date;
      if (clickedDate) {
        navigate(`/diary?date=${clickedDate}`);
      }
    }
  };

  const nutrientDisplayNames: Record<string, { label: string; unit: string }> = {
    energyKcal: { label: 'Energy (Calories)', unit: 'kcal' },
    proteinG: { label: 'Protein', unit: 'g' },
    carbohydrateG: { label: 'Carbohydrates', unit: 'g' },
    fatG: { label: 'Total Fat', unit: 'g' },
    fiberG: { label: 'Dietary Fiber', unit: 'g' },
    sodiumMg: { label: 'Sodium', unit: 'mg' },
  };

  const activeMetricMeta = TREND_METRICS[selectedMetric];

  // Calculated stacked series for daily macro breakdown
  const stackedSeries = (data?.trendSeries || []).map(p => {
    const carbsCal = Math.round((p.carbs || 0) * 4);
    const proteinCal = Math.round((p.protein || 0) * 4);
    const fatCal = Math.round((p.fat || 0) * 9);
    return {
      ...p,
      carbsCal,
      proteinCal,
      fatCal,
      totalMacroCal: carbsCal + proteinCal + fatCal
    };
  });

  const renderStandardTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      const currentVal = p[activeMetricMeta.dataKey] || 0;
      return (
        <div className="p-3 bg-white border border-forest-200 rounded-xl shadow-lg text-xs space-y-1">
          <p className="font-bold text-charcoal border-b border-forest-100 pb-1">{p.date}</p>
          {p.isLogged ? (
            <>
              <p className="font-bold text-forest-900 text-sm">
                {activeMetricMeta.label}: {currentVal} {activeMetricMeta.unit}
              </p>
              <div className="text-[11px] text-muted-grey space-y-0.5 pt-0.5">
                <p>Calories: {p.calories} kcal</p>
                <p>P: {p.protein}g | C: {p.carbs}g | F: {p.fat}g</p>
              </div>
              <p className="text-[10px] text-forest-700 italic pt-1 border-t border-forest-50">
                Click point to open day's Food Diary
              </p>
            </>
          ) : (
            <p className="text-muted-grey italic">No meals logged on this date</p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderStackedTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="p-3 bg-white border border-forest-200 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[170px]">
          <p className="font-bold text-charcoal border-b border-forest-100 pb-1">{p.date}</p>
          {p.isLogged ? (
            <>
              <p className="font-bold text-forest-900 text-sm">Total: {p.calories} kcal</p>
              <div className="space-y-1 pt-1 text-[11px]">
                <div className="flex items-center justify-between text-sage-800 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sage-500" />
                    Carbs ({p.carbs}g)
                  </span>
                  <span>{p.carbsCal} kcal</span>
                </div>
                <div className="flex items-center justify-between text-forest-900 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-forest-700" />
                    Protein ({p.protein}g)
                  </span>
                  <span>{p.proteinCal} kcal</span>
                </div>
                <div className="flex items-center justify-between text-terracotta font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-terracotta" />
                    Fat ({p.fat}g)
                  </span>
                  <span>{p.fatCal} kcal</span>
                </div>
              </div>
              <p className="text-[10px] text-forest-700 italic pt-1 border-t border-forest-50">
                Click bar to open Food Diary
              </p>
            </>
          ) : (
            <p className="text-muted-grey italic">No meals logged on this date</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-forest-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-forest-700" />
            <h1 className="text-2xl font-bold text-charcoal">Nutrient Analytics & Intake Trends</h1>
          </div>
          <p className="text-sm text-muted-grey mt-1">
            Statistical intake patterns, macronutrient caloric distributions, and data-completeness tracking.
          </p>
        </div>

        {/* Action Controls: Seed Demo & Timeframe Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSeedDemoData}
            disabled={seedingDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-forest bg-forest-50 hover:bg-forest-100 border border-forest-200 transition-all shadow-2xs disabled:opacity-60"
            title="Populates realistic 7-day meal history for project demonstration"
          >
            {seedingDemo ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-forest" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-forest" />
            )}
            <span>{seedingDemo ? 'Seeding History...' : 'Seed Sample 7-Day History'}</span>
          </button>

          {/* Timeframe Selector Pills */}
          <div className="flex items-center bg-forest-50 p-1 rounded-xl border border-forest-200/60 text-xs font-semibold text-charcoal shadow-2xs">
            <button
              onClick={() => setTimeframeMode('7')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframeMode === '7' 
                  ? 'bg-forest text-white font-bold shadow-sm' 
                  : 'text-charcoal hover:bg-white/60 font-medium'
              }`}
              style={timeframeMode === '7' ? { backgroundColor: '#1B3A2C', color: '#ffffff' } : undefined}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeframeMode('14')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframeMode === '14' 
                  ? 'bg-forest text-white font-bold shadow-sm' 
                  : 'text-charcoal hover:bg-white/60 font-medium'
              }`}
              style={timeframeMode === '14' ? { backgroundColor: '#1B3A2C', color: '#ffffff' } : undefined}
            >
              Last 14 Days
            </button>
            <button
              onClick={() => setTimeframeMode('30')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframeMode === '30' 
                  ? 'bg-forest text-white font-bold shadow-sm' 
                  : 'text-charcoal hover:bg-white/60 font-medium'
              }`}
              style={timeframeMode === '30' ? { backgroundColor: '#1B3A2C', color: '#ffffff' } : undefined}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimeframeMode('custom')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframeMode === 'custom' 
                  ? 'bg-forest text-white font-bold shadow-sm' 
                  : 'text-charcoal hover:bg-white/60 font-medium'
              }`}
              style={timeframeMode === 'custom' ? { backgroundColor: '#1B3A2C', color: '#ffffff' } : undefined}
            >
              Custom Range
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Range Bar (When Custom Mode is active) */}
      {timeframeMode === 'custom' && (
        <form onSubmit={handleApplyCustomRange} className="bg-white p-4 rounded-2xl border border-forest-100 shadow-sm flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-forest-700" />
            <span className="font-semibold text-charcoal">Custom Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-muted-grey font-medium">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 bg-ivory-warm border border-forest-200 rounded-xl font-mono text-xs focus:outline-none"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-muted-grey font-medium">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 bg-ivory-warm border border-forest-200 rounded-xl font-mono text-xs focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-bold text-white bg-forest hover:bg-forest-dark rounded-xl transition-all shadow-sm"
          >
            Apply Range
          </button>
        </form>
      )}

      {/* Notification Alerts */}
      {seedSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{seedSuccessMsg}</span>
          </div>
          <button onClick={() => setSeedSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950 font-semibold text-xs ml-2">
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-terracotta/10 border border-terracotta/20 rounded-xl flex items-center gap-3 text-terracotta text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[45vh] text-forest-700">
          <RefreshCw className="w-8 h-8 animate-spin text-forest-600 mb-3" />
          <p className="font-medium text-sm">Aggregating historical intake analytics...</p>
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Calories Card */}
            <div className="p-4 rounded-2xl bg-white border border-forest-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-grey">Daily Average</span>
                <Flame className="w-4 h-4 text-terracotta" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-charcoal font-mono">
                  {data.statistics.energyKcal?.mean || 0}
                </span>
                <span className="text-xs font-semibold text-muted-grey ml-1">kcal/day</span>
              </div>
              <div className="mt-2 text-[11px] text-muted-grey">
                Range: {data.statistics.energyKcal?.min || 0} - {data.statistics.energyKcal?.max || 0}
              </div>
            </div>

            {/* Protein Card */}
            <div className="p-4 rounded-2xl bg-white border border-forest-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-grey">Protein Average</span>
                <Dna className="w-4 h-4 text-forest-700" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-charcoal font-mono">
                  {data.statistics.proteinG?.mean || 0}
                </span>
                <span className="text-xs font-semibold text-muted-grey ml-1">g/day</span>
              </div>
              <div className="mt-2 text-[11px] text-forest-800 font-medium">
                {data.macroDistribution.proteinPercentage}% of calories
              </div>
            </div>

            {/* Carbs Card */}
            <div className="p-4 rounded-2xl bg-white border border-forest-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-grey">Carbs Average</span>
                <Wheat className="w-4 h-4 text-sage-700" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-charcoal font-mono">
                  {data.statistics.carbohydrateG?.mean || 0}
                </span>
                <span className="text-xs font-semibold text-muted-grey ml-1">g/day</span>
              </div>
              <div className="mt-2 text-[11px] text-muted-grey">
                {data.macroDistribution.carbsPercentage}% of calories
              </div>
            </div>

            {/* Fat Card */}
            <div className="p-4 rounded-2xl bg-white border border-forest-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-grey">Total Fat Average</span>
                <Droplet className="w-4 h-4 text-terracotta" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-charcoal font-mono">
                  {data.statistics.fatG?.mean || 0}
                </span>
                <span className="text-xs font-semibold text-muted-grey ml-1">g/day</span>
              </div>
              <div className="mt-2 text-[11px] text-muted-grey">
                {data.macroDistribution.fatPercentage}% of calories
              </div>
            </div>

            {/* Completeness Card */}
            <div className="p-4 rounded-2xl bg-white border border-forest-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-grey">Log Completeness</span>
                <Activity className="w-4 h-4 text-forest-700" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-charcoal font-mono">
                  {data.completeness.completenessPercentage}%
                </span>
                <span className="text-xs font-semibold text-muted-grey ml-1">
                  ({data.completeness.loggedDays}/{data.period.totalDays}d)
                </span>
              </div>
              <div className="mt-2 text-[11px]">
                {data.completeness.unloggedDays > 0 ? (
                  <span className="text-amber-700 font-medium">
                    {data.completeness.unloggedDays} unlogged day(s)
                  </span>
                ) : (
                  <span className="text-forest-700 font-medium">
                    100% daily coverage
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Charts Row: Trend Line/Area/Bar Chart (8 Cols) & Macro Donut/Bars (4 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Trend Chart (8 Cols) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-forest-100 p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-forest-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-charcoal flex items-center gap-2">
                      <Activity className="w-4 h-4 text-forest-700" />
                      {chartType === 'stacked' 
                        ? 'Daily Macronutrient Calorie Composition' 
                        : `Daily ${activeMetricMeta.label} Intake Trend`}
                    </h2>
                    <p className="text-xs text-muted-grey mt-0.5">
                      Click any point or bar to drill down into that day's food diary timeline.
                    </p>
                  </div>

                  {/* Chart Type Selector Switcher Pills */}
                  <div className="flex items-center bg-forest-50 p-1 rounded-xl border border-forest-100 text-xs font-semibold">
                    <button
                      onClick={() => setChartType('area')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                        chartType === 'area' ? 'bg-forest-800 text-white shadow-2xs' : 'text-forest-800 hover:text-charcoal'
                      }`}
                      title="Area Chart"
                    >
                      <LucideAreaChart className="w-3.5 h-3.5" />
                      <span>Area</span>
                    </button>
                    <button
                      onClick={() => setChartType('bar')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                        chartType === 'bar' ? 'bg-forest-800 text-white shadow-2xs' : 'text-forest-800 hover:text-charcoal'
                      }`}
                      title="Bar Chart"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Bar</span>
                    </button>
                    <button
                      onClick={() => setChartType('line')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                        chartType === 'line' ? 'bg-forest-800 text-white shadow-2xs' : 'text-forest-800 hover:text-charcoal'
                      }`}
                      title="Line Chart"
                    >
                      <LucideLineChart className="w-3.5 h-3.5" />
                      <span>Line</span>
                    </button>
                    <button
                      onClick={() => setChartType('stacked')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                        chartType === 'stacked' ? 'bg-forest-800 text-white shadow-2xs' : 'text-forest-800 hover:text-charcoal'
                      }`}
                      title="Stacked Macro Breakdown"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Macro Stack</span>
                    </button>
                  </div>
                </div>

                {/* Secondary Row: Nutrient Metric Switcher Tabs OR Stacked Info */}
                {chartType !== 'stacked' ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(Object.keys(TREND_METRICS) as TrendMetricKey[]).map((key) => {
                        const meta = TREND_METRICS[key];
                        const isActive = selectedMetric === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setSelectedMetric(key)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              isActive
                                ? 'bg-forest-800 text-white shadow-2xs'
                                : 'bg-ivory-warm text-charcoal hover:bg-forest-50 border border-forest-100'
                            }`}
                          >
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[11px] font-semibold text-muted-grey flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeMetricMeta.color }} />
                      <span>{activeMetricMeta.label} ({activeMetricMeta.unit})</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 text-[11px] text-muted-grey flex items-center justify-between">
                    <span>Daily calories stacked by macronutrient: Carbs (4 kcal/g), Protein (4 kcal/g), Fat (9 kcal/g).</span>
                    <span className="font-semibold text-forest-800">Target RDA: 2,110 kcal</span>
                  </div>
                )}
              </div>

              {/* Dynamic Chart Body */}
              <div className="h-72 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'area' ? (
                    <AreaChart
                      data={data.trendSeries}
                      onClick={handlePointClick}
                      margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeMetricMeta.color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={activeMetricMeta.color} stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11, fill: '#7E8982' }}
                        tickFormatter={(val) => val.slice(5)} // MM-DD
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#7E8982' }} />
                      <ReferenceLine 
                        y={activeMetricMeta.targetRda} 
                        stroke="#C97857" 
                        strokeDasharray="4 4" 
                        label={{ 
                          value: `Target: ${activeMetricMeta.targetRda} ${activeMetricMeta.unit}`, 
                          fill: '#C97857', 
                          fontSize: 10, 
                          position: 'insideTopRight' 
                        }} 
                      />
                      <Tooltip content={renderStandardTooltip} />
                      <Area 
                        type="monotone" 
                        dataKey={activeMetricMeta.dataKey} 
                        stroke={activeMetricMeta.color} 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#metricGradient)"
                        activeDot={{ r: 6, stroke: activeMetricMeta.color, strokeWidth: 2, fill: '#FFFFFF', cursor: 'pointer' }}
                      />
                    </AreaChart>
                  ) : chartType === 'bar' ? (
                    <BarChart
                      data={data.trendSeries}
                      onClick={handlePointClick}
                      margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11, fill: '#7E8982' }}
                        tickFormatter={(val) => val.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#7E8982' }} />
                      <ReferenceLine 
                        y={activeMetricMeta.targetRda} 
                        stroke="#C97857" 
                        strokeDasharray="4 4" 
                        label={{ 
                          value: `Target: ${activeMetricMeta.targetRda} ${activeMetricMeta.unit}`, 
                          fill: '#C97857', 
                          fontSize: 10, 
                          position: 'insideTopRight' 
                        }} 
                      />
                      <Tooltip content={renderStandardTooltip} />
                      <Bar 
                        dataKey={activeMetricMeta.dataKey} 
                        fill={activeMetricMeta.color} 
                        radius={[6, 6, 0, 0]} 
                        maxBarSize={45} 
                        cursor="pointer" 
                      />
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart
                      data={data.trendSeries}
                      onClick={handlePointClick}
                      margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11, fill: '#7E8982' }}
                        tickFormatter={(val) => val.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#7E8982' }} />
                      <ReferenceLine 
                        y={activeMetricMeta.targetRda} 
                        stroke="#C97857" 
                        strokeDasharray="4 4" 
                        label={{ 
                          value: `Target: ${activeMetricMeta.targetRda} ${activeMetricMeta.unit}`, 
                          fill: '#C97857', 
                          fontSize: 10, 
                          position: 'insideTopRight' 
                        }} 
                      />
                      <Tooltip content={renderStandardTooltip} />
                      <Line 
                        type="monotone" 
                        dataKey={activeMetricMeta.dataKey} 
                        stroke={activeMetricMeta.color} 
                        strokeWidth={3} 
                        dot={{ r: 4, stroke: activeMetricMeta.color, strokeWidth: 2, fill: '#FFFFFF' }}
                        activeDot={{ r: 7, stroke: activeMetricMeta.color, strokeWidth: 2, fill: '#FFFFFF', cursor: 'pointer' }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart
                      data={stackedSeries}
                      onClick={handlePointClick}
                      margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11, fill: '#7E8982' }}
                        tickFormatter={(val) => val.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#7E8982' }} />
                      <ReferenceLine 
                        y={2110} 
                        stroke="#C97857" 
                        strokeDasharray="4 4" 
                        label={{ value: 'Target: 2110 kcal', fill: '#C97857', fontSize: 10, position: 'insideTopRight' }} 
                      />
                      <Tooltip content={renderStackedTooltip} />
                      <Legend 
                        iconType="circle" 
                        wrapperStyle={{ fontSize: 11, paddingTop: 4 }} 
                      />
                      <Bar dataKey="carbsCal" name="Carbs (kcal)" stackId="a" fill="#A9BDA9" radius={[0, 0, 0, 0]} maxBarSize={45} cursor="pointer" />
                      <Bar dataKey="proteinCal" name="Protein (kcal)" stackId="a" fill="#244C3B" radius={[0, 0, 0, 0]} maxBarSize={45} cursor="pointer" />
                      <Bar dataKey="fatCal" name="Fat (kcal)" stackId="a" fill="#C97857" radius={[6, 6, 0, 0]} maxBarSize={45} cursor="pointer" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="pt-3 border-t border-forest-50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-grey">
                <span>Interactive Chart: Click any data point or bar to drill down into that date's Food Diary.</span>
                <span className="font-medium text-forest-800">
                  {data.period.startDate} to {data.period.endDate}
                </span>
              </div>
            </div>

            {/* Macro Energy Distribution Chart (4 Cols) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-forest-100 p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-forest-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-charcoal flex items-center gap-2">
                    <LucidePieChart className="w-4 h-4 text-forest-700" />
                    Caloric Macronutrient Split
                  </h2>
                  <p className="text-xs text-muted-grey mt-0.5">
                    Energy ratio: 4 kcal/g (P, C), 9 kcal/g (F).
                  </p>
                </div>

                {/* Macro View Type Toggle */}
                <div className="flex items-center bg-forest-50 p-1 rounded-xl border border-forest-100 text-xs">
                  <button
                    onClick={() => setMacroViewType('donut')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                      macroViewType === 'donut' ? 'bg-forest-800 text-white shadow-2xs' : 'text-forest-800 hover:text-charcoal'
                    }`}
                    title="Donut Chart View"
                  >
                    <LucidePieChart className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Donut</span>
                  </button>
                  <button
                    onClick={() => setMacroViewType('bars')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                      macroViewType === 'bars' ? 'bg-forest-800 text-white shadow-2xs' : 'text-forest-800 hover:text-charcoal'
                    }`}
                    title="Horizontal Progress Bars View"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Bars</span>
                  </button>
                </div>
              </div>

              {macroViewType === 'donut' ? (
                <>
                  <div className="h-48 w-full my-auto flex items-center justify-center">
                    {pieData.some(d => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                  <div className="p-2.5 bg-white border border-forest-200 rounded-xl shadow-md text-xs">
                                    <span className="font-bold text-charcoal">{d.name}</span>
                                    <p className="text-muted-grey">{d.percentage}% ({d.value} kcal)</p>
                                    <p className="text-[11px] text-muted-grey">{d.grams}g daily avg</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-muted-grey text-center">No macro consumption recorded</div>
                    )}
                  </div>

                  {/* Legend with percentages */}
                  <div className="space-y-2 pt-2 border-t border-forest-50">
                    {pieData.map(entry => (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="font-medium text-charcoal">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-grey font-mono">
                          <span>{entry.grams}g</span>
                          <span className="font-bold text-charcoal">{entry.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Horizontal Breakdown Bars View */
                <div className="py-4 space-y-4 my-auto">
                  {pieData.map(entry => (
                    <div key={entry.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-charcoal">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          {entry.name}
                        </span>
                        <span className="font-mono text-muted-grey">
                          <strong className="text-charcoal">{entry.grams}g</strong> ({entry.value} kcal) &bull; <strong className="text-forest-900">{entry.percentage}%</strong>
                        </span>
                      </div>
                      <div className="w-full bg-forest-100/60 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, entry.percentage)}%`, backgroundColor: entry.color }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-forest-50 text-[11px] text-muted-grey text-center">
                    Percentages represent proportion of total daily caloric intake.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statistical Breakdown Table */}
          <div className="bg-white rounded-2xl border border-forest-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-forest-100">
              <h3 className="text-base font-bold text-charcoal">
                Statistical Intake Distribution (Logged Days Only)
              </h3>
              <p className="text-xs text-muted-grey mt-0.5">
                Omits unlogged days from averages to prevent downward skewing of actual daily consumption.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-forest-50/70 border-b border-forest-100 text-muted-grey font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 pl-5">Nutrient</th>
                    <th className="p-3.5">Mean (Average)</th>
                    <th className="p-3.5">Median</th>
                    <th className="p-3.5">Min</th>
                    <th className="p-3.5">Max</th>
                    <th className="p-3.5 pr-5">Std Deviation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-50">
                  {Object.entries(nutrientDisplayNames).map(([key, def]) => {
                    const stat = data.statistics[key] || { mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
                    return (
                      <tr key={key} className="hover:bg-ivory-warm/40 transition-colors">
                        <td className="p-3.5 pl-5 font-semibold text-charcoal">
                          {def.label} <span className="text-muted-grey font-normal text-[11px]">({def.unit})</span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-forest-900">{stat.mean}</td>
                        <td className="p-3.5 font-mono text-charcoal">{stat.median}</td>
                        <td className="p-3.5 font-mono text-muted-grey">{stat.min}</td>
                        <td className="p-3.5 font-mono text-muted-grey">{stat.max}</td>
                        <td className="p-3.5 pr-5 font-mono text-muted-grey">±{stat.stdDev}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Neutral Observation & Completeness Alert */}
          <div className="p-4 bg-forest-50/70 border border-forest-200/80 rounded-2xl flex items-start gap-3 text-xs leading-relaxed">
            <Info className="w-5 h-5 text-forest-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-forest-900 block mb-0.5">Data Completeness & Quality Index:</span>
              <p className="text-charcoal/80">{data.completeness.observationNote}</p>
              <p className="text-[11px] text-muted-grey mt-1">
                * Consistent daily logging enhances the statistical accuracy of rolling trends and variance indicators.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
