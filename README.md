# NutriTrack: Smart Food Label Intelligence & Meal Nutrient Analysis

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Async%20Motor-47A248.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Python Tests](https://img.shields.io/badge/Pytest-26%20Passed%20(100%25)-brightgreen.svg?logo=pytest&logoColor=white)](https://pytest.org)

NutriTrack is an enterprise-grade clinical and consumer food intelligence platform. It bridges the gap between complex packaged food labels and daily nutritional health through **assistive computer vision (OCR)**, **deterministic nutrient calculation**, **authoritative RDA reference baselines (ICMR-NIN & WHO)**, and **comprehensive reporting (PDF, Excel, CSV)**.

---

## Table of Contents
- [Executive Overview](#executive-overview)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Core Application Modules](#core-application-modules)
- [Installation & Local Setup](#installation--local-setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (FastAPI & MongoDB)](#backend-setup-fastapi--mongodb)
  - [Frontend Setup (React + Vite)](#frontend-setup-react--vite)
  - [Docker Setup (All-in-One)](#docker-setup-all-in-one)
- [Automated Testing & Verification](#automated-testing--verification)
- [Demo Credentials & Sample Data](#demo-credentials--sample-data)
- [API Documentation](#api-documentation)
- [Project Directory Structure](#project-directory-structure)

---

## Executive Overview

Packaged food labels are frequently misleading, dense, and difficult for consumers and dietitians to assess in real time. **NutriTrack** solves this problem by delivering:
1. **Automated Vision OCR Pipeline**: Extract nutrition tables directly from phone camera uploads or package photographs using OpenCV image preprocessing and OCR extraction.
2. **Deterministic Nutritional Calculations**: Transparent Atwater calculations (Carbohydrates: 4 kcal/g, Protein: 4 kcal/g, Fat: 9 kcal/g) without arbitrary estimation or black-box guessing.
3. **Authoritative Population Baselines**: Real-time adherence tracking against officially published standards from the **ICMR - National Institute of Nutrition (NIN 2020 RDA)** and the **World Health Organization (WHO Healthy Diet)**.
4. **Side-by-Side Product Comparison**: Compare 2 to 4 foods side-by-side with metric normalization across Per 100g, Per 100ml, and Per Serving bases.
5. **Print-Ready Clinical Dossiers**: Dynamic ReportLab PDF generators, multi-tab Excel workbooks, and raw CSV files for medical and personal dietary records.

---

## System Architecture

NutriTrack adopts a clean decoupled architecture separating async backend micro-services from a reactive, state-managed SPA frontend:

```
+-------------------------------------------------------------------------+
|                              NutriTrack UI                              |
|         React 18 + TypeScript + Vite + Tailwind CSS + Recharts          |
+------------------------------------+------------------------------------+
                                     |
                          REST API / JWT Bearer
                                     |
+------------------------------------+------------------------------------+
|                         FastAPI Core Engine                             |
|               Python 3.12 + Pydantic v2 + Motor Async                   |
+--------+------------------+------------------+-----------------+--------+
         |                  |                  |                 |
+--------v-------+  +-------v--------+  +------v-------+  +------v--------+
| OCR & Vision   |  | Nutrient Calc  |  | Comparison   |  | Reports Engine|
| OpenCV Preproc |  | Aggregation    |  | Normalizer   |  | ReportLab PDF |
| PyTesseract    |  | Unit Converter |  | Delta Matrix |  | OpenPyXL / CSV|
+--------+-------+  +-------+--------+  +------+-------+  +------+--------+
         |                  |                  |                 |
+--------v------------------v------------------v-----------------v--------+
|                            MongoDB Database                             |
|   Collections: users, user_profiles, foods, food_categories, meals,     |
|             dietary_targets, meal_plans, reports, ocr_jobs              |
+-------------------------------------------------------------------------+
```

---

## Technology Stack

### Backend
- **Language**: Python 3.12+
- **Framework**: FastAPI 0.109.0 (High-performance Async ASGI)
- **Database Driver**: Motor 3.3.2 (Async MongoDB Driver)
- **Data Validation & Serialization**: Pydantic v2.6.0 & Pydantic-Settings
- **Security & Authentication**: Passlib (Bcrypt password hashing), PyJWT (JWT tokens with expiration)
- **Computer Vision & OCR**: OpenCV (cv2 image contrast & thresholding), PyTesseract, Pillow
- **Reporting Engines**: ReportLab 4.1.0 (Vector PDF generation), OpenPyXL 3.1.2 (Excel), Pandas
- **Testing**: Pytest 9.2.0, Pytest-Asyncio, HTTPX

### Frontend
- **Framework**: React 18.2.0 with TypeScript 5.2.2
- **Build Tool**: Vite 5.4.21 (Fast HMR & ESM bundling)
- **Styling**: Tailwind CSS 3.4.1 (Custom Editorial & Organic theme: Forest Green, Sage, Ivory, Terracotta)
- **Charts & Data Visualizations**: Recharts 2.12.0 (AreaChart, PieChart, BarChart, LineChart)
- **Icons**: Lucide React (Clean, accessible SVG iconography with zero raw emojis)
- **State Management**: Zustand 4.5.0
- **Routing**: React Router v6.22.0
- **HTTP Client**: Axios 1.6.7 (With automated JWT interceptors)

### Database
- **Engine**: MongoDB 6.0+ (NoSQL document store with composite indexing and schema flexibility)

---

## Core Application Modules

### 1. Interactive Dashboard (`/`)
- **Top Metric Cards (KPIs)**: Real-time progress bars for Energy (kcal), Protein (g), Carbohydrates (g), and Total Fat (g) with RDA limits.
- **7-Day Caloric Intake Trend Chart**: AreaChart with gradient styling displaying daily intake curves against target benchmark lines.
- **Macronutrient Caloric Split**: Donut visualization utilizing Atwater factors (4-4-9 kcal/g) with percentage breakdowns.
- **Daily Hydration Tracker**: 2,500 ml target with animated liquid progress and 1-click `+250 ml`, `+500 ml`, and `-250 ml` quick logging.
- **Dietary Quality Scorecard**: Deterministic scoring (0-100) based on calorie deficit/surplus, protein sufficiency, and fat compliance.
- **Quick Log Modal**: Log meals directly from the dashboard without navigating away.
- **Feature Shortcuts**: 1-click access to Scanner, Comparison, Planner, and Reports.

### 2. Food Diary (`/diary`)
- Chronological timeline organized by meal slots: **Breakfast**, **Lunch**, **Dinner**, and **Snacks**.
- Item-level snapshots preserving food name, quantity, unit, and verified nutrient attribution.
- Dynamic daily totals calculation and 1-click meal deletion.

### 3. Food Label OCR Scanner (`/scanner`)
- **Assistive Vision Pipeline**: Upload image files (PNG, JPG, PDF) of packaged nutrition fact labels.
- **OpenCV Preprocessing**: Contrast enhancement, adaptive thresholding, and deskewing.
- **Parsed Confidence Scoring**: Confidence percentages per extracted field (Calories, Protein, Fat, Sodium, etc.).
- **Quick Demo Samples**: 1-click demo buttons for Quaker Rolled Oats, ProBar Protein Crunch, and Dark Chocolate.
- **Audit Verification**: User verification safeguard prior to saving into the master database.

### 4. Product Comparison Matrix (`/compare`)
- Side-by-side benchmarking of 2 to 4 food items simultaneously.
- **Metric Normalization**: Instant toggling between **Per 100g**, **Per 100ml**, and **Per Serving**.
- Visual delta color-coding: green for beneficial nutrients (protein, fiber) and terracotta for limit nutrients (sugars, sodium, saturated fat).
- Quick demo comparison presets: *Oats vs Rice*, *Eggs vs Paneer*, *Milk vs Yogurt*, *Dark Chocolate vs Snacks*.

### 5. Smart Meal Planner (`/planner`)
- Target-aligned daily meal plan schedules tailored to personal daily calorie targets.
- Deterministic macronutrient split distribution across Breakfast (25%), Lunch (35%), Dinner (30%), and Snack (10%).

### 6. Dietary Targets & Progress Tracking (`/targets`)
- **Authoritative Baselines**: Select between:
  - **ICMR-NIN 2020 RDA**: Indian Adult Male (Sedentary, 2,110 kcal)
  - **ICMR-NIN 2020 RDA**: Indian Adult Female (Sedentary, 1,660 kcal)
  - **WHO Healthy Diet Global Reference**: General Adult (2,000 kcal)
- **Custom Overrides**: Fine-tune specific targets for Energy, Protein, Carbs, Total Fat, Fiber, Sodium, and Sugars.
- **Interactive Daily Adherence Ribbon**: Date navigation with previous/next and "Today" shortcuts.

### 7. Reports & Data Export Center (`/reports`)
- **Multi-Format Downloads**:
  - **PDF Clinical Dossier**: Generated via ReportLab with executive summary, macronutrient distribution, and compliance disclaimer.
  - **Excel Workbook (`.xlsx`)**: 3 formatted worksheets: *Summary & Targets*, *Timeline Log*, and *Macro Split*.
  - **Raw CSV Data**: Flat records formatted for statistical modeling and data science workflows.
- Preset reporting windows: 7 Days, 14 Days, 30 Days, or custom date ranges.
- 1-Click `Generate Sample 7-Day PDF Report` quick demonstration.

### 8. Personal Profile & Health Context (`/profile`)
- **Biometric Targets**: Height (cm), Weight (kg), Preferred Units (Metric / Imperial), Daily Calorie Goal.
- **Activity Levels**: Sedentary (1.0x), Lightly Active (1.15x), Moderately Active (1.3x), Very Active (1.5x).
- **Dietary Lifestyle Filters**: Vegetarian, Vegan, Eggetarian, Halal, Kosher, Gluten-Free, Low-Carb, Dairy-Free.
- **10-Point Allergen Safety Framework**: Peanuts, Tree Nuts, Cow Milk / Dairy, Soybeans, Wheat / Gluten, Eggs, Fish, Shellfish, Sesame, Mustard.

---

## Installation & Local Setup

### Prerequisites
- **Python**: Version `3.12` or higher
- **Node.js**: Version `18.0` or higher (with `npm`)
- **MongoDB**: Version `6.0` or higher running locally (or MongoDB Atlas connection string)
- **Git**: Installed and configured

---

### Backend Setup (FastAPI & MongoDB)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/devops941/NutriTrack.git
   cd NutriTrack
   ```

2. **Create and activate a Python virtual environment**:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install backend dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Configure environment variables**:
   Create a `.env` file inside the `backend/` directory (or copy `backend/.env.example`):
   ```ini
   ENVIRONMENT=development
   DEBUG=True
   PORT=8000
   MONGODB_URL=mongodb://localhost:27017
   DATABASE_NAME=nutritrack_db
   JWT_SECRET=supersecretnutritrackjwtkey_replace_in_production
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
   UPLOAD_DIR=uploads
   MAX_UPLOAD_SIZE_MB=10
   ```

5. **Seed Initial Food Master Database & RDA Targets**:
   ```bash
   # From project root
   python backend/app/food_data/seed_foods.py
   python backend/app/food_data/seed_targets.py
   ```

6. **Start the FastAPI backend server**:
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```
   *The backend will be running at:* `http://localhost:8000`  
   *Interactive API Docs (Swagger):* `http://localhost:8000/docs`

---

### Frontend Setup (React + Vite)

1. **Navigate to the frontend folder**:
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `frontend/.env` file:
   ```ini
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

4. **Run the Vite development server**:
   ```bash
   npm run dev
   ```
   *The frontend application will be running at:* `http://localhost:5173`

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

### Docker Setup (All-in-One)

You can launch MongoDB, the FastAPI backend, and the Vite frontend with a single command:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- MongoDB: `localhost:27017`

---

## Automated Testing & Verification

NutriTrack includes a comprehensive automated test suite verifying calculation engines, comparison math, analytics aggregations, targets, meal planning, and report generation:

```bash
# Run all unit tests
python -m pytest backend/tests/unit -v
```

**Test Coverage Summary**:
```
backend/tests/unit/test_analytics_engine.py  PASSED
backend/tests/unit/test_calculation.py       PASSED (8 tests: Atwater formula, serving scaling)
backend/tests/unit/test_comparison_engine.py PASSED (4 tests: Normalization 100g, delta calculation)
backend/tests/unit/test_meal_plans.py        PASSED (3 tests: Plan generation, calorie targets)
backend/tests/unit/test_ocr_parser.py        PASSED (3 tests: Heuristic regex, confidence thresholds)
backend/tests/unit/test_reports.py           PASSED (4 tests: PDF creation, Excel worksheets)
backend/tests/unit/test_targets.py           PASSED (4 tests: RDA alignment, adherence progress)

======================== 26 passed in 3.51s (100%) ========================
```

---

## Demo Credentials & Sample Data

To log in and immediately explore the platform with pre-populated records:

| Role | Email | Password | Pre-loaded Data |
| :--- | :--- | :--- | :--- |
| **Standard User** | `gokul@gmail.com` | `password123` | 7-day food diary, biometric profile, hydration logs |
| **Admin Account** | `admin@gmail.com` | `admin123` | Full access, master database controls |

*Note: You can also create a new account via the `/register` page and complete the 3-step onboarding wizard.*

---

## API Documentation

FastAPI automatically generates interactive OpenAPI/Swagger documentation. Once the backend is running, open:
- **Interactive Swagger UI**: `http://localhost:8000/docs`
- **ReDoc Alternative UI**: `http://localhost:8000/redoc`

### Key Endpoints Overview

| Prefix | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/auth` | `POST /register`, `POST /login` | User registration and JWT authentication |
| `/api/v1/profiles` | `GET /me`, `PUT /me` | User biometrics, dietary lifestyle, and allergens |
| `/api/v1/foods` | `GET /`, `GET /{id}`, `POST /` | Master food library search and nutrition specs |
| `/api/v1/meals` | `GET /daily`, `POST /`, `DELETE /{id}` | Daily food diary logging and nutrient aggregation |
| `/api/v1/labels` | `POST /scan`, `GET /{jobId}` | OCR label photo ingestion and nutrient parsing |
| `/api/v1/comparison`| `POST /matrix` | Multi-product normalized comparison matrix |
| `/api/v1/targets` | `GET /frameworks`, `GET /progress` | Reference baselines and real-time adherence |
| `/api/v1/analytics`| `GET /summary`, `POST /seed-demo` | Daily trend series and Atwater distribution |
| `/api/v1/reports` | `POST /generate`, `GET /download/{id}` | Export print-ready PDF, Excel, and CSV dossiers |

---

## Project Directory Structure

```
NutriTrack/
├── .gitignore                                      # Comprehensive Git ignore rules
├── docker-compose.yml                              # Multi-container orchestration
├── README.md                                       # Full documentation
├── NutriTrack_Complete_Project_Documentation.pdf   # Academic project report
├── sample_food_labels/                             # Standard high-res sample food labels
│   ├── quaker_whole_oats_label.png
│   ├── pro_bar_protein_crunch_label.png
│   └── artisanal_dark_chocolate_label.png
│
├── backend/                                        # FastAPI Application
│   ├── app/
│   │   ├── config/                                 # Database & Settings
│   │   ├── core/                                   # JWT, Auth Dependencies, Security
│   │   ├── engines/                                # Calculation, Aggregation, Comparison
│   │   ├── food_data/                              # Master seed datasets (ICMR-NIN & Foods)
│   │   ├── integrations/ocr/                       # OpenCV preprocessor & Tesseract parser
│   │   ├── modules/                                # Domain feature routers & Pydantic schemas
│   │   │   ├── auth/                               # Login, Register, Tokens
│   │   │   ├── profiles/                           # User biometrics & allergens
│   │   │   ├── foods/                              # Verified food master records
│   │   │   ├── meals/                              # Daily diary logging & snapshots
│   │   │   ├── labels/                             # OCR ingestion pipeline
│   │   │   ├── comparison/                         # Side-by-side product comparator
│   │   │   ├── targets/                            # RDA baselines & adherence tracking
│   │   │   ├── meal_plans/                         # Deterministic meal scheduling
│   │   │   ├── analytics/                          # 7/14/30-day trends & stats
│   │   │   └── reports/                            # PDF, Excel, and CSV generators
│   │   └── main.py                                 # FastAPI application entrypoint
│   ├── tests/unit/                                 # 26 automated Pytest unit tests
│   └── requirements.txt                            # Python dependencies
│
└── frontend/                                       # React 18 + TypeScript SPA
    ├── src/
    │   ├── app/                                    # Main App & React Router definitions
    │   ├── components/                             # Reusable layout, navbar & sidebar
    │   ├── modules/                                # Feature pages & view components
    │   │   ├── overview/DashboardPage.tsx          # Complete upgraded dashboard
    │   │   ├── diary/FoodDiaryPage.tsx             # Food intake diary
    │   │   ├── labels/LabelScannerPage.tsx         # OCR label scanner with preview
    │   │   ├── comparison/ProductComparisonPage.tsx# Normalized comparison matrix
    │   │   ├── targets/TargetSettingsPage.tsx      # RDA framework & target settings
    │   │   ├── planner/MealPlannerPage.tsx         # Deterministic meal planner
    │   │   ├── analytics/AnalyticsPage.tsx         # Deep analytics & trend charts
    │   │   ├── reports/ReportsPage.tsx             # PDF/Excel/CSV export center
    │   │   ├── profile/ProfileWizardPage.tsx       # Biometrics & allergen preferences
    │   │   ├── onboarding/OnboardingPage.tsx       # 3-Step user setup wizard
    │   │   └── auth/LoginPage.tsx & RegisterPage   # Secure authentication
    │   ├── services/                               # Typed Axios API client wrappers
    │   └── store/authStore.ts                      # Zustand authentication state
    ├── tailwind.config.js                          # Custom color palettes & typography
    ├── package.json                                # Node dependencies & scripts
    └── vite.config.ts                              # Vite bundler configuration
```

---

## License

This project was developed for academic and personal dietary intelligence purposes. All calculations are deterministic based on standard food science protocols.
