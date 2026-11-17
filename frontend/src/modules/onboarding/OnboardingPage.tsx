import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Activity,
  Heart,
  Scale,
  Sparkles,
  ShieldCheck,
  Flame,
  AlertCircle
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
import { useAuthStore } from '../../store/authStore';

const ACTIVITY_LEVELS = [
  {
    id: 'sedentary',
    title: 'Sedentary',
    desc: 'Desk job, little to no structured physical exercise',
    factor: 1.0,
    calories: 2110,
  },
  {
    id: 'lightly_active',
    title: 'Lightly Active',
    desc: 'Light daily exercise or brisk walking 1–3 days/week',
    factor: 1.15,
    calories: 2350,
  },
  {
    id: 'moderately_active',
    title: 'Moderately Active',
    desc: 'Moderate physical training or cardio 3–5 days/week',
    factor: 1.3,
    calories: 2600,
  },
  {
    id: 'very_active',
    title: 'Very Active',
    desc: 'Intense heavy workout, sports or athletic training 6–7 days/week',
    factor: 1.5,
    calories: 2950,
  },
];



export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProfileData>({
    displayName: '',
    heightCm: undefined,
    weightKg: undefined,
    dailyCalorieGoal: undefined,
    preferredUnits: 'metric',
    activityLevel: '',
    dietaryPreferences: [],
    allergies: [],
    excludedIngredients: [],
  });

  // If user is already onboarded, send them to dashboard
  useEffect(() => {
    if (user && user.isOnboarded) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!formData.displayName?.trim()) {
        setError('Please enter your full or display name.');
        return;
      }
      if (!formData.heightCm || formData.heightCm < 50 || formData.heightCm > 260) {
        setError('Please enter your height (between 50 and 260 cm).');
        return;
      }
      if (!formData.weightKg || formData.weightKg < 20 || formData.weightKg > 350) {
        setError('Please enter your weight (between 20 and 350 kg).');
        return;
      }
      // If dailyCalorieGoal not entered, set default 2110
      if (!formData.dailyCalorieGoal) {
        setFormData((prev) => ({ ...prev, dailyCalorieGoal: 2110 }));
      }
    }
    if (step === 2) {
      if (!formData.activityLevel) {
        setError('Please select your physical activity level.');
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrev = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const toggleDietaryPref = (opt: DietaryOption) => {
    setFormData((prev) => {
      const list = prev.dietaryPreferences || [];
      const active = isDietaryOptionActive(opt, list);
      const updated = active
        ? list.filter(
            (item) =>
              item.toLowerCase() !== opt.id.toLowerCase() &&
              item.toLowerCase() !== opt.label.toLowerCase()
          )
        : [...list, opt.id];
      return { ...prev, dietaryPreferences: updated };
    });
  };

  const toggleAllergy = (allergy: string) => {
    setFormData((prev) => {
      const list = prev.allergies || [];
      const active = isAllergenActive(allergy, list);
      const updated = active
        ? list.filter((item) => {
            const it = item.toLowerCase();
            const norm = allergy.toLowerCase();
            if (it === norm) return false;
            if (norm === 'cow milk / dairy' && (it === 'dairy' || it === 'cow milk' || it === 'cow milk / dairy' || it === 'milk')) return false;
            if (norm === 'wheat / gluten' && (it === 'gluten' || it === 'wheat' || it === 'wheat / gluten')) return false;
            if (norm === 'soybeans' && (it === 'soy' || it === 'soybeans')) return false;
            return true;
          })
        : [...list, allergy];
      return { ...prev, allergies: updated };
    });
  };

  const handleActivitySelect = (levelId: string) => {
    const selected = ACTIVITY_LEVELS.find((a) => a.id === levelId);
    setFormData((prev) => ({
      ...prev,
      activityLevel: levelId,
      dailyCalorieGoal: selected ? selected.calories : prev.dailyCalorieGoal,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await profileService.updateProfile(formData);
      completeOnboarding();
      navigate('/');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Authentication credentials are required or expired. Redirecting to login...');
        setTimeout(() => navigate('/login'), 1800);
      } else {
        setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to complete onboarding. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Branding Navigation */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center text-sage-light shadow-md">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <span className="font-editorial text-xl font-bold text-forest tracking-tight">NutriTrack</span>
            <span className="block text-[10px] text-mutedGrey uppercase tracking-wider">
              Smart Food Intelligence
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-mutedGrey bg-white px-3 py-1.5 rounded-full border border-mutedGrey-border shadow-sm">
          <ShieldCheck className="w-4 h-4 text-forest" />
          <span>Step {step} of 3</span>
        </div>
      </div>

      {/* Main Form Stepper Card */}
      <div className="max-w-3xl mx-auto w-full my-6 bg-white rounded-3xl border border-mutedGrey-border shadow-organic p-6 sm:p-8 lg:p-10 animate-fadeIn">
        {/* Progress Stepper Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-2">
            <span className={step >= 1 ? 'text-forest' : 'text-mutedGrey'}>1. Biometrics</span>
            <span className={step >= 2 ? 'text-forest' : 'text-mutedGrey'}>2. Activity Level</span>
            <span className={step >= 3 ? 'text-forest' : 'text-mutedGrey'}>3. Dietary & Allergens</span>
          </div>
          <div className="w-full bg-ivory h-2.5 rounded-full overflow-hidden border border-mutedGrey-border">
            <div
              className="bg-forest h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-terracotta/10 border border-terracotta/30 text-terracotta text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Biometrics */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-forest bg-forest-50 px-3 py-1 rounded-full border border-sage/40">
                Welcome to NutriTrack
              </span>
              <h1 className="text-2xl font-bold font-editorial text-forest mt-2">
                Let's customize your nutrition profile
              </h1>
              <p className="text-xs text-mutedGrey mt-1">
                Tell us your body biometrics and target goals so we can calculate accurate nutrient percentages.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-charcoal mb-1.5 uppercase tracking-wider">
                  Display / Full Name
                </label>
                <input
                  type="text"
                  value={formData.displayName || ''}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 bg-ivory/50 rounded-xl border border-mutedGrey-border text-sm text-charcoal focus:outline-none focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1.5 uppercase tracking-wider">
                  Height (cm)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.heightCm !== undefined ? formData.heightCm : ''}
                    onChange={(e) => setFormData({ ...formData, heightCm: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                    placeholder="e.g. 175"
                    className="w-full px-4 py-2.5 bg-ivory/50 rounded-xl border border-mutedGrey-border text-sm text-charcoal focus:outline-none focus:border-forest"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-mutedGrey font-medium">
                    cm
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1.5 uppercase tracking-wider">
                  Weight (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.weightKg !== undefined ? formData.weightKg : ''}
                    onChange={(e) => setFormData({ ...formData, weightKg: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                    placeholder="e.g. 70"
                    className="w-full px-4 py-2.5 bg-ivory/50 rounded-xl border border-mutedGrey-border text-sm text-charcoal focus:outline-none focus:border-forest"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-mutedGrey font-medium">
                    kg
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1.5 uppercase tracking-wider">
                  Daily Energy Goal (kcal)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.dailyCalorieGoal !== undefined ? formData.dailyCalorieGoal : ''}
                    onChange={(e) => setFormData({ ...formData, dailyCalorieGoal: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                    placeholder="e.g. 2110"
                    className="w-full px-4 py-2.5 bg-ivory/50 rounded-xl border border-mutedGrey-border text-sm text-charcoal focus:outline-none focus:border-forest"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-mutedGrey font-medium">
                    kcal
                  </span>
                </div>
                <span className="text-[10px] text-mutedGrey mt-1 block">Recommended benchmark: 2,110 kcal (ICMR-NIN RDA)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1.5 uppercase tracking-wider">
                  Measurement Units
                </label>
                <select
                  value={formData.preferredUnits || 'metric'}
                  onChange={(e) => setFormData({ ...formData, preferredUnits: e.target.value })}
                  className="w-full px-4 py-2.5 bg-ivory/50 rounded-xl border border-mutedGrey-border text-sm text-charcoal focus:outline-none focus:border-forest"
                >
                  <option value="metric">Metric (grams, ml, kg)</option>
                  <option value="imperial">Imperial (oz, fl oz, lbs)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Physical Activity Level */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-forest bg-forest-50 px-3 py-1 rounded-full border border-sage/40">
                Lifestyle & Energy
              </span>
              <h1 className="text-2xl font-bold font-editorial text-forest mt-2">
                How active are you on an average week?
              </h1>
              <p className="text-xs text-mutedGrey mt-1">
                Your activity level helps calibrate realistic daily macro target thresholds.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {ACTIVITY_LEVELS.map((level) => {
                const isSelected = formData.activityLevel === level.id;
                return (
                  <div
                    key={level.id}
                    onClick={() => handleActivitySelect(level.id)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-forest bg-forest-50/50 shadow-md ring-1 ring-forest'
                        : 'border-mutedGrey-border hover:border-forest/50 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-charcoal font-editorial">{level.title}</span>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-forest bg-forest text-white' : 'border-mutedGrey-border'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                    <p className="text-xs text-mutedGrey leading-relaxed">{level.desc}</p>
                    <div className="mt-3 text-[11px] font-semibold text-forest flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-forest" />
                      <span>Recommended Baseline: ~{level.calories} kcal</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Dietary Preferences & Allergens */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-forest bg-forest-50 px-3 py-1 rounded-full border border-sage/40">
                Dietary Habits & Safety
              </span>
              <h1 className="text-2xl font-bold font-editorial text-forest mt-2">
                Preferences and dietary exclusions
              </h1>
              <p className="text-xs text-mutedGrey mt-1">
                Select options that apply to you. We'll highlight matching recommendations and flag allergens.
              </p>
            </div>

            {/* Dietary tags */}
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-2 uppercase tracking-wider">
                Dietary Lifestyle
              </label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((opt) => {
                  const active = isDietaryOptionActive(opt, formData.dietaryPreferences);
                  return (
                    <button
                      key={opt.id}
                      type="button"
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

            {/* Allergen tags */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-charcoal mb-2 uppercase tracking-wider">
                Known Food Allergies & Ingredients to Avoid
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGENS.map((allergy) => {
                  const active = isAllergenActive(allergy, formData.allergies);
                  return (
                    <button
                      key={allergy}
                      type="button"
                      onClick={() => toggleAllergy(allergy)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        active
                          ? 'bg-terracotta text-white shadow-sm'
                          : 'bg-ivory border border-mutedGrey-border text-charcoal hover:border-terracotta/50'
                      }`}
                      style={active ? { backgroundColor: '#C97857', color: '#ffffff' } : undefined}
                    >
                      {allergy}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-10 pt-6 border-t border-mutedGrey-border flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-5 py-2.5 rounded-xl border border-mutedGrey-border text-xs font-semibold text-charcoal hover:bg-ivory transition-colors flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-forest hover:bg-forest-dark text-white rounded-xl font-semibold text-xs shadow-sm transition-all flex items-center space-x-1.5"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-7 py-3 bg-forest hover:bg-forest-dark text-white rounded-xl font-semibold text-xs shadow-md transition-all flex items-center space-x-2 disabled:opacity-70"
            >
              <Sparkles className="w-4 h-4 text-sage-light" />
              <span>{loading ? 'Finalizing Profile...' : 'Complete & Enter NutriTrack'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer reassurance */}
      <div className="max-w-3xl mx-auto w-full text-center text-[11px] text-mutedGrey py-2">
        You can always review and update these details anytime from <strong>Profile & Settings</strong>.
      </div>
    </div>
  );
};
