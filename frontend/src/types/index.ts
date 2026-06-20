export type UserRole = "admin" | "procurement_officer" | "manager" | "vendor";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  vendor_id: number | null;
  created_at: string;
  company?: string;
  designation?: string;
  department?: string;
  avatar?: string;
  status?: string;
}

export interface Vendor {
  id: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  gst_number: string;
  performance_score: number;
  average_delivery_time: number;
  reliability_rating: number;
  created_at: string;
}

export interface RFQ {
  id: number;
  rfq_number: string;
  title: string;
  description: string;
  budget: number;
  quantity: number;
  category: string;
  deadline: string;
  status: "Draft" | "Published" | "Under Review" | "PO Generated" | "Closed";
  created_by_id: number;
  created_at: string;
  vendors: Vendor[];
  quotations: Quotation[];
}

export interface Quotation {
  id: number;
  rfq_id: number;
  vendor_id: number;
  price: number;
  delivery_days: number;
  specs: string | null;
  terms: string | null;
  status: "Submitted" | "Accepted" | "Rejected";
  submitted_at: string;
  vendor?: Vendor;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  purchase_order_id: number;
  amount: number;
  status: "Pending" | "Approved" | "Paid" | "Overdue";
  due_date: string;
  file_path: string | null;
  submitted_at: string;
  paid_at: string | null;
}

export interface ApprovalLog {
  id: number;
  purchase_order_id: number;
  approver_id: number;
  action: "Approved" | "Rejected";
  comments: string | null;
  created_at: string;
  approver: User;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  quotation_id: number;
  amount: number;
  status: "Draft" | "Pending Approval" | "Approved" | "Rejected" | "Sent to Vendor" | "Completed";
  approval_status: "Pending" | "Approved" | "Rejected";
  created_by_id: number;
  approved_by_id: number | null;
  created_at: string;
  quotation: Quotation;
  creator: User;
  approver: User | null;
  invoices: Invoice[];
  approval_logs: ApprovalLog[];
}

export interface CopilotMessageResponse {
  response: string;
  suggested_rfq: {
    title: string;
    description: string;
    category: string;
    quantity: number;
    budget: number;
    suggested_vendor_ids: number[];
  } | null;
  suggested_vendors: {
    vendor_id: number;
    vendor_name: string;
    confidence_score: number;
    reasoning: string;
  }[] | null;
}

export interface SpendAnalytics {
  total_spend: number;
  active_vendors: number;
  open_rfqs: number;
  pending_approvals: number;
  avg_procurement_cycle_days: number;
  monthly_spend: { month: string; spend: number }[];
  category_spend: { category: string; spend: number }[];
  vendor_performance: { vendor_name: string; score: number; reliability: number }[];
  rfq_trends: { month: string; count: number }[];
}
