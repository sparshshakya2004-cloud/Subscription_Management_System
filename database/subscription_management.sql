-- ============================================================================
-- Brightloop Software - Subscription Management System
-- Database Schema and Initial Seed Data
-- Target Engine: MySQL 8.0+
-- File: database/subscription_management.sql
-- ============================================================================

CREATE DATABASE IF NOT EXISTS brightloop_subscription
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE brightloop_subscription;

-- Disable foreign key checks for clean drop/recreate if tables exist
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS billing_history;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoice_lines;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS discount_usages;
DROP TABLE IF EXISTS discount_subscriptions;
DROP TABLE IF EXISTS discount_products;
DROP TABLE IF EXISTS discounts;
DROP TABLE IF EXISTS product_taxes;
DROP TABLE IF EXISTS taxes;
DROP TABLE IF EXISTS subscription_lines;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS quotation_lines;
DROP TABLE IF EXISTS quotations;
DROP TABLE IF EXISTS quotation_template_lines;
DROP TABLE IF EXISTS quotation_templates;
DROP TABLE IF EXISTS plan_products;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS product_variant_options;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. ROLES TABLE
-- ============================================================================
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 2. USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NULL,
    role_id INT NOT NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 3. CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL UNIQUE,
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(150) NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30) NULL,
    billing_address TEXT NULL,
    tax_number VARCHAR(50) NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_customers_code (customer_code),
    INDEX idx_customers_email (email)
) ENGINE=InnoDB;

-- ============================================================================
-- 4. PRODUCTS TABLE
-- ============================================================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    product_type ENUM('software', 'service', 'addon', 'license') NOT NULL DEFAULT 'software',
    sales_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    product_notes TEXT NULL,
    status ENUM('active', 'archived') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_products_code (product_code),
    INDEX idx_products_status (status)
) ENGINE=InnoDB;

-- ============================================================================
-- 5. PRODUCT VARIANTS TABLE
-- ============================================================================
CREATE TABLE product_variants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    variant_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_variants_product (product_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 6. PRODUCT VARIANT OPTIONS TABLE
-- ============================================================================
CREATE TABLE product_variant_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    variant_id INT NOT NULL,
    option_name VARCHAR(100) NOT NULL,
    price_adjustment DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_options_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    INDEX idx_options_variant (variant_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 7. PLANS TABLE
-- ============================================================================
CREATE TABLE plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_code VARCHAR(50) NOT NULL UNIQUE,
    plan_name VARCHAR(150) NOT NULL,
    product_id INT NOT NULL,
    plan_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    billing_frequency ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL DEFAULT 'monthly',
    minimum_quantity INT NOT NULL DEFAULT 1,
    start_availability_date DATE NOT NULL,
    end_availability_date DATE NULL,
    auto_close BOOLEAN NOT NULL DEFAULT FALSE,
    early_closure_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    pause_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    renewal_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_plans_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_plans_code (plan_code),
    INDEX idx_plans_status (status),
    INDEX idx_plans_frequency (billing_frequency)
) ENGINE=InnoDB;

-- ============================================================================
-- 8. PLAN PRODUCTS (BUNDLE / INCLUDED PRODUCTS)
-- ============================================================================
CREATE TABLE plan_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    product_id INT NOT NULL,
    is_included BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_planprod_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_planprod_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_plan_product (plan_id, product_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 9. QUOTATION TEMPLATES TABLE
-- ============================================================================
CREATE TABLE quotation_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT NULL,
    validity_days INT NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 10. QUOTATION TEMPLATE LINES TABLE
-- ============================================================================
CREATE TABLE quotation_template_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    product_id INT NOT NULL,
    plan_id INT NULL,
    default_quantity INT NOT NULL DEFAULT 1,
    default_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_templines_template FOREIGN KEY (template_id) REFERENCES quotation_templates(id) ON DELETE CASCADE,
    CONSTRAINT fk_templines_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_templines_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 11. QUOTATIONS TABLE
-- ============================================================================
CREATE TABLE quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    template_id INT NULL,
    validity_date DATE NOT NULL,
    status ENUM('draft', 'quotation', 'confirmed', 'active', 'closed') DEFAULT 'draft',
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_quotations_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_quotations_template FOREIGN KEY (template_id) REFERENCES quotation_templates(id) ON DELETE SET NULL,
    INDEX idx_quotations_number (quotation_number),
    INDEX idx_quotations_status (status)
) ENGINE=InnoDB;

-- ============================================================================
-- 12. QUOTATION LINES TABLE
-- ============================================================================
CREATE TABLE quotation_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    product_id INT NOT NULL,
    variant_option_id INT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    line_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_qlines_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    CONSTRAINT fk_qlines_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_qlines_option FOREIGN KEY (variant_option_id) REFERENCES product_variant_options(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 13. SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    plan_id INT NOT NULL,
    quotation_id INT NULL,
    start_date DATE NOT NULL,
    expiry_date DATE NULL,
    next_billing_date DATE NOT NULL,
    payment_terms VARCHAR(50) NOT NULL DEFAULT 'Net 30',
    status ENUM('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed') NOT NULL DEFAULT 'draft',
    auto_close BOOLEAN NOT NULL DEFAULT FALSE,
    early_closure_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    pause_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    renewal_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    pause_reason VARCHAR(255) NULL,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_subs_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_subs_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT,
    CONSTRAINT fk_subs_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
    INDEX idx_subs_number (subscription_number),
    INDEX idx_subs_customer (customer_id),
    INDEX idx_subs_status (status),
    INDEX idx_subs_next_billing (next_billing_date)
) ENGINE=InnoDB;

-- ============================================================================
-- 14. SUBSCRIPTION LINES TABLE
-- ============================================================================
CREATE TABLE subscription_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id INT NOT NULL,
    product_id INT NOT NULL,
    variant_option_id INT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    line_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sublines_sub FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_sublines_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sublines_option FOREIGN KEY (variant_option_id) REFERENCES product_variant_options(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 15. TAXES TABLE
-- ============================================================================
CREATE TABLE taxes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tax_name VARCHAR(100) NOT NULL UNIQUE,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    tax_type ENUM('sales_tax', 'vat', 'gst', 'service_tax') NOT NULL DEFAULT 'gst',
    description VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_taxes_active (is_active)
) ENGINE=InnoDB;

-- ============================================================================
-- 16. PRODUCT TAXES TABLE
-- ============================================================================
CREATE TABLE product_taxes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    tax_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prodtax_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_prodtax_tax FOREIGN KEY (tax_id) REFERENCES taxes(id) ON DELETE CASCADE,
    UNIQUE KEY uk_product_tax (product_id, tax_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 17. DISCOUNTS TABLE
-- ============================================================================
CREATE TABLE discounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discount_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    discount_type ENUM('fixed', 'percentage') NOT NULL DEFAULT 'percentage',
    discount_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    min_purchase_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    min_quantity INT NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    max_usage_limit INT NOT NULL DEFAULT 100,
    current_usage_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_discounts_code (discount_code),
    INDEX idx_discounts_active (is_active)
) ENGINE=InnoDB;

-- ============================================================================
-- 18. DISCOUNT PRODUCTS TABLE (PRODUCT-SPECIFIC DISCOUNTS)
-- ============================================================================
CREATE TABLE discount_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discount_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_discprod_discount FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_discprod_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uk_discount_product (discount_id, product_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 19. DISCOUNT SUBSCRIPTIONS TABLE (SUBSCRIPTION-WIDE APPLICABILITY)
-- ============================================================================
CREATE TABLE discount_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discount_id INT NOT NULL,
    subscription_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_discsub_discount FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_discsub_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    UNIQUE KEY uk_discount_subscription (discount_id, subscription_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 20. DISCOUNT USAGES TABLE
-- ============================================================================
CREATE TABLE discount_usages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discount_id INT NOT NULL,
    customer_id INT NOT NULL,
    invoice_id INT NULL,
    amount_applied DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_discusage_discount FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_discusage_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    INDEX idx_discusage_customer (customer_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 21. INVOICES TABLE
-- ============================================================================
CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    subscription_id INT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    outstanding_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status ENUM('draft', 'confirmed', 'paid', 'cancelled', 'overdue') NOT NULL DEFAULT 'draft',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    INDEX idx_invoices_number (invoice_number),
    INDEX idx_invoices_customer (customer_id),
    INDEX idx_invoices_status (status),
    INDEX idx_invoices_due_date (due_date)
) ENGINE=InnoDB;

-- ============================================================================
-- 22. INVOICE LINES TABLE
-- ============================================================================
CREATE TABLE invoice_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    product_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invlines_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_invlines_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 23. PAYMENTS TABLE
-- ============================================================================
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_id INT NOT NULL,
    customer_id INT NOT NULL,
    payment_method ENUM('cash', 'bank_transfer', 'upi', 'card', 'other') NOT NULL DEFAULT 'bank_transfer',
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    transaction_reference VARCHAR(100) NULL,
    notes TEXT NULL,
    status ENUM('completed', 'pending', 'failed') NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    INDEX idx_payments_number (payment_number),
    INDEX idx_payments_invoice (invoice_id),
    INDEX idx_payments_customer (customer_id),
    INDEX idx_payments_date (payment_date)
) ENGINE=InnoDB;

-- ============================================================================
-- 24. BILLING HISTORY TABLE
-- ============================================================================
CREATE TABLE billing_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id INT NOT NULL,
    invoice_id INT NULL,
    billing_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status ENUM('success', 'skipped', 'failed') NOT NULL DEFAULT 'success',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bilhist_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_bilhist_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    INDEX idx_bilhist_subscription (subscription_id),
    INDEX idx_bilhist_date (billing_date)
) ENGINE=InnoDB;

-- ============================================================================
-- 25. PASSWORD RESET TOKENS TABLE
-- ============================================================================
CREATE TABLE password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pwreset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_pwreset_token (token)
) ENGINE=InnoDB;

-- ============================================================================
-- 26. ACTIVITY LOGS TABLE
-- ============================================================================
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_actlogs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_actlogs_action (action),
    INDEX idx_actlogs_entity (entity_type, entity_id),
    INDEX idx_actlogs_created (created_at)
) ENGINE=InnoDB;


-- ============================================================================
-- SEED DATA SECTION
-- ============================================================================

-- 1. Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'Admin', 'Full administrative control over products, plans, billing, financial reports and users'),
(2, 'Internal Staff', 'Day-to-day operations: quotations, subscriptions, invoices, and payment recording'),
(3, 'Customer', 'Customer portal access: view/manage own subscriptions, view invoices, download PDFs');

-- 2. Users (Passwords: Admin@12345, Staff@12345, Customer@12345)
INSERT INTO users (id, email, password_hash, full_name, phone, role_id, status) VALUES
(1, 'admin@brightloop.com', '$2b$12$LzFzOF334hcwyh/Ji5BlMO7kMjz3wnnMZhTBXLWLYW7LfYF6new9u', 'Eleanor Vance (Admin)', '+91 98765 43210', 1, 'active'),
(2, 'staff@brightloop.com', '$2b$12$KsODR5431gWh7.J/slYoxutVxvqNHrhHDnopgV3yosnnI.AxzsxP.', 'Julian Hayes (Sales Staff)', '+91 98765 43211', 2, 'active'),
(3, 'acme@example.com', '$2b$12$./1rHNZRa3pt7zVbHiefFOgioCvXxuvmhbawK/ACRQNYHnxLaqtR6', 'Arthur Dent', '+91 98765 11111', 3, 'active'),
(4, 'zenith@example.com', '$2b$12$./1rHNZRa3pt7zVbHiefFOgioCvXxuvmhbawK/ACRQNYHnxLaqtR6', 'Diana Prince', '+91 98765 22222', 3, 'active'),
(5, 'apex@example.com', '$2b$12$./1rHNZRa3pt7zVbHiefFOgioCvXxuvmhbawK/ACRQNYHnxLaqtR6', 'Bruce Wayne', '+91 98765 33333', 3, 'active');

-- 3. Customers
INSERT INTO customers (id, user_id, customer_code, company_name, contact_name, email, phone, billing_address, tax_number, status) VALUES
(1, 3, 'CUST-001', 'Acme Corporation', 'Arthur Dent', 'acme@example.com', '+91 98765 11111', '42 Hitchhiker Way, Sector 5, Bangalore 560001', '29ABCDE1234F1Z5', 'active'),
(2, 4, 'CUST-002', 'Zenith Logistics Ltd', 'Diana Prince', 'zenith@example.com', '+91 98765 22222', '100 Gateway Tower, BKC, Mumbai 400051', '27ABCDE5678F1Z2', 'active'),
(3, 5, 'CUST-003', 'Apex Innovations Pvt Ltd', 'Bruce Wayne', 'apex@example.com', '+91 98765 33333', 'Wayne Manor, Industrial Area, Hyderabad 500081', '36ABCDE9012F1Z8', 'active');

-- 4. Taxes
INSERT INTO taxes (id, tax_name, tax_rate, tax_type, description, is_active) VALUES
(1, 'GST 18%', 18.00, 'gst', 'Standard Goods & Services Tax (India)', TRUE),
(2, 'GST 5%', 5.00, 'gst', 'Concessional GST rate for educational services', TRUE),
(3, 'VAT 5%', 5.00, 'vat', 'Value Added Tax for international GCC customers', TRUE),
(4, 'Zero Tax 0%', 0.00, 'sales_tax', 'Exempt export sales', TRUE);

-- 5. Products
INSERT INTO products (id, product_code, name, product_type, sales_price, cost_price, product_notes, status) VALUES
(1, 'PROD-ERP', 'Brightloop ERP Core', 'software', 1200.00, 300.00, 'Complete enterprise resource planning module with multi-company support.', 'active'),
(2, 'PROD-CRM', 'Brightloop Sales CRM', 'software', 800.00, 200.00, 'Lead scoring, pipeline management, email tracking and quote generation.', 'active'),
(3, 'PROD-CLOUD', 'Dedicated Cloud Storage (100GB)', 'addon', 250.00, 50.00, 'High availability NVMe cloud storage add-on for document attachments.', 'active'),
(4, 'PROD-SUPPORT', 'Priority 24/7 SLA Support', 'service', 1500.00, 400.00, 'Dedicated technical account manager with 15-minute response SLA.', 'active'),
(5, 'PROD-API', 'Custom API & Webhooks Access', 'license', 600.00, 100.00, 'High-volume REST and GraphQL API tokens with webhook notifications.', 'active');

-- 6. Product Taxes
INSERT INTO product_taxes (product_id, tax_id) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),
(5, 1);

-- 7. Product Variants & Options (Notice Brand with Odoo Brand +560 as requested in problem statement)
INSERT INTO product_variants (id, product_id, variant_name) VALUES
(1, 1, 'Brand'),
(2, 1, 'Deployment Mode'),
(3, 2, 'Tier');

INSERT INTO product_variant_options (id, variant_id, option_name, price_adjustment) VALUES
(1, 1, 'Standard Brand', 0.00),
(2, 1, 'Odoo Brand', 560.00),
(3, 2, 'Multi-tenant Cloud', 0.00),
(4, 2, 'Dedicated Private Server', 1500.00),
(5, 3, 'Professional Edition', 0.00),
(6, 3, 'Enterprise Edition', 400.00);

-- 8. Plans
INSERT INTO plans (id, plan_code, plan_name, product_id, plan_price, billing_frequency, minimum_quantity, start_availability_date, end_availability_date, auto_close, early_closure_allowed, pause_allowed, renewal_allowed, status) VALUES
(1, 'PLAN-ERP-MO', 'Brightloop ERP Monthly', 1, 1200.00, 'monthly', 1, '2026-01-01', '2027-12-31', FALSE, TRUE, TRUE, TRUE, 'active'),
(2, 'PLAN-ERP-YR', 'Brightloop ERP Annual Growth', 1, 12000.00, 'yearly', 1, '2026-01-01', '2027-12-31', FALSE, TRUE, TRUE, TRUE, 'active'),
(3, 'PLAN-CRM-MO', 'Sales CRM Monthly Pro', 2, 800.00, 'monthly', 1, '2026-01-01', '2027-12-31', FALSE, TRUE, TRUE, TRUE, 'active'),
(4, 'PLAN-DEV-WK', 'Developer Sandbox Weekly', 5, 200.00, 'weekly', 1, '2026-01-01', '2027-12-31', TRUE, TRUE, FALSE, TRUE, 'active'),
(5, 'PLAN-EVENT-DA', 'Special Event Daily Pass', 1, 99.00, 'daily', 1, '2026-01-01', '2027-12-31', TRUE, TRUE, FALSE, FALSE, 'active');

-- 9. Quotation Templates
INSERT INTO quotation_templates (id, template_name, description, validity_days, is_active) VALUES
(1, 'Enterprise Standard Bundle', 'Includes ERP Core + CRM + 100GB Cloud Storage with 30-day price lock.', 30, TRUE),
(2, 'SaaS Starter Pack', 'Basic CRM with Cloud Storage for small businesses.', 15, TRUE);

INSERT INTO quotation_template_lines (template_id, product_id, plan_id, default_quantity, default_price) VALUES
(1, 1, 1, 5, 1200.00),
(1, 2, 3, 5, 800.00),
(1, 3, NULL, 2, 250.00),
(2, 2, 3, 2, 800.00),
(2, 3, NULL, 1, 250.00);

-- 10. Discounts
INSERT INTO discounts (id, discount_code, name, discount_type, discount_value, min_purchase_amount, min_quantity, start_date, end_date, max_usage_limit, current_usage_count, is_active) VALUES
(1, 'BRIGHT10', 'Early Bird 10% Off', 'percentage', 10.00, 1000.00, 1, '2026-01-01', '2027-12-31', 500, 3, TRUE),
(2, 'BULK500', 'Volume Discount Flat ₹500 Off', 'fixed', 500.00, 3000.00, 3, '2026-01-01', '2027-12-31', 100, 1, TRUE),
(3, 'VIP20', 'Enterprise Partner 20% Off', 'percentage', 20.00, 5000.00, 5, '2026-01-01', '2027-12-31', 50, 0, TRUE);

INSERT INTO discount_products (discount_id, product_id) VALUES
(1, 1),
(1, 2),
(2, 1);

-- 11. Quotations
INSERT INTO quotations (id, quotation_number, customer_id, template_id, validity_date, status, subtotal, tax_amount, discount_amount, total_amount, notes) VALUES
(1, 'QTN-2026-0001', 1, 1, '2026-11-30', 'confirmed', 10500.00, 1890.00, 1050.00, 11340.00, 'Standard enterprise deployment with 5 seats.'),
(2, 'QTN-2026-0002', 2, 2, '2026-11-15', 'quotation', 1850.00, 333.00, 0.00, 2183.00, 'Awaiting customer sign-off on starter pack.'),
(3, 'QTN-2026-0003', 3, NULL, '2026-12-15', 'draft', 12000.00, 2160.00, 1200.00, 12960.00, 'Annual enterprise custom quote.');

INSERT INTO quotation_lines (quotation_id, product_id, variant_option_id, quantity, unit_price, tax_rate, tax_amount, line_amount) VALUES
(1, 1, 2, 5, 1760.00, 18.00, 1584.00, 8800.00), -- 1200 + 560 Odoo brand = 1760
(1, 3, NULL, 2, 250.00, 18.00, 90.00, 500.00),
(2, 2, 5, 2, 800.00, 18.00, 288.00, 1600.00),
(2, 3, NULL, 1, 250.00, 18.00, 45.00, 250.00),
(3, 1, 1, 10, 1200.00, 18.00, 2160.00, 12000.00);

-- 12. Subscriptions
INSERT INTO subscriptions (id, subscription_number, customer_id, plan_id, quotation_id, start_date, expiry_date, next_billing_date, payment_terms, status, auto_close, early_closure_allowed, pause_allowed, renewal_allowed, subtotal, tax_amount, discount_amount, total_amount, notes) VALUES
(1, 'SUB-2026-0001', 1, 1, 1, '2026-10-01', '2027-09-30', '2026-11-01', 'Net 30', 'active', FALSE, TRUE, TRUE, TRUE, 8800.00, 1584.00, 880.00, 9504.00, 'Acme Corp ERP Monthly with Odoo Brand variant'),
(2, 'SUB-2026-0002', 2, 3, NULL, '2026-09-15', '2027-09-14', '2026-11-15', 'Net 15', 'active', FALSE, TRUE, TRUE, TRUE, 1600.00, 288.00, 0.00, 1888.00, 'Zenith Logistics 2-seat CRM'),
(3, 'SUB-2026-0003', 3, 2, NULL, '2026-01-01', '2026-12-31', '2027-01-01', 'Net 30', 'active', FALSE, TRUE, TRUE, TRUE, 12000.00, 2160.00, 1200.00, 12960.00, 'Apex Innovations Annual Plan'),
(4, 'SUB-2026-0004', 1, 4, NULL, '2026-08-01', '2026-10-01', '2026-10-01', 'Immediate', 'closed', TRUE, TRUE, FALSE, TRUE, 800.00, 144.00, 0.00, 944.00, 'Sandbox completed and auto-closed'),
(5, 'SUB-2026-0005', 2, 1, NULL, '2026-07-01', '2027-06-30', '2026-11-01', 'Net 30', 'paused', FALSE, TRUE, TRUE, TRUE, 2400.00, 432.00, 0.00, 2832.00, 'Temporarily paused due to company restructuring');

INSERT INTO subscription_lines (subscription_id, product_id, variant_option_id, quantity, unit_price, tax_rate, tax_amount, discount_amount, line_amount) VALUES
(1, 1, 2, 5, 1760.00, 18.00, 1584.00, 880.00, 8800.00), -- With Odoo Brand variant +560
(2, 2, 5, 2, 800.00, 18.00, 288.00, 0.00, 1600.00),
(3, 1, 1, 1, 12000.00, 18.00, 2160.00, 1200.00, 12000.00),
(4, 5, NULL, 4, 200.00, 18.00, 144.00, 0.00, 800.00),
(5, 1, 1, 2, 1200.00, 18.00, 432.00, 0.00, 2400.00);

-- 13. Invoices
INSERT INTO invoices (id, invoice_number, customer_id, subscription_id, invoice_date, due_date, subtotal, tax_amount, discount_amount, total_amount, paid_amount, outstanding_amount, status, notes) VALUES
(1, 'INV-2026-0001', 1, 1, '2026-10-01', '2026-10-31', 8800.00, 1584.00, 880.00, 9504.00, 9504.00, 0.00, 'paid', 'October 2026 monthly billing - Fully paid'),
(2, 'INV-2026-0002', 2, 2, '2026-09-15', '2026-09-30', 1600.00, 288.00, 0.00, 1888.00, 1888.00, 0.00, 'paid', 'September CRM billing - Fully paid'),
(3, 'INV-2026-0003', 2, 2, '2026-10-15', '2026-10-30', 1600.00, 288.00, 0.00, 1888.00, 1000.00, 888.00, 'overdue', 'October CRM billing - Partially paid, currently overdue'),
(4, 'INV-2026-0004', 3, 3, '2026-01-01', '2026-01-31', 12000.00, 2160.00, 1200.00, 12960.00, 12960.00, 0.00, 'paid', 'Annual Enterprise contract 2026'),
(5, 'INV-2026-0005', 1, 1, '2026-11-01', '2026-12-01', 8800.00, 1584.00, 880.00, 9504.00, 0.00, 9504.00, 'confirmed', 'November 2026 upcoming monthly invoice generated by recurring billing');

INSERT INTO invoice_lines (invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, discount_amount, line_total) VALUES
(1, 1, 'Brightloop ERP Core - Odoo Brand (5 Seats)', 5, 1760.00, 18.00, 1584.00, 880.00, 9504.00),
(2, 2, 'Brightloop Sales CRM - Professional (2 Seats)', 2, 800.00, 18.00, 288.00, 0.00, 1888.00),
(3, 2, 'Brightloop Sales CRM - Professional (2 Seats)', 2, 800.00, 18.00, 288.00, 0.00, 1888.00),
(4, 1, 'Brightloop ERP Core Annual Plan', 1, 12000.00, 18.00, 2160.00, 1200.00, 12960.00),
(5, 1, 'Brightloop ERP Core - Odoo Brand (5 Seats)', 5, 1760.00, 18.00, 1584.00, 880.00, 9504.00);

-- 14. Payments
INSERT INTO payments (id, payment_number, invoice_id, customer_id, payment_method, amount, payment_date, transaction_reference, notes, status) VALUES
(1, 'PAY-2026-0001', 1, 1, 'bank_transfer', 9504.00, '2026-10-05', 'HDFC-NEFT-984321', 'Payment received via HDFC NetBanking for INV-2026-0001', 'completed'),
(2, 'PAY-2026-0002', 2, 2, 'upi', 1888.00, '2026-09-20', 'UPI-TXN-49204820', 'UPI transaction cleared for INV-2026-0002', 'completed'),
(3, 'PAY-2026-0003', 3, 2, 'card', 1000.00, '2026-10-25', 'STRIPE-CH-829147', 'Part payment of 1,000 received; balance 888 outstanding', 'completed'),
(4, 'PAY-2026-0004', 4, 3, 'bank_transfer', 12960.00, '2026-01-10', 'ICICI-RTGS-592019', 'Full annual enterprise advance payment received', 'completed');

-- 15. Billing History
INSERT INTO billing_history (subscription_id, invoice_id, billing_date, period_start, period_end, amount, status, notes) VALUES
(1, 1, '2026-10-01', '2026-10-01', '2026-10-31', 9504.00, 'success', 'October billing cycle executed successfully'),
(2, 2, '2026-09-15', '2026-09-15', '2026-10-14', 1888.00, 'success', 'September billing cycle executed successfully'),
(2, 3, '2026-10-15', '2026-10-15', '2026-11-14', 1888.00, 'success', 'October billing cycle executed successfully'),
(3, 4, '2026-01-01', '2026-01-01', '2026-12-31', 12960.00, 'success', 'Annual contract billing cycle executed successfully'),
(1, 5, '2026-11-01', '2026-11-01', '2026-11-30', 9504.00, 'success', 'November billing cycle executed successfully');

-- 16. Activity Logs
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES
(1, 'USER_LOGIN', 'users', 1, 'Admin logged into Brightloop Portal', '127.0.0.1'),
(1, 'CREATE_PLAN', 'plans', 1, 'Admin created Brightloop ERP Monthly Plan', '127.0.0.1'),
(2, 'CREATE_SUBSCRIPTION', 'subscriptions', 1, 'Staff Julian Hayes generated subscription SUB-2026-0001 for Acme Corp', '127.0.0.1'),
(2, 'RECORD_PAYMENT', 'payments', 1, 'Recorded full payment of 9504 for INV-2026-0001', '127.0.0.1');

-- Done
