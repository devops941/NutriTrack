import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Info,
  ChevronRight,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { foodService, FoodItem, Category } from '../../services/foodService';

export const FoodLibraryPage: React.FC = () => {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // New Food Form State
  const [newFood, setNewFood] = useState({
    name: '',
    brand: '',
    barcode: '',
    categorySlug: 'grains',
    energyKcal: 200,
    proteinG: 10,
    carbohydrateG: 25,
    fatG: 5,
    fiberG: 3,
    sodiumMg: 15,
  });

  const fetchFoods = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedCategory !== 'all') params.category = selectedCategory;

      const data = await foodService.getFoods(params);
      if (data && data.foods) {
        setFoods(data.foods);
      }
    } catch (err) {
      console.error('Failed to load foods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    foodService.getCategories().then((cats) => {
      if (cats) setCategories(cats);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFoods();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const handleCreateFood = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await foodService.createFood({
        name: newFood.name,
        brand: newFood.brand || undefined,
        barcode: newFood.barcode || undefined,
        categoryId: newFood.categorySlug,
        basis: { amount: 100, unit: 'g' },
        nutrients: {
          energyKcal: Number(newFood.energyKcal),
          proteinG: Number(newFood.proteinG),
          carbohydrateG: Number(newFood.carbohydrateG),
          fatG: Number(newFood.fatG),
          fiberG: Number(newFood.fiberG),
          sodiumMg: Number(newFood.sodiumMg),
        },
        verificationStatus: 'verified',
      });
      setIsAddModalOpen(false);
      fetchFoods();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create food');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Uploading and parsing CSV...');
    try {
      const res = await foodService.importCSV(file);
      setImportStatus(`Success: ${res.importedCount} items imported, ${res.skippedDuplicates} duplicates skipped.`);
      fetchFoods();
    } catch (err: any) {
      setImportStatus(`Import Error: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 lg:p-8 border border-mutedGrey-border shadow-organic flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-forest bg-forest-50 px-3 py-1 rounded-full border border-sage/40">
            Verified Food Repository
          </span>
          <h1 className="text-2xl lg:text-3xl font-bold font-editorial text-forest mt-2">
            Verified Food Database
          </h1>
          <p className="text-xs text-mutedGrey mt-1 max-w-xl">
            Normalized food items with verified nutrient compositions per 100g/ml basis and custom serving definitions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-forest bg-forest-50 hover:bg-forest-100 rounded-xl transition-colors border border-sage/40"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-forest hover:bg-forest-dark rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Food Record</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Category Filter Ribbon */}
      <div className="bg-white rounded-2xl p-5 border border-mutedGrey-border shadow-organic space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-mutedGrey absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search foods by name, brand, or barcode (e.g. 'Oats', 'Milk', 'Banana')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-ivory/60 rounded-xl border border-mutedGrey-border text-sm text-charcoal focus:outline-none focus:border-forest"
          />
        </div>

        {/* Categories Ribbon */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-forest text-white shadow-sm'
                : 'bg-ivory text-charcoal-light hover:bg-forest-50 border border-mutedGrey-border'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              onClick={() => setSelectedCategory(c.slug)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === c.slug
                  ? 'bg-forest text-white shadow-sm'
                  : 'bg-ivory text-charcoal-light hover:bg-forest-50 border border-mutedGrey-border'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Food Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-sm text-mutedGrey">Loading verified food items...</div>
      ) : foods.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-mutedGrey-border shadow-card">
          <Info className="w-8 h-8 text-mutedGrey mx-auto mb-3" />
          <h3 className="font-editorial text-lg font-bold text-charcoal">No food items found</h3>
          <p className="text-xs text-mutedGrey mt-1">Try adjusting your search terms or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {foods.map((food) => (
            <div
              key={food.id}
              onClick={() => setSelectedFood(food)}
              className="bg-white rounded-2xl p-5 border border-mutedGrey-border shadow-card hover:border-forest/60 hover:shadow-organic transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-forest bg-forest-50 px-2.5 py-0.5 rounded-full border border-sage/30 truncate">
                    {food.categoryName || 'Food Item'}
                  </span>
                  <span className="flex items-center space-x-1 text-[11px] text-emerald-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-charcoal font-editorial group-hover:text-forest transition-colors">
                  {food.name}
                </h3>
                {food.brand && <p className="text-xs text-mutedGrey mt-0.5">{food.brand}</p>}
              </div>

              {/* Nutrients Row */}
              <div className="mt-5 pt-4 border-t border-mutedGrey-border grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-forest-50/50 rounded-lg">
                  <span className="block text-[10px] text-mutedGrey uppercase">Calories</span>
                  <span className="text-xs font-bold text-forest">{food.nutrients.energyKcal ?? 'N/A'}</span>
                </div>
                <div className="p-2 bg-ivory rounded-lg">
                  <span className="block text-[10px] text-mutedGrey uppercase">Protein</span>
                  <span className="text-xs font-bold text-charcoal">{food.nutrients.proteinG ?? 0}g</span>
                </div>
                <div className="p-2 bg-ivory rounded-lg">
                  <span className="block text-[10px] text-mutedGrey uppercase">Carbs</span>
                  <span className="text-xs font-bold text-charcoal">{food.nutrients.carbohydrateG ?? 0}g</span>
                </div>
                <div className="p-2 bg-ivory rounded-lg">
                  <span className="block text-[10px] text-mutedGrey uppercase">Fat</span>
                  <span className="text-xs font-bold text-charcoal">{food.nutrients.fatG ?? 0}g</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Food Detail Modal */}
      {selectedFood && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 lg:p-8 max-w-lg w-full border border-mutedGrey-border shadow-2xl relative animate-scaleIn">
            <button
              onClick={() => setSelectedFood(null)}
              className="absolute top-5 right-5 p-1 rounded-lg text-mutedGrey hover:text-charcoal hover:bg-ivory"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-xs font-semibold text-forest bg-forest-50 px-3 py-1 rounded-full border border-sage/40">
              {selectedFood.categoryName}
            </span>
            <h2 className="text-2xl font-bold font-editorial text-forest mt-3">{selectedFood.name}</h2>
            {selectedFood.brand && <p className="text-xs text-mutedGrey">{selectedFood.brand}</p>}

            <div className="mt-6 space-y-4">
              <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider border-b border-mutedGrey-border pb-1">
                Nutrition Facts (Basis per {selectedFood.basis.amount}{selectedFood.basis.unit})
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-ivory-dark">
                  <span className="text-mutedGrey">Energy</span>
                  <strong className="text-forest font-semibold">{selectedFood.nutrients.energyKcal ?? 'N/A'} kcal</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-ivory-dark">
                  <span className="text-mutedGrey">Protein</span>
                  <strong className="text-charcoal">{selectedFood.nutrients.proteinG ?? 0} g</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-ivory-dark">
                  <span className="text-mutedGrey">Total Carbohydrates</span>
                  <strong className="text-charcoal">{selectedFood.nutrients.carbohydrateG ?? 0} g</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-ivory-dark">
                  <span className="text-mutedGrey">Total Fat</span>
                  <strong className="text-charcoal">{selectedFood.nutrients.fatG ?? 0} g</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-ivory-dark">
                  <span className="text-mutedGrey">Dietary Fiber</span>
                  <strong className="text-charcoal">{selectedFood.nutrients.fiberG ?? 0} g</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-ivory-dark">
                  <span className="text-mutedGrey">Sugars</span>
                  <strong className="text-charcoal">{selectedFood.nutrients.sugarsG ?? 0} g</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-ivory-dark">
                  <span className="text-mutedGrey">Sodium</span>
                  <strong className="text-charcoal">{selectedFood.nutrients.sodiumMg ?? 0} mg</strong>
                </div>
              </div>

              {selectedFood.servings && selectedFood.servings.length > 0 && (
                <div className="mt-4 pt-3 border-t border-mutedGrey-border">
                  <h5 className="text-xs font-semibold text-charcoal mb-2">Supported Serving Equivalents:</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedFood.servings.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 bg-ivory rounded-lg text-xs text-charcoal border border-mutedGrey-border">
                        {s.name} = <strong>{s.grams}g</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-mutedGrey-border text-[11px] text-mutedGrey flex items-center justify-between">
                <span>Source: {selectedFood.source?.name || 'Verified Food Data'}</span>
                {selectedFood.barcode && <span>Barcode: {selectedFood.barcode}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Food Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 lg:p-8 max-w-lg w-full border border-mutedGrey-border shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-mutedGrey hover:text-charcoal"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold font-editorial text-forest mb-4">Add Food Item to Database</h2>

            <form onSubmit={handleCreateFood} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Food Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masala Oats, Apple, Soy Milk"
                  value={newFood.name}
                  onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">Brand Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Quaker, Saffola"
                    value={newFood.brand}
                    onChange={(e) => setNewFood({ ...newFood, brand: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">Category</label>
                  <select
                    value={newFood.categorySlug}
                    onChange={(e) => setNewFood({ ...newFood, categorySlug: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-mutedGrey-border">
                <span className="block text-xs font-semibold text-charcoal mb-2">Nutrients per 100g basis:</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-mutedGrey mb-1">Calories (kcal)</label>
                    <input
                      type="number"
                      required
                      value={newFood.energyKcal}
                      onChange={(e) => setNewFood({ ...newFood, energyKcal: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs bg-ivory rounded-lg border border-mutedGrey-border"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-mutedGrey mb-1">Protein (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newFood.proteinG}
                      onChange={(e) => setNewFood({ ...newFood, proteinG: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs bg-ivory rounded-lg border border-mutedGrey-border"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-mutedGrey mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newFood.carbohydrateG}
                      onChange={(e) => setNewFood({ ...newFood, carbohydrateG: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs bg-ivory rounded-lg border border-mutedGrey-border"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-mutedGrey mb-1">Fat (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newFood.fatG}
                      onChange={(e) => setNewFood({ ...newFood, fatG: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs bg-ivory rounded-lg border border-mutedGrey-border"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-mutedGrey mb-1">Fiber (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newFood.fiberG}
                      onChange={(e) => setNewFood({ ...newFood, fiberG: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs bg-ivory rounded-lg border border-mutedGrey-border"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-mutedGrey mb-1">Sodium (mg)</label>
                    <input
                      type="number"
                      value={newFood.sodiumMg}
                      onChange={(e) => setNewFood({ ...newFood, sodiumMg: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs bg-ivory rounded-lg border border-mutedGrey-border"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-charcoal hover:bg-ivory rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-forest hover:bg-forest-dark rounded-xl shadow-sm"
                >
                  Save Food
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 lg:p-8 max-w-md w-full border border-mutedGrey-border shadow-2xl relative">
            <button
              onClick={() => {
                setIsImportModalOpen(false);
                setImportStatus(null);
              }}
              className="absolute top-5 right-5 p-1 rounded-lg text-mutedGrey hover:text-charcoal"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold font-editorial text-forest mb-2">Import Foods via CSV</h2>
            <p className="text-xs text-mutedGrey mb-4">
              Upload a standard CSV file with headers: <code className="bg-ivory px-1.5 py-0.5 rounded text-charcoal">name, calories, protein, carbs, fat, fiber</code>.
            </p>

            <div className="border-2 border-dashed border-sage rounded-2xl p-6 text-center bg-forest-50/20 hover:bg-forest-50/40 transition-colors">
              <FileSpreadsheet className="w-10 h-10 text-forest mx-auto mb-2" />
              <label className="cursor-pointer block">
                <span className="text-xs font-semibold text-forest underline">Choose a .csv file</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-mutedGrey mt-1 block">UTF-8 formatted CSV files</span>
            </div>

            {importStatus && (
              <div className="mt-4 p-3 bg-ivory rounded-xl text-xs text-charcoal border border-mutedGrey-border">
                {importStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
