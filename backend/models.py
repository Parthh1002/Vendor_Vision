import datetime
from sqlalchemy import Table, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

# Association table for RFQ distribution to multiple Vendors (many-to-many)
rfq_vendor_association = Table(
    "rfq_vendors",
    Base.metadata,
    Column("rfq_id", Integer, ForeignKey("rfqs.id", ondelete="CASCADE"), primary_key=True),
    Column("vendor_id", Integer, ForeignKey("vendors.id", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False) # For local auth fallback
    name = Column(String, nullable=False)
    role = Column(String, nullable=False) # admin, procurement_officer, manager, vendor
    phone = Column(String, nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    vendor = relationship("Vendor", back_populates="users")
    rfqs_created = relationship("RFQ", back_populates="creator")
    purchase_orders_created = relationship("PurchaseOrder", foreign_keys="[PurchaseOrder.created_by_id]", back_populates="creator")
    purchase_orders_approved = relationship("PurchaseOrder", foreign_keys="[PurchaseOrder.approved_by_id]", back_populates="approver")
    copilot_logs = relationship("CopilotLog", back_populates="user")


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    contact_person = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(Text, nullable=False)
    category = Column(String, nullable=False) # Electronics, Furniture, Logistics, etc.
    gst_number = Column(String, nullable=False)
    performance_score = Column(Float, default=90.0) # 0 to 100
    average_delivery_time = Column(Integer, default=5) # in days
    reliability_rating = Column(Float, default=4.5) # 1.0 to 5.0
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="vendor")
    rfqs = relationship("RFQ", secondary=rfq_vendor_association, back_populates="vendors")
    quotations = relationship("Quotation", back_populates="vendor")


class RFQ(Base):
    __tablename__ = "rfqs"

    id = Column(Integer, primary_key=True, index=True)
    rfq_number = Column(String, unique=True, index=True, nullable=False) # e.g. RFQ-2026-0001
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    budget = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    category = Column(String, nullable=False)
    deadline = Column(DateTime, nullable=False)
    status = Column(String, default="Draft") # Draft, Published, Under Review, PO Generated, Closed
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="rfqs_created")
    vendors = relationship("Vendor", secondary=rfq_vendor_association, back_populates="rfqs")
    quotations = relationship("Quotation", back_populates="rfq", cascade="all, delete-orphan")


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    price = Column(Float, nullable=False)
    delivery_days = Column(Integer, nullable=False)
    specs = Column(Text, nullable=True) # Matching specifications
    terms = Column(Text, nullable=True) # Terms & Conditions
    status = Column(String, default="Submitted") # Submitted, Accepted, Rejected
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    rfq = relationship("RFQ", back_populates="quotations")
    vendor = relationship("Vendor", back_populates="quotations")
    purchase_orders = relationship("PurchaseOrder", back_populates="quotation")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String, unique=True, index=True, nullable=False) # e.g. PO-2026-0001
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="Pending Approval") # Draft, Pending Approval, Approved, Rejected, Sent to Vendor, Completed
    approval_status = Column(String, default="Pending") # Pending, Approved, Rejected
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    quotation = relationship("Quotation", back_populates="purchase_orders")
    creator = relationship("User", foreign_keys=[created_by_id], back_populates="purchase_orders_created")
    approver = relationship("User", foreign_keys=[approved_by_id], back_populates="purchase_orders_approved")
    invoices = relationship("Invoice", back_populates="purchase_order")
    approval_logs = relationship("ApprovalLog", back_populates="purchase_order")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True, nullable=False)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="Pending") # Pending, Approved, Paid, Overdue
    due_date = Column(DateTime, nullable=False)
    file_path = Column(String, nullable=True) # Mock path or text
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="invoices")


class ApprovalLog(Base):
    __tablename__ = "approval_logs"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False) # Approved, Rejected
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="approval_logs")
    approver = relationship("User")


class CopilotLog(Base):
    __tablename__ = "copilot_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="copilot_logs")
