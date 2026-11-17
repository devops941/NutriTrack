import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Scale, 
  Flame, 
  Dna,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  X,
  BookOpen,
  PenLine,
  Sparkles,
  Utensils
} from 'lucide-react';
import { plannerService, MealPlan, PlannedMeal, PlannedVsActual } from '../../services/plannerService';
import { foodService, FoodItem } from '../../services/foodService';
import { mealService, DailyDiarySummary } from '../../services/mealService';

const ALL_SLOTS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export const MealPlannerPage: React.FC = () => {
  // Current viewed week start (Monday)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  });

  const [weekPlans, setWeekPlans] = useState<MealPlan[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [varianceData, setVarianceData] = useState<PlannedVsActual | null>(null);
  const [dailyDiary, setDailyDiary] = useState<DailyDiarySummary | null>(null);
  const [loggingMealSlot, setLoggingMealSlot] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [varianceLoading, setVarianceLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Food Library states for Dual-Mode Planner Entry
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [entryMode, setEntryMode] = useState<'library' | 'manual'>('library');
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(100);
  const [unit, setUnit] = useState<string>('g');

  // Modal for adding planned meal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [modalDate, setModalDate] = useState<string>('');
  const [mealType, setMealType] = useState<string>('lunch');
  const [mealName, setMealName] = useState<string>('');
  const [foodItemName, setFoodItemName] = useState<string>('');
  const [portionGrams, setPortionGrams] = useState<number>(100);
  const [itemCalories, setItemCalories] = useState<number>(250);
  const [itemProtein, setItemProtein] = useState<number>(20);
  const [itemCarbs, setItemCarbs] = useState<number>(30);
  const [itemFat, setItemFat] = useState<number>(8);
  const [savingMeal, setSavingMeal] = useState<boolean>(false);

  // Compute 7 days of current week
  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const weekStartStr = weekDates[0];
  const weekEndStr = weekDates[6];

  useEffect(() => {
    loadWeekPlans();
  }, [currentWeekStart]);

  useEffect(() => {
    const fetchFoodLibrary = async () => {
      try {
        const res = await foodService.getFoods({ limit: 100 });
        setFoods(res.foods || []);
        if (res.foods && res.foods.length > 0) {
          setSelectedFoodId(res.foods[0].id);
        }
      } catch (err) {
        console.error('Failed to load food library for planner:', err);
      }
    };
    fetchFoodLibrary();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadVariance(selectedDate);
      loadDailyDiary(selectedDate);
    }
  }, [selectedDate, weekPlans]);

  const loadWeekPlans = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const plans = await plannerService.getPlans(weekStartStr, weekEndStr);
      setWeekPlans(plans);
    } catch (err: any) {
      console.error('Failed to load meal plans:', err);
      setErrorMsg('Failed to load weekly meal plans.');
    } finally {
      setLoading(false);
    }
  };

  const loadVariance = async (dateStr: string) => {
    try {
      setVarianceLoading(true);
      const res = await plannerService.getVariance(dateStr);
      setVarianceData(res);
    } catch (err: any) {
      console.error('Failed to load variance:', err);
    } finally {
      setVarianceLoading(false);
    }
  };

  const loadDailyDiary = async (dateStr: string) => {
    try {
      const diary = await mealService.getDailyMeals(dateStr);
      setDailyDiary(diary);
    } catch (err: any) {
      console.error('Failed to load daily diary:', err);
    }
  };

  const isMealConsumed = (m: PlannedMeal): boolean => {
    if (!dailyDiary?.meals) return false;
    const planType = m.mealType.toLowerCase();
    return dailyDiary.meals.some(dm => {
      const diaryType = dm.mealType.toLowerCase();
      return diaryType === planType || (planType === 'snack' && (diaryType === 'morning_snack' || diaryType === 'evening_snack'));
    });
  };

  const handleLogMealAsEaten = async (m: PlannedMeal) => {
    try {
      setLoggingMealSlot(m.mealType);
      await plannerService.logPlannedMealToDiary({
        date: selectedDate,
        mealType: m.mealType,
        name: m.name,
        items: m.items,
        totalNutrients: m.totalNutrients
      });
      await Promise.all([
        loadDailyDiary(selectedDate),
        loadVariance(selectedDate)
      ]);
    } catch (err: any) {
      console.error('Failed to log meal as eaten:', err);
      setErrorMsg('Failed to log planned meal to food diary.');
    } finally {
      setLoggingMealSlot(null);
    }
  };

  const handleDeletePlannedMeal = async (mealIndex: number) => {
    const currentPlan = weekPlans.find(p => p.date === selectedDate);
    if (!currentPlan) return;

    const mealToDelete = currentPlan.meals[mealIndex];
    if (!confirm(`Are you sure you want to remove ${mealToDelete.name || mealToDelete.mealType} from this plan?`)) {
      return;
    }

    try {
      const updatedMeals = currentPlan.meals.filter((_, idx) => idx !== mealIndex);
      await plannerService.savePlan({
        date: selectedDate,
        title: currentPlan.title || `Plan for ${selectedDate}`,
        meals: updatedMeals
      });
      await loadWeekPlans();
      await Promise.all([
        loadVariance(selectedDate),
        loadDailyDiary(selectedDate)
      ]);
    } catch (err) {
      console.error('Failed to delete planned meal:', err);
      setErrorMsg('Failed to remove planned meal slot.');
    }
  };

  const handlePrevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const calculateMacrosForFood = (food: FoodItem, qty: number, u: string) => {
    let factor = 1.0;
    const lower = u.toLowerCase();
    if (lower === 'kg' || lower === 'l') {
      factor = 1000.0;
    } else if (lower === 'mg') {
      factor = 0.001;
    } else if (food.servings) {
      const s = food.servings.find(
        (srv) => srv.name.toLowerCase() === lower || lower.includes(srv.name.toLowerCase())
      );
      if (s) factor = s.grams;
    }

    const totalBasis = Math.max(0, qty) * factor;
    const basisAmt = food.basis?.amount || 100.0;
    const scaling = basisAmt > 0 ? totalBasis / basisAmt : 1.0;

    const kcal = Math.round((food.nutrients.energyKcal || 0) * scaling * 10) / 10;
    const protein = Math.round((food.nutrients.proteinG || 0) * scaling * 10) / 10;
    const carbs = Math.round((food.nutrients.carbohydrateG || 0) * scaling * 10) / 10;
    const fat = Math.round((food.nutrients.fatG || 0) * scaling * 10) / 10;
    const portionInGrams = Math.round(totalBasis * 10) / 10;

    return { kcal, protein, carbs, fat, portionInGrams };
  };

  const applyFoodSelection = (food: FoodItem, qty?: number, u?: string) => {
    setSelectedFoodId(food.id);
    const isLiquid = food.basis?.unit === 'ml';
    const chosenUnit = u !== undefined ? u : (isLiquid ? 'ml' : 'g');
    const chosenQty = qty !== undefined ? qty : (isLiquid ? 200 : 100);

    setUnit(chosenUnit);
    setQuantity(chosenQty);
    setFoodItemName(food.name);

    const macros = calculateMacrosForFood(food, chosenQty, chosenUnit);
    setPortionGrams(macros.portionInGrams);
    setItemCalories(macros.kcal);
    setItemProtein(macros.protein);
    setItemCarbs(macros.carbs);
    setItemFat(macros.fat);
  };

  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    const food = foods.find(f => f.id === selectedFoodId);
    if (food) {
      const macros = calculateMacrosForFood(food, newQty, unit);
      setPortionGrams(macros.portionInGrams);
      setItemCalories(macros.kcal);
      setItemProtein(macros.protein);
      setItemCarbs(macros.carbs);
      setItemFat(macros.fat);
    }
  };

  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit);
    const food = foods.find(f => f.id === selectedFoodId);
    if (food) {
      const macros = calculateMacrosForFood(food, quantity, newUnit);
      setPortionGrams(macros.portionInGrams);
      setItemCalories(macros.kcal);
      setItemProtein(macros.protein);
      setItemCarbs(macros.carbs);
      setItemFat(macros.fat);
    }
  };

  const handleFoodSelectChange = (newFoodId: string) => {
    const food = foods.find(f => f.id === newFoodId);
    if (food) {
      applyFoodSelection(food);
    }
  };

  const getAvailableUnits = (food?: FoodItem) => {
    const isLiquid = food?.basis?.unit === 'ml';
    const list: Array<{ value: string; label: string }> = [];

    if (isLiquid) {
      list.push({ value: 'ml', label: 'ml (Milliliters)' });
      list.push({ value: 'g', label: 'g (Grams)' });
      list.push({ value: 'L', label: 'L (Liters - 1,000 ml)' });
      list.push({ value: 'kg', label: 'kg (Kilograms - 1,000 g)' });
    } else {
      list.push({ value: 'g', label: 'g (Grams)' });
      list.push({ value: 'kg', label: 'kg (Kilograms - 1,000 g)' });
      list.push({ value: 'ml', label: 'ml (Milliliters)' });
      list.push({ value: 'L', label: 'L (Liters - 1,000 ml)' });
    }

    if (food?.servings) {
      food.servings.forEach((s) => {
        list.push({
          value: s.name,
          label: `${s.name} (${s.grams}${isLiquid ? 'ml' : 'g'})`
        });
      });
    }

    return list;
  };

  const handleOpenAddModal = (dateStr: string) => {
    setModalDate(dateStr);
    setMealName('');
    const existingPlan = weekPlans.find(p => p.date === dateStr);
    const plannedSlotTypes = new Set(existingPlan?.meals.map(m => m.mealType.toLowerCase()) || []);
    const availableSlots = ALL_SLOTS.filter(s => !plannedSlotTypes.has(s.value));
    if (availableSlots.length > 0) {
      setMealType(availableSlots[0].value);
    }
    setShowAddModal(true);
    if (foods.length > 0) {
      setEntryMode('library');
      const food = (selectedFoodId ? foods.find(f => f.id === selectedFoodId) : null) || foods[0];
      applyFoodSelection(food);
    } else {
      setEntryMode('manual');
      setFoodItemName('');
      setPortionGrams(100);
      setItemCalories(250);
      setItemProtein(20);
      setItemCarbs(30);
      setItemFat(8);
    }
  };

  const handleSavePlannedMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodItemName.trim()) return;

    try {
      setSavingMeal(true);
      // Find existing day plan or prepare new
      const existingPlan = weekPlans.find(p => p.date === modalDate);
      const plannedSlotTypes = new Set(existingPlan?.meals.map(m => m.mealType.toLowerCase()) || []);
      const availableSlots = ALL_SLOTS.filter(s => !plannedSlotTypes.has(s.value));
      const targetSlot = availableSlots.some(s => s.value === mealType) ? mealType : (availableSlots[0]?.value || mealType);

      const newMeal: PlannedMeal = {
        mealType: targetSlot,
        name: mealName.trim() || `${targetSlot.charAt(0).toUpperCase() + targetSlot.slice(1)} Entry`,
        items: [
          {
            name: foodItemName.trim(),
            portionGrams,
            nutrients: {
              energyKcal: itemCalories,
              proteinG: itemProtein,
              carbohydrateG: itemCarbs,
              fatG: itemFat
            }
          }
        ],
        totalNutrients: {
          energyKcal: itemCalories,
          proteinG: itemProtein,
          carbohydrateG: itemCarbs,
          fatG: itemFat
        }
      };

      const existingMeals = existingPlan ? [...existingPlan.meals] : [];
      existingMeals.push(newMeal);

      await plannerService.savePlan({
        date: modalDate,
        title: existingPlan?.title || `Plan for ${modalDate}`,
        meals: existingMeals
      });

      setShowAddModal(false);
      await loadWeekPlans();
      if (modalDate === selectedDate) {
        await loadVariance(modalDate);
      }
    } catch (err: any) {
      setErrorMsg('Failed to save planned meal.');
    } finally {
      setSavingMeal(false);
    }
  };

  const selectedDayPlan = weekPlans.find(p => p.date === selectedDate);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-forest-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-forest-700" />
            <h1 className="text-2xl font-bold text-charcoal">Smart Meal Planner & Variance Tracker</h1>
          </div>
          <p className="text-sm text-muted-grey mt-1">
            Plan daily prospective meals, predict nutrient intake, and compare planned vs actual consumption.
          </p>
        </div>

        {/* Week navigation buttons */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-forest-200 shadow-sm text-xs font-semibold text-charcoal">
          <button
            onClick={handlePrevWeek}
            className="p-1 hover:bg-forest-50 rounded-lg text-muted-grey hover:text-charcoal transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs">
            {weekStartStr} to {weekEndStr}
          </span>
          <button
            onClick={handleNextWeek}
            className="p-1 hover:bg-forest-50 rounded-lg text-muted-grey hover:text-charcoal transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-terracotta/10 border border-terracotta/20 rounded-xl flex items-center gap-3 text-terracotta text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 7-Day Weekly Calendar Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {weekDates.map((dStr, idx) => {
          const plan = weekPlans.find(p => p.date === dStr);
          const isSelected = selectedDate === dStr;
          const isToday = dStr === new Date().toISOString().split('T')[0];
          const mealCount = plan?.meals?.length || 0;
          const calTotal = plan?.plannedDailyTotals?.energyKcal || 0;
          const protTotal = plan?.plannedDailyTotals?.proteinG || 0;

          return (
            <div
              key={dStr}
              onClick={() => setSelectedDate(dStr)}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between min-h-[140px] ${
                isSelected
                  ? 'border-forest-700 bg-forest-50/70 shadow-sm'
                  : 'border-forest-100 hover:border-forest-200 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-grey uppercase">
                    {dayNames[idx]}
                  </span>
                  {isToday && (
                    <span className="text-[10px] bg-forest-700 text-white px-1.5 py-0.2 rounded font-semibold">
                      Today
                    </span>
                  )}
                </div>
                <div className="text-sm font-black text-charcoal font-mono mt-0.5">
                  {dStr.slice(5)}
                </div>

                <div className="mt-2 text-xs">
                  {mealCount > 0 ? (
                    <div className="space-y-0.5 font-mono">
                      <div className="text-forest-900 font-bold">{calTotal} kcal</div>
                      <div className="text-[11px] text-muted-grey">{protTotal}g protein</div>
                      <div className="text-[10px] text-forest-700 font-medium pt-0.5">{mealCount} meal(s)</div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-grey italic">No plan set</span>
                  )}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAddModal(dStr);
                }}
                className="mt-2 flex items-center justify-center gap-1 w-full py-1 text-[11px] font-semibold text-forest-800 bg-forest-100/70 hover:bg-forest-200 rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Meal
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected Day View: Meals & Variance Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Planned Meals for Selected Date (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-forest-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-forest-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-charcoal">
                Planned Meals for {selectedDate}
              </h2>
              <p className="text-xs text-muted-grey mt-0.5">
                {selectedDayPlan?.title || 'Scheduled nutrition for this date'}
              </p>
            </div>
            <button
              onClick={() => handleOpenAddModal(selectedDate)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-forest-700 hover:bg-forest-800 rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Planned Food
            </button>
          </div>

          {selectedDayPlan && selectedDayPlan.meals.length > 0 ? (
            <div className="space-y-3">
              {selectedDayPlan.meals.map((m, idx) => {
                const consumed = isMealConsumed(m);
                return (
                  <div key={idx} className="p-4 rounded-xl bg-ivory-warm/60 border border-forest-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase px-2 py-0.5 bg-forest-100 text-forest-800 rounded-md">
                          {m.mealType}
                        </span>
                        <span className="font-semibold text-xs text-charcoal">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-forest-900">
                          {m.totalNutrients?.energyKcal || 0} kcal
                        </span>
                        <button
                          onClick={() => handleDeletePlannedMeal(idx)}
                          className="p-1 text-muted-grey hover:text-terracotta hover:bg-terracotta/10 rounded-lg transition-colors ml-1"
                          title="Remove planned meal slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {m.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center justify-between text-xs text-muted-grey pl-2 border-l-2 border-forest-200">
                        <span>{item.name} ({item.portionGrams}g)</span>
                        <span className="font-mono text-[11px]">
                          P: {item.nutrients?.proteinG || 0}g | C: {item.nutrients?.carbohydrateG || 0}g | F: {item.nutrients?.fatG || 0}g
                        </span>
                      </div>
                    ))}

                    {/* "I Ate This" / Consumed Status Button */}
                    <div className="pt-2 border-t border-forest-100 flex flex-wrap items-center justify-between gap-2">
                      {consumed ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Logged as Eaten (Consumed)</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleLogMealAsEaten(m)}
                          disabled={loggingMealSlot === m.mealType}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-forest hover:bg-forest-dark active:scale-[0.98] shadow-sm transition-all disabled:opacity-60"
                        >
                          {loggingMealSlot === m.mealType ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Logging to Diary...</span>
                            </>
                          ) : (
                            <>
                              <Utensils className="w-3.5 h-3.5" />
                              <span>I Ate This (Log to Diary)</span>
                            </>
                          )}
                        </button>
                      )}
                      <span className="text-[10px] text-muted-grey italic">
                        {consumed ? 'Synced with Food Diary' : 'Click to log directly into your food diary'}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="p-3 bg-forest-50/70 rounded-xl border border-forest-100 flex items-center justify-between text-xs">
                <span className="font-bold text-forest-900">Planned Daily Total:</span>
                <span className="font-mono font-bold text-forest-900">
                  {selectedDayPlan.plannedDailyTotals?.energyKcal || 0} kcal &nbsp;|&nbsp; 
                  {selectedDayPlan.plannedDailyTotals?.proteinG || 0}g protein
                </span>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-muted-grey text-xs space-y-2">
              <CalendarDays className="w-8 h-8 text-forest-300 mx-auto" />
              <p>No meals planned for {selectedDate}.</p>
              <button
                onClick={() => handleOpenAddModal(selectedDate)}
                className="text-forest-700 font-semibold hover:underline"
              >
                + Plan a prospective meal now
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Planned vs Actual Variance Card (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-forest-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-forest-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-charcoal flex items-center gap-2">
                <Scale className="w-4 h-4 text-forest-700" />
                Planned vs Actual Variance
              </h2>
              <span className="text-[11px] font-mono text-muted-grey">{selectedDate}</span>
            </div>

            {varianceLoading ? (
              <div className="py-10 flex flex-col items-center justify-center text-forest-700 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mb-2" />
                <span>Evaluating diary adherence...</span>
              </div>
            ) : varianceData ? (
              <div className="space-y-4">
                <div className="p-3 bg-forest-50/60 rounded-xl border border-forest-100 text-xs leading-relaxed text-charcoal/80">
                  <p className="font-medium">{varianceData.observation}</p>
                </div>

                {/* Variance Items List */}
                <div className="space-y-3">
                  {varianceData.items.slice(0, 4).map((item) => {
                    const isOver = item.variance > 0;
                    const isUnder = item.variance < 0;
                    const isOnTarget = item.status === 'on_target';

                    return (
                      <div key={item.nutrient} className="p-3 rounded-xl bg-ivory-warm/60 border border-forest-100 space-y-1 text-xs">
                        <div className="flex items-center justify-between font-semibold text-charcoal">
                          <span>{item.nutrient.replace('G', ' (g)').replace('Kcal', ' (kcal)')}</span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                            isOnTarget 
                              ? 'bg-forest-100 text-forest-800' 
                              : isOver ? 'bg-terracotta/10 text-terracotta' : 'bg-sage-200 text-forest-900'
                          }`}>
                            {isOnTarget ? 'On Target' : isOver ? 'Over Plan' : 'Under Plan'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between font-mono text-[11px] text-muted-grey pt-1">
                          <span>Plan: <b className="text-charcoal">{item.planned}</b></span>
                          <span>Actual: <b className="text-charcoal">{item.actual}</b></span>
                          <span className={`font-bold ${isOver ? 'text-terracotta' : isUnder ? 'text-forest-700' : 'text-muted-grey'}`}>
                            {item.variance > 0 ? `+${item.variance}` : item.variance} ({item.variancePercentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 pt-3 border-t border-forest-50 text-[11px] text-muted-grey">
            * Compares planned meals against actual entries logged in your Food Diary timeline for this date.
          </div>
        </div>
      </div>

      {/* Modal: Add Planned Meal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-forest-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-forest-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-charcoal">
                  Add Planned Meal
                </h3>
                <p className="text-xs text-muted-grey mt-0.5">Date: {modalDate}</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-grey hover:text-charcoal p-1 rounded-lg hover:bg-forest-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex rounded-xl p-1 bg-ivory-warm border border-forest-200">
              <button
                type="button"
                onClick={() => {
                  setEntryMode('library');
                  const food = foods.find(f => f.id === selectedFoodId) || foods[0];
                  if (food) applyFoodSelection(food);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  entryMode === 'library'
                    ? 'bg-forest text-white shadow-sm'
                    : 'text-charcoal hover:bg-white/60'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Select from Food Library
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('manual')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  entryMode === 'manual'
                    ? 'bg-forest text-white shadow-sm'
                    : 'text-charcoal hover:bg-white/60'
                }`}
              >
                <PenLine className="w-3.5 h-3.5" />
                Manual Custom Entry
              </button>
            </div>

            {(() => {
              const existingPlan = weekPlans.find(p => p.date === modalDate);
              const plannedSlotTypes = new Set(existingPlan?.meals.map(m => m.mealType.toLowerCase()) || []);
              const availableSlots = ALL_SLOTS.filter(s => !plannedSlotTypes.has(s.value));
              const allSlotsPlanned = availableSlots.length === 0;
              const effectiveMealType = availableSlots.some(s => s.value === mealType)
                ? mealType
                : (availableSlots[0]?.value || 'lunch');

              return (
                <>
                  {allSlotsPlanned && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-bold">All 4 meal slots (Breakfast, Lunch, Dinner, Snack) have already been planned for this day.</p>
                        <p className="mt-0.5 text-[11px] text-amber-700">To plan a different meal, remove an existing meal slot using the trash button on its card first.</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSavePlannedMeal} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-charcoal mb-1">Meal Slot</label>
                        {allSlotsPlanned ? (
                          <div className="w-full px-3 py-2 bg-ivory-warm border border-forest-200 rounded-xl text-muted-grey text-xs italic">
                            All slots planned
                          </div>
                        ) : (
                          <select
                            value={effectiveMealType}
                            onChange={(e) => setMealType(e.target.value)}
                            className="w-full px-3 py-2 bg-ivory-warm border border-forest-200 rounded-xl focus:outline-none font-medium capitalize"
                          >
                            {availableSlots.map((slot) => (
                              <option key={slot.value} value={slot.value}>
                                {slot.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="block font-semibold text-charcoal mb-1">Meal Title (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Post-Workout Lunch"
                          value={mealName}
                          onChange={(e) => setMealName(e.target.value)}
                          className="w-full px-3 py-2 bg-ivory-warm border border-forest-200 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>

              {entryMode === 'library' ? (
                /* Mode A: Food Library Selection */
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-charcoal mb-1">Select Food Item</label>
                    <select
                      value={selectedFoodId}
                      onChange={(e) => handleFoodSelectChange(e.target.value)}
                      className="w-full px-3 py-2 bg-ivory-warm border border-forest-200 rounded-xl focus:outline-none font-medium text-xs text-charcoal"
                    >
                      {foods.map((food) => (
                        <option key={food.id} value={food.id}>
                          {food.name} {food.brand ? `(${food.brand})` : ''} - {food.nutrients.energyKcal} kcal / {food.basis.amount}{food.basis.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-charcoal mb-1">Portion / Quantity</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-ivory-warm border border-forest-200 rounded-xl font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-charcoal mb-1">Measurement Unit</label>
                      <select
                        value={unit}
                        onChange={(e) => handleUnitChange(e.target.value)}
                        className="w-full px-3 py-2 bg-ivory-warm border border-forest-200 rounded-xl font-medium text-xs focus:outline-none"
                      >
                        {getAvailableUnits(foods.find(f => f.id === selectedFoodId)).map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Calculated Nutrients Live Preview Card */}
                  <div className="bg-forest-50/60 border border-forest-100 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-forest-800">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-forest" />
                        Calculated Nutritional Content
                      </span>
                      <span className="font-mono text-xs bg-white px-2 py-0.5 rounded-md border border-forest-200">
                        {portionGrams} g portion
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                      <div className="bg-white p-2 rounded-lg border border-forest-100 shadow-2xs">
                        <span className="block text-[10px] text-muted-grey uppercase tracking-wider font-semibold">Calories</span>
                        <span className="text-sm font-bold text-charcoal font-mono">{itemCalories}</span>
                        <span className="text-[10px] text-muted-grey ml-0.5">kcal</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-forest-100 shadow-2xs">
                        <span className="block text-[10px] text-muted-grey uppercase tracking-wider font-semibold">Protein</span>
                        <span className="text-sm font-bold text-forest font-mono">{itemProtein}</span>
                        <span className="text-[10px] text-muted-grey ml-0.5">g</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-forest-100 shadow-2xs">
                        <span className="block text-[10px] text-muted-grey uppercase tracking-wider font-semibold">Carbs</span>
                        <span className="text-sm font-bold text-amber-600 font-mono">{itemCarbs}</span>
                        <span className="text-[10px] text-muted-grey ml-0.5">g</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-forest-100 shadow-2xs">
                        <span className="block text-[10px] text-muted-grey uppercase tracking-wider font-semibold">Fat</span>
                        <span className="text-sm font-bold text-terracotta font-mono">{itemFat}</span>
                        <span className="text-[10px] text-muted-grey ml-0.5">g</span>
                      </div>
                    </div>

                    {itemCalories > 3000 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>High caloric portion ({itemCalories} kcal). Please double check your portion and unit!</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Mode B: Manual Entry */
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-charcoal mb-1">Food Item Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grilled Chicken & Quinoa"
                      value={foodItemName}
                      onChange={(e) => setFoodItemName(e.target.value)}
                      className="w-full px-3 py-2 bg-ivory-warm border border-forest-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-charcoal mb-1">Portion (g)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={portionGrams}
                        onChange={(e) => setPortionGrams(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-ivory-warm border border-forest-200 rounded-xl font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-charcoal mb-1">Calories (kcal)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={itemCalories}
                        onChange={(e) => setItemCalories(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-ivory-warm border border-forest-200 rounded-xl font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-muted-grey mb-1">Protein (g)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={itemProtein}
                        onChange={(e) => setItemProtein(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-2 bg-ivory-warm border border-forest-200 rounded-xl font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-muted-grey mb-1">Carbs (g)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={itemCarbs}
                        onChange={(e) => setItemCarbs(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-2 bg-ivory-warm border border-forest-200 rounded-xl font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-muted-grey mb-1">Fat (g)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={itemFat}
                        onChange={(e) => setItemFat(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-2 bg-ivory-warm border border-forest-200 rounded-xl font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-forest-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-muted-grey hover:text-charcoal transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMeal || allSlotsPlanned || !foodItemName.trim()}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-forest hover:bg-forest-dark active:scale-[0.98] disabled:opacity-50 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {savingMeal ? 'Saving...' : 'Add to Day Plan'}
                </button>
              </div>
            </form>
          </>
        );
      })()}
          </div>
        </div>
      )}
    </div>
  );
};
