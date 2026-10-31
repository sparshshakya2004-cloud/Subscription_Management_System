from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.models.models import QuotationTemplate, QuotationTemplateLine, Product, Plan, User
from backend.app.schemas.schemas import (
    QuotationTemplateResponse, QuotationTemplateCreate, QuotationTemplateLineResponse
)
from backend.app.middleware.auth import require_staff_or_admin, get_current_user

router = APIRouter(prefix="/quotation-templates", tags=["Quotation Templates"])

@router.get("", response_model=List[QuotationTemplateResponse])
def list_quotation_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    templates = db.query(QuotationTemplate).order_by(QuotationTemplate.created_at.desc()).all()
    results = []
    for t in templates:
        lines = []
        for l in t.lines:
            lines.append({
                "id": l.id,
                "template_id": l.template_id,
                "product_id": l.product_id,
                "product_name": l.product.name if l.product else None,
                "plan_id": l.plan_id,
                "plan_name": l.plan.plan_name if l.plan else None,
                "default_quantity": l.default_quantity,
                "default_price": l.default_price,
                "created_at": l.created_at
            })
        results.append({
            "id": t.id,
            "template_name": t.template_name,
            "description": t.description,
            "validity_days": t.validity_days,
            "is_active": t.is_active,
            "created_at": t.created_at,
            "lines": lines
        })
    return results

@router.get("/{template_id}", response_model=QuotationTemplateResponse)
def get_quotation_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    t = db.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found.")

    lines = []
    for l in t.lines:
        lines.append({
            "id": l.id,
            "template_id": l.template_id,
            "product_id": l.product_id,
            "product_name": l.product.name if l.product else None,
            "plan_id": l.plan_id,
            "plan_name": l.plan.plan_name if l.plan else None,
            "default_quantity": l.default_quantity,
            "default_price": l.default_price,
            "created_at": l.created_at
        })
    return {
        "id": t.id,
        "template_name": t.template_name,
        "description": t.description,
        "validity_days": t.validity_days,
        "is_active": t.is_active,
        "created_at": t.created_at,
        "lines": lines
    }

@router.post("", response_model=QuotationTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_quotation_template(
    request: QuotationTemplateCreate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(QuotationTemplate).filter(QuotationTemplate.template_name == request.template_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Template with this name already exists.")

    new_tmpl = QuotationTemplate(
        template_name=request.template_name,
        description=request.description,
        validity_days=request.validity_days,
        is_active=request.is_active
    )
    db.add(new_tmpl)
    db.flush()

    for line_req in request.lines:
        db.add(QuotationTemplateLine(
            template_id=new_tmpl.id,
            product_id=line_req.product_id,
            plan_id=line_req.plan_id,
            default_quantity=line_req.default_quantity,
            default_price=line_req.default_price
        ))

    db.commit()
    db.refresh(new_tmpl)

    lines = []
    for l in new_tmpl.lines:
        lines.append({
            "id": l.id,
            "template_id": l.template_id,
            "product_id": l.product_id,
            "product_name": l.product.name if l.product else None,
            "plan_id": l.plan_id,
            "plan_name": l.plan.plan_name if l.plan else None,
            "default_quantity": l.default_quantity,
            "default_price": l.default_price,
            "created_at": l.created_at
        })

    return {
        "id": new_tmpl.id,
        "template_name": new_tmpl.template_name,
        "description": new_tmpl.description,
        "validity_days": new_tmpl.validity_days,
        "is_active": new_tmpl.is_active,
        "created_at": new_tmpl.created_at,
        "lines": lines
    }

@router.delete("/{template_id}")
def delete_quotation_template(
    template_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    tmpl = db.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found.")
    db.delete(tmpl)
    db.commit()
    return {"message": "Template deleted successfully."}
