import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Save, 
  RefreshCw, 
  Info,
  TrendingUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Flame,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { targetService, ReferenceSet, UserTargetProfile, DailyTargetProgress } from '../../services/targetService';

export const TargetSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [referenceSets, setReferenceSets] = useState<ReferenceSet[]>([]);
  const [activeProfile, setActiveProfile] = useState<UserTargetProfile | null>(null);
  const [selectedRefCode, setSelectedRefCode] = useState<string>('ICMR_ADULT_SEDENTARY_MALE');
  const [customTargets, setCustomTargets] = useState<Record<string, number>>({});
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [progressData, setProgressData] = useState<DailyTargetProgress | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [progressLoading, setProgressLoading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadProgress(selectedDate);
    }
  }, [selectedDate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [refSets, userProfile] = await Promise.all([
        targetService.getReferenceSets(),
        targetService.getUserTargets()
      ]);

      setReferenceSets(refSets);
      setActiveProfile(userProfile);
      if (userProfile?.referenceSetCode) {
        setSelectedRefCode(userProfile.referenceSetCode);
      }
      if (userProfile?.customTargets) {
        setCustomTargets(userProfile.customTargets);
      }
    } catch (err: any) {
      console.error('Failed to load targets:', err);
      setErrorMsg('Failed to load reference targets. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async (dateStr: string) => {
    try {
      setProgressLoading(true);
      const data = await targetService.getDailyProgress(dateStr);
      setProgressData(data);
    } catch (err: any) {
      console.error('Failed to load daily progress:', err);
    } finally {
      setProgressLoading(false);
    }
  };

  const handleRefSelect = (code: string) => {
    setSelectedRefCode(code);
    const chosen = referenceSets.find(r => r.code.toLowerCase() === code.toLowerCase());
    if (chosen) {
      setCustomTargets(chosen.targets);
    }
  };

  const handleResetToBaseline = () => {
    const chosen = referenceSets.find(r => r.code.toLowerCase() === selectedRefCode.toLowerCase());
    if (chosen) {
      setCustomTargets({ ...chosen.targets });
    }
  };

  const handleCustomChange = (nutrient: string, val: string) => {
    const num = parseFloat(val);
    setCustomTargets(prev => ({
      ...prev,
      [nutrient]: isNaN(num) ? 0 : num
    }));
  };

  const handleSaveTargets = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      const updated = await targetService.updateTargets({
        referenceSetCode: selectedRefCode,
        customTargets: Object.keys(customTargets).length > 0 ? customTargets : undefined
      });
      setActiveProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadProgress(selectedDate);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update nutrition targets.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const nutrientLabels: Record<string, { label: string; unit: string; isLimit?: boolean }> = {
    energyKcal: { label: 'Energy (Calories)', unit: 'kcal' },
    proteinG: { label: 'Protein', unit: 'g' },
    carbohydrateG: { label: 'Carbohydrates', unit: 'g' },
    fatG: { label: 'Total Fat', unit: 'g' },
    saturatedFatG: { label: 'Saturated Fat', unit: 'g', isLimit: true },
    fiberG: { label: 'Dietary Fiber', unit: 'g' },
    sugarsG: { label: 'Sugars', unit: 'g', isLimit: true },
    sodiumMg: { label: 'Sodium', unit: 'mg', isLimit: true },
    calciumMg: { label: 'Calcium', unit: 'mg' },
    ironMg: { label: 'Iron', unit: 'mg' },
    vitaminCMg: { label: 'Vitamin C', unit: 'mg' }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-forest-700">
        <RefreshCw className="w-8 h-8 animate-spin text-forest-600 mb-3" />
        <p className="font-medium">Loading dietary reference targets...</p>
      </div>
    );
  }

  const energyItem = progressData?.items.find(i => i.nutrient === 'energyKcal');

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-forest-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-7 h-7 text-forest-700" />
            <h1 className="text-2xl font-bold text-charcoal">Dietary Targets & Progress Tracking</h1>
          </div>
          <p className="text-sm text-muted-grey mt-1">
            Configure authoritative nutritional benchmarks (ICMR-NIN 2020 / WHO) or tailor custom daily goals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadInitialData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-forest-800 bg-forest-50 hover:bg-forest-100 rounded-lg transition-colors border border-forest-200/50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-terracotta/10 border border-terracotta/20 rounded-xl flex items-center gap-3 text-terracotta text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: Settings on Left, Today's Progress on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Reference Set & Targets Config (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Reference Sets Selection */}
          <div className="bg-white rounded-2xl border border-forest-100 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-charcoal mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-forest-700" />
              1. Authoritative Reference Framework
            </h2>
            <p className="text-xs text-muted-grey mb-4">
              Select an officially published population-level guideline as your nutritional foundation:
            </p>

            <div className="space-y-3">
              {referenceSets.map(ref => {
                const isSelected = selectedRefCode?.toLowerCase() === ref.code?.toLowerCase();
                return (
                  <div
                    key={ref.code}
                    onClick={() => handleRefSelect(ref.code)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-forest-700 bg-forest-50/60 shadow-sm' 
                        : 'border-forest-100 hover:border-forest-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-charcoal">{ref.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-100 text-forest-800">
                            {ref.jurisdiction}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-700 text-white flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Active Baseline
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-grey mt-1">{ref.population}</p>
                        <p className="text-[11px] text-muted-grey mt-0.5 italic">Source: {ref.source}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-1 ${
                        isSelected ? 'border-forest-700 bg-forest-700' : 'border-forest-300'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Nutrient Overrides */}
          <div className="bg-white rounded-2xl border border-forest-100 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-bold text-charcoal flex items-center gap-2">
                <Target className="w-5 h-5 text-forest-700" />
                2. Custom Daily Nutrient Targets
              </h2>
              <button
                type="button"
                onClick={handleResetToBaseline}
                className="flex items-center gap-1 text-xs text-forest-700 hover:text-forest-900 font-medium transition-colors"
                title="Reset custom targets to match the selected framework baseline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Framework Baseline
              </button>
            </div>
            <p className="text-xs text-muted-grey mb-5">
              Fine-tune any value according to your personal caloric and fitness requirements.
            </p>

            {/* Category 1: Macronutrients & Energy */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 pb-1 border-b border-forest-100">
                <Flame className="w-4 h-4 text-forest-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                  Macronutrients & Energy
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  { key: 'energyKcal', label: 'Energy (Calories)', unit: 'kcal' },
                  { key: 'proteinG', label: 'Protein', unit: 'g' },
                  { key: 'carbohydrateG', label: 'Carbohydrates', unit: 'g' },
                  { key: 'fatG', label: 'Total Fat', unit: 'g' },
                  { key: 'fiberG', label: 'Dietary Fiber', unit: 'g' }
                ].map(({ key, label, unit }) => {
                  const currentVal = customTargets[key] ?? activeProfile?.effectiveTargets[key] ?? '';
                  return (
                    <div key={key} className="p-3 rounded-xl bg-ivory-warm border border-forest-100">
                      <label className="block text-xs font-semibold text-charcoal mb-1">
                        {label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          value={currentVal}
                          onChange={(e) => handleCustomChange(key, e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-white border border-forest-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-600 font-mono"
                          placeholder="0.0"
                        />
                        <span className="text-xs text-muted-grey font-medium w-8">{unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category 2: Limits & Micronutrients */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-1 border-b border-forest-100">
                <ShieldCheck className="w-4 h-4 text-forest-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                  Limits & Micronutrients
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  { key: 'saturatedFatG', label: 'Saturated Fat', unit: 'g', isLimit: true },
                  { key: 'sugarsG', label: 'Sugars', unit: 'g', isLimit: true },
                  { key: 'sodiumMg', label: 'Sodium', unit: 'mg', isLimit: true },
                  { key: 'calciumMg', label: 'Calcium', unit: 'mg' },
                  { key: 'ironMg', label: 'Iron', unit: 'mg' },
                  { key: 'vitaminCMg', label: 'Vitamin C', unit: 'mg' }
                ].map(({ key, label, unit, isLimit }) => {
                  const currentVal = customTargets[key] ?? activeProfile?.effectiveTargets[key] ?? '';
                  return (
                    <div key={key} className="p-3 rounded-xl bg-ivory-warm border border-forest-100">
                      <label className="block text-xs font-semibold text-charcoal mb-1 flex items-center justify-between">
                        <span>{label}</span>
                        {isLimit && (
                          <span className="text-[10px] font-medium text-terracotta bg-terracotta/10 px-1.5 py-0.2 rounded">
                            Max Limit
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          value={currentVal}
                          onChange={(e) => handleCustomChange(key, e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-white border border-forest-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-600 font-mono"
                          placeholder="0.0"
                        />
                        <span className="text-xs text-muted-grey font-medium w-8">{unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-forest-100">
              {saveSuccess ? (
                <div className="flex items-center gap-1.5 text-xs text-forest-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-forest-700" />
                  Targets saved successfully!
                </div>
              ) : (
                <span className="text-xs text-muted-grey">Stored in your profile settings</span>
              )}

              <button
                onClick={handleSaveTargets}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Target Preferences
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Daily Progress Monitor (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-forest-100 p-6 shadow-sm sticky top-6 space-y-5">
            {/* Header & Date Navigation Ribbon */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-charcoal flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-forest-700" />
                  Daily Target Progress
                </h2>
                <button
                  onClick={handleToday}
                  className="text-[11px] font-semibold text-forest-800 hover:text-forest-900 bg-forest-50 hover:bg-forest-100 px-2.5 py-1 rounded-lg border border-forest-200/50 transition-colors"
                >
                  Today
                </button>
              </div>

              {/* Date Navigation Bar */}
              <div className="flex items-center gap-2 bg-forest-50/70 p-1.5 rounded-xl border border-forest-100">
                <button
                  onClick={handlePrevDay}
                  title="Previous Day"
                  className="p-1 rounded-lg hover:bg-white text-forest-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 flex items-center justify-center gap-1.5 text-xs text-charcoal font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-forest-700" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-charcoal font-semibold text-xs focus:outline-none cursor-pointer"
                  />
                </div>
                <button
                  onClick={handleNextDay}
                  title="Next Day"
                  className="p-1 rounded-lg hover:bg-white text-forest-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Action: View in Food Diary */}
            <button
              onClick={() => navigate(`/diary?date=${selectedDate}`)}
              className="w-full flex items-center justify-between py-2 px-3.5 text-xs font-semibold text-forest-800 bg-forest-50/80 hover:bg-forest-100 border border-forest-200/60 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-forest-700" />
                <span>View {selectedDate} in Food Diary</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {progressLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-forest-700">
                <RefreshCw className="w-6 h-6 animate-spin text-forest-600 mb-2" />
                <span className="text-xs">Computing consumption progress...</span>
              </div>
            ) : progressData ? (
              <div className="space-y-4">
                {/* Benchmark & Completeness metadata */}
                <div className="p-3 bg-forest-50/60 rounded-xl border border-forest-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-grey block text-[11px]">Reference Benchmark:</span>
                    <span className="font-semibold text-forest-900">{progressData.referenceSource}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-grey block text-[11px]">Completeness:</span>
                    <span className="font-semibold text-forest-800">{progressData.overallCompletenessPercent}% tracked</span>
                  </div>
                </div>

                {/* Energy Highlight Banner */}
                {energyItem && (
                  <div className="p-3 bg-white rounded-xl border border-forest-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-700">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-grey font-bold uppercase tracking-wider block">Energy Intake</span>
                        <span className="text-sm font-bold text-charcoal">
                          {energyItem.consumed} / {energyItem.target} <span className="text-xs font-normal text-muted-grey">kcal</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        energyItem.status === 'exceeded'
                          ? 'bg-terracotta/10 text-terracotta'
                          : energyItem.status === 'on_track'
                          ? 'bg-forest-100 text-forest-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {energyItem.progressPercentage}%
                      </span>
                      <span className="text-[10px] text-muted-grey block mt-0.5">
                        {energyItem.remaining > 0 ? `${energyItem.remaining} kcal left` : 'Target met'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Progress bars list */}
                <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                  {progressData.items.map(item => {
                    const info = nutrientLabels[item.nutrient] || { label: item.nutrient, unit: '' };
                    const isOver = item.status === 'exceeded';
                    const isLimit = item.isLimit;

                    // Bar color
                    let barColor = 'bg-forest-700';
                    if (isLimit && isOver) barColor = 'bg-terracotta';
                    else if (isLimit && item.status === 'approaching') barColor = 'bg-amber-500';
                    else if (!isLimit && item.status === 'under') barColor = 'bg-sage-600';
                    else if (!isLimit && isOver) barColor = 'bg-forest-800';

                    return (
                      <div key={item.nutrient} className="p-3 rounded-xl bg-ivory-warm/60 border border-forest-50">
                        <div className="flex items-center justify-between text-xs font-semibold text-charcoal mb-1">
                          <span className="flex items-center gap-1.5">
                            {info.label}
                            {isLimit && (
                              <span className="text-[9px] px-1 bg-terracotta/10 text-terracotta rounded">
                                Limit
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-muted-grey">
                            <span className="text-charcoal font-bold">{item.consumed}</span> / {item.target} {info.unit}
                          </span>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="w-full bg-forest-100/70 rounded-full h-2 overflow-hidden mb-1.5">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${barColor}`}
                            style={{ width: `${Math.min(100, item.progressPercentage)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-grey">
                          <span className="font-medium">
                            {item.progressPercentage}%
                          </span>
                          <span>
                            {item.remaining > 0 ? (
                              <span>{item.remaining} {info.unit} left</span>
                            ) : (
                              <span className="text-forest-700 font-medium flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3 text-forest-700" />
                                Target met
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legal Disclaimer Box */}
                <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-[11px] text-charcoal/80 flex items-start gap-2.5 leading-relaxed">
                  <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <span>{progressData.disclaimer}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-grey text-center py-6">No progress data available for this date.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
