import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { quoteApi, rfqApi, poApi } from "../services/api";
import type { Quotation, RFQ } from "../types";
import { useAuth } from "../contexts/AuthContext";
import {
  MessageSquareQuote,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ArrowDownAZ,
  X,
  Award,
  ShieldCheck,
  AlertCircle,
  FileText
} from "lucide-react";

const Quotations: React.FC = () => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Submitted" | "Accepted" | "Rejected">("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "price_asc" | "price_desc">("newest");

  // Modal State
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchQuotesAndRFQs = async () => {
    setLoading(true);
    try {
      const [quotesRes, rfqsRes] = await Promise.all([
        quoteApi.getQuotes(),
        rfqApi.getRFQs()
      ]);
      setQuotes(quotesRes.data);
      setRfqs(rfqsRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve quotations and RFQ details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotesAndRFQs();
  }, []);

  const handleAcceptQuote = async (quoteId: number) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      // 1. Accept the winning quotation
      await quoteApi.acceptQuote(quoteId);
      // 2. Generate a Purchase Order automatically from it
      await poApi.createPO(quoteId);
      
      setActionSuccess("Quotation accepted successfully! Purchase Order has been generated.");
      
      // Refresh list
      const [quotesRes, rfqsRes] = await Promise.all([
        quoteApi.getQuotes(),
        rfqApi.getRFQs()
      ]);
      setQuotes(quotesRes.data);
      setRfqs(rfqsRes.data);
      
      // Update selected quote details in modal to reflect Accepted status
      const updatedQuote = quotesRes.data.find((q: Quotation) => q.id === quoteId);
      if (updatedQuote) {
        setSelectedQuote(updatedQuote);
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.response?.data?.detail || "Failed to accept quotation.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Accepted":
        return (
          <span className="px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20 font-bold text-[10px] flex items-center gap-1 w-max">
            <CheckCircle size={10} />
            <span>Accepted</span>
          </span>
        );
      case "Rejected":
        return (
          <span className="px-2.5 py-1 rounded-full bg-danger/10 text-danger border border-danger/20 font-bold text-[10px] flex items-center gap-1 w-max">
            <XCircle size={10} />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-accent border border-blue-500/20 font-bold text-[10px] flex items-center gap-1 w-max">
            <Clock size={10} />
            <span>Submitted</span>
          </span>
        );
    }
  };

  // Filtering Logic
  const filteredQuotes = quotes.filter((quote) => {
    const rfq = rfqs.find((r) => r.id === quote.rfq_id);
    const vendorName = quote.vendor?.name || "";
    const rfqNum = rfq?.rfq_number || `RFQ-${quote.rfq_id.toString().padStart(4, "0")}`;
    const rfqTitle = rfq?.title || "";

    const matchesSearch =
      vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfqNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfqTitle.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || quote.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sorting Logic
  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    if (sortBy === "price_asc") {
      return a.price - b.price;
    } else if (sortBy === "price_desc") {
      return b.price - a.price;
    } else if (sortBy === "oldest") {
      return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
    } else {
      // Default: newest first
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    }
  });

  const isProcurementOrAdmin = user?.role === "admin" || user?.role === "procurement_officer";

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0 relative">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quotations Registry</h1>
        <p className="text-sm text-secondary">
          {user?.role === "vendor"
            ? "Track and manage bids submitted by your company"
            : "Audit history logs of all proposals submitted by suppliers"}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 bg-surface border border-default rounded-2xl">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-secondary">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by vendor, RFQ number or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-elevated border border-default rounded-xl pl-9 pr-4 py-2 text-xs text-primary outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Status Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tabs */}
          <div className="flex bg-surface-elevated p-1 rounded-xl border border-default">
            {(["All", "Submitted", "Accepted", "Rejected"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  statusFilter === status
                    ? "bg-surface text-accent shadow-sm"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Sorting Dropdown */}
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-secondary pointer-events-none">
              <ArrowDownAZ size={14} />
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-surface-elevated border border-default rounded-xl pl-9 pr-8 py-2 text-xs text-primary font-semibold outline-none cursor-pointer hover:border-accent transition-all duration-300 appearance-none"
            >
              <option value="newest">Newest Submitted</option>
              <option value="oldest">Oldest Submitted</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedQuotes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface border border-default rounded-2xl text-center">
          <MessageSquareQuote size={40} className="text-secondary mb-3 animate-pulse" />
          <p className="font-semibold text-primary">No Quotations Found</p>
          <p className="text-xs text-secondary mt-1 max-w-sm">
            {searchTerm || statusFilter !== "All"
              ? "We couldn't find any quotes matching your current search criteria or status filter."
              : user?.role === "vendor"
              ? "You haven't submitted any quotations yet. Check open RFQs!"
              : "No suppliers have submitted quotations to any RFQ yet."}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="border border-default rounded-2xl overflow-hidden bg-surface shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-elevated border-b border-default text-secondary uppercase font-bold tracking-wider">
                  <th className="p-4 w-[120px]">RFQ Number</th>
                  <th className="p-4 min-w-[200px]">RFQ Title</th>
                  {user?.role !== "vendor" && <th className="p-4 min-w-[150px]">Vendor</th>}
                  <th className="p-4 text-right">Bid Price</th>
                  <th className="p-4 text-center">Lead Time</th>
                  <th className="p-4">Submitted Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedQuotes.map((quote) => {
                  const rfq = rfqs.find((r) => r.id === quote.rfq_id);
                  const rfqNum = rfq?.rfq_number || `RFQ-${quote.rfq_id.toString().padStart(4, "0")}`;
                  const rfqTitle = rfq?.title || "Unknown RFQ";
                  return (
                    <tr
                      key={quote.id}
                      onClick={() => {
                        setSelectedQuote(quote);
                        setActionError(null);
                        setActionSuccess(null);
                      }}
                      className="border-b border-default last:border-0 hover:bg-surface-elevated/40 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 font-mono font-bold text-accent group-hover:underline">
                        {rfqNum}
                      </td>
                      <td className="p-4 font-semibold text-primary max-w-xs truncate">
                        {rfqTitle}
                      </td>
                      {user?.role !== "vendor" && (
                        <td className="p-4 font-medium text-primary">
                          {quote.vendor?.name || `Vendor ID ${quote.vendor_id}`}
                        </td>
                      )}
                      <td className="p-4 font-bold text-right text-primary">
                        ${quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center font-medium text-secondary">
                        {quote.delivery_days} days
                      </td>
                      <td className="p-4 text-secondary">
                        {new Date(quote.submitted_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short"
                        })}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(quote.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bid Details Modal */}
      {selectedQuote && createPortal(
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-default rounded-3xl w-full max-w-2xl p-4 shadow-xl flex flex-col max-h-[90vh] overflow-hidden scale-in-center">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-default">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-accent">
                    RFQ-{rfqs.find((r) => r.id === selectedQuote.rfq_id)?.rfq_number.split("-").pop() || selectedQuote.rfq_id}
                  </span>
                  {getStatusBadge(selectedQuote.status)}
                </div>
                <h3 className="text-md font-bold text-primary mt-1">Quotation Submission Details</h3>
              </div>
              <button
                onClick={() => setSelectedQuote(null)}
                className="p-1 rounded-lg text-secondary hover:bg-surface-elevated hover:text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
              {actionSuccess && (
                <div className="p-3 bg-success/10 border border-success/20 text-success rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle size={14} />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {actionError && (
                <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Grid Section 1: Bid Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-surface-elevated rounded-2xl border border-default">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">Proposed Bid Price</span>
                  <span className="text-xl font-black text-accent mt-1 block">
                    ${selectedQuote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 bg-surface-elevated rounded-2xl border border-default">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">Delivery Lead Time</span>
                  <span className="text-xl font-bold text-primary mt-1 block">
                    {selectedQuote.delivery_days} calendar days
                  </span>
                </div>
              </div>

              {/* Quotation Specs & Terms */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold uppercase text-secondary tracking-wider">Proposal Specifications</h4>
                  <div className="p-3.5 bg-neutral-50 border border-default rounded-xl text-xs font-medium text-primary mt-1.5 whitespace-pre-wrap leading-relaxed">
                    {selectedQuote.specs || "No custom specifications provided by supplier."}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-secondary tracking-wider">Terms & Conditions</h4>
                  <div className="p-3.5 bg-neutral-50 border border-default rounded-xl text-xs font-medium text-primary mt-1.5 whitespace-pre-wrap leading-relaxed">
                    {selectedQuote.terms || "Standard payment and shipping terms apply."}
                  </div>
                </div>
              </div>

              {/* Section 2: Supplier Profile */}
              {selectedQuote.vendor && (
                <div className="p-4 border border-default rounded-2xl space-y-3 bg-surface">
                  <div className="flex items-center gap-1.5 text-secondary">
                    <Award size={14} className="text-accent" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Supplier Performance Card</h4>
                  </div>
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h5 className="font-bold text-xs text-primary">{selectedQuote.vendor.name}</h5>
                      <p className="text-[10px] text-secondary mt-0.5">
                        Contact: {selectedQuote.vendor.contact_person} ({selectedQuote.vendor.email})
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-success flex items-center gap-0.5 justify-end">
                        <ShieldCheck size={12} /> {selectedQuote.vendor.reliability_rating.toFixed(1)} / 5.0
                      </span>
                      <span className="text-[9px] text-secondary block mt-0.5">Reliability Rating</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-dashed border-default text-center">
                    <div>
                      <span className="text-xs font-bold text-accent">{selectedQuote.vendor.performance_score.toFixed(1)}%</span>
                      <span className="text-[9px] text-secondary block">Perf. Score</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-primary">{selectedQuote.vendor.average_delivery_time} days</span>
                      <span className="text-[9px] text-secondary block">Avg. Delivery</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-primary">{selectedQuote.vendor.category}</span>
                      <span className="text-[9px] text-secondary block">Category</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: Target RFQ Requirements */}
              {(() => {
                const rfq = rfqs.find((r) => r.id === selectedQuote.rfq_id);
                if (!rfq) return null;
                const priceVsBudget = ((selectedQuote.price / rfq.budget) * 100).toFixed(0);
                const isOverBudget = selectedQuote.price > rfq.budget;

                return (
                  <div className="p-4 border border-default rounded-2xl bg-slate-50/50 space-y-3">
                    <div className="flex items-center gap-1.5 text-secondary">
                      <FileText size={14} className="text-secondary" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">Target RFQ Requirements</h4>
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-primary">{rfq.title}</h5>
                      <p className="text-[10px] text-secondary mt-1 leading-relaxed">{rfq.description}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-dashed border-default text-left">
                      <div>
                        <span className="text-xs font-bold text-primary">${rfq.budget.toLocaleString()}</span>
                        <span className="text-[9px] text-secondary block">RFQ Budget</span>
                      </div>
                      <div>
                        <span className={`text-xs font-bold ${isOverBudget ? "text-danger" : "text-success"}`}>
                          {priceVsBudget}%
                        </span>
                        <span className="text-[9px] text-secondary block">Budget Utilization</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-primary">{rfq.quantity} units</span>
                        <span className="text-[9px] text-secondary block">Target Quantity</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-primary">
                          {new Date(rfq.deadline).toLocaleDateString()}
                        </span>
                        <span className="text-[9px] text-secondary block">Bid Deadline</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-default flex justify-end gap-3 bg-surface">
              <button
                onClick={() => setSelectedQuote(null)}
                className="px-4 py-2 border border-default text-secondary hover:bg-surface-elevated hover:text-primary rounded-xl text-xs font-bold transition-all duration-200"
              >
                Close
              </button>
              {isProcurementOrAdmin && selectedQuote.status === "Submitted" && (
                <button
                  onClick={() => handleAcceptQuote(selectedQuote.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-success hover:bg-success-dark text-white rounded-xl text-xs font-bold transition-all duration-300 btn-premium shadow-md shadow-success/15 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  <span>Accept Bid & Generate PO</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Quotations;
