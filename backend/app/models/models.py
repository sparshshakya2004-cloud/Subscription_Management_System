import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime, Numeric,
    ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from backend.app.database.connection import Base

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    status = Column(Enum("active", "inactive", "suspended", name="user_status"), default="active")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    role = relationship("Role", back_populates="users")
    customer = relationship("Customer", back_populates="user", uselist=False)
    activity_logs = relationship("ActivityLog", back_populates="user")
    reset_tokens = relationship("PasswordResetToken", back_populates="user")


class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    customer_code = Column(String(50), unique=True, nullable=False, index=True)
    company_name = Column(String(150), nullable=False)
    contact_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    phone = Column(String(30), nullable=True)
    billing_address = Column(Text, nullable=True)
    tax_number = Column(String(50), nullable=True)
    status = Column(Enum("active", "inactive", name="cust_status"), default="active")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="customer")
    quotations = relationship("Quotation", back_populates="customer")
    subscriptions = relationship("Subscription", back_populates="customer")
    invoices = relationship("Invoice", back_populates="customer")
    payments = relationship("Payment", back_populates="customer")
    discount_usages = relationship("DiscountUsage", back_populates="customer")


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    product_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    product_type = Column(Enum("software", "service", "addon", "license", name="prod_type"), default="software")
    sales_price = Column(Numeric(12, 2), default=0.00, nullable=False)
    cost_price = Column(Numeric(12, 2), default=0.00, nullable=False)
    product_notes = Column(Text, nullable=True)
    status = Column(Enum("active", "archived", name="prod_status"), default="active", index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    plans = relationship("Plan", back_populates="product")
    product_taxes = relationship("ProductTax", back_populates="product", cascade="all, delete-orphan")


class ProductVariant(Base):
    __tablename__ = "product_variants"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    variant_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    product = relationship("Product", back_populates="variants")
    options = relationship("ProductVariantOption", back_populates="variant", cascade="all, delete-orphan")


class ProductVariantOption(Base):
    __tablename__ = "product_variant_options"
    id = Column(Integer, primary_key=True, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=False, index=True)
    option_name = Column(String(100), nullable=False)
    price_adjustment = Column(Numeric(12, 2), default=0.00, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    variant = relationship("ProductVariant", back_populates="options")


class Plan(Base):
    __tablename__ = "plans"
    id = Column(Integer, primary_key=True, index=True)
    plan_code = Column(String(50), unique=True, nullable=False, index=True)
    plan_name = Column(String(150), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    plan_price = Column(Numeric(12, 2), default=0.00, nullable=False)
    billing_frequency = Column(Enum("daily", "weekly", "monthly", "yearly", name="bill_freq"), default="monthly")
    minimum_quantity = Column(Integer, default=1, nullable=False)
    start_availability_date = Column(Date, nullable=False)
    end_availability_date = Column(Date, nullable=True)
    auto_close = Column(Boolean, default=False, nullable=False)
    early_closure_allowed = Column(Boolean, default=True, nullable=False)
    pause_allowed = Column(Boolean, default=True, nullable=False)
    renewal_allowed = Column(Boolean, default=True, nullable=False)
    status = Column(Enum("active", "inactive", name="plan_status"), default="active", index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    product = relationship("Product", back_populates="plans")
    subscriptions = relationship("Subscription", back_populates="plan")


class PlanProduct(Base):
    __tablename__ = "plan_products"
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    is_included = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class QuotationTemplate(Base):
    __tablename__ = "quotation_templates"
    id = Column(Integer, primary_key=True, index=True)
    template_name = Column(String(150), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    validity_days = Column(Integer, default=30, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    lines = relationship("QuotationTemplateLine", back_populates="template", cascade="all, delete-orphan")


class QuotationTemplateLine(Base):
    __tablename__ = "quotation_template_lines"
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("quotation_templates.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=True)
    default_quantity = Column(Integer, default=1, nullable=False)
    default_price = Column(Numeric(12, 2), default=0.00, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    template = relationship("QuotationTemplate", back_populates="lines")
    product = relationship("Product")
    plan = relationship("Plan")


class Quotation(Base):
    __tablename__ = "quotations"
    id = Column(Integer, primary_key=True, index=True)
    quotation_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("quotation_templates.id"), nullable=True)
    validity_date = Column(Date, nullable=False)
    status = Column(Enum("draft", "quotation", "confirmed", "active", "closed", name="q_status"), default="draft")
    subtotal = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    customer = relationship("Customer", back_populates="quotations")
    template = relationship("QuotationTemplate")
    lines = relationship("QuotationLine", back_populates="quotation", cascade="all, delete-orphan")


class QuotationLine(Base):
    __tablename__ = "quotation_lines"
    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    variant_option_id = Column(Integer, ForeignKey("product_variant_options.id"), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    line_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    quotation = relationship("Quotation", back_populates="lines")
    product = relationship("Product")
    variant_option = relationship("ProductVariantOption")


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    subscription_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=True)
    start_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=True)
    next_billing_date = Column(Date, nullable=False, index=True)
    payment_terms = Column(String(50), default="Net 30", nullable=False)
    status = Column(Enum("draft", "quotation", "confirmed", "active", "paused", "closed", name="sub_status"), default="draft", index=True)
    auto_close = Column(Boolean, default=False, nullable=False)
    early_closure_allowed = Column(Boolean, default=True, nullable=False)
    pause_allowed = Column(Boolean, default=True, nullable=False)
    renewal_allowed = Column(Boolean, default=True, nullable=False)
    pause_reason = Column(String(255), nullable=True)
    subtotal = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    customer = relationship("Customer", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")
    quotation = relationship("Quotation")
    lines = relationship("SubscriptionLine", back_populates="subscription", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="subscription")
    billing_histories = relationship("BillingHistory", back_populates="subscription")


class SubscriptionLine(Base):
    __tablename__ = "subscription_lines"
    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    variant_option_id = Column(Integer, ForeignKey("product_variant_options.id"), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    line_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    subscription = relationship("Subscription", back_populates="lines")
    product = relationship("Product")
    variant_option = relationship("ProductVariantOption")


class Tax(Base):
    __tablename__ = "taxes"
    id = Column(Integer, primary_key=True, index=True)
    tax_name = Column(String(100), unique=True, nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    tax_type = Column(Enum("sales_tax", "vat", "gst", "service_tax", name="tax_types"), default="gst")
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    product_taxes = relationship("ProductTax", back_populates="tax", cascade="all, delete-orphan")


class ProductTax(Base):
    __tablename__ = "product_taxes"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    tax_id = Column(Integer, ForeignKey("taxes.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    product = relationship("Product", back_populates="product_taxes")
    tax = relationship("Tax", back_populates="product_taxes")


class Discount(Base):
    __tablename__ = "discounts"
    id = Column(Integer, primary_key=True, index=True)
    discount_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    discount_type = Column(Enum("fixed", "percentage", name="disc_type"), default="percentage")
    discount_value = Column(Numeric(12, 2), default=0.00, nullable=False)
    min_purchase_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    min_quantity = Column(Integer, default=1, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    max_usage_limit = Column(Integer, default=100, nullable=False)
    current_usage_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    discount_products = relationship("DiscountProduct", back_populates="discount", cascade="all, delete-orphan")
    discount_subscriptions = relationship("DiscountSubscription", back_populates="discount", cascade="all, delete-orphan")
    usages = relationship("DiscountUsage", back_populates="discount")


class DiscountProduct(Base):
    __tablename__ = "discount_products"
    id = Column(Integer, primary_key=True, index=True)
    discount_id = Column(Integer, ForeignKey("discounts.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    discount = relationship("Discount", back_populates="discount_products")
    product = relationship("Product")


class DiscountSubscription(Base):
    __tablename__ = "discount_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    discount_id = Column(Integer, ForeignKey("discounts.id"), nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    discount = relationship("Discount", back_populates="discount_subscriptions")
    subscription = relationship("Subscription")


class DiscountUsage(Base):
    __tablename__ = "discount_usages"
    id = Column(Integer, primary_key=True, index=True)
    discount_id = Column(Integer, ForeignKey("discounts.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    invoice_id = Column(Integer, nullable=True)
    amount_applied = Column(Numeric(12, 2), default=0.00, nullable=False)
    used_at = Column(DateTime, default=datetime.datetime.utcnow)

    discount = relationship("Discount", back_populates="usages")
    customer = relationship("Customer", back_populates="discount_usages")


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    subtotal = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    paid_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    outstanding_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    status = Column(Enum("draft", "confirmed", "paid", "cancelled", "overdue", name="inv_status"), default="draft", index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    customer = relationship("Customer", back_populates="invoices")
    subscription = relationship("Subscription", back_populates="invoices")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    line_total = Column(Numeric(12, 2), default=0.00, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    invoice = relationship("Invoice", back_populates="lines")
    product = relationship("Product")


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    payment_number = Column(String(50), unique=True, nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    payment_method = Column(Enum("cash", "bank_transfer", "upi", "card", "other", name="pay_method"), default="bank_transfer")
    amount = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(Date, nullable=False, index=True)
    transaction_reference = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(Enum("completed", "pending", "failed", name="pay_status"), default="completed")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    invoice = relationship("Invoice", back_populates="payments")
    customer = relationship("Customer", back_populates="payments")


class BillingHistory(Base):
    __tablename__ = "billing_history"
    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    billing_date = Column(Date, nullable=False, index=True)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(Enum("success", "skipped", "failed", name="bill_status"), default="success")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    subscription = relationship("Subscription", back_populates="billing_histories")
    invoice = relationship("Invoice")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="reset_tokens")


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User", back_populates="activity_logs")
