import os
import sys
import datetime

# Add parent directory to sys.path to enable direct imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, engine, SessionLocal
from models import User, Vendor, RFQ, Quotation, PurchaseOrder, Invoice, ApprovalLog, CopilotLog, rfq_vendor_association
from utils.hash import hash_password

def seed_database():
    print("Initializing database and tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Cleaning up existing database records...")
        db.query(ApprovalLog).delete()
        db.query(CopilotLog).delete()
        db.query(Invoice).delete()
        db.query(PurchaseOrder).delete()
        db.query(Quotation).delete()
        db.execute(rfq_vendor_association.delete())
        db.query(RFQ).delete()
        db.query(User).delete()
        db.query(Vendor).delete()
        db.commit()
        print("Database cleaned successfully.")

        print("Seeding Vendors...")
        # Categories: Electronics, Furniture, Office Supplies, IT Services, Facilities
        vendors = [
            Vendor(
                name="Apex Solutions Ltd",
                contact_person="Alex Mercer",
                email="sales@apex.com",
                phone="+1-555-0199",
                address="100 Tech Parkway, Suite 500, San Jose, CA",
                category="IT Services",
                gst_number="GST-APEX-998877",
                performance_score=94.5,
                average_delivery_time=4,
                reliability_rating=4.8
            ),
            Vendor(
                name="Horizon Office Furniture",
                contact_person="Clara Oswald",
                email="contracts@horizon.com",
                phone="+1-555-0188",
                address="450 Maple Ave, Grand Rapids, MI",
                category="Furniture",
                gst_number="GST-HORIZON-554433",
                performance_score=87.2,
                average_delivery_time=7,
                reliability_rating=4.2
            ),
            Vendor(
                name="Stellar Industrial Supplies",
                contact_person="Marcus Vance",
                email="orders@stellar.com",
                phone="+1-555-0177",
                address="820 Industrial Blvd, Houston, TX",
                category="Office Supplies",
                gst_number="GST-STELLAR-112233",
                performance_score=91.0,
                average_delivery_time=3,
                reliability_rating=4.6
            ),
            Vendor(
                name="Global Logistics & Shipping",
                contact_person="Sarah Connor",
                email="logistics@globallog.com",
                phone="+1-555-0166",
                address="12 Logistics Way, Newark, NJ",
                category="Facilities",
                gst_number="GST-GLOBAL-445566",
                performance_score=83.5,
                average_delivery_time=5,
                reliability_rating=3.9
            )
        ]
        
        for v in vendors:
            db.add(v)
        db.flush() # Populate vendor IDs

        print("Seeding Users...")
        # Core roles: Admin, Procurement Officer, Manager, Vendor
        users = [
            User(
                email="admin@vendorvision.com",
                password_hash=hash_password("VndrVisn_Adm_2026!"),
                name="David Miller",
                role="admin",
                phone="+1-555-0100"
            ),
            User(
                email="procurement@vendorvision.com",
                password_hash=hash_password("VndrVisn_Off_2026!"),
                name="Emily Stone",
                role="procurement_officer",
                phone="+1-555-0101"
            ),
            User(
                email="manager@vendorvision.com",
                password_hash=hash_password("VndrVisn_Mgr_2026!"),
                name="Robert Chen",
                role="manager",
                phone="+1-555-0102"
            ),
            # Vendor specific user accounts
            User(
                email="sales@apex.com",
                password_hash=hash_password("VndrVisn_Vnd_2026!"),
                name="Alex Mercer (Apex)",
                role="vendor",
                phone="+1-555-0199",
                vendor_id=vendors[0].id
            ),
            User(
                email="contracts@horizon.com",
                password_hash=hash_password("VndrVisn_Vnd_2026!"),
                name="Clara Oswald (Horizon)",
                role="vendor",
                phone="+1-555-0188",
                vendor_id=vendors[1].id
            ),
            User(
                email="orders@stellar.com",
                password_hash=hash_password("VndrVisn_Vnd_2026!"),
                name="Marcus Vance (Stellar)",
                role="vendor",
                phone="+1-555-0177",
                vendor_id=vendors[2].id
            )
        ]

        for u in users:
            db.add(u)
        db.flush()

        proc_officer = users[1]
        manager = users[2]
        
        # Timing constants relative to current date (2026)
        now = datetime.datetime.utcnow()

        print("Seeding RFQs...")
        rfqs = [
            RFQ(
                rfq_number="RFQ-2026-0001",
                title="Server Rack Cabinets",
                description="Procurement of 10 heavy duty server rack cabinets for data center expansion. Standard sizing and grounding required.",
                budget=15000.0,
                quantity=10,
                category="IT Services",
                deadline=now - datetime.timedelta(days=140),
                status="PO Generated",
                created_by_id=proc_officer.id,
                created_at=now - datetime.timedelta(days=150)
            ),
            RFQ(
                rfq_number="RFQ-2026-0002",
                title="Office Stationery Bulk",
                description="Bulk purchase of standard office paper, printer cartridges, folders, and whiteboard markers.",
                budget=10000.0,
                quantity=1,
                category="Office Supplies",
                deadline=now - datetime.timedelta(days=110),
                status="PO Generated",
                created_by_id=proc_officer.id,
                created_at=now - datetime.timedelta(days=120)
            ),
            RFQ(
                rfq_number="RFQ-2026-0003",
                title="Conference Room Furniture",
                description="Procurement of custom modular conference tables and 20 executive leather board chairs.",
                budget=25000.0,
                quantity=1,
                category="Furniture",
                deadline=now - datetime.timedelta(days=80),
                status="PO Generated",
                created_by_id=proc_officer.id,
                created_at=now - datetime.timedelta(days=90)
            ),
            RFQ(
                rfq_number="RFQ-2026-0004",
                title="HVAC System Service",
                description="Annual preventive maintenance and filter replacements for building cooling and heating facilities.",
                budget=12000.0,
                quantity=1,
                category="Facilities",
                deadline=now - datetime.timedelta(days=50),
                status="PO Generated",
                created_by_id=proc_officer.id,
                created_at=now - datetime.timedelta(days=60)
            ),
            RFQ(
                rfq_number="RFQ-2026-0005",
                title="Developer Laptops Upgrade",
                description="Purchase of 15 high-performance laptops for engineering teams. Intel Core i7, 32GB RAM, 1TB SSD.",
                budget=20000.0,
                quantity=15,
                category="IT Services",
                deadline=now - datetime.timedelta(days=20),
                status="PO Generated",
                created_by_id=proc_officer.id,
                created_at=now - datetime.timedelta(days=30)
            ),
            RFQ(
                rfq_number="RFQ-2026-0006",
                title="Office Cafeteria Refurbishment",
                description="Procurement of bar stools, dining tables, lounge couches, and partition walls for cafeteria renovation.",
                budget=35000.0,
                quantity=1,
                category="Furniture",
                deadline=now - datetime.timedelta(days=5),
                status="PO Generated",
                created_by_id=proc_officer.id,
                created_at=now - datetime.timedelta(days=15)
            ),
            RFQ(
                rfq_number="RFQ-2026-0007",
                title="Annual Stationery Package",
                description="Refilling company stationary, printing materials, custom letterheads, and notebooks.",
                budget=8000.0,
                quantity=1,
                category="Office Supplies",
                deadline=now - datetime.timedelta(days=2),
                status="PO Generated",
                created_by_id=proc_officer.id,
                created_at=now - datetime.timedelta(days=6)
            ),
            RFQ(
                rfq_number="RFQ-2026-0008",
                title="Main Server Room AC Installation",
                description="Redundant split AC system with smart thermostat control for database server room cooling maintenance.",
                budget=15000.0,
                quantity=2,
                category="Facilities",
                deadline=now + datetime.timedelta(days=15),
                status="Published",
                created_by_id=proc_officer.id,
                created_at=now - datetime.timedelta(days=2)
            ),
            RFQ(
                rfq_number="RFQ-2026-0009",
                title="Ergonomic Office Chairs",
                description="Supply of 120 ergonomic adjustable mesh office chairs with lumbar support and armrests for office headquarters.",
                budget=24000.0,
                quantity=120,
                category="Furniture",
                deadline=now + datetime.timedelta(days=5),
                status="Published",
                created_by_id=proc_officer.id,
                created_at=now - datetime.timedelta(days=2)
            ),
            RFQ(
                rfq_number="RFQ-2026-0010",
                title="Enterprise Security Auditing",
                description="Third-party penetration testing, security auditing, and compliance reporting.",
                budget=50000.0,
                quantity=1,
                category="IT Services",
                deadline=now + datetime.timedelta(days=25),
                status="Draft",
                created_by_id=proc_officer.id,
                created_at=now
            )
        ]

        for r in rfqs:
            db.add(r)
        db.flush()

        # Associate invited vendors to RFQs
        # Jan
        rfqs[0].vendors.append(vendors[0])
        # Feb
        rfqs[1].vendors.append(vendors[2])
        # Mar
        rfqs[2].vendors.append(vendors[1])
        # Apr
        rfqs[3].vendors.append(vendors[3])
        # May
        rfqs[4].vendors.append(vendors[0])
        rfqs[4].vendors.append(vendors[2])
        # Jun cafeteria
        rfqs[5].vendors.append(vendors[1])
        # Jun annual stationery
        rfqs[6].vendors.append(vendors[2])
        rfqs[6].vendors.append(vendors[3])
        # Active RFQ AC
        rfqs[7].vendors.append(vendors[0])
        # Active RFQ Chairs
        rfqs[8].vendors.append(vendors[1])

        print("Seeding Quotations...")
        quotes = [
            # Jan Quote
            Quotation(
                rfq_id=rfqs[0].id,
                vendor_id=vendors[0].id, # Apex
                price=12400.0,
                delivery_days=6,
                specs="Apex ServerCabinets Premium Pro, 42U Server Racks with cable ducts, black matte coating.",
                terms="Net 30, free delivery & setup.",
                status="Accepted",
                submitted_at=now - datetime.timedelta(days=148)
            ),
            # Feb Quote
            Quotation(
                rfq_id=rfqs[1].id,
                vendor_id=vendors[2].id, # Stellar
                price=8200.0,
                delivery_days=4,
                specs="Stellar EcoStationery Package, full office supplies kit.",
                terms="Net 15, delivery in 3 batches.",
                status="Accepted",
                submitted_at=now - datetime.timedelta(days=118)
            ),
            # Mar Quote
            Quotation(
                rfq_id=rfqs[2].id,
                vendor_id=vendors[1].id, # Horizon
                price=18500.0,
                delivery_days=10,
                specs="Horizon Boardroom Custom Tables + 20 Horizon Aero-back leather chairs.",
                terms="Net 30, assembly included.",
                status="Accepted",
                submitted_at=now - datetime.timedelta(days=88)
            ),
            # Apr Quote
            Quotation(
                rfq_id=rfqs[3].id,
                vendor_id=vendors[3].id, # Global
                price=9800.0,
                delivery_days=5,
                specs="Facilities HVAC service package - certified technician review and filter replacement.",
                terms="Net 30 payment.",
                status="Accepted",
                submitted_at=now - datetime.timedelta(days=58)
            ),
            # May Quotes
            Quotation(
                rfq_id=rfqs[4].id,
                vendor_id=vendors[0].id, # Apex
                price=15100.0,
                delivery_days=5,
                specs="ThinkPad L14 Gen 4, AMD Ryzen 7, 32GB RAM, 1TB SSD, 3-yr onsite warranty.",
                terms="50% advance, 50% net 30.",
                status="Accepted",
                submitted_at=now - datetime.timedelta(days=28)
            ),
            Quotation(
                rfq_id=rfqs[4].id,
                vendor_id=vendors[2].id, # Stellar
                price=16500.0,
                delivery_days=6,
                specs="Dell Latitude 5440, Core i7, 32GB RAM, 1TB SSD.",
                terms="Net 30.",
                status="Rejected",
                submitted_at=now - datetime.timedelta(days=27)
            ),
            # Jun Cafeteria Quote
            Quotation(
                rfq_id=rfqs[5].id,
                vendor_id=vendors[1].id, # Horizon
                price=28900.0,
                delivery_days=12,
                specs="Modern Cafeteria Package: 15 bar stools, 10 dining tables, and 4 modular lounge seating sets.",
                terms="Net 30, free delivery & configuration.",
                status="Accepted",
                submitted_at=now - datetime.timedelta(days=12)
            ),
            # Jun Annual Stationery Quotes
            Quotation(
                rfq_id=rfqs[6].id,
                vendor_id=vendors[2].id, # Stellar
                price=7200.0,
                delivery_days=3,
                specs="Premium EcoStationery Kit, includes customized notebooks.",
                terms="Net 15, free delivery.",
                status="Accepted",
                submitted_at=now - datetime.timedelta(days=5)
            ),
            Quotation(
                rfq_id=rfqs[6].id,
                vendor_id=vendors[3].id, # Global
                price=7800.0,
                delivery_days=5,
                specs="Global Stationery Solutions bundle.",
                terms="Net 30, shipping included.",
                status="Rejected",
                submitted_at=now - datetime.timedelta(days=4)
            ),
            # Active/Submitted Quotes for RFQ 9 (Chairs)
            Quotation(
                rfq_id=rfqs[8].id,
                vendor_id=vendors[1].id, # Horizon
                price=22800.0,
                delivery_days=8,
                specs="Horizon ErgoFlex Mesh Chairs - Model X. Meets all criteria, 10-year warranty.",
                terms="Net 30 payment, free delivery to HQ.",
                status="Submitted",
                submitted_at=now - datetime.timedelta(days=3)
            ),
            # New quotation for RFQ 8 (Server AC)
            Quotation(
                rfq_id=rfqs[7].id,
                vendor_id=vendors[0].id, # Apex
                price=12000.0,
                delivery_days=10,
                specs="Apex AirFlow CoolMax Split AC, 2 redundant units, smart thermostat controller.",
                terms="50% advance, 50% net 30.",
                status="Accepted",
                submitted_at=now - datetime.timedelta(days=1)
            )
        ]

        for q in quotes:
            db.add(q)
        db.flush()

        print("Seeding Purchase Orders...")
        pos = [
            # PO 1 (Jan)
            PurchaseOrder(
                po_number="PO-2026-0001",
                quotation_id=quotes[0].id, # Apex quote 12.4k
                amount=12400.0,
                status="Approved",
                approval_status="Approved",
                created_by_id=proc_officer.id,
                approved_by_id=manager.id,
                created_at=now - datetime.timedelta(days=145)
            ),
            # PO 2 (Feb)
            PurchaseOrder(
                po_number="PO-2026-0002",
                quotation_id=quotes[1].id, # Stellar quote 8.2k
                amount=8200.0,
                status="Approved",
                approval_status="Approved",
                created_by_id=proc_officer.id,
                approved_by_id=manager.id,
                created_at=now - datetime.timedelta(days=115)
            ),
            # PO 3 (Mar)
            PurchaseOrder(
                po_number="PO-2026-0003",
                quotation_id=quotes[2].id, # Horizon quote 18.5k
                amount=18500.0,
                status="Approved",
                approval_status="Approved",
                created_by_id=proc_officer.id,
                approved_by_id=manager.id,
                created_at=now - datetime.timedelta(days=85)
            ),
            # PO 4 (Apr)
            PurchaseOrder(
                po_number="PO-2026-0004",
                quotation_id=quotes[3].id, # Global quote 9.8k
                amount=9800.0,
                status="Approved",
                approval_status="Approved",
                created_by_id=proc_officer.id,
                approved_by_id=manager.id,
                created_at=now - datetime.timedelta(days=55)
            ),
            # PO 5 (May)
            PurchaseOrder(
                po_number="PO-2026-0005",
                quotation_id=quotes[4].id, # Apex quote 15.1k
                amount=15100.0,
                status="Approved",
                approval_status="Approved",
                created_by_id=proc_officer.id,
                approved_by_id=manager.id,
                created_at=now - datetime.timedelta(days=25)
            ),
            # PO 6 (Jun Cafeteria)
            PurchaseOrder(
                po_number="PO-2026-0006",
                quotation_id=quotes[6].id, # Horizon quote 28.9k
                amount=28900.0,
                status="Approved",
                approval_status="Approved",
                created_by_id=proc_officer.id,
                approved_by_id=manager.id,
                created_at=now - datetime.timedelta(days=10)
            ),
            # PO 7 (Jun Stationery)
            PurchaseOrder(
                po_number="PO-2026-0007",
                quotation_id=quotes[7].id, # Stellar quote 7.2k
                amount=7200.0,
                status="Approved",
                approval_status="Approved",
                created_by_id=proc_officer.id,
                approved_by_id=manager.id,
                created_at=now - datetime.timedelta(days=4)
            ),
            # PO 8 (Jun - Awaiting approval)
            PurchaseOrder(
                po_number="PO-2026-0008",
                quotation_id=quotes[9].id, # Horizon chairs quote 22.8k
                amount=22800.0,
                status="Pending Approval",
                approval_status="Pending",
                created_by_id=proc_officer.id,
                created_at=now - datetime.timedelta(days=1)
            )
        ]

        for p in pos:
            db.add(p)
        db.flush()

        print("Seeding Invoices...")
        invoices = [
            Invoice(
                invoice_number="INV-2026-0012",
                purchase_order_id=pos[0].id,
                amount=12400.0,
                status="Paid",
                due_date=now - datetime.timedelta(days=110),
                file_path="/invoices/inv_0012.pdf",
                submitted_at=now - datetime.timedelta(days=140),
                paid_at=now - datetime.timedelta(days=138)
            ),
            Invoice(
                invoice_number="INV-2026-0024",
                purchase_order_id=pos[1].id,
                amount=8200.0,
                status="Paid",
                due_date=now - datetime.timedelta(days=80),
                file_path="/invoices/inv_0024.pdf",
                submitted_at=now - datetime.timedelta(days=110),
                paid_at=now - datetime.timedelta(days=108)
            ),
            Invoice(
                invoice_number="INV-2026-0036",
                purchase_order_id=pos[2].id,
                amount=18500.0,
                status="Paid",
                due_date=now - datetime.timedelta(days=50),
                file_path="/invoices/inv_0036.pdf",
                submitted_at=now - datetime.timedelta(days=80),
                paid_at=now - datetime.timedelta(days=78)
            ),
            Invoice(
                invoice_number="INV-2026-0048",
                purchase_order_id=pos[3].id,
                amount=9800.0,
                status="Paid",
                due_date=now - datetime.timedelta(days=20),
                file_path="/invoices/inv_0048.pdf",
                submitted_at=now - datetime.timedelta(days=50),
                paid_at=now - datetime.timedelta(days=48)
            ),
            Invoice(
                invoice_number="INV-2026-0060",
                purchase_order_id=pos[4].id,
                amount=15100.0,
                status="Paid",
                due_date=now + datetime.timedelta(days=10),
                file_path="/invoices/inv_0060.pdf",
                submitted_at=now - datetime.timedelta(days=20),
                paid_at=now - datetime.timedelta(days=18)
            ),
            Invoice(
                invoice_number="INV-2026-0072",
                purchase_order_id=pos[5].id,
                amount=28900.0,
                status="Paid",
                due_date=now + datetime.timedelta(days=25),
                file_path="/invoices/inv_0072.pdf",
                submitted_at=now - datetime.timedelta(days=8),
                paid_at=now - datetime.timedelta(days=6)
            ),
            Invoice(
                invoice_number="INV-2026-0088",
                purchase_order_id=pos[6].id,
                amount=7200.0,
                status="Paid",
                due_date=now + datetime.timedelta(days=20),
                file_path="/invoices/inv_0088.pdf",
                submitted_at=now - datetime.timedelta(days=4),
                paid_at=now - datetime.timedelta(days=2)
            ),
            Invoice(
                invoice_number="INV-2026-0105",
                purchase_order_id=pos[7].id,
                amount=22800.0,
                status="Pending",
                due_date=now + datetime.timedelta(days=20),
                file_path="/invoices/inv_0105.pdf",
                submitted_at=now
            )
        ]

        for inv in invoices:
            db.add(inv)
        db.flush()

        print("Seeding Approval Logs...")
        logs = [
            ApprovalLog(
                purchase_order_id=pos[0].id, approver_id=manager.id, action="Approved",
                comments="Rack setup matches server criteria. Pricing matches standard rates.",
                created_at=now - datetime.timedelta(days=145)
            ),
            ApprovalLog(
                purchase_order_id=pos[1].id, approver_id=manager.id, action="Approved",
                comments="Stationery replenish package approved.",
                created_at=now - datetime.timedelta(days=115)
            ),
            ApprovalLog(
                purchase_order_id=pos[2].id, approver_id=manager.id, action="Approved",
                comments="Custom conference tables approved for the HQ redesign.",
                created_at=now - datetime.timedelta(days=85)
            ),
            ApprovalLog(
                purchase_order_id=pos[3].id, approver_id=manager.id, action="Approved",
                comments="Facilities HVAC annual maintenance package approved.",
                created_at=now - datetime.timedelta(days=55)
            ),
            ApprovalLog(
                purchase_order_id=pos[4].id, approver_id=manager.id, action="Approved",
                comments="Developer laptops replacement. Pricing is optimal.",
                created_at=now - datetime.timedelta(days=25)
            ),
            ApprovalLog(
                purchase_order_id=pos[5].id, approver_id=manager.id, action="Approved",
                comments="Cafeteria seating upgrade. Design and pricing matches budget constraints.",
                created_at=now - datetime.timedelta(days=10)
            ),
            ApprovalLog(
                purchase_order_id=pos[6].id, approver_id=manager.id, action="Approved",
                comments="Stationery replenishment. Accept bid.",
                created_at=now - datetime.timedelta(days=4)
            )
        ]

        for l in logs:
            db.add(l)
        db.flush()

        print("Seeding Copilot Chats...")
        chat_logs = [
            CopilotLog(
                user_id=proc_officer.id,
                message="Show me the top performing vendor",
                response="The top performing vendor is **Apex Solutions Ltd** with a **Performance Score of 94.5%** and a **Reliability Rating of 4.8/5.0**. Their average delivery time is **4 days**.",
                created_at=now - datetime.timedelta(days=1)
            )
        ]

        for chat in chat_logs:
            db.add(chat)
        db.flush()

        db.commit()
        print("Database seeded successfully with premium test data!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
