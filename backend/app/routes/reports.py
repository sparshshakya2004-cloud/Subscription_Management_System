from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.schemas.schemas import FinanceSummaryResponse
from backend.app.services.report_service import get_finance_dashboard_summary, generate_csv_export
from backend.app.middleware.auth import require_staff_or_admin, User

router = APIRouter(prefix="/reports", tags=["Finance & Reports"])

@router.get("/finance", response_model=FinanceSummaryResponse)
def get_finance_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    return get_finance_dashboard_summary(db, start_date=start_date, end_date=end_date)

@router.get("/export")
def export_report_csv(
    report_type: str = Query(..., description="invoices | subscriptions | payments"),
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    csv_content = generate_csv_export(db, report_type)
    filename = f"{report_type}_report_{date.today()}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
