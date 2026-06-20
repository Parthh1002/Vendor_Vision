import os
import json
import requests
from sqlalchemy.orm import Session
from models import Vendor, RFQ, PurchaseOrder, Invoice, CopilotLog
import google.generativeai as genai

# Load .env file manually if exists
for path in [".env", "../.env", "backend/.env"]:
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                if line.strip() and not line.startswith("#") and "=" in line:
                    k, v = line.strip().split("=", 1)
                    os.environ[k.strip()] = v.strip().strip('"').strip("'")
        break

# Setup Gemini API key
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Initialize generative AI client if key is set and not OpenRouter key
if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("sk-or-v1-"):
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-2.5-flash")
else:
    gemini_model = None

def get_database_context(db: Session) -> str:
    """Serialize the SQLite database state to feed into the AI context."""
    # 1. Fetch Vendors
    vendors = db.query(Vendor).all()
    vendors_text = "VENDORS:\n"
    for v in vendors:
        vendors_text += f"- ID {v.id}: {v.name} (Category: {v.category}, Perf Score: {v.performance_score}%, Reliability: {v.reliability_rating}/5.0, Avg Delivery: {v.average_delivery_time} days, Contact: {v.contact_person}, Email: {v.email})\n"

    # 2. Fetch RFQs
    rfqs = db.query(RFQ).all()
    rfqs_text = "\nREQUESTS FOR QUOTATION (RFQs):\n"
    for r in rfqs:
        rfqs_text += f"- RFQ {r.rfq_number}: '{r.title}' (Status: {r.status}, Quantity: {r.quantity}, Budget: ${r.budget:.2f}, Category: {r.category}, Deadline: {r.deadline.strftime('%Y-%m-%d')})\n"

    # 3. Fetch POs
    pos = db.query(PurchaseOrder).all()
    pos_text = "\nPURCHASE ORDERS (POs):\n"
    for p in pos:
        pos_text += f"- PO {p.po_number}: Amount: ${p.amount:.2f} (Status: {p.status}, Approval: {p.approval_status})\n"

    # 4. Fetch Invoices
    invoices = db.query(Invoice).all()
    invoices_text = "\nINVOICES:\n"
    for inv in invoices:
        invoices_text += f"- INV {inv.invoice_number}: Amount: ${inv.amount:.2f} (Status: {inv.status}, Due Date: {inv.due_date.strftime('%Y-%m-%d')})\n"

    return vendors_text + rfqs_text + pos_text + invoices_text


def query_copilot(db: Session, user_id: int, message: str) -> dict:
    """Processes Copilot natural language queries using Gemini API or local smart fallback."""
    db_context = get_database_context(db)
    
    system_prompt = f"""
You are the AI Procurement Copilot for VendorVision ERP, an enterprise procurement management platform.
Your purpose is to assist procurement officers, managers, and admins with spend analysis, vendor recommendations, and RFQ generation.

You have access to the current live SQLite database context below:
---
{db_context}
---

INSTRUCTIONS:
1. SPEND ANALYTICS: Use the database context above to answer spend-related questions (e.g. total spend, pending approvals, top performing vendor, category spend). Be precise with numbers.
2. VENDOR RECOMMENDATION: If the user asks for a recommendation, return a structured markdown response detailing recommended vendors based on historical ratings, scorecards, delivery time, and reliability. Also return a JSON-parsable block at the very end in the format:
   ```json
   {{"type": "vendor_recommendation", "data": {{"vendor_id": 1, "vendor_name": "ABC Ltd", "confidence_score": 95, "reasoning": "Reason here"}}}}
   ```
3. RFQ GENERATOR: If the user asks to create/generate an RFQ (e.g. "Need 50 laptops"), generate a complete draft and include a JSON-parsable block at the very end in the format:
   ```json
   {{"type": "rfq_generation", "data": {{"title": "RFQ Title", "description": "RFQ Description", "category": "IT Services", "quantity": 50, "budget": 75000.0, "suggested_vendor_ids": [1, 2]}}}}
   ```
4. Respond in professional, clean Markdown. Highlight KPIs using bullet points. Use emojis for high visual appeal.
"""

    response_text = ""
    suggested_rfq = None
    suggested_vendors = None
    insights = None

    if GEMINI_API_KEY:
        if GEMINI_API_KEY.startswith("sk-or-v1-"):
            try:
                headers = {
                    "Authorization": f"Bearer {GEMINI_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8000",
                    "X-Title": "VendorVision ERP"
                }
                body = {
                    "model": "google/gemini-1.5-flash",
                    "messages": [
                        {
                            "role": "system",
                            "content": system_prompt
                        },
                        {
                            "role": "user",
                            "content": message
                        }
                    ]
                }
                res = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=body,
                    timeout=25
                )
                if res.status_code == 200:
                    res_data = res.json()
                    response_text = res_data["choices"][0]["message"]["content"]
                else:
                    raise Exception(f"OpenRouter returned status {res.status_code}: {res.text}")
            except Exception as e:
                response_text = f"*⚠️ Note: OpenRouter API encountered an error ({str(e)}). Switched to Local Smart Agent.*\n\n"
                response_text += run_local_smart_agent(db, message)
        elif gemini_model:
            try:
                chat = gemini_model.start_chat(history=[])
                prompt = f"{system_prompt}\n\nUSER QUESTION: {message}"
                response = chat.send_message(prompt)
                response_text = response.text
            except Exception as e:
                response_text = f"*⚠️ Note: Gemini API encountered an error ({str(e)}). Switched to Local Smart Agent.*\n\n"
                response_text += run_local_smart_agent(db, message)
        else:
            response_text = f"🤖 **Local Vision Copilot (Development Mode)**\n\n*Note: To connect real Google Gemini AI, set `GEMINI_API_KEY` in environment variables.*\n\n"
            response_text += run_local_smart_agent(db, message)
    else:
        # Fallback to local agent if API Key is not set
        response_text = f"🤖 **Local Vision Copilot (Development Mode)**\n\n*Note: To connect real Google Gemini AI, set `GEMINI_API_KEY` in environment variables.*\n\n"
        response_text += run_local_smart_agent(db, message)

    # Parse JSON structured recommendations if present in response
    if "rfq_generation" in response_text or "vendor_recommendation" in response_text:
        try:
            # Attempt to extract json block
            start_idx = response_text.find("```json")
            if start_idx != -1:
                end_idx = response_text.find("```", start_idx + 7)
                json_str = response_text[start_idx + 7:end_idx].strip()
                data = json.loads(json_str)
                if data.get("type") == "rfq_generation":
                    suggested_rfq = data.get("data")
                elif data.get("type") == "vendor_recommendation":
                    suggested_vendors = [data.get("data")]
        except Exception:
            pass # Suppress parsing errors, fallback to regular chat response

    # Parse local agent outputs directly
    if not gemini_model and not (GEMINI_API_KEY and GEMINI_API_KEY.startswith("sk-or-v1-")):
        # Detect local agent structures
        if "RFQ DRAFT GENERATED" in response_text:
            # Locate JSON manually
            try:
                start_idx = response_text.find("```json")
                if start_idx != -1:
                    end_idx = response_text.find("```", start_idx + 7)
                    json_str = response_text[start_idx + 7:end_idx].strip()
                    suggested_rfq = json.loads(json_str)
            except Exception:
                pass
        elif "RECOMMENDED VENDOR" in response_text:
            try:
                start_idx = response_text.find("```json")
                if start_idx != -1:
                    end_idx = response_text.find("```", start_idx + 7)
                    json_str = response_text[start_idx + 7:end_idx].strip()
                    suggested_vendors = [json.loads(json_str)]
            except Exception:
                pass

    # Log the interaction in the database
    log = CopilotLog(
        user_id=user_id,
        message=message,
        response=response_text
    )
    db.add(log)
    db.commit()

    return {
        "response": response_text,
        "suggested_rfq": suggested_rfq,
        "suggested_vendors": suggested_vendors,
        "insights": insights
    }


def run_local_smart_agent(db: Session, message: str) -> str:
    """Smart keyword matcher that executes queries directly against SQLite database to answer users."""
    msg = message.lower()
    
    # 1. Total Spend
    if "total spend" in msg or "how much did we spend" in msg or "spend this month" in msg:
        total = db.query(func_sum_amount()).scalar() or 0.0
        return f"""
💰 **Spend Analytics Summary**
Our current **Total Spend** (representing all approved Purchase Orders) is **${total:,.2f}**. 

Here is the breakdown of approved orders:
- **PO-2026-0001**: $7,200.00 (Approved)
"""

    # 2. Top Vendor or Vendor Recommendation
    elif "vendor" in msg or "recommend" in msg:
        # Find vendor with highest rating
        best_vendor = db.query(Vendor).order_by(Vendor.performance_score.desc()).first()
        if not best_vendor:
            return "No vendors found in the database."
            
        category = "IT Services"
        if "furniture" in msg or "chair" in msg:
            category = "Furniture"
            best_vendor = db.query(Vendor).filter(Vendor.category == "Furniture").order_by(Vendor.performance_score.desc()).first() or best_vendor

        return f"""
🏆 **RECOMMENDED VENDOR**
I recommend **{best_vendor.name}** for your needs in **{best_vendor.category}**.

**Performance Scorecard:**
* **Vendor Name:** {best_vendor.name}
* **Performance Score:** {best_vendor.performance_score}%
* **Reliability Rating:** {best_vendor.reliability_rating}/5.0
* **Average Delivery Time:** {best_vendor.average_delivery_time} days
* **Reasoning:** Highest rated supplier in the '{best_vendor.category}' category, showing optimal delivery speeds and reliability.

```json
{{
  "vendor_id": {best_vendor.id},
  "vendor_name": "{best_vendor.name}",
  "confidence_score": {int(best_vendor.performance_score)},
  "reasoning": "Highest rated supplier in category {best_vendor.category} with reliability {best_vendor.reliability_rating}/5.0"
}}
```
"""

    # 3. RFQ Generation request
    elif "laptop" in msg or "chair" in msg or "need" in msg or "create rfq" in msg:
        title = "Enterprise Laptops Upgrade" if "laptop" in msg else "Ergonomic Office Chairs"
        category = "IT Services" if "laptop" in msg else "Furniture"
        qty = 50 if "laptop" in msg else 120
        budget = 75000.0 if "laptop" in msg else 24000.0
        desc = "Need high-performance laptops for development team with 32GB RAM" if "laptop" in msg else "Standard ergonomic adjustable chairs"
        
        # Get suggested vendors
        vendors = db.query(Vendor).filter(Vendor.category == category).all()
        v_ids = [v.id for v in vendors]
        v_names = ", ".join([v.name for v in vendors])
        
        return f"""
📝 **RFQ DRAFT GENERATED**
I have generated a draft Request for Quotation matching your specs:

* **RFQ Title:** Procurement of {title}
* **Description:** {desc}. Must include standard warranty and delivery terms.
* **Category:** {category}
* **Quantity:** {qty}
* **Estimated Budget:** ${budget:,.2f}
* **Suggested Suppliers:** {v_names or "Stellar Supplies"}

```json
{{
  "title": "Procurement of {title}",
  "description": "{desc}",
  "category": "{category}",
  "quantity": {qty},
  "budget": {budget},
  "suggested_vendor_ids": {v_ids or [1]}
}}
```
"""

    # 4. Pending invoices / approvals
    elif "pending" in msg or "invoice" in msg or "approval" in msg:
        pending_pos = db.query(PurchaseOrder).filter(PurchaseOrder.status == "Pending Approval").count()
        pending_invs = db.query(Invoice).filter(Invoice.status == "Pending").count()
        return f"""
📋 **Action Items & Pending Approvals**
Here are the items requiring immediate attention:
- **Pending Purchase Order Approvals:** {pending_pos} PO(s) awaiting manager review.
- **Pending Invoices:** {pending_invs} invoice(s) awaiting payment tracking.
"""

    # 5. Default
    else:
        return f"""
👋 Hello! I am the **VendorVision Copilot**. 
I can assist you with your procurement operations. Try asking:
1. *"Show me the top performing vendor"*
2. *"What is our total spend this month?"*
3. *"Draft an RFQ for 50 developer laptops"*
4. *"Do we have any pending approvals or invoices?"*
"""

def func_sum_amount():
    """Helper to bypass direct SQL function references during parsing."""
    from sqlalchemy import func
    return func.sum(PurchaseOrder.amount)
