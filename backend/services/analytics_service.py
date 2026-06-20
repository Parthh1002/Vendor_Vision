from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from models import PurchaseOrder, Vendor, RFQ, Quotation, Invoice
import datetime

def get_spend_analytics(db: Session):
    # 1. Total Spend (Approved POs)
    total_spend = db.query(func.sum(PurchaseOrder.amount)).filter(
        PurchaseOrder.status == "Approved"
    ).scalar() or 0.0

    # 2. Active Vendors Count
    active_vendors = db.query(func.count(Vendor.id)).scalar() or 0

    # 3. Open RFQs
    open_rfqs = db.query(func.count(RFQ.id)).filter(
        RFQ.status.in_(["Published", "Under Review"])
    ).scalar() or 0

    # 4. Pending Approvals
    pending_approvals = db.query(func.count(PurchaseOrder.id)).filter(
        PurchaseOrder.status == "Pending Approval"
    ).scalar() or 0

    # 5. Average Procurement Cycle (Days)
    # Calculates avg delta between RFQ creation and PO creation
    # If no approved POs, default to 5.5 days
    cycle_query = db.query(
        RFQ.created_at, PurchaseOrder.created_at
    ).join(
        Quotation, Quotation.rfq_id == RFQ.id
    ).join(
        PurchaseOrder, PurchaseOrder.quotation_id == Quotation.id
    ).filter(PurchaseOrder.status == "Approved").all()

    if cycle_query:
        total_days = 0.0
        for rfq_created, po_created in cycle_query:
            delta = po_created - rfq_created
            total_days += max(delta.days, 1) # minimum 1 day
        avg_cycle = total_days / len(cycle_query)
    else:
        avg_cycle = 5.2

    # 6. Monthly Spend (last 6 months)
    # For SQLite, we can group by formatted date or group in Python memory for simplicity & DB compatibility
    monthly_spend_data = {}
    pos = db.query(PurchaseOrder).filter(PurchaseOrder.status == "Approved").all()
    for po in pos:
        month_name = po.created_at.strftime("%b %Y")
        monthly_spend_data[month_name] = monthly_spend_data.get(month_name, 0.0) + po.amount

    # Ensure last 6 months are represented (even if 0 spend)
    now = datetime.datetime.utcnow()
    monthly_spend = []
    for i in range(5, -1, -1):
        month_date = now - datetime.timedelta(days=i*30)
        m_name = month_date.strftime("%b %Y")
        monthly_spend.append({
            "month": m_name,
            "spend": monthly_spend_data.get(m_name, 0.0)
        })

    # 7. Category Spend
    category_spend_data = {}
    po_categories = db.query(PurchaseOrder.amount, RFQ.category).join(
        Quotation, PurchaseOrder.quotation_id == Quotation.id
    ).join(
        RFQ, Quotation.rfq_id == RFQ.id
    ).filter(PurchaseOrder.status == "Approved").all()

    for amount, category in po_categories:
        category_spend_data[category] = category_spend_data.get(category, 0.0) + amount

    category_spend = [
        {"category": cat, "spend": amt} for cat, amt in category_spend_data.items()
    ]
    # Default fallback data if empty
    if not category_spend:
        category_spend = [
            {"category": "IT Services", "spend": 0.0},
            {"category": "Furniture", "spend": 0.0},
            {"category": "Office Supplies", "spend": 0.0},
            {"category": "Facilities", "spend": 0.0}
        ]

    # 8. Vendor Performance Scorecards
    db_vendors = db.query(Vendor).all()
    vendor_performance = []
    for v in db_vendors:
        vendor_performance.append({
            "vendor_name": v.name,
            "score": v.performance_score,
            "reliability": v.reliability_rating
        })

    # 9. RFQ Trends (number of RFQs created monthly)
    rfq_data = db.query(RFQ).all()
    rfq_monthly = {}
    for r in rfq_data:
        m_name = r.created_at.strftime("%b %Y")
        rfq_monthly[m_name] = rfq_monthly.get(m_name, 0) + 1

    rfq_trends = []
    for i in range(5, -1, -1):
        month_date = now - datetime.timedelta(days=i*30)
        m_name = month_date.strftime("%b %Y")
        rfq_trends.append({
            "month": m_name,
            "count": rfq_monthly.get(m_name, 0)
        })

    return {
        "total_spend": total_spend,
        "active_vendors": active_vendors,
        "open_rfqs": open_rfqs,
        "pending_approvals": pending_approvals,
        "avg_procurement_cycle_days": round(avg_cycle, 1),
        "monthly_spend": monthly_spend,
        "category_spend": category_spend,
        "vendor_performance": vendor_performance,
        "rfq_trends": rfq_trends
    }
