import React, { useState, useEffect } from 'react';
import {
  Calculator,
  X,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { nutritionService, CalculationResult } from '../../services/nutritionService';
import { foodService, FoodItem } from '../../services/foodService';

interface NutrientCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFoodId?: string;
}

export const NutrientCalculatorModal: React.FC<NutrientCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialFoodId
}) => {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState<string>(initialFoodId || '');
  const [quantity, setQuantity] = useState<number>(50);
  const [unit, setUnit] = useState<string>('g');
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    foodService.getFoods({ limit: 50 }).then((res) => {
      if (res && res.foods) {
        setFoods(res.foods);
        if (!selectedFoodId && res.foods.length > 0) {
          setSelectedFoodId(res.foods[0].id);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (initialFoodId) {
      setSelectedFoodId(initialFoodId);
    }
  }, [initialFoodId]);

  const selectedFood = foods.find((f) => f.id === selectedFoodId);

  // Available units for the selected food
  const availableUnits = ['g', 'mg', 'kg', ...(selectedFood?.basis.unit === 'ml' ? ['ml', 'L'] : [])];
  if (selectedFood?.servings) {
    selectedFood.servings.forEach((s) => {
      if (!availableUnits.includes(s.name)) availableUnits.push(s.name);
    });
  }

  const performCalculation = async () => {
    if (!selectedFoodId || quantity <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await nutritionService.calculateNutrition(selectedFoodId, quantity, unit);
      setCalculation(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Calculation error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      performCalculation();
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedFoodId, quantity, unit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-xl w-full border border-mutedGrey-border shadow-2xl relative animate-scaleIn space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-xl text-mutedGrey hover:text-charcoal hover:bg-ivory"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <span className="text-[11px] font-semibold text-forest bg-forest-50 px-3 py-1 rounded-full border border-sage/40">
            Deterministic Engine
          </span>
          <h2 className="text-2xl font-bold font-editorial text-forest mt-2 flex items-center space-x-2">
            <Calculator className="w-6 h-6 text-forest" />
            <span>Nutrient Calculation Engine</span>
          </h2>
          <p className="text-xs text-mutedGrey mt-1">
            Deterministic per-100g scaling with strict mass/volume isolation and missing value preservation.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-terracotta/10 border border-terracotta/30 text-terracotta text-xs rounded-xl flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-[11px] font-semibold text-charcoal mb-1 uppercase tracking-wider">
              Food Item
            </label>
            <select
              value={selectedFoodId}
              onChange={(e) => {
                setSelectedFoodId(e.target.value);
                setUnit('g');
              }}
              className="w-full px-3 py-2 text-xs bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none"
            >
              {foods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-charcoal mb-1 uppercase tracking-wider">
              Quantity
            </label>
            <input
              type="number"
              min="0.1"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none font-semibold text-charcoal"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-charcoal mb-1 uppercase tracking-wider">
              Unit / Measure
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none"
            >
              {availableUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Calculation Output Card */}
        {calculation && (
          <div className="p-5 bg-ivory/60 rounded-2xl border border-mutedGrey-border space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-forest flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Calculated for {calculation.normalizedQuantity.amount} {calculation.normalizedQuantity.unit}</span>
              </span>
              <span className="text-[10px] text-mutedGrey">{calculation.calculationMethod}</span>
            </div>

            {/* Primary Macros Display */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 bg-white rounded-xl border border-mutedGrey-border shadow-sm">
                <span className="block text-[10px] text-mutedGrey uppercase">Calories</span>
                <span className="text-lg font-bold font-editorial text-forest">
                  {calculation.nutrients.energyKcal ?? 'N/A'}
                </span>
                <span className="text-[9px] text-mutedGrey block">kcal</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-mutedGrey-border shadow-sm">
                <span className="block text-[10px] text-mutedGrey uppercase">Protein</span>
                <span className="text-lg font-bold font-editorial text-charcoal">
                  {calculation.nutrients.proteinG ?? 0}
                </span>
                <span className="text-[9px] text-mutedGrey block">grams</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-mutedGrey-border shadow-sm">
                <span className="block text-[10px] text-mutedGrey uppercase">Carbs</span>
                <span className="text-lg font-bold font-editorial text-charcoal">
                  {calculation.nutrients.carbohydrateG ?? 0}
                </span>
                <span className="text-[9px] text-mutedGrey block">grams</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-mutedGrey-border shadow-sm">
                <span className="block text-[10px] text-mutedGrey uppercase">Fat</span>
                <span className="text-lg font-bold font-editorial text-charcoal">
                  {calculation.nutrients.fatG ?? 0}
                </span>
                <span className="text-[9px] text-mutedGrey block">grams</span>
              </div>
            </div>

            {/* Micronutrients breakdown */}
            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div className="p-2 bg-white rounded-lg border border-mutedGrey-border text-center">
                <span className="text-[10px] text-mutedGrey block">Dietary Fiber</span>
                <strong className="text-charcoal font-semibold">{calculation.nutrients.fiberG ?? 'Unknown'} g</strong>
              </div>
              <div className="p-2 bg-white rounded-lg border border-mutedGrey-border text-center">
                <span className="text-[10px] text-mutedGrey block">Sugars</span>
                <strong className="text-charcoal font-semibold">{calculation.nutrients.sugarsG ?? 'Unknown'} g</strong>
              </div>
              <div className="p-2 bg-white rounded-lg border border-mutedGrey-border text-center">
                <span className="text-[10px] text-mutedGrey block">Sodium</span>
                <strong className="text-charcoal font-semibold">{calculation.nutrients.sodiumMg ?? 'Unknown'} mg</strong>
              </div>
            </div>

            {/* Data Quality & Warnings Badge */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-mutedGrey">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Completeness: {Math.round(calculation.dataQuality.completenessRatio * 100)}%</span>
              </span>
              <span>{calculation.dataQuality.knownNutrientsCount} fields verified</span>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-forest hover:bg-forest-dark text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
