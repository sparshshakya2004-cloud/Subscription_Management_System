from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal

# ============================================================================
# AUTH & USER SCHEMAS
# ============================================================================
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    billing_address: Optional[str] = None

class StaffCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str
    phone: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str]
    role_id: int
    role_name: str
    status: str
    customer_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ============================================================================
# CUSTOMER SCHEMAS
# ============================================================================
class CustomerBase(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    phone: Optional[str] = None
    billing_address: Optional[str] = None
    tax_number: Optional[str] = None
    status: Optional[str] = "active"

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    billing_address: Optional[str] = None
    tax_number: Optional[str] = None
    status: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: int
    customer_code: str
    user_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# ============================================================================
# PRODUCT & VARIANT SCHEMAS
# ============================================================================
class ProductVariantOptionBase(BaseModel):
    option_name: str
    price_adjustment: Decimal = Decimal("0.00")

class ProductVariantOptionCreate(ProductVariantOptionBase):
    pass

class ProductVariantOptionResponse(ProductVariantOptionBase):
    id: int
    variant_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ProductVariantBase(BaseModel):
    variant_name: str

class ProductVariantCreate(ProductVariantBase):
    options: List[ProductVariantOptionCreate] = []

class ProductVariantResponse(ProductVariantBase):
    id: int
    product_id: int
    created_at: datetime
    options: List[ProductVariantOptionResponse] = []

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    product_code: str
    name: str
    product_type: str = "software"
    sales_price: Decimal = Decimal("0.00")
    cost_price: Decimal = Decimal("0.00")
    product_notes: Optional[str] = None
    status: str = "active"

class ProductCreate(ProductBase):
    variants: Optional[List[ProductVariantCreate]] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    product_type: Optional[str] = None
    sales_price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    product_notes: Optional[str] = None
    status: Optional[str] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    variants: List[ProductVariantResponse] = []

    class Config:
        from_attributes = True

# ============================================================================
# PLAN SCHEMAS
# ============================================================================
class PlanBase(BaseModel):
    plan_code: str
    plan_name: str
    product_id: int
    plan_price: Decimal
    billing_frequency: str = "monthly"
    minimum_quantity: int = 1
    start_availability_date: date
    end_availability_date: Optional[date] = None
    auto_close: bool = False
    early_closure_allowed: bool = True
    pause_allowed: bool = True
    renewal_allowed: bool = True
    status: str = "active"

class PlanCreate(PlanBase):
    pass

class PlanUpdate(BaseModel):
    plan_name: Optional[str] = None
    plan_price: Optional[Decimal] = None
    billing_frequency: Optional[str] = None
    minimum_quantity: Optional[int] = None
    start_availability_date: Optional[date] = None
    end_availability_date: Optional[date] = None
    auto_close: Optional[bool] = None
    early_closure_allowed: Optional[bool] = None
    pause_allowed: Optional[bool] = None
    renewal_allowed: Optional[bool] = None
    status: Optional[str] = None

class PlanResponse(PlanBase):
    id: int
    product_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# ============================================================================
# QUOTATION TEMPLATE SCHEMAS
# ============================================================================
class QuotationTemplateLineCreate(BaseModel):
    product_id: int
    plan_id: Optional[int] = None
    default_quantity: int = 1
    default_price: Decimal = Decimal("0.00")

class QuotationTemplateLineResponse(BaseModel):
    id: int
    template_id: int
    product_id: int
    product_name: Optional[str] = None
    plan_id: Optional[int] = None
    plan_name: Optional[str] = None
    default_quantity: int
    default_price: Decimal
    created_at: datetime

    class Config:
        from_attributes = True

class QuotationTemplateCreate(BaseModel):
    template_name: str
    description: Optional[str] = None
    validity_days: int = 30
    is_active: bool = True
    lines: List[QuotationTemplateLineCreate] = []

class QuotationTemplateResponse(BaseModel):
    id: int
    template_name: str
    description: Optional[str]
    validity_days: int
    is_active: bool
    created_at: datetime
    lines: List[QuotationTemplateLineResponse] = []

    class Config:
        from_attributes = True

# ============================================================================
# QUOTATION SCHEMAS
# ============================================================================
class QuotationLineCreate(BaseModel):
    product_id: int
    variant_option_id: Optional[int] = None
    quantity: int = 1
    unit_price: Decimal
    tax_rate: Decimal = Decimal("0.00")

class QuotationLineResponse(BaseModel):
    id: int
    quotation_id: int
    product_id: int
    product_name: Optional[str] = None
    variant_option_id: Optional[int] = None
    variant_option_name: Optional[str] = None
    quantity: int
    unit_price: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    line_amount: Decimal
    created_at: datetime

    class Config:
        from_attributes = True

class QuotationCreate(BaseModel):
    customer_id: int
    template_id: Optional[int] = None
    validity_date: date
    notes: Optional[str] = None
    lines: List[QuotationLineCreate]

class QuotationResponse(BaseModel):
    id: int
    quotation_number: str
    customer_id: int
    customer_name: Optional[str] = None
    template_id: Optional[int] = None
    validity_date: date
    status: str
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    notes: Optional[str] = None
    created_at: datetime
    lines: List[QuotationLineResponse] = []

    class Config:
        from_attributes = True

# ============================================================================
# SUBSCRIPTION SCHEMAS
# ============================================================================
class SubscriptionLineCreate(BaseModel):
    product_id: int
    variant_option_id: Optional[int] = None
    quantity: int = 1
    unit_price: Decimal
    tax_rate: Decimal = Decimal("0.00")
    discount_amount: Decimal = Decimal("0.00")

class SubscriptionLineResponse(BaseModel):
    id: int
    subscription_id: int
    product_id: int
    product_name: Optional[str] = None
    variant_option_id: Optional[int] = None
    variant_option_name: Optional[str] = None
    quantity: int
    unit_price: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    line_amount: Decimal
    created_at: datetime

    class Config:
        from_attributes = True

class SubscriptionCreate(BaseModel):
    customer_id: int
    plan_id: int
    quotation_id: Optional[int] = None
    start_date: date
    expiry_date: Optional[date] = None
    next_billing_date: Optional[date] = None
    payment_terms: str = "Net 30"
    auto_close: bool = False
    notes: Optional[str] = None
    lines: List[SubscriptionLineCreate]

class SubscriptionUpdate(BaseModel):
    plan_id: Optional[int] = None
    expiry_date: Optional[date] = None
    next_billing_date: Optional[date] = None
    payment_terms: Optional[str] = None
    auto_close: Optional[bool] = None
    notes: Optional[str] = None

class SubscriptionLifecycleAction(BaseModel):
    action: str = Field(..., description="pause | resume | close | renew")
    reason: Optional[str] = None
    renew_until: Optional[date] = None

class SubscriptionResponse(BaseModel):
    id: int
    subscription_number: str
    customer_id: int
    customer_name: Optional[str] = None
    plan_id: int
    plan_name: Optional[str] = None
    quotation_id: Optional[int] = None
    start_date: date
    expiry_date: Optional[date] = None
    next_billing_date: date
    payment_terms: str
    status: str
    auto_close: bool
    early_closure_allowed: bool
    pause_allowed: bool
    renewal_allowed: bool
    pause_reason: Optional[str] = None
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    notes: Optional[str] = None
    created_at: datetime
    lines: List[SubscriptionLineResponse] = []

    class Config:
        from_attributes = True

# ============================================================================
# TAX SCHEMAS
# ============================================================================
class TaxBase(BaseModel):
    tax_name: str
    tax_rate: Decimal
    tax_type: str = "gst"
    description: Optional[str] = None
    is_active: bool = True

class TaxCreate(TaxBase):
    pass

class TaxUpdate(BaseModel):
    tax_name: Optional[str] = None
    tax_rate: Optional[Decimal] = None
    tax_type: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class TaxResponse(TaxBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ============================================================================
# DISCOUNT SCHEMAS
# ============================================================================
class DiscountBase(BaseModel):
    discount_code: str
    name: str
    discount_type: str = "percentage"
    discount_value: Decimal
    min_purchase_amount: Decimal = Decimal("0.00")
    min_quantity: int = 1
    start_date: date
    end_date: date
    max_usage_limit: int = 100
    is_active: bool = True

class DiscountCreate(DiscountBase):
    applicable_product_ids: Optional[List[int]] = []

class DiscountUpdate(BaseModel):
    name: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[Decimal] = None
    min_purchase_amount: Optional[Decimal] = None
    min_quantity: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_usage_limit: Optional[int] = None
    is_active: Optional[bool] = None

class DiscountResponse(DiscountBase):
    id: int
    current_usage_count: int
    created_at: datetime
    applicable_product_ids: List[int] = []

    class Config:
        from_attributes = True

# ============================================================================
# INVOICE SCHEMAS
# ============================================================================
class InvoiceLineCreate(BaseModel):
    product_id: int
    description: str
    quantity: int = 1
    unit_price: Decimal
    tax_rate: Decimal = Decimal("0.00")
    discount_amount: Decimal = Decimal("0.00")

class InvoiceLineResponse(BaseModel):
    id: int
    invoice_id: int
    product_id: int
    product_name: Optional[str] = None
    description: str
    quantity: int
    unit_price: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    line_total: Decimal
    created_at: datetime

    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    customer_id: int
    subscription_id: Optional[int] = None
    invoice_date: date
    due_date: date
    notes: Optional[str] = None
    lines: List[InvoiceLineCreate]

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    customer_id: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    subscription_id: Optional[int] = None
    subscription_number: Optional[str] = None
    invoice_date: date
    due_date: date
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    outstanding_amount: Decimal
    status: str
    notes: Optional[str] = None
    created_at: datetime
    lines: List[InvoiceLineResponse] = []

    class Config:
        from_attributes = True

# ============================================================================
# PAYMENT SCHEMAS
# ============================================================================
class PaymentCreate(BaseModel):
    invoice_id: int
    amount: Decimal
    payment_method: str = "bank_transfer"
    payment_date: Optional[date] = None
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    payment_number: str
    invoice_id: int
    invoice_number: Optional[str] = None
    customer_id: int
    customer_name: Optional[str] = None
    payment_method: str
    amount: Decimal
    payment_date: date
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# ============================================================================
# DASHBOARD & FINANCE REPORTS
# ============================================================================
class DashboardStatsResponse(BaseModel):
    total_customers: int
    total_products: int
    total_plans: int
    total_subscriptions: int
    active_subscriptions: int
    closed_subscriptions: int
    paused_subscriptions: int
    total_invoices: int
    paid_invoices: int
    outstanding_invoices: int
    overdue_invoices: int
    total_revenue: Decimal
    total_outstanding_amount: Decimal
    monthly_revenue: List[Dict[str, Any]]
    subscription_growth: List[Dict[str, Any]]
    status_distribution: List[Dict[str, Any]]
    recent_transactions: List[Dict[str, Any]]

class FinanceSummaryResponse(BaseModel):
    active_subscriptions_count: int
    total_revenue_received: Decimal
    total_outstanding_amount: Decimal
    overdue_invoices_count: int
    monthly_revenue_breakdown: List[Dict[str, Any]]
    subscriptions_due_for_renewal: List[Dict[str, Any]]
    overdue_invoices_list: List[Dict[str, Any]]
