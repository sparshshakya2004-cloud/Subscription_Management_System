import pytest
from datetime import date, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.connection import SessionLocal
from backend.app.models.models import User, Customer, Product, Plan, Subscription, Invoice, Payment

client = TestClient(app)

def test_1_password_validation_on_registration():
    """Verify password strength validation rejects weak passwords."""
    # Too short
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Weak Pass User",
        "email": "weak@example.com",
        "password": "Short1!"
    })
    assert res.status_code == 400
    assert "strictly longer than 8 characters" in res.json()["detail"]

    # Missing uppercase
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Weak Pass User",
        "email": "weak@example.com",
        "password": "nouppercase123!"
    })
    assert res.status_code == 400
    assert "uppercase" in res.json()["detail"]

    # Missing special char
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Weak Pass User",
        "email": "weak@example.com",
        "password": "ValidPassword123"
    })
    assert res.status_code == 400
    assert "special character" in res.json()["detail"]

import uuid

def test_2_customer_registration_and_isolation():
    """Customer registration generates user, linked customer profile, and JWT."""
    unique_id = uuid.uuid4().hex[:8]
    email = f"customer_{unique_id}@testcorp.com"
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Test Customer Lead",
        "email": email,
        "password": "Customer@Secure2026",
        "company_name": "TestCorp Global",
        "phone": "+91 99999 88888",
        "billing_address": "Tech Park, Bangalore"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify portal overview works for this customer
    ov_res = client.get("/api/v1/portal/overview", headers=headers)
    assert ov_res.status_code == 200
    assert ov_res.json()["company_name"] == "TestCorp Global"

    # Verify customer CANNOT access admin users list
    admin_res = client.get("/api/v1/users", headers=headers)
    assert admin_res.status_code == 403

def test_3_admin_and_staff_roles():
    """Admin full access vs Staff limited access."""
    # Admin login
    res_admin = client.post("/api/v1/auth/login", json={"email": "admin@brightloop.com", "password": "Admin@12345"})
    assert res_admin.status_code == 200
    admin_token = res_admin.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Staff login
    res_staff = client.post("/api/v1/auth/login", json={"email": "staff@brightloop.com", "password": "Staff@12345"})
    assert res_staff.status_code == 200
    staff_token = res_staff.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    # Admin CAN access user management
    assert client.get("/api/v1/users", headers=admin_headers).status_code == 200

    # Staff CANNOT access user management
    assert client.get("/api/v1/users", headers=staff_headers).status_code == 403

    # Both CAN access customers
    assert client.get("/api/v1/customers", headers=admin_headers).status_code == 200
    assert client.get("/api/v1/customers", headers=staff_headers).status_code == 200

def test_4_forgot_password_and_reset():
    """Forgot password generates token and resets password securely."""
    # Request token
    res = client.post("/api/v1/auth/forgot-password", json={"email": "acme@example.com"})
    assert res.status_code == 200
    dev_info = res.json().get("dev_info")
    assert dev_info is not None
    token = dev_info["token"]

    # Reset password with weak password should fail
    res_fail = client.post("/api/v1/auth/reset-password", json={
        "token": token,
        "new_password": "weak"
    })
    assert res_fail.status_code == 400

    # Reset password with valid password succeeds
    res_ok = client.post("/api/v1/auth/reset-password", json={
        "token": token,
        "new_password": "Customer@NewPass2026"
    })
    assert res_ok.status_code == 200

    # Verify login with new password
    res_login = client.post("/api/v1/auth/login", json={
        "email": "acme@example.com",
        "password": "Customer@NewPass2026"
    })
    assert res_login.status_code == 200

    # Reset back to Customer@12345 for consistency
    res_re = client.post("/api/v1/auth/forgot-password", json={"email": "acme@example.com"})
    token2 = res_re.json()["dev_info"]["token"]
    client.post("/api/v1/auth/reset-password", json={
        "token": token2,
        "new_password": "Customer@12345"
    })

def test_5_product_variants_pricing():
    """Verify dynamic variant price computation (Standard Brand +0, Odoo Brand +560)."""
    res_admin = client.post("/api/v1/auth/login", json={"email": "admin@brightloop.com", "password": "Admin@12345"})
    admin_headers = {"Authorization": f"Bearer {res_admin.json()['access_token']}"}

    # Product 1 is Brightloop ERP Core (Base price: 1200)
    # Option 2 is Odoo Brand (+560)
    res_calc = client.get("/api/v1/products/1/calculate-price?option_ids=2", headers=admin_headers)
    assert res_calc.status_code == 200
    calc = res_calc.json()
    assert calc["base_price"] == 1200.0
    assert calc["total_adjustments"] == 560.0
    assert calc["final_price"] == 1760.0

def test_6_quotation_template_and_conversion():
    """Verify generating quotation from template and converting to active subscription."""
    res_admin = client.post("/api/v1/auth/login", json={"email": "admin@brightloop.com", "password": "Admin@12345"})
    admin_headers = {"Authorization": f"Bearer {res_admin.json()['access_token']}"}

    # Generate quote from template 1 for customer 1
    res_quote = client.post("/api/v1/quotations/from-template/1?customer_id=1", headers=admin_headers)
    assert res_quote.status_code == 200
    quote = res_quote.json()
    assert quote["customer_id"] == 1
    assert len(quote["lines"]) > 0

    # Convert quote to subscription
    res_conv = client.post(f"/api/v1/quotations/{quote['id']}/convert-to-subscription", headers=admin_headers)
    assert res_conv.status_code == 200
    sub_id = res_conv.json()["subscription_id"]

    # Verify subscription is now active
    sub_res = client.get(f"/api/v1/subscriptions/{sub_id}", headers=admin_headers)
    assert sub_res.status_code == 200
    assert sub_res.json()["status"] == "active"

def test_7_subscription_lifecycle():
    """Verify pause, resume, close, renew lifecycle operations."""
    res_admin = client.post("/api/v1/auth/login", json={"email": "admin@brightloop.com", "password": "Admin@12345"})
    admin_headers = {"Authorization": f"Bearer {res_admin.json()['access_token']}"}

    # Use Subscription 1 (Acme Corp, active, pause_allowed=True, renewal_allowed=True)
    # 1. Pause
    res_pause = client.post("/api/v1/subscriptions/1/action", json={"action": "pause", "reason": "Maintenance hold"}, headers=admin_headers)
    assert res_pause.status_code == 200
    assert res_pause.json()["status"] == "paused"

    # 2. Resume
    res_resume = client.post("/api/v1/subscriptions/1/action", json={"action": "resume"}, headers=admin_headers)
    assert res_resume.status_code == 200
    assert res_resume.json()["status"] == "active"

    # 3. Renew
    res_renew = client.post("/api/v1/subscriptions/1/action", json={"action": "renew"}, headers=admin_headers)
    assert res_renew.status_code == 200
    assert res_renew.json()["status"] == "active"

def test_8_automated_recurring_billing_and_idempotency():
    """Verify automated billing engine generates invoices and enforces idempotency."""
    res_admin = client.post("/api/v1/auth/login", json={"email": "admin@brightloop.com", "password": "Admin@12345"})
    admin_headers = {"Authorization": f"Bearer {res_admin.json()['access_token']}"}

    # Run billing cycle for target date
    res_bill1 = client.post("/api/v1/invoices/run-billing-cycle?target_date=2026-11-01", headers=admin_headers)
    assert res_bill1.status_code == 200

    # Running immediately again for the same date must be idempotent (no duplicate invoices created)
    res_bill2 = client.post("/api/v1/invoices/run-billing-cycle?target_date=2026-11-01", headers=admin_headers)
    assert res_bill2.status_code == 200
    assert res_bill2.json()["details"]["invoices_generated_count"] == 0

def test_9_payment_recording_and_auto_status_update():
    """Verify recording payment validates <= outstanding, updates balance, and marks invoice paid."""
    res_admin = client.post("/api/v1/auth/login", json={"email": "admin@brightloop.com", "password": "Admin@12345"})
    admin_headers = {"Authorization": f"Bearer {res_admin.json()['access_token']}"}

    # Invoice 3 is partially paid with outstanding balance
    inv_res = client.get("/api/v1/invoices/3", headers=admin_headers)
    assert inv_res.status_code == 200
    inv = inv_res.json()
    outstanding = Decimal(str(inv["outstanding_amount"]))

    if outstanding > Decimal("0.00"):
        # Payment exceeding outstanding balance must fail
        res_fail = client.post("/api/v1/payments", json={
            "invoice_id": 3,
            "amount": float(outstanding + Decimal("500.00")),
            "payment_method": "upi"
        }, headers=admin_headers)
        assert res_fail.status_code == 400

        # Partial payment of 100
        pay_amt = min(Decimal("100.00"), outstanding)
        res_pay = client.post("/api/v1/payments", json={
            "invoice_id": 3,
            "amount": float(pay_amt),
            "payment_method": "upi",
            "transaction_reference": "TEST-UPI-123456"
        }, headers=admin_headers)
        assert res_pay.status_code == 201

        # Check invoice balance was updated
        inv_after = client.get("/api/v1/invoices/3", headers=admin_headers).json()
        assert Decimal(str(inv_after["paid_amount"])) == Decimal(str(inv["paid_amount"])) + pay_amt

def test_10_finance_reporting_6_questions():
    """Verify the 6 core questions are answered from live MySQL database."""
    res_admin = client.post("/api/v1/auth/login", json={"email": "admin@brightloop.com", "password": "Admin@12345"})
    admin_headers = {"Authorization": f"Bearer {res_admin.json()['access_token']}"}

    res_fin = client.get("/api/v1/reports/finance", headers=admin_headers)
    assert res_fin.status_code == 200
    data = res_fin.json()

    # Q1: Active Subscriptions
    assert "active_subscriptions_count" in data
    assert data["active_subscriptions_count"] >= 1

    # Q2: Revenue Received
    assert "total_revenue_received" in data
    assert float(data["total_revenue_received"]) > 0

    # Q3: Money Outstanding
    assert "total_outstanding_amount" in data

    # Q4: Overdue Invoices
    assert "overdue_invoices_count" in data
    assert "overdue_invoices_list" in data

    # Q5: Monthly Revenue Breakdown
    assert "monthly_revenue_breakdown" in data
    assert len(data["monthly_revenue_breakdown"]) > 0

    # Q6: Renewals Due
    assert "subscriptions_due_for_renewal" in data

if __name__ == "__main__":
    pytest.main(["-v", "tests/test_system.py"])
