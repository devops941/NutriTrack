import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Bookmark,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Coffee,
  Sun,
  Sunset,
  Moon,
  Utensils,
  CheckCircle2,
  X,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ClipboardList
} from 'lucide-react';
import { mealService, Meal, DailyDiarySummary } from '../../services/mealService';
import { foodService, FoodItem } from '../../services/foodService';
import { plannerService, MealPlan, PlannedMeal } from '../../services/plannerService';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: Sun, color: 'text-amber-600 bg-amber-50' },
  { id: 'morning_snack', label: 'Morning Snack', icon: Coffee, color: 'text-emerald-700 bg-emerald-50' },
  { id: 'lunch', label: 'Lunch', icon: Utensils, color: 'text-forest bg-forest-50' },
  { id: 'evening_snack', label: 'Evening Snack', icon: Sunset, color: 'text-amber-700 bg-amber-50' },
  { id: 'dinner', label: 'Dinner', icon: Moon, color: 'text-indigo-800 bg-indigo-50' },
  { id: 'custom', label: 'Custom Meal', icon: Utensils, color: 'text-charcoal bg-ivory' },
];

export const FoodDiaryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryDate = searchParams.get('date');

  const [currentDate, setCurrentDate] = useState<string>(() => {
    return queryDate || new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    if (queryDate && queryDate !== currentDate) {
      setCurrentDate(queryDate);
    }
  }, [queryDate]);

  const [diary, setDiary] = useState<DailyDiarySummary | null>(null);
  const [dayPlan, setDayPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [importingSlot, setImportingSlot] = useState<string | null>(null);

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [targetMealType, setTargetMealType] = useState<string>('breakfast');
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(100);
  const [itemUnit, setItemUnit] = useState<string>('g');
  const [logging, setLogging] = useState<boolean>(false);

  const fetchDailyDiary = async () => {
    setLoading(true);
    try {
      const [diaryData, planData] = await Promise.all([
        mealService.getDailyMeals(currentDate),
        plannerService.getDayPlan(currentDate).catch(() => null)
      ]);
      setDiary(diaryData);
      setDayPlan(planData);
    } catch (err) {
      console.error('Failed to load daily diary or plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogPlannedMeal = async (plannedMeal: PlannedMeal, slotType: string) => {
    try {
      setImportingSlot(slotType);
      await plannerService.logPlannedMealToDiary({
        date: currentDate,
        mealType: slotType,
        name: plannedMeal.name,
        items: plannedMeal.items,
        totalNutrients: plannedMeal.totalNutrients
      });
      await fetchDailyDiary();
    } catch (err: any) {
      console.error('Failed to quick-log planned meal:', err);
      alert(err.response?.data?.detail || 'Failed to log planned meal to diary');
    } finally {
      setImportingSlot(null);
    }
  };

  useEffect(() => {
    fetchDailyDiary();
  }, [currentDate]);

  useEffect(() => {
    foodService.getFoods({ limit: 50 }).then((res) => {
      if (res && res.foods && res.foods.length > 0) {
        setFoods(res.foods);
        if (!selectedFoodId) setSelectedFoodId(res.foods[0].id);
      }
    });
  }, []);

  const handleDateChange = (newDateStr: string) => {
    setCurrentDate(newDateStr);
    setSearchParams({ date: newDateStr });
  };

  const changeDate = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    handleDateChange(d.toISOString().split('T')[0]);
  };

  const handleOpenAddModal = (mealType: string) => {
    setTargetMealType(mealType);
    if (foods.length > 0) {
      const activeFood = foods.find((f) => f.id === selectedFoodId) || foods[0];
      if (activeFood.basis.unit === 'ml') {
        setItemUnit('ml');
        setItemQuantity(200);
      } else {
        setItemUnit('g');
        setItemQuantity(100);
      }
    }
    setIsAddModalOpen(true);
  };

  const handleSelectFood = (foodId: string) => {
    setSelectedFoodId(foodId);
    const fd = foods.find((f) => f.id === foodId);
    if (fd?.basis.unit === 'ml') {
      setItemUnit('ml');
      setItemQuantity(200);
    } else {
      setItemUnit('g');
      setItemQuantity(100);
    }
  };

  const handleLogFoodItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFoodId || itemQuantity <= 0) return;

    setLogging(true);
    try {
      await mealService.logMeal({
        mealType: targetMealType,
        dateStr: currentDate,
        consumedAt: new Date().toISOString(),
        items: [{ foodId: selectedFoodId, quantity: itemQuantity, unit: itemUnit }],
      });
      setIsAddModalOpen(false);
      fetchDailyDiary();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to log food');
    } finally {
      setLogging(false);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm('Are you sure you want to remove this meal from your diary?')) return;
    try {
      await mealService.deleteMeal(mealId);
      fetchDailyDiary();
    } catch (err) {
      alert('Failed to delete meal');
    }
  };

  const selectedFood = foods.find((f) => f.id === selectedFoodId);

  const getAvailableUnits = () => {
    const isLiquid = selectedFood?.basis.unit === 'ml';
    const list: Array<{ value: string; label: string }> = [];

    if (isLiquid) {
      list.push({ value: 'ml', label: 'ml (Milliliters)' });
      list.push({ value: 'g', label: 'g (Grams)' });
      list.push({ value: 'L', label: 'L (Liters - 1,000 ml)' });
      list.push({ value: 'kg', label: 'kg (Kilograms - 1,000 g)' });
    } else {
      list.push({ value: 'g', label: 'g (Grams)' });
      list.push({ value: 'kg', label: 'kg (Kilograms - 1,000 g)' });
      list.push({ value: 'mg', label: 'mg (Milligrams - 0.001 g)' });
      list.push({ value: 'ml', label: 'ml (Milliliters)' });
      list.push({ value: 'L', label: 'L (Liters - 1,000 ml)' });
    }

    if (selectedFood?.servings) {
      selectedFood.servings.forEach((s) => {
        list.push({
          value: s.name,
          label: `${s.name} (${s.grams}${isLiquid ? 'ml' : 'g'})`
        });
      });
    }

    return list;
  };

  const getPreviewNutrients = () => {
    if (!selectedFood || itemQuantity <= 0) return null;
    let factor = 1.0;
    const lowerUnit = itemUnit.toLowerCase();

    if (lowerUnit === 'kg' || lowerUnit === 'l') {
      factor = 1000.0;
    } else if (lowerUnit === 'mg') {
      factor = 0.001;
    } else if (selectedFood.servings) {
      const s = selectedFood.servings.find(
        (srv) => srv.name.toLowerCase() === lowerUnit || lowerUnit.includes(srv.name.toLowerCase())
      );
      if (s) factor = s.grams;
    }

    const totalBasis = itemQuantity * factor;
    const scaling = totalBasis / (selectedFood.basis?.amount || 100.0);

    const kcal = Math.round((selectedFood.nutrients.energyKcal || 0) * scaling * 10) / 10;
    const protein = Math.round((selectedFood.nutrients.proteinG || 0) * scaling * 10) / 10;
    const carbs = Math.round((selectedFood.nutrients.carbohydrateG || 0) * scaling * 10) / 10;
    const fat = Math.round((selectedFood.nutrients.fatG || 0) * scaling * 10) / 10;

    return { kcal, protein, carbs, fat, isTooHigh: kcal > 3000 };
  };

  const preview = getPreviewNutrients();

  const dailyTotals = diary?.dailyTotals || {};
  const totalCalories = dailyTotals.energyKcal || 0;
  const targetCalories = 2110; // ICMR-NIN Indian Adult Target
  const calPercent = Math.min(Math.round((totalCalories / targetCalories) * 100), 100);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Date Navigation Ribbon */}
      <div className="bg-white rounded-2xl p-4 lg:p-6 border border-mutedGrey-border shadow-organic flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest flex items-center justify-center border border-sage/40">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-editorial text-forest">Food Diary & Meal Timeline</h1>
            <p className="text-xs text-mutedGrey">Historical snapshot architecture preserves your logged nutrition data</p>
          </div>
        </div>

        {/* Date Selector Pill */}
        <div className="flex items-center space-x-2 bg-ivory p-1.5 rounded-2xl border border-mutedGrey-border">
          <button
            onClick={() => changeDate(-1)}
            className="p-1.5 rounded-xl hover:bg-white text-mutedGrey hover:text-charcoal transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative flex items-center bg-white px-2.5 py-1 rounded-xl border border-mutedGrey-border hover:border-forest/60 transition-colors shadow-sm group">
            <CalendarIcon className="w-3.5 h-3.5 text-forest mr-1.5 pointer-events-none" />
            <input
              type="date"
              value={currentDate}
              onChange={(e) => {
                if (e.target.value) handleDateChange(e.target.value);
              }}
              className="text-xs font-bold font-mono text-charcoal bg-transparent cursor-pointer focus:outline-none"
              title="Click to select any day from calendar"
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
            onClick={() => handleDateChange(new Date().toISOString().split('T')[0])}
            className="px-2.5 py-1 text-[11px] font-semibold text-forest bg-white rounded-lg border border-sage/40 hover:bg-forest-50 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Daily Progress Overview Bar */}
      <div className="bg-white rounded-2xl p-6 border border-mutedGrey-border shadow-organic">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-charcoal uppercase tracking-wider">
                Daily Energy Intake
              </span>
              <span className="text-xs text-mutedGrey">
                <strong className="text-forest text-sm">{totalCalories}</strong> / {targetCalories} kcal ({calPercent}%)
              </span>
            </div>
            <div className="w-full bg-ivory rounded-full h-2.5 overflow-hidden border border-mutedGrey-border">
              <div
                className="bg-forest h-full rounded-full transition-all duration-500"
                style={{ width: `${calPercent}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-mutedGrey mt-1 block">
              Reference Target: ICMR-NIN 2020 RDA for Indian Adult (Sedentary)
            </span>
          </div>

          {/* Macro Breakdown Pills */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 bg-ivory rounded-xl border border-mutedGrey-border text-center min-w-[80px]">
              <span className="block text-[10px] text-mutedGrey uppercase">Protein</span>
              <span className="text-sm font-bold text-charcoal">{dailyTotals.proteinG || 0}g</span>
            </div>
            <div className="px-3.5 py-2 bg-ivory rounded-xl border border-mutedGrey-border text-center min-w-[80px]">
              <span className="block text-[10px] text-mutedGrey uppercase">Carbs</span>
              <span className="text-sm font-bold text-charcoal">{dailyTotals.carbohydrateG || 0}g</span>
            </div>
            <div className="px-3.5 py-2 bg-ivory rounded-xl border border-mutedGrey-border text-center min-w-[80px]">
              <span className="block text-[10px] text-mutedGrey uppercase">Fat</span>
              <span className="text-sm font-bold text-charcoal">{dailyTotals.fatG || 0}g</span>
            </div>
            <div className="px-3.5 py-2 bg-ivory rounded-xl border border-mutedGrey-border text-center min-w-[80px]">
              <span className="block text-[10px] text-mutedGrey uppercase">Fiber</span>
              <span className="text-sm font-bold text-forest">{dailyTotals.fiberG || 0}g</span>
            </div>
          </div>
        </div>
      </div>

      {/* Meals List by Meal Type */}
      <div className="space-y-4">
        {MEAL_TYPES.map((type) => {
          const Icon = type.icon;
          const matchingMeals = (diary?.meals || []).filter((m) => m.mealType === type.id);
          const hasMeals = matchingMeals.length > 0;
          const plannedMealForSlot = dayPlan?.meals?.find((m) => {
            const pType = m.mealType.toLowerCase();
            const sType = type.id.toLowerCase();
            if (pType === sType) return true;
            if (pType === 'snack' && (sType === 'morning_snack' || sType === 'evening_snack')) return true;
            return false;
          });

          return (
            <div
              key={type.id}
              className="bg-white rounded-2xl border border-mutedGrey-border shadow-card overflow-hidden"
            >
              {/* Meal Header */}
              <div className="p-4 sm:p-5 flex items-center justify-between bg-white border-b border-mutedGrey-border">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${type.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-charcoal font-editorial">{type.label}</h3>
                    <span className="text-[11px] text-mutedGrey">
                      {hasMeals
                        ? `${matchingMeals.reduce((acc, m) => acc + m.items.length, 0)} food item(s) logged`
                        : 'No foods recorded yet'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {hasMeals && (
                    <span className="text-xs font-bold text-forest hidden sm:inline">
                      {matchingMeals.reduce((acc, m) => acc + (m.mealTotals.energyKcal || 0), 0)} kcal
                    </span>
                  )}
                  <button
                    onClick={() => handleOpenAddModal(type.id)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-forest bg-forest-50 hover:bg-forest-100 rounded-xl transition-colors border border-sage/40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Food</span>
                  </button>
                </div>
              </div>

              {/* Quick-Log from Planned Meal (when slot is empty) */}
              {!hasMeals && plannedMealForSlot && (
                <div className="p-3.5 sm:p-4 bg-forest-50/60 border-b border-mutedGrey-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 text-xs text-charcoal">
                    <Sparkles className="w-4 h-4 text-forest flex-shrink-0" />
                    <span>
                      Planned for today: <strong className="font-semibold text-forest">{plannedMealForSlot.name}</strong> ({plannedMealForSlot.totalNutrients?.energyKcal || 0} kcal)
                    </span>
                  </div>
                  <button
                    onClick={() => handleQuickLogPlannedMeal(plannedMealForSlot, type.id)}
                    disabled={importingSlot === type.id}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-forest hover:bg-forest-dark rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-60 whitespace-nowrap"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>
                      {importingSlot === type.id ? 'Logging...' : `Quick-Log from Planned Meal: ${plannedMealForSlot.name}`}
                    </span>
                  </button>
                </div>
              )}

              {/* Logged Items */}
              {hasMeals && (
                <div className="divide-y divide-mutedGrey-border/60 bg-ivory/30">
                  {matchingMeals.map((meal) => (
                    <div key={meal.id} className="p-4 sm:p-5 space-y-3">
                      {meal.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="w-2 h-2 rounded-full bg-sage-dark"></span>
                            <div>
                              <strong className="text-charcoal text-sm">{item.foodNameSnapshot}</strong>
                              <span className="text-mutedGrey ml-2">
                                ({item.quantity} {item.unit})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <span className="font-bold text-forest">
                                {item.nutrientSnapshot.energyKcal ?? 0} kcal
                              </span>
                              <span className="block text-[10px] text-mutedGrey">
                                P: {item.nutrientSnapshot.proteinG ?? 0}g | C: {item.nutrientSnapshot.carbohydrateG ?? 0}g | F: {item.nutrientSnapshot.fatG ?? 0}g
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteMeal(meal.id)}
                              className="p-1 text-mutedGrey hover:text-terracotta rounded-lg transition-colors"
                              title="Delete meal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Food Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 lg:p-8 max-w-md w-full border border-mutedGrey-border shadow-2xl relative animate-scaleIn">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-mutedGrey hover:text-charcoal"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[11px] font-semibold text-forest bg-forest-50 px-2.5 py-0.5 rounded-full border border-sage/40 uppercase">
              {targetMealType.replace('_', ' ')}
            </span>
            <h2 className="text-xl font-bold font-editorial text-forest mt-2 mb-4">
              Add Food to Diary
            </h2>

            <form onSubmit={handleLogFoodItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Select Food Item</label>
                <select
                  value={selectedFoodId}
                  onChange={(e) => handleSelectFood(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none"
                >
                  {foods.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.nutrients.energyKcal} kcal/100{f.basis.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none font-bold text-charcoal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">Unit</label>
                  <select
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none"
                  >
                    {getAvailableUnits().map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Live Nutrient Calculation Preview */}
              {preview && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                    preview.isTooHigh
                      ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                      : 'bg-forest-50/70 border-sage/40 text-charcoal'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5 text-forest">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Live Nutrient Calculation</span>
                    </span>
                    <span className="font-bold text-sm font-editorial text-forest">
                      {preview.kcal.toLocaleString()} kcal
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-mutedGrey pt-1 border-t border-mutedGrey-border/40">
                    <span>Protein: <strong className="text-charcoal">{preview.protein}g</strong></span>
                    <span>Carbs: <strong className="text-charcoal">{preview.carbs}g</strong></span>
                    <span>Fat: <strong className="text-charcoal">{preview.fat}g</strong></span>
                  </div>
                  {preview.isTooHigh && (
                    <div className="text-[11px] font-semibold text-amber-800 pt-1 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                      <span>
                        Caution: {preview.kcal.toLocaleString()} kcal is unusually high. Did you choose <strong>"{itemUnit}"</strong> by mistake? For liquids like milk, prefer <strong>ml</strong> (e.g. 200 ml = 122 kcal).
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 bg-ivory/60 rounded-xl border border-mutedGrey-border text-xs text-mutedGrey flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-forest flex-shrink-0" />
                <span>Nutrients will be saved as an immutable snapshot for {currentDate}.</span>
              </div>

              <div className="pt-3 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-charcoal hover:bg-ivory rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logging}
                  className="px-5 py-2 text-xs font-semibold text-white bg-forest hover:bg-forest-dark rounded-xl shadow-sm transition-all disabled:opacity-70"
                >
                  {logging ? 'Logging...' : 'Add to Diary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
