import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Trash2, 
  ArrowRightLeft, 
  Search, 
  AlertCircle, 
  RefreshCw, 
  HelpCircle,
  Sparkles,
  X
} from 'lucide-react';
import { foodService, FoodItem } from '../../services/foodService';
import { comparisonService, ProductComparisonResponse } from '../../services/comparisonService';

export const ProductComparisonPage: React.FC = () => {
  const [availableFoods, setAvailableFoods] = useState<FoodItem[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<FoodItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [normalizeBasis, setNormalizeBasis] = useState<'per_100g' | 'per_100ml' | 'serving'>('per_100g');
  
  const [comparisonResult, setComparisonResult] = useState<ProductComparisonResponse | null>(null);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadFoodCatalog();
  }, []);

  const runComparisonForItems = async (foods: FoodItem[], basis: 'per_100g' | 'per_100ml' | 'serving') => {
    if (foods.length < 2) return;
    try {
      setComparing(true);
      setErrorMsg(null);
      const foodIds = foods.map(f => f.id);
      const result = await comparisonService.compareFoods(foodIds, basis);
      setComparisonResult(result);
    } catch (err: any) {
      console.error('Comparison execution failed:', err);
      setErrorMsg(err.response?.data?.detail || err.response?.data?.message || 'Failed to compare food products.');
    } finally {
      setComparing(false);
    }
  };

  const loadFoodCatalog = async () => {
    try {
      setLoadingFoods(true);
      const res = await foodService.listFoods({ page: 1, limit: 100 });
      const foods = res.items || res.foods || [];
      setAvailableFoods(foods);

      // Auto-select first two foods if available for instant live matrix
      if (foods.length >= 2 && selectedFoods.length === 0) {
        const initialTwo = [foods[0], foods[1]];
        setSelectedFoods(initialTwo);
        runComparisonForItems(initialTwo, normalizeBasis);
      }
    } catch (err) {
      console.error('Failed to load foods catalog:', err);
    } finally {
      setLoadingFoods(false);
    }
  };

  const handleAddFood = (food: FoodItem) => {
    if (selectedFoods.some(f => f.id === food.id)) return;
    if (selectedFoods.length >= 4) {
      setErrorMsg('You can compare a maximum of 4 food products at a time.');
      return;
    }
    setErrorMsg(null);
    const updated = [...selectedFoods, food];
    setSelectedFoods(updated);
    if (updated.length >= 2) {
      runComparisonForItems(updated, normalizeBasis);
    }
  };

  const handleRemoveFood = (foodId: string) => {
    const updated = selectedFoods.filter(f => f.id !== foodId);
    setSelectedFoods(updated);
    if (updated.length >= 2) {
      runComparisonForItems(updated, normalizeBasis);
    } else {
      setComparisonResult(null);
    }
  };

  const handleClearAll = () => {
    setSelectedFoods([]);
    setComparisonResult(null);
    setErrorMsg(null);
  };

  const handleRunComparison = () => {
    if (selectedFoods.length < 2) {
      setErrorMsg('Select at least 2 foods to compare.');
      return;
    }
    runComparisonForItems(selectedFoods, normalizeBasis);
  };

  // Re-run comparison when normalizeBasis changes
  useEffect(() => {
    if (selectedFoods.length >= 2) {
      runComparisonForItems(selectedFoods, normalizeBasis);
    }
  }, [normalizeBasis]);

  // Quick preset comparisons
  const handleApplyPreset = (query1: string, query2: string) => {
    if (availableFoods.length < 2) return;
    const findFood = (q: string) => 
      availableFoods.find(f => f.name.toLowerCase().includes(q.toLowerCase())) ||
      availableFoods.find(f => f.categoryName?.toLowerCase().includes(q.toLowerCase()));

    const food1 = findFood(query1) || availableFoods[0];
    const food2 = findFood(query2) || (availableFoods[1] !== food1 ? availableFoods[1] : availableFoods[2] || availableFoods[0]);

    if (food1 && food2 && food1.id !== food2.id) {
      const pair = [food1, food2];
      setSelectedFoods(pair);
      runComparisonForItems(pair, normalizeBasis);
    }
  };

  const nutrientMetadata: Record<string, { label: string; unit: string; lowerIsBetter?: boolean }> = {
    energyKcal: { label: 'Energy', unit: 'kcal' },
    proteinG: { label: 'Protein', unit: 'g', lowerIsBetter: false },
    carbohydrateG: { label: 'Carbohydrates', unit: 'g' },
    fatG: { label: 'Total Fat', unit: 'g', lowerIsBetter: true },
    saturatedFatG: { label: 'Saturated Fat', unit: 'g', lowerIsBetter: true },
    fiberG: { label: 'Dietary Fiber', unit: 'g', lowerIsBetter: false },
    sugarsG: { label: 'Sugars', unit: 'g', lowerIsBetter: true },
    sodiumMg: { label: 'Sodium', unit: 'mg', lowerIsBetter: true },
    calciumMg: { label: 'Calcium', unit: 'mg', lowerIsBetter: false },
    ironMg: { label: 'Iron', unit: 'mg', lowerIsBetter: false },
    vitaminCMg: { label: 'Vitamin C', unit: 'mg', lowerIsBetter: false }
  };

  const filteredFoods = availableFoods.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedFoods.some(sf => sf.id === f.id)
  );

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-forest-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-7 h-7 text-forest-700" />
            <h1 className="text-2xl font-bold text-charcoal">Food Product Comparison Matrix</h1>
          </div>
          <p className="text-sm text-muted-grey mt-1">
            Compare 2 to 4 food products side-by-side with metric normalization and explicit missing data indicators.
          </p>
        </div>

        {/* Normalization Basis Toggle */}
        <div className="flex items-center bg-forest-50 p-1 rounded-xl border border-forest-200/60 text-xs font-semibold text-charcoal shadow-2xs">
          <button
            onClick={() => setNormalizeBasis('per_100g')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              normalizeBasis === 'per_100g' 
                ? 'bg-forest text-white font-bold shadow-sm' 
                : 'text-charcoal hover:bg-white/60 font-medium'
            }`}
            style={normalizeBasis === 'per_100g' ? { backgroundColor: '#1B3A2C', color: '#ffffff' } : undefined}
          >
            Per 100g
          </button>
          <button
            onClick={() => setNormalizeBasis('per_100ml')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              normalizeBasis === 'per_100ml' 
                ? 'bg-forest text-white font-bold shadow-sm' 
                : 'text-charcoal hover:bg-white/60 font-medium'
            }`}
            style={normalizeBasis === 'per_100ml' ? { backgroundColor: '#1B3A2C', color: '#ffffff' } : undefined}
          >
            Per 100ml
          </button>
          <button
            onClick={() => setNormalizeBasis('serving')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              normalizeBasis === 'serving' 
                ? 'bg-forest text-white font-bold shadow-sm' 
                : 'text-charcoal hover:bg-white/60 font-medium'
            }`}
            style={normalizeBasis === 'serving' ? { backgroundColor: '#1B3A2C', color: '#ffffff' } : undefined}
          >
            Per Serving
          </button>
        </div>
      </div>

      {/* Preset Demo Comparison Bar */}
      <div className="bg-forest-50/60 rounded-xl p-3 border border-forest-100 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-forest-900 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-forest-700" />
          Quick Demo Comparisons:
        </span>
        <button
          onClick={() => handleApplyPreset('oat', 'rice')}
          className="px-2.5 py-1 bg-white hover:bg-forest-100 text-forest-800 font-medium rounded-lg border border-forest-200/60 transition-colors shadow-2xs"
        >
          Oats vs Rice
        </button>
        <button
          onClick={() => handleApplyPreset('egg', 'paneer')}
          className="px-2.5 py-1 bg-white hover:bg-forest-100 text-forest-800 font-medium rounded-lg border border-forest-200/60 transition-colors shadow-2xs"
        >
          Eggs vs Paneer
        </button>
        <button
          onClick={() => handleApplyPreset('milk', 'yogurt')}
          className="px-2.5 py-1 bg-white hover:bg-forest-100 text-forest-800 font-medium rounded-lg border border-forest-200/60 transition-colors shadow-2xs"
        >
          Milk vs Yogurt
        </button>
        <button
          onClick={() => handleApplyPreset('chocolate', 'snack')}
          className="px-2.5 py-1 bg-white hover:bg-forest-100 text-forest-800 font-medium rounded-lg border border-forest-200/60 transition-colors shadow-2xs"
        >
          Chocolate vs Snacks
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-terracotta/10 border border-terracotta/20 rounded-xl flex items-center gap-3 text-terracotta text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Food Selection Bar */}
      <div className="bg-white rounded-2xl border border-forest-100 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-charcoal">Selected Foods for Comparison</span>
            <span className="text-xs bg-forest-100 text-forest-800 px-2 py-0.5 rounded-full font-bold">
              {selectedFoods.length}/4
            </span>
            {selectedFoods.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-muted-grey hover:text-terracotta transition-colors ml-2"
              >
                Clear all
              </button>
            )}
          </div>

          <button
            onClick={handleRunComparison}
            disabled={selectedFoods.length < 2 || comparing}
            className="flex items-center gap-2 px-5 py-2 bg-forest-700 hover:bg-forest-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            {comparing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="w-4 h-4" />
            )}
            Run Side-by-Side Comparison
          </button>
        </div>

        {/* Selected food pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {selectedFoods.map((food, idx) => (
            <div
              key={food.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-forest-50 border border-forest-200 rounded-xl text-xs font-semibold text-charcoal"
            >
              <span className="w-4 h-4 rounded-full bg-forest-700 text-white text-[10px] flex items-center justify-center font-bold">
                {idx + 1}
              </span>
              <span>{food.name}</span>
              {idx === 0 && (
                <span className="text-[10px] bg-forest-200/70 text-forest-900 px-1.5 py-0.2 rounded font-mono">
                  Base
                </span>
              )}
              <button
                onClick={() => handleRemoveFood(food.id)}
                className="text-muted-grey hover:text-terracotta transition-colors ml-1"
                title="Remove product"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {selectedFoods.length < 4 && (
            <div className="relative flex-1 min-w-[240px]">
              <div className="flex items-center bg-ivory-warm rounded-xl border border-forest-200 px-3 py-1.5 focus-within:ring-1 focus-within:ring-forest-600 focus-within:border-forest-600">
                <Search className="w-3.5 h-3.5 text-muted-grey mr-2" />
                <input
                  type="text"
                  placeholder="Type food name to add..."
                  value={searchTerm}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent text-xs text-charcoal placeholder-muted-grey focus:outline-none w-full font-medium"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-muted-grey hover:text-charcoal">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Autocomplete dropdown */}
              {(searchTerm.trim().length > 0 || (searchFocused && selectedFoods.length === 0)) && (
                <div 
                  className="absolute z-20 left-0 right-0 mt-1 bg-white border border-forest-200 rounded-xl shadow-lg max-h-56 overflow-y-auto"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {filteredFoods.length > 0 ? (
                    filteredFoods.slice(0, 8).map(f => (
                      <div
                        key={f.id}
                        onClick={() => {
                          handleAddFood(f);
                          setSearchTerm('');
                          setSearchFocused(false);
                        }}
                        className="p-2.5 hover:bg-forest-50 cursor-pointer border-b border-forest-50 last:border-0 flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <span className="font-semibold text-charcoal block">{f.name}</span>
                          {f.brand && <span className="text-[10px] text-muted-grey">{f.brand}</span>}
                        </div>
                        <span className="text-forest-800 text-[11px] font-medium bg-forest-50 px-2 py-0.5 rounded-full">
                          {f.nutrients.energyKcal ? `${f.nutrients.energyKcal} kcal` : f.categoryName || 'Food'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-muted-grey text-center">
                      {loadingFoods ? 'Loading food library...' : 'No matching food found'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Matrix Table */}
      {comparisonResult ? (
        <div className="bg-white rounded-2xl border border-forest-100 shadow-sm overflow-hidden space-y-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              {/* Product Header Row */}
              <thead>
                <tr className="bg-forest-50/70 border-b border-forest-100">
                  <th className="p-4 w-1/4 text-xs font-bold text-muted-grey uppercase tracking-wider">
                    Nutrient (Basis: {comparisonResult.normalizeBasis})
                  </th>
                  {comparisonResult.products.map((p, idx) => (
                    <th key={p.id} className="p-4 text-left border-l border-forest-100">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-forest-700 text-white text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-sm text-charcoal line-clamp-1">{p.name}</span>
                        </div>
                        {p.brand && <p className="text-[11px] text-muted-grey">{p.brand}</p>}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-forest-100 text-forest-800 font-medium">
                            {p.completenessScore}% complete
                          </span>
                          {idx === 0 && (
                            <span className="text-[10px] bg-forest-200/80 text-forest-900 px-2 py-0.5 rounded-full font-semibold">
                              Baseline
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Nutrient Rows */}
              <tbody className="divide-y divide-forest-50 text-xs">
                {comparisonResult.trackedNutrients.map((nutKey) => {
                  const meta = nutrientMetadata[nutKey] || { label: nutKey, unit: '' };

                  return (
                    <tr key={nutKey} className="hover:bg-ivory-warm/40 transition-colors">
                      {/* Nutrient Label Column */}
                      <td className="p-4 font-semibold text-charcoal">
                        {meta.label} <span className="text-muted-grey font-normal text-[11px]">({meta.unit})</span>
                      </td>

                      {/* Product Value Columns */}
                      {comparisonResult.products.map((p, pIdx) => {
                        const val = comparisonResult.matrix[nutKey]?.[pIdx];
                        const delta = pIdx > 0 ? comparisonResult.deltasVsFirst[nutKey]?.[pIdx - 1] : null;

                        return (
                          <td key={p.id} className="p-4 border-l border-forest-50 align-top">
                            {val !== null && val !== undefined ? (
                              <div className="space-y-1">
                                <span className="text-sm font-bold text-charcoal font-mono">
                                  {val} {meta.unit}
                                </span>

                                {/* Delta vs Baseline chip for products 2, 3, 4 */}
                                {pIdx > 0 && delta !== null && delta !== undefined && (
                                  <div className="flex items-center gap-1">
                                    {delta === 0 ? (
                                      <span className="text-[10px] font-mono text-muted-grey bg-forest-50 px-1.5 py-0.2 rounded">
                                        Identical
                                      </span>
                                    ) : (
                                      <span
                                        className={`inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                                          delta > 0 
                                            ? meta.lowerIsBetter ? 'bg-terracotta/10 text-terracotta' : 'bg-forest-100 text-forest-800'
                                            : meta.lowerIsBetter ? 'bg-forest-100 text-forest-800' : 'bg-terracotta/10 text-terracotta'
                                        }`}
                                      >
                                        {delta > 0 ? `+${delta}` : delta} {meta.unit}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {pIdx > 0 && delta === null && (
                                  <div className="text-[10px] text-muted-grey italic">
                                    Base value missing
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Explicit highlight for missing fields without assuming 0!
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted-grey/10 text-muted-grey text-[10px] font-medium">
                                <HelpCircle className="w-3 h-3" />
                                Data Not Available
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Missing Data Highlight Note */}
          <div className="p-4 bg-forest-50/40 border-t border-forest-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-grey">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-forest-700" />
              Nutrient deltas are computed relative to Product 1 ({comparisonResult.products[0]?.name}).
            </span>
            <span className="italic">
              * "Data Not Available" fields are kept indeterminate to prevent misleading zero calculations.
            </span>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-forest-100 shadow-sm space-y-3">
          <Scale className="w-10 h-10 text-forest-400 mx-auto" />
          <h3 className="text-base font-bold text-charcoal">Ready to Compare Food Products</h3>
          <p className="text-xs text-muted-grey max-w-md mx-auto">
            Select 2 to 4 products above or click any of the Quick Demo Comparisons to analyze nutrient differences, calories, and completeness.
          </p>
        </div>
      )}
    </div>
  );
};
