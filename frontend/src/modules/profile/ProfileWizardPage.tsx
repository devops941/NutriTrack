import React, { useState, useEffect } from 'react';
import {
  User,
  Activity,
  Heart,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Scale,
  Ruler,
  Target
} from 'lucide-react';
import {
  profileService,
  ProfileData,
  DietaryOption,
  DIETARY_OPTIONS,
  COMMON_ALLERGENS,
  isDietaryOptionActive,
  isAllergenActive
} from '../../services/profileService';

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little to no daily exercise' },
  { id: 'lightly_active', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
  { id: 'moderately_active', label: 'Moderately Active', desc: 'Moderate workout 3-5 days/week' },
  { id: 'very_active', label: 'Very Active', desc: 'Hard exercise 6-7 days/week' }
];

export const ProfileWizardPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState<ProfileData>({
    displayName: '',
    gender: '',
    heightCm: undefined,
    weightKg: undefined,
    activityLevel: 'sedentary',
    dietaryPreferences: [],
    allergies: [],
    excludedIngredients: [],
    preferredUnits: 'metric',
    dailyCalorieGoal: undefined
  });

  useEffect(() => {
    profileService
      .getProfile()
      .then((data) => {
        if (data) {
          setFormData((prev) => ({
            ...prev,
            ...data,
            dietaryPreferences: data.dietaryPreferences || [],
            allergies: data.allergies || []
          }));
        }
      })
      .catch((err) => {
        console.warn('Profile fetch notice:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleDietaryPref = (opt: DietaryOption) => {
    setFormData((prev) => {
      const current = prev.dietaryPreferences || [];
      const active = isDietaryOptionActive(opt, current);
      const updated = active
        ? current.filter(
            (item) =>
              item.toLowerCase() !== opt.id.toLowerCase() &&
              item.toLowerCase() !== opt.label.toLowerCase()
          )
        : [...current, opt.id];
      return { ...prev, dietaryPreferences: updated };
    });
  };

  const toggleAllergy = (allergy: string) => {
    setFormData((prev) => {
      const current = prev.allergies || [];
      const active = isAllergenActive(allergy, current);
      const updated = active
        ? current.filter((item) => {
            const it = item.toLowerCase();
            const norm = allergy.toLowerCase();
            if (it === norm) return false;
            if (norm === 'cow milk / dairy' && (it === 'dairy' || it === 'cow milk' || it === 'cow milk / dairy' || it === 'milk')) return false;
            if (norm === 'wheat / gluten' && (it === 'gluten' || it === 'wheat' || it === 'wheat / gluten')) return false;
            if (norm === 'soybeans' && (it === 'soy' || it === 'soybeans')) return false;
            return true;
          })
        : [...current, allergy];
      return { ...prev, allergies: updated };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      await profileService.updateProfile(formData);
      setFeedback({
        type: 'success',
        message: 'Personal nutrition profile saved successfully!'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update profile. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 lg:p-8 border border-mutedGrey-border shadow-organic flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-forest bg-forest-50 px-3 py-1 rounded-full border border-sage/40">
            Personal Profile & Health Context
          </span>
          <h1 className="text-2xl lg:text-3xl font-bold font-editorial text-forest mt-2">
            Personal Nutrition Profile
          </h1>
          <p className="text-xs text-mutedGrey mt-1 max-w-xl">
            Configure your biometrics, dietary habits, and allergens. This context guides your target progress and meal insights without medical assumptions.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-forest bg-forest-50 px-3.5 py-2 rounded-xl border border-sage/40">
          <ShieldCheck className="w-4 h-4 text-forest" />
          <span>RBAC: Standard / Admin</span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center space-x-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-terracotta/10 border-terracotta/30 text-terracotta'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Biometrics */}
        <div className="bg-white rounded-2xl p-6 border border-mutedGrey-border shadow-organic space-y-5">
          <h2 className="text-base font-bold font-editorial text-charcoal flex items-center space-x-2">
            <Ruler className="w-4 h-4 text-forest" />
            <span>Biometrics & Energy Targets</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1.5 uppercase tracking-wider">
                Display Name
              </label>
              <input
                type="text"
                value={formData.displayName || ''}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1.5 uppercase tracking-wider">
                Height (cm)
              </label>
              <input
                type="number"
                min={50}
                max={250}
                value={formData.heightCm || ''}
                onChange={(e) => setFormData({ ...formData, heightCm: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-sm bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1.5 uppercase tracking-wider">
                Weight (kg)
              </label>
              <input
                type="number"
                min={20}
                max={300}
                step="0.1"
                value={formData.weightKg || ''}
                onChange={(e) => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-sm bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1.5 uppercase tracking-wider">
                Daily Calorie Target (kcal)
              </label>
              <div className="relative">
                <Target className="w-4 h-4 text-forest absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={800}
                  max={8000}
                  value={formData.dailyCalorieGoal !== undefined ? formData.dailyCalorieGoal : ''}
                  onChange={(e) => setFormData({ ...formData, dailyCalorieGoal: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                  placeholder="e.g. 2110"
                  className="w-full pl-10 pr-4 py-2 text-sm bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none font-semibold text-forest"
                />
              </div>
              <span className="text-[10px] text-mutedGrey mt-1 block">Default: 2,110 kcal (ICMR RDA Indian Adult)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1.5 uppercase tracking-wider">
                Measurement Units
              </label>
              <select
                value={formData.preferredUnits}
                onChange={(e) => setFormData({ ...formData, preferredUnits: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-ivory rounded-xl border border-mutedGrey-border focus:border-forest focus:outline-none"
              >
                <option value="metric">Metric (grams, ml, kg)</option>
                <option value="imperial">Imperial (oz, lbs, fl oz)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Activity Level */}
        <div className="bg-white rounded-2xl p-6 border border-mutedGrey-border shadow-organic space-y-4">
          <h2 className="text-base font-bold font-editorial text-charcoal flex items-center space-x-2">
            <Activity className="w-4 h-4 text-forest" />
            <span>Activity Level</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ACTIVITY_LEVELS.map((act) => {
              const selected = formData.activityLevel === act.id;
              return (
                <div
                  key={act.id}
                  onClick={() => setFormData({ ...formData, activityLevel: act.id })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selected
                      ? 'border-forest bg-forest-50/70 shadow-sm ring-1 ring-forest'
                      : 'border-mutedGrey-border bg-ivory/50 hover:bg-ivory'
                  }`}
                >
                  <span className={`block font-semibold text-xs ${selected ? 'text-forest' : 'text-charcoal'}`}>
                    {act.label}
                  </span>
                  <span className="block text-[11px] text-mutedGrey mt-1">{act.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Dietary Preferences & Allergies (Aligned with Onboarding Step 3) */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 border border-mutedGrey-border shadow-organic space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-forest bg-forest-50 px-3 py-1 rounded-full border border-sage/40">
              Dietary Habits & Safety
            </span>
            <h2 className="text-xl font-bold font-editorial text-forest mt-2 flex items-center space-x-2">
              <Heart className="w-5 h-5 text-forest" />
              <span>Preferences and dietary exclusions</span>
            </h2>
            <p className="text-xs text-mutedGrey mt-1">
              Select options that apply to you. We'll highlight matching recommendations and flag allergens.
            </p>
          </div>

          {/* Dietary Lifestyle Tags */}
          <div>
            <label className="block text-xs font-bold text-charcoal mb-2.5 uppercase tracking-wider">
              Dietary Lifestyle
            </label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((opt) => {
                const active = isDietaryOptionActive(opt, formData.dietaryPreferences);
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => toggleDietaryPref(opt)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      active
                        ? 'bg-forest text-white shadow-sm'
                        : 'bg-ivory border border-mutedGrey-border text-charcoal hover:border-forest/50'
                    }`}
                    style={active ? { backgroundColor: '#1B3A2C', color: '#ffffff' } : undefined}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Known Food Allergies & Ingredients to Avoid */}
          <div className="pt-4 border-t border-mutedGrey-border">
            <label className="block text-xs font-bold text-charcoal mb-2.5 uppercase tracking-wider">
              Known Food Allergies & Ingredients to Avoid
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGENS.map((alg) => {
                const active = isAllergenActive(alg, formData.allergies);
                return (
                  <button
                    type="button"
                    key={alg}
                    onClick={() => toggleAllergy(alg)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      active
                        ? 'bg-terracotta text-white shadow-sm'
                        : 'bg-ivory border border-mutedGrey-border text-charcoal hover:border-terracotta/50'
                    }`}
                    style={active ? { backgroundColor: '#C97857', color: '#ffffff' } : undefined}
                  >
                    {alg}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-mutedGrey">
            All personal health biometrics are securely encrypted and protected.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-forest-800 hover:bg-forest text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center space-x-2 disabled:opacity-70"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
