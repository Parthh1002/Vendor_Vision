import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { rfqApi, vendorApi, quoteApi, poApi } from "../services/api";
import type { RFQ, Vendor } from "../types";
import { useAuth } from "../contexts/AuthContext";
import {
  FileText,
  Plus,
  Send,
  CheckCircle,
  Calendar,
  X,
  AlertCircle,
  FileCheck2,
  ArrowRight
} from "lucide-react";

// Form validation schema for RFQ creation
const rfqSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  budget: z.coerce.number().gt(0, "Budget must be greater than 0"),
  quantity: z.coerce.number().gt(0, "Quantity must be greater than 0"),
  category: z.string().min(2, "Category is required"),
  deadline: z.string().min(5, "Deadline is required"),
  invited_vendor_ids: z.array(z.coerce.number()).min(1, "Please allocate at least one vendor"),
});

type RFQFormValues = z.infer<typeof rfqSchema>;

// Form validation schema for Quotation submission (embedded)
const quoteSchema = z.object({
  price: z.coerce.number().gt(0, "Price must be greater than 0"),
  delivery_days: z.coerce.number().gt(0, "Delivery days must be greater than 0"),
  specs: z.string().optional(),
  terms: z.string().optional(),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

const RFQs: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [vendorsList, setVendorsList] = useState<Vendor[]>([]);
  const [selectedRfq, setSelectedRfq] = useState<RFQ | null>(null);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState<string | null>(null);

  const {
    register: registerRfq,
    handleSubmit: handleSubmitRfq,
    reset: resetRfq,
    setValue: setRfqValue,
    formState: { errors: rfqErrors, isSubmitting: isRfqSubmitting },
  } = useForm<RFQFormValues>({
    resolver: zodResolver(rfqSchema) as any,
    defaultValues: { invited_vendor_ids: [] }
  });

  const {
    register: registerQuote,
    handleSubmit: handleSubmitQuote,
    reset: resetQuote,
    formState: { errors: quoteErrors, isSubmitting: isQuoteSubmitting },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema) as any,
  });

  const fetchRFQs = async () => {
    setLoading(true);
    try {
      const res = await rfqApi.getRFQs();
      setRfqs(res.data);
      
      // If we had a selected RFQ open, refresh its data
      if (selectedRfq) {
        const refreshed = res.data.find((r: RFQ) => r.id === selectedRfq.id);
        if (refreshed) setSelectedRfq(refreshed);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch Requests for Quotations.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await vendorApi.getVendors();
      setVendorsList(res.data);
    } catch (err) {
      console.error("Failed to load vendors for allocation dropdown", err);
    }
  };

  useEffect(() => {
    fetchRFQs();
    if (user?.role !== "vendor") {
      fetchVendors();
    }
  }, []);

  // Listen for AI Copilot draft injections passed in react-router state
  useEffect(() => {
    const state = location.state as { draftRFQ?: any } | null;
    if (state?.draftRFQ) {
      const draft = state.draftRFQ;
      setRfqValue("title", draft.title);
      setRfqValue("description", draft.description);
      setRfqValue("category", draft.category);
      setRfqValue("quantity", draft.quantity);
      setRfqValue("budget", draft.budget);
      setRfqValue("invited_vendor_ids", draft.suggested_vendor_ids || []);
      
      // Auto-set deadline to 7 days from now
      const defaultDeadline = new Date();
      defaultDeadline.setDate(defaultDeadline.getDate() + 7);
      setRfqValue("deadline", defaultDeadline.toISOString().slice(0, 16));
      
      setIsCreateOpen(true);
      // Clear location state to prevent reopening on reload
      navigate(location.pathname, { replace: true });
    }
  }, [location.state]);

  const handleCreateRFQ = async (data: RFQFormValues) => {
    setSubmitError(null);
    try {
      const payload = {
        ...data,
        deadline: new Date(data.deadline).toISOString(),
      };
      const res = await rfqApi.createRFQ(payload);
      setIsCreateOpen(false);
      resetRfq();
      await fetchRFQs();
      setSelectedRfq(res.data);
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || "Failed to create RFQ.");
    }
  };

  const handlePublish = async (rfqId: number) => {
    try {
      await rfqApi.publishRFQ(rfqId);
      await fetchRFQs();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to publish RFQ");
    }
  };

  const handleQuoteSubmit = async (data: QuoteFormValues) => {
    if (!selectedRfq) return;
    setSubmitError(null);
    setQuoteSuccessMsg(null);
    try {
      const payload = {
        rfq_id: selectedRfq.id,
        ...data
      };
      await quoteApi.submitQuote(payload);
      setQuoteSuccessMsg("Quotation submitted successfully!");
      resetQuote();
      await fetchRFQs();
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || "Failed to submit quotation.");
    }
  };

  const handleAcceptQuote = async (quoteId: number) => {
    try {
      // 1. Accept Quote (which marks other quotes rejected and RFQ under review)
      await quoteApi.acceptQuote(quoteId);
      // 2. Generate PO automatically from winning quote
      await poApi.createPO(quoteId);
      await fetchRFQs();
      alert("Quotation accepted! Purchase Order has been generated and sent to approvals.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to accept quotation.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      case "Published": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Under Review": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "PO Generated": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Closed": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const isProcurementOrAdmin = user?.role === "admin" || user?.role === "procurement_officer";

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0 relative">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Requests for Quotations (RFQ)</h1>
          <p className="text-sm text-secondary">Manage tenders, invite vendors, and compare submitted bids</p>
        </div>
        {isProcurementOrAdmin && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold transition-all duration-300 btn-premium shadow-md shadow-accent/15"
          >
            <Plus size={16} />
            <span>Create RFQ Draft</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* RFQ Split View container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        
        {/* Left Column: RFQs Directory */}
        <div className="lg:col-span-1 glass-card border border-default rounded-2xl flex flex-col p-4 min-h-0 overflow-y-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-secondary mb-4 px-2">Active Tenders</h2>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rfqs.length === 0 ? (
            <div className="text-center p-4 text-secondary flex-1 flex flex-col items-center justify-center">
              <FileText size={32} className="mb-2 text-secondary/60" />
              <p className="text-xs font-medium">No RFQs available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rfqs.map((rfq) => (
                <div
                  key={rfq.id}
                  onClick={() => {
                    setSelectedRfq(rfq);
                    setQuoteSuccessMsg(null);
                    setSubmitError(null);
                  }}
                  className={`p-4 border rounded-xl cursor-pointer transition-all duration-300 flex flex-col gap-2 ${
                    selectedRfq?.id === rfq.id
                      ? "bg-surface-elevated border-accent shadow-sm"
                      : "bg-surface border-default hover:border-accent/40"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-[10px] font-bold text-accent">{rfq.rfq_number}</span>
                    <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase ${getStatusColor(rfq.status)}`}>
                      {rfq.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-xs text-primary line-clamp-1">{rfq.title}</h3>
                  <div className="flex items-center justify-between text-[10px] text-secondary font-medium">
                    <span>Budget: ${rfq.budget.toLocaleString()}</span>
                    <span>Deadline: {new Date(rfq.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Columns: Selected RFQ Detail View & Evaluation */}
        <div className="lg:col-span-2 glass-card border border-default rounded-2xl p-4 flex flex-col min-h-0 overflow-y-auto">
          {selectedRfq ? (
            <div className="space-y-4">
              {/* Detailed Header */}
              <div className="border-b border-default pb-4 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-accent">{selectedRfq.rfq_number}</span>
                    <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase ${getStatusColor(selectedRfq.status)}`}>
                      {selectedRfq.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold">{selectedRfq.title}</h2>
                  <p className="text-xs text-secondary mt-1">Category: {selectedRfq.category} | Created: {new Date(selectedRfq.created_at).toLocaleDateString()}</p>
                </div>

                {/* Publish draft button */}
                {isProcurementOrAdmin && selectedRfq.status === "Draft" && (
                  <button
                    onClick={() => handlePublish(selectedRfq.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-semibold transition-all duration-300"
                  >
                    <Send size={12} />
                    <span>Publish RFQ</span>
                  </button>
                )}
              </div>

              {/* Main specifications layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left side: Specs */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-secondary">Requirement Details</h4>
                    <p className="text-xs text-secondary mt-1 whitespace-pre-line leading-relaxed bg-surface-elevated p-3 border border-default rounded-xl">
                      {selectedRfq.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-surface-elevated border border-default rounded-xl">
                      <span className="text-[10px] text-secondary font-medium block">Quantity</span>
                      <span className="text-sm font-bold">{selectedRfq.quantity} unit(s)</span>
                    </div>
                    <div className="p-3 bg-surface-elevated border border-default rounded-xl col-span-2">
                      <span className="text-[10px] text-secondary font-medium block">Target Budget</span>
                      <span className="text-sm font-bold text-accent">${selectedRfq.budget.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-surface-elevated border border-default rounded-xl flex items-center gap-3">
                    <Calendar size={18} className="text-secondary" />
                    <div>
                      <span className="text-[10px] text-secondary font-medium block">Bidding Deadline</span>
                      <span className="text-xs font-bold text-primary">
                        {new Date(selectedRfq.deadline).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Operations (Vendors Submission Form or Officer Comparison table) */}
                <div className="border-t md:border-t-0 md:border-l border-default pt-6 md:pt-0 md:pl-6">
                  {user?.role === "vendor" ? (
                    // VENDOR INTERFACE: Submit Quotation
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-secondary">Quotation Submission Portal</h4>
                      
                      {quoteSuccessMsg && (
                        <div className="p-3 bg-success/10 border border-success/20 text-success rounded-xl text-xs font-semibold flex items-center gap-2">
                          <CheckCircle size={14} />
                          <span>{quoteSuccessMsg}</span>
                        </div>
                      )}

                      {submitError && (
                        <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs font-semibold flex items-center gap-2">
                          <AlertCircle size={14} />
                          <span>{submitError}</span>
                        </div>
                      )}

                      {selectedRfq.status === "Published" ? (
                        <form onSubmit={handleSubmitQuote(handleQuoteSubmit)} className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-secondary">Bid Price ($)</label>
                              <input
                                type="number"
                                {...registerQuote("price")}
                                className="w-full bg-surface-elevated border border-default rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent"
                              />
                              {quoteErrors.price && <p className="text-[10px] text-danger">{quoteErrors.price.message}</p>}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-secondary">Delivery (Days)</label>
                              <input
                                type="number"
                                {...registerQuote("delivery_days")}
                                className="w-full bg-surface-elevated border border-default rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent"
                              />
                              {quoteErrors.delivery_days && <p className="text-[10px] text-danger">{quoteErrors.delivery_days.message}</p>}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-secondary">Matching Specs / Material Details</label>
                            <textarea
                              {...registerQuote("specs")}
                              rows={2}
                              placeholder="Describe how your items meet or exceed specifications..."
                              className="w-full bg-surface-elevated border border-default rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-secondary">Delivery Terms / Warranty Details</label>
                            <textarea
                              {...registerQuote("terms")}
                              rows={2}
                              placeholder="e.g. Free shipping, Net 30 payment terms..."
                              className="w-full bg-surface-elevated border border-default rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isQuoteSubmitting}
                            className="w-full py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-semibold transition-colors btn-premium flex items-center justify-center gap-1.5"
                          >
                            <span>Submit Quotation</span>
                            <ArrowRight size={12} />
                          </button>
                        </form>
                      ) : (
                        <div className="p-3 bg-surface-elevated border border-default rounded-xl text-center text-xs text-secondary">
                          Bidding portal is closed. RFQ status: <span className="font-semibold">{selectedRfq.status}</span>.
                        </div>
                      )}
                    </div>
                  ) : (
                    // PROCUREMENT/STAFF INTERFACE: Compare Quotes
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-secondary">Allocated Tenders & Quotations</h4>
                      
                      <div className="space-y-3">
                        {selectedRfq.quotations && selectedRfq.quotations.length > 0 ? (
                          selectedRfq.quotations.map((quote) => (
                            <div
                              key={quote.id}
                              className={`p-3.5 bg-surface-elevated border rounded-xl space-y-2.5 transition-all duration-300 ${
                                quote.status === "Accepted" ? "border-success bg-success/5" : "border-default"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-xs text-primary">{quote.vendor?.name || `Vendor ID ${quote.vendor_id}`}</p>
                                  <p className="text-[10px] text-secondary mt-0.5">Reliability: {quote.vendor?.reliability_rating} / 5.0</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-xs text-accent">${quote.price.toLocaleString()}</p>
                                  <p className="text-[10px] text-secondary mt-0.5">Delivery: {quote.delivery_days} days</p>
                                </div>
                              </div>
                              
                              {quote.specs && (
                                <p className="text-[10px] text-secondary italic border-l-2 border-default pl-2">
                                  "{quote.specs}"
                                </p>
                              )}

                              {/* Action buttons based on status */}
                              {isProcurementOrAdmin && selectedRfq.status === "Published" && (
                                <button
                                  onClick={() => handleAcceptQuote(quote.id)}
                                  className="w-full py-1.5 border border-success/30 hover:border-success bg-success/5 text-success hover:bg-success/10 rounded-lg text-[10px] font-semibold transition-colors flex items-center justify-center gap-1"
                                >
                                  <CheckCircle size={10} />
                                  <span>Accept & Issue PO</span>
                                </button>
                              )}

                              {quote.status === "Accepted" && (
                                <div className="py-1 bg-success/10 text-success text-center rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                                  <FileCheck2 size={11} />
                                  <span>Accepted Bid & PO Generated</span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-3 bg-surface-elevated border border-default rounded-xl text-center text-xs text-secondary">
                            No quotations submitted yet for this RFQ.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-secondary">
              <FileText size={48} className="text-secondary/40 mb-3" />
              <p className="font-semibold text-sm">No RFQ Selected</p>
              <p className="text-xs">Select a tender from the left pane to view details and proposals</p>
            </div>
          )}
        </div>
      </div>

      {/* Create RFQ Draft Modal */}
      {isCreateOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-lg rounded-2xl p-4 border border-default shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Create Request for Quotation</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
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

            <form onSubmit={handleSubmitRfq(handleCreateRFQ)} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-secondary">RFQ Title</label>
                <input
                  type="text"
                  {...registerRfq("title")}
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {rfqErrors.title && <p className="text-xs text-danger">{rfqErrors.title.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary">Category</label>
                <select
                  {...registerRfq("category")}
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                >
                  <option value="">Select Category</option>
                  <option value="IT Services">IT Services</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Facilities">Facilities</option>
                </select>
                {rfqErrors.category && <p className="text-xs text-danger">{rfqErrors.category.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary">Submission Deadline</label>
                <input
                  type="datetime-local"
                  {...registerRfq("deadline")}
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {rfqErrors.deadline && <p className="text-xs text-danger">{rfqErrors.deadline.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary">Target Quantity</label>
                <input
                  type="number"
                  {...registerRfq("quantity")}
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {rfqErrors.quantity && <p className="text-xs text-danger">{rfqErrors.quantity.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary">Allocated Budget ($)</label>
                <input
                  type="number"
                  {...registerRfq("budget")}
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {rfqErrors.budget && <p className="text-xs text-danger">{rfqErrors.budget.message}</p>}
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-secondary">Allocate Suppliers (Select Invited Vendors)</label>
                <div className="max-h-24 overflow-y-auto border border-default rounded-xl p-3 bg-surface-elevated grid grid-cols-2 gap-2">
                  {vendorsList.map((v) => (
                    <label key={v.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        value={v.id}
                        {...registerRfq("invited_vendor_ids")}
                        className="rounded border-default text-accent focus:ring-accent"
                      />
                      <span className="truncate">{v.name}</span>
                    </label>
                  ))}
                </div>
                {rfqErrors.invited_vendor_ids && <p className="text-xs text-danger">{rfqErrors.invited_vendor_ids.message}</p>}
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-secondary">Specifications Requirements</label>
                <textarea
                  {...registerRfq("description")}
                  rows={3}
                  placeholder="Draft detailed criteria, warranties, performance specifications..."
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {rfqErrors.description && <p className="text-xs text-danger">{rfqErrors.description.message}</p>}
              </div>

              <div className="col-span-2 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-default text-secondary hover:bg-surface-elevated font-semibold text-sm transition-colors btn-premium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRfqSubmitting}
                  className="flex-1 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl font-semibold text-sm transition-colors btn-premium shadow-md shadow-accent/10"
                >
                  {isRfqSubmitting ? "Drafting..." : "Create Draft"}
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

export default RFQs;
