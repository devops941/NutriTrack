import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardPage } from '../modules/overview/DashboardPage';
import { LoginPage } from '../modules/auth/LoginPage';
import { RegisterPage } from '../modules/auth/RegisterPage';
import { ProfileWizardPage } from '../modules/profile/ProfileWizardPage';
import { FoodLibraryPage } from '../modules/foods/FoodLibraryPage';
import { LabelScannerPage } from '../modules/labels/LabelScannerPage';
import { FoodDiaryPage } from '../modules/diary/FoodDiaryPage';
import { TargetSettingsPage } from '../modules/targets/TargetSettingsPage';
import { ProductComparisonPage } from '../modules/comparison/ProductComparisonPage';
import { AnalyticsPage } from '../modules/analytics/AnalyticsPage';
import { MealPlannerPage } from '../modules/planner/MealPlannerPage';
import { ReportsPage } from '../modules/reports/ReportsPage';
import { OnboardingPage } from '../modules/onboarding/OnboardingPage';
import {
  BookOpen,
  CalendarDays,
  UtensilsCrossed,
  ScanLine,
  Scale,
  TrendingUp,
  Target,
  FileSpreadsheet,
  ShieldAlert,
} from 'lucide-react';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/onboarding',
    element: <OnboardingPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'profile',
        element: <ProfileWizardPage />,
      },
      {
        path: 'diary',
        element: <FoodDiaryPage />,
      },
      {
        path: 'planner',
        element: <MealPlannerPage />,
      },
      {
        path: 'foods',
        element: <FoodLibraryPage />,
      },
      {
        path: 'scanner',
        element: <LabelScannerPage />,
      },
      {
        path: 'compare',
        element: <ProductComparisonPage />,
      },
      {
        path: 'analytics',
        element: <AnalyticsPage />,
      },
      {
        path: 'targets',
        element: <TargetSettingsPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'admin',
        element: <Navigate to="/" replace />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
