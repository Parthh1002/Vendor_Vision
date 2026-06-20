import React, { useEffect, useState } from "react";
import { poApi } from "../services/api";
import type { PurchaseOrder } from "../types";
import { useAuth } from "../contexts/AuthContext";
import {
  FileCheck,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Printer,
  Calendar,
  User as UserIcon
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PurchaseOrders: React.FC = () => {
  const { user } = useAuth();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  
  const [approvalComments, setApprovalComments] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const res = await poApi.getPOs();
      setPos(res.data);
      if (selectedPo) {
        const refreshed = res.data.find((p: PurchaseOrder) => p.id === selectedPo.id);
        if (refreshed) setSelectedPo(refreshed);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch Purchase Orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, []);

  const handleApprovalAction = async (action: "Approved" | "Rejected") => {
    if (!selectedPo) return;
    setIsSubmittingApproval(true);
    try {
      await poApi.approvePO(selectedPo.id, action, approvalComments);
      setApprovalComments("");
      await fetchPOs();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update PO status.");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // PDF Export using html2canvas & jsPDF
  const downloadPOAsPDF = async () => {
    if (!selectedPo) return;
    const element = document.getElementById("po-pdf-print-template");
    if (!element) return;

    // Make template visible temporarily for capture
    element.style.display = "block";

    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Retain high resolution text
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 size width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`PurchaseOrder_${selectedPo.po_number}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to export PO PDF.");
    } finally {
      // Hide print element again
      element.style.display = "none";
    }
  };

  const triggerPrint = () => {
    // Reveal B&W template
    const element = document.getElementById("po-pdf-print-template");
    if (!element) return;
    element.style.display = "block";
    window.print();
    element.style.display = "none";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-success/10 text-success border-success/20";
      case "Rejected":
        return "bg-danger/10 text-danger border-danger/20";
      case "Pending Approval":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Completed":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-default";
    }
  };

  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0 relative">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Purchase Orders (PO)</h1>
        <p className="text-sm text-secondary">Manage purchase agreements and complete manager approval workflows</p>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs font-semibold flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        
        {/* Left Column: Purchase Orders List */}
        <div className="lg:col-span-1 glass-card border border-default rounded-2xl flex flex-col p-4 min-h-0 overflow-y-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-secondary mb-4 px-2">Order Book</h2>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pos.length === 0 ? (
            <div className="text-center p-4 text-secondary flex-1 flex flex-col items-center justify-center">
              <FileCheck size={32} className="mb-2 text-secondary/60" />
              <p className="text-xs font-medium">No Purchase Orders</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pos.map((po) => (
                <div
                  key={po.id}
                  onClick={() => setSelectedPo(po)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all duration-300 flex flex-col gap-2 ${
                    selectedPo?.id === po.id
                      ? "bg-surface-elevated border-accent shadow-sm"
                      : "bg-surface border-default hover:border-accent/40"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-[10px] font-bold text-accent">{po.po_number}</span>
                    <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase ${getStatusBadge(po.status)}`}>
                      {po.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-xs text-primary line-clamp-1">
                    {po.quotation.vendor?.name || `Vendor ID ${po.quotation.vendor_id}`}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] text-secondary font-medium">
                    <span>Amount: ${po.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span>Date: {new Date(po.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Columns: Purchase Order details sheet */}
        <div className="lg:col-span-2 glass-card border border-default rounded-2xl p-4 flex flex-col min-h-0 overflow-y-auto">
          {selectedPo ? (
            <div className="space-y-4">
              
              {/* Detailed Header & Export Actions */}
              <div className="border-b border-default pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-accent">{selectedPo.po_number}</span>
                    <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase ${getStatusBadge(selectedPo.status)}`}>
                      {selectedPo.status}
                    </span>
                  </div>
                  <h2 className="text-base font-bold">
                    {selectedPo.quotation.vendor?.name || `Vendor ID ${selectedPo.quotation.vendor_id}`}
                  </h2>
                </div>

                {/* PDF & Print Trigger buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={downloadPOAsPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-elevated hover:bg-surface border border-default text-primary rounded-lg text-xs font-semibold btn-premium transition-all duration-300"
                  >
                    <Download size={13} />
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={triggerPrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-elevated hover:bg-surface border border-default text-primary rounded-lg text-xs font-semibold btn-premium transition-all duration-300"
                  >
                    <Printer size={13} />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* Specifications sheet */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* PO core values */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-secondary">Purchase Order Details</h4>
                  
                  <div className="space-y-3 text-xs bg-surface-elevated p-4 border border-default rounded-2xl">
                    <div className="flex justify-between">
                      <span className="text-secondary">Vendor Company:</span>
                      <span className="font-semibold text-primary">{selectedPo.quotation.vendor?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Vendor Email:</span>
                      <span className="font-semibold text-primary">{selectedPo.quotation.vendor?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">VAT/GST Number:</span>
                      <span className="font-mono text-primary">{selectedPo.quotation.vendor?.gst_number}</span>
                    </div>
                    <div className="flex justify-between border-t border-default pt-2 mt-2">
                      <span className="text-secondary font-medium">Agreement Value:</span>
                      <span className="font-bold text-accent text-sm">${selectedPo.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Delivery Timeline:</span>
                      <span className="font-semibold text-primary">{selectedPo.quotation.delivery_days} days from dispatch</span>
                    </div>
                  </div>

                  {/* Date details */}
                  <div className="p-3 bg-surface-elevated border border-default rounded-xl flex items-center gap-3">
                    <Calendar size={18} className="text-secondary" />
                    <div>
                      <span className="text-[10px] text-secondary font-medium block">Issue Date</span>
                      <span className="text-xs font-bold text-primary">
                        {new Date(selectedPo.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Approvals audit log / action panel */}
                <div className="border-t md:border-t-0 md:border-l border-default pt-6 md:pt-0 md:pl-6 space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-secondary">Approval Workflow Status</h4>

                  {/* 1. Pending approval & current user is Manager/Admin */}
                  {selectedPo.status === "Pending Approval" && isManagerOrAdmin ? (
                    <div className="space-y-3 p-3 bg-surface-elevated border border-default rounded-2xl">
                      <p className="text-xs text-secondary font-medium">Review purchase terms and finalize authorization action:</p>
                      
                      <textarea
                        value={approvalComments}
                        onChange={(e) => setApprovalComments(e.target.value)}
                        placeholder="Add remarks or justification for approval/rejection..."
                        rows={3}
                        className="w-full bg-surface border border-default rounded-xl p-3 text-xs focus:outline-none focus:border-accent"
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprovalAction("Rejected")}
                          disabled={isSubmittingApproval}
                          className="flex-1 py-2 border border-danger/30 hover:border-danger bg-danger/5 hover:bg-danger/10 text-danger rounded-xl text-xs font-semibold transition-all duration-300 btn-premium"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprovalAction("Approved")}
                          disabled={isSubmittingApproval}
                          className="flex-1 py-2 bg-success text-white hover:bg-success/90 rounded-xl text-xs font-semibold transition-all duration-300 btn-premium shadow-md shadow-success/15"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 2. Display approval log / comments
                    <div className="space-y-3">
                      {selectedPo.approval_logs && selectedPo.approval_logs.length > 0 ? (
                        selectedPo.approval_logs.map((log) => (
                          <div
                            key={log.id}
                            className={`p-3.5 border rounded-xl space-y-2 ${
                              log.action === "Approved" ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
                            }`}
                          >
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold flex items-center gap-1">
                                {log.action === "Approved" ? (
                                  <CheckCircle size={12} className="text-success" />
                                ) : (
                                  <XCircle size={12} className="text-danger" />
                                )}
                                <span className={log.action === "Approved" ? "text-success" : "text-danger"}>
                                  PO {log.action}
                                </span>
                              </span>
                              <span className="text-[10px] text-secondary">{new Date(log.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-primary italic">"{log.comments || "No comments added."}"</p>
                            <div className="text-[10px] text-secondary flex items-center gap-1">
                              <UserIcon size={10} />
                              <span>Reviewed by {log.approver.name}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 bg-surface-elevated border border-default rounded-xl text-center text-xs text-secondary flex items-center gap-2 justify-center">
                          <Clock size={14} />
                          <span>Awaiting manager approval review.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-secondary">
              <FileCheck size={48} className="text-secondary/40 mb-3" />
              <p className="font-semibold text-sm">No Purchase Order Selected</p>
              <p className="text-xs">Select a purchase order from the sidebar ledger to display details, logs, or exports</p>
            </div>
          )}
        </div>
      </div>

      {/* DEDICATED PDF/PRINT BLACK AND WHITE TEMPLATE (HIDDEN FROM STANDARDS SCREEN RENDER) */}
      {selectedPo && (
        <div
          id="po-pdf-print-template"
          style={{
            display: "none",
            position: "absolute",
            left: "-9999px",
            width: "800px",
            padding: "40px",
            backgroundColor: "#ffffff",
            color: "#000000",
            fontFamily: "sans-serif",
            lineHeight: "1.5",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #000000", paddingBottom: "20px", marginBottom: "30px" }}>
            <div>
              <h1 style={{ fontSize: "28px", margin: "0", fontWeight: "bold", letterSpacing: "-0.5px" }}>VENDORVISION ERP</h1>
              <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#555555" }}>Enterprise Procurement & Supply Operations</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <h2 style={{ fontSize: "20px", margin: "0", fontWeight: "bold" }}>PURCHASE ORDER</h2>
              <p style={{ margin: "5px 0 0 0", fontFamily: "monospace", fontSize: "14px", fontWeight: "bold" }}>{selectedPo.po_number}</p>
            </div>
          </div>

          {/* Details Table */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px", fontSize: "13px" }}>
            <div>
              <p style={{ margin: "0 0 8px 0", fontWeight: "bold", textTransform: "uppercase", fontSize: "10px", color: "#666666" }}>Issued To (Supplier)</p>
              <p style={{ margin: "0 0 4px 0", fontWeight: "bold", fontSize: "15px" }}>{selectedPo.quotation.vendor?.name}</p>
              <p style={{ margin: "0 0 4px 0" }}>Contact: {selectedPo.quotation.vendor?.contact_person}</p>
              <p style={{ margin: "0 0 4px 0" }}>Email: {selectedPo.quotation.vendor?.email}</p>
              <p style={{ margin: "0 0 4px 0" }}>Address: {selectedPo.quotation.vendor?.address}</p>
              <p style={{ margin: "0" }}>GSTIN: {selectedPo.quotation.vendor?.gst_number}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: "bold", textTransform: "uppercase", fontSize: "10px", color: "#666666" }}>Order Details</p>
              <p style={{ margin: "0 0 4px 0" }}><strong>Issue Date:</strong> {new Date(selectedPo.created_at).toLocaleDateString()}</p>
              <p style={{ margin: "0 0 4px 0" }}><strong>Delivery Lead:</strong> {selectedPo.quotation.delivery_days} Days</p>
              <p style={{ margin: "0 0 4px 0" }}><strong>Agreement status:</strong> {selectedPo.status}</p>
              <p style={{ margin: "0" }}><strong>Origin RFQ:</strong> RFQ-{selectedPo.quotation.rfq_id.toString().padStart(4, "0")}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "40px", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #000000", textAlign: "left", fontWeight: "bold" }}>
                <th style={{ padding: "8px 0" }}>Item Specifications / Description</th>
                <th style={{ padding: "8px 0", textAlign: "right" }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #dddddd" }}>
                <td style={{ padding: "12px 0", verticalAlign: "top" }}>
                  <p style={{ margin: "0", fontWeight: "bold" }}>Procured Goods & Service Contract</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#555555" }}>{selectedPo.quotation.specs || "Standard procurement delivery contract."}</p>
                </td>
                <td style={{ padding: "12px 0", textAlign: "right", verticalAlign: "top", fontWeight: "bold" }}>
                  ${selectedPo.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
              {/* Summary Row */}
              <tr>
                <td style={{ padding: "12px 0", textAlign: "right", fontWeight: "bold" }}>Grand Total (USD):</td>
                <td style={{ padding: "12px 0", textAlign: "right", fontWeight: "bold", fontSize: "16px" }}>
                  ${selectedPo.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer signature line */}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "40px", borderTop: "1px solid #dddddd", fontSize: "12px" }}>
            <div>
              <p style={{ margin: "0 0 30px 0", color: "#666666" }}>Prepared By</p>
              <p style={{ margin: "0", fontWeight: "bold" }}>{selectedPo.creator.name}</p>
              <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#666666" }}>{selectedPo.creator.role}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 30px 0", color: "#666666" }}>Authorized Approval Signature</p>
              <p style={{ margin: "0", fontWeight: "bold" }}>{selectedPo.approver?.name || "System Authorization"}</p>
              <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#666666" }}>{selectedPo.approver?.role || "Pending Approved Logs"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
