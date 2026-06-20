import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { invoiceApi, poApi } from "../services/api";
import type { Invoice, PurchaseOrder } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Receipt,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Calendar,
  X
} from "lucide-react";

// Form validation schema for Invoice submission
const invoiceSchema = z.object({
  invoice_number: z.string().min(3, "Invoice number is required"),
  purchase_order_id: z.coerce.number().gt(0, "Please select a Purchase Order"),
  amount: z.coerce.number().gt(0, "Amount must be greater than 0"),
  due_date: z.string().min(5, "Due date is required"),
  file_path: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

const Invoices: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [approvedPOs, setApprovedPOs] = useState<PurchaseOrder[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
  });

  const selectedPoId = watch("purchase_order_id");

  // Automatically fill invoice amount when PO is selected
  useEffect(() => {
    if (selectedPoId) {
      const match = approvedPOs.find((p) => p.id === Number(selectedPoId));
      if (match) {
        setValue("amount", match.amount);
        
        // Auto-set default due date to 30 days from now
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 30);
        setValue("due_date", defaultDue.toISOString().slice(0, 10));
      }
    }
  }, [selectedPoId, approvedPOs, setValue]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await invoiceApi.getInvoices();
      setInvoices(res.data);
      if (selectedInvoice) {
        const refreshed = res.data.find((i: Invoice) => i.id === selectedInvoice.id);
        if (refreshed) setSelectedInvoice(refreshed);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch invoice tracking logs.");
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedPOs = async () => {
    try {
      const res = await poApi.getPOs();
      // Only keep approved POs to invoice against
      const approved = res.data.filter((p: PurchaseOrder) => p.status === "Approved");
      setApprovedPOs(approved);
    } catch (err) {
      console.error("Failed to load POs for invoice selector", err);
    }
  };

  useEffect(() => {
    fetchInvoices();
    if (user?.role === "vendor") {
      fetchApprovedPOs();
    }
  }, []);

  const handleInvoiceSubmit = async (data: InvoiceFormValues) => {
    setSubmitError(null);
    try {
      const payload = {
        ...data,
        due_date: new Date(data.due_date).toISOString(),
        file_path: data.file_path || "/uploads/invoice_temp.pdf"
      };
      await invoiceApi.submitInvoice(payload);
      setIsSubmitOpen(false);
      reset();
      await fetchInvoices();
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || "Failed to submit invoice.");
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedInvoice) return;
    try {
      await invoiceApi.updateStatus(selectedInvoice.id, status);
      await fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update invoice payment status.");
    }
  };

  const isOverdue = (invoice: Invoice) => {
    return (
      (invoice.status === "Pending" || invoice.status === "Approved") &&
      new Date(invoice.due_date) < new Date()
    );
  };

  const getStatusBadge = (invoice: Invoice) => {
    if (isOverdue(invoice)) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-danger/10 text-danger border border-danger/20 font-bold text-[10px] flex items-center gap-1 w-max">
          <AlertTriangle size={10} />
          <span>Overdue Alert</span>
        </span>
      );
    }

    switch (invoice.status) {
      case "Paid":
        return (
          <span className="px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20 font-bold text-[10px] flex items-center gap-1 w-max">
            <CheckCircle size={10} />
            <span>Paid</span>
          </span>
        );
      case "Approved":
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-accent border border-blue-500/20 font-bold text-[10px] flex items-center gap-1 w-max">
            <CheckCircle size={10} />
            <span>Approved</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold text-[10px] flex items-center gap-1 w-max">
            <Clock size={10} />
            <span>Pending</span>
          </span>
        );
    }
  };

  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoice Tracker</h1>
          <p className="text-sm text-secondary">Track billing statements, payment completions, and due dates</p>
        </div>
        {user?.role === "vendor" && (
          <button
            onClick={() => setIsSubmitOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold transition-all duration-300 btn-premium shadow-md shadow-accent/15"
          >
            <Plus size={16} />
            <span>Submit Invoice</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        
        {/* Left Column: Invoices list */}
        <div className="lg:col-span-1 glass-card border border-default rounded-2xl flex flex-col p-4 min-h-0 overflow-y-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-secondary mb-4 px-2">Invoice Logs</h2>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center p-4 text-secondary flex-1 flex flex-col items-center justify-center">
              <Receipt size={32} className="mb-2 text-secondary/60" />
              <p className="text-xs font-medium">No invoices registered</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all duration-300 flex flex-col gap-2 ${
                    selectedInvoice?.id === inv.id
                      ? "bg-surface-elevated border-accent shadow-sm"
                      : "bg-surface border-default hover:border-accent/40"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-[10px] font-bold text-accent">{inv.invoice_number}</span>
                    {getStatusBadge(inv)}
                  </div>
                  <h3 className="font-semibold text-xs text-primary">
                    PO Link: PO-{inv.purchase_order_id.toString().padStart(4, "0")}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] text-secondary font-medium">
                    <span>Amount: ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span>Due: {new Date(inv.due_date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Columns: Detail Panel */}
        <div className="lg:col-span-2 glass-card border border-default rounded-2xl p-4 flex flex-col min-h-0 overflow-y-auto">
          {selectedInvoice ? (
            <div className="space-y-4">
              
              {/* Detailed Title */}
              <div className="border-b border-default pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold text-accent">{selectedInvoice.invoice_number}</span>
                  {getStatusBadge(selectedInvoice)}
                </div>
                <h2 className="text-base font-bold">
                  Purchase Order Reference: PO-{selectedInvoice.purchase_order_id.toString().padStart(4, "0")}
                </h2>
              </div>

              {/* Data sheets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Details list */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-secondary">Billing Details</h4>

                  <div className="space-y-3 text-xs bg-surface-elevated p-4 border border-default rounded-2xl">
                    <div className="flex justify-between">
                      <span className="text-secondary">Invoice Number:</span>
                      <span className="font-mono font-semibold text-primary">{selectedInvoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Origin PO ID:</span>
                      <span className="font-mono text-primary">PO-{selectedInvoice.purchase_order_id.toString().padStart(4, "0")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Submission Date:</span>
                      <span className="font-semibold text-primary">{new Date(selectedInvoice.submitted_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-default pt-2 mt-2">
                      <span className="text-secondary font-medium">Invoiced Amount:</span>
                      <span className="font-bold text-accent text-sm">${selectedInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-surface-elevated border border-default rounded-xl flex items-center gap-3">
                    <Calendar size={18} className="text-secondary" />
                    <div>
                      <span className="text-[10px] text-secondary font-medium block">Terms Due Date</span>
                      <span className={`text-xs font-bold ${isOverdue(selectedInvoice) ? "text-danger" : "text-primary"}`}>
                        {new Date(selectedInvoice.due_date).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Approvals/Actions */}
                <div className="border-t md:border-t-0 md:border-l border-default pt-6 md:pt-0 md:pl-6 space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-secondary">Payment Audit Trails</h4>

                  {/* Overdue alert banner */}
                  {isOverdue(selectedInvoice) && (
                    <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-2xl flex gap-3 text-xs">
                      <AlertTriangle size={18} className="flex-shrink-0 pt-0.5" />
                      <div>
                        <p className="font-bold">Overdue Payment Alert</p>
                        <p className="text-[11px] text-secondary mt-0.5">This invoice has exceeded its credit terms. Processing required.</p>
                      </div>
                    </div>
                  )}

                  {/* Manager controls */}
                  {isManagerOrAdmin ? (
                    <div className="space-y-3 p-3 bg-surface-elevated border border-default rounded-2xl">
                      <p className="text-xs text-secondary font-semibold">Payment Action Panels:</p>
                      
                      {selectedInvoice.status === "Pending" && (
                        <button
                          onClick={() => handleUpdateStatus("Approved")}
                          className="w-full py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold btn-premium transition-all duration-300 shadow-md shadow-accent/15"
                        >
                          Approve Invoice
                        </button>
                      )}

                      {selectedInvoice.status === "Approved" && (
                        <button
                          onClick={() => handleUpdateStatus("Paid")}
                          className="w-full py-2.5 bg-success hover:bg-success/90 text-white rounded-xl text-xs font-semibold btn-premium transition-all duration-300 shadow-md shadow-success/15"
                        >
                          Mark Invoice as Paid
                        </button>
                      )}

                      {selectedInvoice.status === "Paid" && (
                        <div className="text-center p-3 bg-success/10 text-success border border-success/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle size={14} />
                          <span>Transaction Paid on {selectedInvoice.paid_at ? new Date(selectedInvoice.paid_at).toLocaleDateString() : "ledger"}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Vendor status panel
                    <div className="p-3 bg-surface-elevated border border-default rounded-2xl text-center text-xs text-secondary">
                      {selectedInvoice.status === "Paid" ? (
                        <div className="text-success font-semibold flex items-center justify-center gap-1">
                          <CheckCircle size={14} />
                          <span>Payment completed. Funds deposited.</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <Clock size={14} />
                          <span>Awaiting internal processing updates.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-secondary">
              <Receipt size={48} className="text-secondary/40 mb-3" />
              <p className="font-semibold text-sm">No Invoice Selected</p>
              <p className="text-xs">Select an invoice from the ledger to review schedules, billing values, and pay logs</p>
            </div>
          )}
        </div>
      </div>

      {/* Submit Invoice Modal */}
      {isSubmitOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-lg rounded-2xl p-4 border border-default shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Submit Invoice</h2>
              <button
                onClick={() => setIsSubmitOpen(false)}
                className="p-1 rounded-lg border border-default hover:bg-surface-elevated"
              >
                <X size={16} />
              </button>
            </div>

            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/25 text-danger rounded-xl text-xs font-semibold">
                <AlertCircle size={14} />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(handleInvoiceSubmit)} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-secondary">Select Purchase Order Reference</label>
                <select
                  {...register("purchase_order_id")}
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                >
                  <option value="">Choose Approved PO</option>
                  {approvedPOs.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} (${po.amount.toLocaleString()})
                    </option>
                  ))}
                </select>
                {errors.purchase_order_id && <p className="text-xs text-danger">{errors.purchase_order_id.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary">Invoice Number</label>
                <input
                  type="text"
                  {...register("invoice_number")}
                  placeholder="e.g. INV-2026-99"
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {errors.invoice_number && <p className="text-xs text-danger">{errors.invoice_number.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary">Billing Amount ($)</label>
                <input
                  type="number"
                  {...register("amount")}
                  readOnly
                  className="w-full bg-surface-elevated opacity-75 cursor-not-allowed border border-default rounded-xl px-4 py-2 text-sm focus:outline-none"
                />
                {errors.amount && <p className="text-xs text-danger">{errors.amount.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary">Payment Due Date</label>
                <input
                  type="date"
                  {...register("due_date")}
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {errors.due_date && <p className="text-xs text-danger">{errors.due_date.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary">Attachment file path</label>
                <input
                  type="text"
                  {...register("file_path")}
                  placeholder="/uploads/my_invoice.pdf"
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div className="col-span-2 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubmitOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-default text-secondary hover:bg-surface-elevated font-semibold text-sm transition-colors btn-premium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl font-semibold text-sm transition-colors btn-premium shadow-md shadow-accent/10"
                >
                  {isSubmitting ? "Submitting..." : "Submit Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Invoices;
