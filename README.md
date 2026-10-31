# Brightloop Software — Enterprise Subscription Management System

A production-style, database-connected Subscription Management System engineered for **Brightloop Software** to manage the complete lifecycle of subscription plans, dynamic product variants, quotations, automated recurring billing, tax & discount management, payments, and financial audit reporting.

---

## 1. Technology Stack

- **Frontend:** React.js 19 with Vite, Tailwind CSS, React Router, Axios, Lucide React icons, Recharts.
- **Backend:** Python FastAPI, REST API architecture, Pydantic v2 validation, SQLAlchemy ORM, ReportLab PDF generation.
- **Database:** MySQL 8.0+ (InnoDB, UTF-8 MB4, normalized relational design, foreign keys, indexes, decimal types for currencies).
- **Authentication:** JWT Bearer tokens with bcrypt password hashing and Role-Based Access Control (RBAC).

---

## 2. Default Seed Accounts & Credentials

The system includes pre-configured accounts in `database/subscription_management.sql`. All passwords satisfy security requirements (> 8 characters, uppercase, lowercase, special character):

| Role | Email Address | Password | Portal View |
|---|---|---|---|
| **Admin** | `admin@brightloop.com` | `Admin@12345` | `/admin` (Executive Control Center & Finance Reports) |
| **Internal Staff** | `staff@brightloop.com` | `Staff@12345` | `/staff` (Operations, Quotes, Subscriptions, Invoicing) |
| **Customer** | `acme@example.com` | `Customer@12345` | `/portal` (Customer Self-Service Portal) |
| **Customer** | `zenith@example.com` | `Customer@12345` | `/portal` |
| **Customer** | `apex@example.com` | `Customer@12345` | `/portal` |

---

## 3. Local Installation & Setup Guide

### Step 1: Database Setup in MySQL Workbench
1. Open **MySQL Workbench** (or standard MySQL CLI).
2. Connect to your local MySQL instance (port `3306`).
3. Open the SQL script located at:
   ```
   database/subscription_management.sql
   ```
4. Execute the entire script. It will:
   - Create the `brightloop_subscription` database.
   - Build all 26 relational tables, primary keys, foreign keys, and indexes.
   - Seed initial users, products, variants, plans, quotations, subscriptions, invoices, and payments.

---

### Step 2: Backend Setup (FastAPI)
1. Open a terminal and navigate to the project directory:
   ```bash
   cd Subscription_Management_System
   ```
2. Configure the database credentials in `backend/.env`:
   ```ini
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=brightloop_subscription
   SECRET_KEY=brightloop_enterprise_secret_key_2026_super_secure_jwt
   PORT=8000
   ```
3. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Start the FastAPI backend server:
   ```bash
   python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   - API will be accessible at: `http://localhost:8000`
   - Interactive Swagger API documentation: `http://localhost:8000/docs`

---

### Step 3: Frontend Setup (React + Vite)
1. Open a second terminal window and navigate to `frontend`:
   ```bash
   cd Subscription_Management_System/frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 4. Key Functional Modules

### 4.1 Product & Dynamic Variant Management
- Add, update, view, and archive software products.
- Configure dynamic variants and options (e.g., Attribute: `Brand`, Option: `Standard Brand` +₹0, `Odoo Brand` +₹560).
- Interactive Price Calculator computes real-time final price reflecting selected variant adjustments.

### 4.2 Subscription Plan Management
- Manage billing frequencies: **Daily**, **Weekly**, **Monthly**, and **Yearly**.
- Configure lifecycle rules per plan:
  - `Auto-close`: Closes subscription automatically when end date is reached.
  - `Early closure`: Allows or disallows cancellation prior to term expiry.
  - `Pause permission`: Grants ability to temporarily suspend billing.
  - `Renewal permission`: Enables subsequent term extension.

### 4.3 Quotations & Reusable Templates
- Create custom quotes or generate them in one click from predefined bundle templates.
- Complete lifecycle workflow: `Draft` → `Quotation` → `Confirmed` → `Active Subscription`.
- "Convert to Subscription" button immediately provisions an active recurring contract with linked products and taxes.

### 4.4 Automated Recurring Billing Engine
- **Idempotent Billing:** Identifies active subscriptions where `next_billing_date <= today`, generates itemized tax invoices, advances next billing date according to plan frequency, and skips duplicate billing.
- Supports on-demand billing cycle execution from the UI header and backend scheduler.
- Computes GST/VAT taxes and checks eligible discounts.
- Generates official tax invoice PDFs ready for download and print.

### 4.5 Payment Management & Reconciliation
- Records payments across multiple payment methods: **Bank Transfer**, **UPI**, **Card**, **Cash**, and **Other**.
- Validates payment amount cannot exceed outstanding balance.
- Supports partial payments.
- Automatically marks invoices as `Paid` when the outstanding balance reaches zero.

### 4.6 Finance Lead Audit Dashboard (The 6 Questions)
Answers the 6 core financial questions for Brightloop Software's Finance Lead:
1. **How many subscriptions are active?** — Live count of active recurring contracts.
2. **How much revenue has been received?** — Total cleared collections.
3. **How much money is still outstanding?** — Total uncollected receivables on confirmed invoices.
4. **Which invoices are overdue?** — Real-time list of invoices past due date with days overdue calculation.
5. **How much revenue was generated monthly?** — Historical bar chart and audit table of monthly receipts.
6. **Which subscriptions are due for renewal?** — Early warning list of subscriptions expiring in the next 30 days with a 1-click renewal action.
- CSV Data Export for Invoices, Subscriptions, and Payments.

### 4.7 Customer Self-Service Portal
- Strict data isolation: Customers can access only their own records.
- View active subscriptions, license seat counts, and expiration dates.
- Download GST tax invoices in PDF format.
- View cleared payment history and update corporate address/contact details.

---

## 5. Automated Testing

Run the full end-to-end automated test suite:
```bash
python -m pytest -v tests/test_system.py
```

### Verified Test Cases:
1. `test_1_password_validation_on_registration`: Enforces password rules.
2. `test_2_customer_registration_and_isolation`: Customer enrollment & portal isolation.
3. `test_3_admin_and_staff_roles`: RBAC boundary enforcement.
4. `test_4_forgot_password_and_reset`: Password reset token lifecycle.
5. `test_5_product_variants_pricing`: Dynamic +₹560 Odoo brand calculation.
6. `test_6_quotation_template_and_conversion`: Quotation template provision and conversion.
7. `test_7_subscription_lifecycle`: Pause, Resume, Close, and Renew lifecycle actions.
8. `test_8_automated_recurring_billing_and_idempotency`: Idempotent billing cycle run.
9. `test_9_payment_recording_and_auto_status_update`: Payment recording, balance reduction, auto-paid.
10. `test_10_finance_reporting_6_questions`: Finance lead 6 questions live query verification.

---

## 6. Project Structure

```
subscription-management-system/
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, Sidebar, Modals, StatusBadges, StatCards, Layout
│   │   ├── pages/           # Admin, Staff, Finance dashboards, Modules, Portal
│   │   ├── services/        # Axios API client & endpoints
│   │   ├── context/         # AuthContext & ToastContext
│   │   ├── App.jsx          # Protected routing & Role dispatch
│   │   ├── main.jsx
│   │   └── index.css        # Tailwind CSS and theme design system
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── backend/
│   ├── app/
│   │   ├── routes/          # API route controllers (Auth, Products, Invoices, etc.)
│   │   ├── models/          # SQLAlchemy ORM models (26 tables)
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   ├── services/        # Billing engine, Discount evaluator, Email & Reports
│   │   ├── middleware/      # JWT verification & RBAC guards
│   │   ├── database/        # MySQL engine connection pooling
│   │   ├── utils/           # Password hashing & ReportLab PDF generator
│   │   └── main.py          # FastAPI application & CORS
│   ├── requirements.txt
│   ├── .env
│   └── .env.example
│
├── database/
│   └── subscription_management.sql  # Complete MySQL schema & initial seed data
│
├── docs/
│   └── API_DOCUMENTATION.md         # Comprehensive REST API specification
│
├── tests/
│   └── test_system.py               # Automated pytest suite (10 test suites)
│
├── README.md
└── .gitignore
```
