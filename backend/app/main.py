import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.routes import (
    auth, users, customers, products, plans,
    quotation_templates, quotations, subscriptions,
    invoices, taxes, discounts, payments,
    dashboard, reports, customer_portal
)

app = FastAPI(
    title="Brightloop Software - Subscription Management API",
    description="Enterprise subscription management, automated recurring billing, quotations, invoicing, and finance reporting.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware setup
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api/v1
api_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(customers.router, prefix=api_prefix)
app.include_router(products.router, prefix=api_prefix)
app.include_router(plans.router, prefix=api_prefix)
app.include_router(quotation_templates.router, prefix=api_prefix)
app.include_router(quotations.router, prefix=api_prefix)
app.include_router(subscriptions.router, prefix=api_prefix)
app.include_router(invoices.router, prefix=api_prefix)
app.include_router(taxes.router, prefix=api_prefix)
app.include_router(discounts.router, prefix=api_prefix)
app.include_router(payments.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(customer_portal.router, prefix=api_prefix)

@app.get("/", tags=["Health"])
def root():
    return {
        "service": "Brightloop Software - Subscription Management System",
        "status": "operational",
        "version": "1.0.0",
        "documentation": "/docs"
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
