from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# ==========================================
# AUTH & USER SCHEMAS
# ==========================================
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str # admin, procurement_officer, manager, vendor
    phone: Optional[str] = None
    vendor_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    email: str
    vendor_id: Optional[int] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# VENDOR SCHEMAS
# ==========================================
class VendorBase(BaseModel):
    name: str
    contact_person: str
    email: EmailStr
    phone: str
    address: str
    category: str
    gst_number: str

class VendorCreate(VendorBase):
    pass

class VendorResponse(VendorBase):
    id: int
    performance_score: float
    average_delivery_time: int
    reliability_rating: float
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# QUOTATION SCHEMAS
# ==========================================
class QuotationBase(BaseModel):
    price: float = Field(..., gt=0)
    delivery_days: int = Field(..., gt=0)
    specs: Optional[str] = None
    terms: Optional[str] = None

class QuotationCreate(QuotationBase):
    rfq_id: int

class QuotationResponse(QuotationBase):
    id: int
    rfq_id: int
    vendor_id: int
    status: str
    submitted_at: datetime
    vendor: Optional[VendorResponse] = None

    class Config:
        from_attributes = True

# ==========================================
# RFQ SCHEMAS
# ==========================================
class RFQBase(BaseModel):
    title: str
    description: str
    budget: float = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    category: str
    deadline: datetime

class RFQCreate(RFQBase):
    invited_vendor_ids: List[int] = []

class RFQResponse(RFQBase):
    id: int
    rfq_number: str
    status: str
    created_by_id: int
    created_at: datetime
    vendors: List[VendorResponse] = []
    quotations: List[QuotationResponse] = []

    class Config:
        from_attributes = True

class RFQStatusUpdate(BaseModel):
    status: str

# ==========================================
# INVOICE SCHEMAS
# ==========================================
class InvoiceBase(BaseModel):
    invoice_number: str
    purchase_order_id: int
    amount: float = Field(..., gt=0)
    due_date: datetime
    file_path: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceResponse(InvoiceBase):
    id: int
    status: str
    submitted_at: datetime
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InvoiceStatusUpdate(BaseModel):
    status: str

# ==========================================
# APPROVAL LOG SCHEMAS
# ==========================================
class ApprovalLogBase(BaseModel):
    action: str # Approved, Rejected
    comments: Optional[str] = None

class ApprovalLogResponse(ApprovalLogBase):
    id: int
    purchase_order_id: int
    approver_id: int
    created_at: datetime
    approver: UserResponse

    class Config:
        from_attributes = True

# ==========================================
# PURCHASE ORDER SCHEMAS
# ==========================================
class PurchaseOrderBase(BaseModel):
    quotation_id: int
    amount: float = Field(..., gt=0)

class PurchaseOrderCreate(PurchaseOrderBase):
    pass

class PurchaseOrderResponse(PurchaseOrderBase):
    id: int
    po_number: str
    status: str
    approval_status: str
    created_by_id: int
    approved_by_id: Optional[int] = None
    created_at: datetime
    quotation: QuotationResponse
    creator: UserResponse
    approver: Optional[UserResponse] = None
    invoices: List[InvoiceResponse] = []
    approval_logs: List[ApprovalLogResponse] = []

    class Config:
        from_attributes = True

class PurchaseOrderApproval(BaseModel):
    action: str # Approved, Rejected
    comments: Optional[str] = None

# ==========================================
# AI COPILOT SCHEMAS
# ==========================================
class CopilotMessageRequest(BaseModel):
    message: str

class CopilotLogResponse(BaseModel):
    id: int
    user_id: int
    message: str
    response: str
    created_at: datetime

    class Config:
        from_attributes = True

class CopilotMessageResponse(BaseModel):
    response: str
    suggested_rfq: Optional[dict] = None
    suggested_vendors: Optional[List[dict]] = None
    insights: Optional[List[dict]] = None

# ==========================================
# ANALYTICS SCHEMAS
# ==========================================
class SpendAnalyticsResponse(BaseModel):
    total_spend: float
    active_vendors: int
    open_rfqs: int
    pending_approvals: int
    avg_procurement_cycle_days: float
    monthly_spend: List[dict] # {month: "Jan", spend: 10000}
    category_spend: List[dict] # {category: "Furniture", spend: 5000}
    vendor_performance: List[dict] # {vendor_name: "ABC Inc", score: 95.0, reliability: 4.8}
    rfq_trends: List[dict] # {month: "Jan", count: 12}
