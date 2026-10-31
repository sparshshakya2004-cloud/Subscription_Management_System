# Brightloop Software — Subscription Management System API Documentation

## 1. Overview
The **Brightloop Software Subscription Management System** backend is built using Python **FastAPI**, **SQLAlchemy ORM**, and **MySQL 8.0+**. It implements a versioned REST architecture under `/api/v1` with JWT-based Bearer authentication, role-based authorization, idempotent automated recurring billing, dynamic product variant calculation, and financial audit reporting.

- **Base URL:** `http://localhost:8000/api/v1`
- **Interactive Swagger Documentation:** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`

---

## 2. Authentication & Security
All authenticated endpoints require an `Authorization` header containing the JWT token:
```http
Authorization: Bearer <jwt_access_token>
```

### User Roles
- **Admin**: Full administrative permissions over users, catalog products, plans, taxes, discounts, billing, and reports.
- **Internal Staff**: Operational management of customers, quotations, subscriptions, invoices, and payments.
- **Customer**: Access strictly isolated to their own customer profile, subscriptions, invoices, and payments.

---

## 3. API Endpoints Catalog

### 3.1 Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/auth/login` | Authenticate with email & password; returns JWT token & user payload | Public |
| `POST` | `/auth/register` | Customer self-registration (validates password strength & unique email) | Public |
| `GET` | `/auth/me` | Retrieve profile of currently authenticated user | Authenticated |
| `POST` | `/auth/forgot-password` | Generate secure time-limited reset token & dispatches email (or dev log) | Public |
| `POST` | `/auth/reset-password` | Reset password using valid authorization token | Public |

#### Password Strength Validation Rules:
- Length strictly greater than 8 characters (> 8)
- At least one uppercase letter (`A-Z`)
- At least one lowercase letter (`a-z`)
- At least one special character (`!@#$%^&*()_+-=[]{};':"\|,.<>/?`)

---

### 3.2 User Management (`/api/v1/users`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/users` | List all registered user accounts with roles and statuses | Admin |
| `POST` | `/users/staff` | Onboard an Internal Staff member account | Admin |
| `PATCH` | `/users/{id}/status` | Activate, deactivate, or suspend a user account | Admin |

---

### 3.3 Customer Management (`/api/v1/customers`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/customers` | List customers with search & filter | Admin, Staff |
| `GET` | `/customers/{id}` | Retrieve details of a customer | Admin, Staff |
| `POST` | `/customers` | Register an organization customer | Admin, Staff |
| `PUT` | `/customers/{id}` | Update customer organization and billing details | Admin, Staff |

---

### 3.4 Product Catalog & Dynamic Variants (`/api/v1/products`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/products` | List all catalog products and configured variants | Authenticated |
| `GET` | `/products/{id}` | Retrieve single product details | Authenticated |
| `POST` | `/products` | Create a new catalog product | Admin |
| `PUT` | `/products/{id}` | Update product details | Admin |
| `DELETE` | `/products/{id}` | Archive a product (preserves historical invoices) | Admin |
| `POST` | `/products/{id}/variants` | Add a dynamic variant attribute (e.g. Brand, Tier) | Admin |
| `POST` | `/products/variants/{v_id}/options` | Add option with price adjustment (e.g. Odoo Brand +₹560) | Admin |
| `GET` | `/products/{id}/calculate-price` | Compute real-time final price based on selected variant options | Authenticated |

---

### 3.5 Subscription Plans (`/api/v1/plans`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/plans` | List plans (filterable by frequency: daily, weekly, monthly, yearly) | Authenticated |
| `GET` | `/plans/{id}` | Retrieve plan by ID | Authenticated |
| `POST` | `/plans` | Create a subscription plan with lifecycle flags | Admin |
| `PUT` | `/plans/{id}` | Update plan details | Admin |
| `PATCH` | `/plans/{id}/toggle-status` | Toggle active / inactive status | Admin |

---

### 3.6 Quotations & Templates (`/api/v1/quotations` & `/api/v1/quotation-templates`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/quotations` | List quotations with lifecycle statuses | Admin, Staff |
| `GET` | `/quotations/{id}` | Retrieve single quotation with lines | Admin, Staff |
| `POST` | `/quotations` | Create a manual quotation | Admin, Staff |
| `POST` | `/quotations/from-template/{id}` | Generate quotation instantly from a predefined bundle template | Admin, Staff |
| `PATCH` | `/quotations/{id}/status` | Update status (`draft`, `quotation`, `confirmed`, `closed`) | Admin, Staff |
| `POST` | `/quotations/{id}/convert-to-subscription` | Convert confirmed quotation to an active subscription | Admin, Staff |
| `GET` | `/quotation-templates` | List reusable quotation templates | Admin, Staff |
| `POST` | `/quotation-templates` | Create a quotation template with bundled lines | Admin, Staff |
| `DELETE` | `/quotation-templates/{id}` | Remove a quotation template | Admin, Staff |

---

### 3.7 Subscriptions Management (`/api/v1/subscriptions`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/subscriptions` | List subscriptions (isolated to customer for Customer role) | Authenticated |
| `GET` | `/subscriptions/{id}` | Retrieve subscription details and lines | Authenticated |
| `POST` | `/subscriptions` | Activate a new subscription | Admin, Staff |
| `POST` | `/subscriptions/{id}/action` | Execute lifecycle action (`pause`, `resume`, `close`, `renew`) | Admin, Staff |

---

### 3.8 Invoices & Recurring Billing (`/api/v1/invoices`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/invoices` | List invoices (with filters for status and overdue flag) | Authenticated |
| `GET` | `/invoices/{id}` | Retrieve detailed invoice with itemized lines | Authenticated |
| `POST` | `/invoices` | Create manual invoice | Admin, Staff |
| `PATCH` | `/invoices/{id}/status` | Confirm or cancel an invoice | Admin, Staff |
| `POST` | `/invoices/run-billing-cycle` | Trigger automated recurring billing cycle across active subscriptions | Admin, Staff |
| `GET` | `/invoices/{id}/pdf` | Generate and download official Tax Invoice PDF | Authenticated |

---

### 3.9 Taxes & Discounts (`/api/v1/taxes` & `/api/v1/discounts`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/taxes` | List configured tax rules | Authenticated |
| `POST` | `/taxes` | Create tax rule (GST, VAT, Sales Tax) | Admin |
| `PATCH` | `/taxes/{id}/toggle-status` | Toggle tax rule active/inactive | Admin |
| `GET` | `/discounts` | List discount rules with current usage limits | Admin |
| `POST` | `/discounts` | Create percentage or fixed discount rule with limits | Admin |
| `POST` | `/discounts/validate` | Test and validate discount coupon eligibility against order subtotal | Authenticated |

---

### 3.10 Payments (`/api/v1/payments`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/payments` | List payment records | Authenticated |
| `POST` | `/payments` | Record payment against invoice (validates <= balance, auto-marks Paid) | Admin, Staff |

---

### 3.11 Finance & Executive Reports (`/api/v1/reports` & `/api/v1/dashboard`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/dashboard/stats` | Executive KPI summary, monthly revenue, growth trends, transactions | Admin, Staff |
| `GET` | `/reports/finance` | Answers the 6 Core Finance Lead questions | Admin, Staff |
| `GET` | `/reports/export?report_type=...` | Stream CSV export for `invoices`, `subscriptions`, or `payments` | Admin, Staff |

---

### 3.12 Customer Portal (`/api/v1/portal`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/portal/overview` | Customer's isolated dashboard metrics (active subs, total paid, dues) | Customer |
| `GET` | `/portal/profile` | View customer profile | Customer |
| `PUT` | `/portal/profile` | Update permitted contact and billing address details | Customer |
| `GET` | `/portal/subscriptions` | Customer's own subscriptions list | Customer |
| `GET` | `/portal/invoices` | Customer's own invoices list | Customer |
| `GET` | `/portal/invoices/{id}/pdf` | Download official tax invoice PDF for customer's own record | Customer |
| `GET` | `/portal/payments` | Customer's historical payments list | Customer |
| `GET` | `/portal/plans` | Publicly available active subscription plans | Customer |
