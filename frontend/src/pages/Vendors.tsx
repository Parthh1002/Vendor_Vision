import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { vendorApi } from "../services/api";
import type { Vendor } from "../types";
import { useAuth } from "../contexts/AuthContext";
import {
  Search,
  Filter,
  Plus,
  ShieldCheck,
  Star,
  Clock,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  X,
  FileCheck2
} from "lucide-react";

// Form validation schema for creating a vendor
const vendorSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  contact_person: z.string().min(2, "Contact person name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(8, "Phone number must be at least 8 digits"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  category: z.string().min(2, "Category is required"),
  gst_number: z.string().min(5, "GST number is required"),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

const Vendors: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
  });

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await vendorApi.getVendors();
      setVendors(res.data);
      setFilteredVendors(res.data);
      
      // Auto-open scorecard if redirected from Copilot recommendation
      const state = location.state as { highlightVendorId?: number } | null;
      if (state?.highlightVendorId) {
        const matchingVendor = res.data.find((v: Vendor) => v.id === state.highlightVendorId);
        if (matchingVendor) {
          setSelectedVendor(matchingVendor);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch vendors. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [location.state]);

  // Apply search query and category filtering
  useEffect(() => {
    let result = vendors;
    if (selectedCategory !== "All") {
      result = result.filter((v) => v.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          v.contact_person.toLowerCase().includes(query) ||
          v.email.toLowerCase().includes(query)
      );
    }
    setFilteredVendors(result);
  }, [searchQuery, selectedCategory, vendors]);

  const onSubmit = async (data: VendorFormValues) => {
    setSubmitError(null);
    try {
      await vendorApi.createVendor(data);
      setIsAddOpen(false);
      reset();
      await fetchVendors();
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || "Failed to create vendor.");
    }
  };

  const categories = ["All", "IT Services", "Furniture", "Office Supplies", "Facilities"];

  // Render score color based on performance
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success bg-success/10";
    if (score >= 80) return "text-warning bg-warning/10";
    return "text-danger bg-danger/10";
  };

  const isProcurementOrAdmin = user?.role === "admin" || user?.role === "procurement_officer";

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0 relative">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Directory</h1>
          <p className="text-sm text-secondary">Manage and evaluate verified ERP suppliers</p>
        </div>
        {isProcurementOrAdmin && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold transition-all duration-300 btn-premium shadow-md shadow-accent/15"
          >
            <Plus size={16} />
            <span>Onboard Vendor</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-surface-elevated p-3 rounded-2xl border border-default">
        {/* Search */}
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company name, contact, email..."
            className="w-full bg-surface border border-default rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-secondary" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-surface border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Vendor Grid/Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 bg-danger/10 border border-danger/25 text-danger rounded-xl text-center font-medium">
          {error}
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-elevated rounded-2xl border border-default text-center">
          <Briefcase size={40} className="text-secondary mb-3" />
          <p className="font-semibold">No Vendors Found</p>
          <p className="text-sm text-secondary">Try adjusting your filters or query</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => setSelectedVendor(vendor)}
                className={`p-3 bg-surface border rounded-2xl cursor-pointer hover-lift flex flex-col justify-between ${
                  selectedVendor?.id === vendor.id ? "border-accent ring-1 ring-accent" : "border-default"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-base line-clamp-1">{vendor.name}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-surface-elevated border border-default text-[10px] font-semibold uppercase text-secondary">
                      {vendor.category}
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-1">{vendor.contact_person}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-default flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-warning fill-warning" />
                    <span>{vendor.reliability_rating.toFixed(1)} / 5.0</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-secondary text-[11px]">Score:</span>
                    <span className={`px-2 py-0.5 rounded-md ${getScoreColor(vendor.performance_score)}`}>
                      {vendor.performance_score.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side Drawer details Panel (Vendor Scorecard) */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setSelectedVendor(null)}>
          <div
            className="absolute top-0 right-0 w-full sm:w-[480px] h-full bg-surface p-4 flex flex-col border-l border-default shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-success">
                <ShieldCheck size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Verified Supplier</span>
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                className="p-1.5 rounded-lg border border-default hover:bg-surface-elevated transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scorecard Content */}
            <div className="space-y-4 flex-1">
              <div>
                <h2 className="text-xl font-bold">{selectedVendor.name}</h2>
                <p className="text-xs text-secondary mt-1">Vendor ID: VV-VND-{selectedVendor.id.toString().padStart(4, "0")}</p>
              </div>

              {/* Core Scorecard KPIs */}
              <div className="grid grid-cols-3 gap-3 bg-surface-elevated p-4 rounded-2xl border border-default text-center">
                <div>
                  <span className="text-[10px] font-semibold text-secondary uppercase block mb-1">Performance</span>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold inline-block ${getScoreColor(selectedVendor.performance_score)}`}>
                    {selectedVendor.performance_score.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-secondary uppercase block mb-1">Reliability</span>
                  <span className="text-sm font-bold flex items-center justify-center gap-0.5 text-warning">
                    <Star size={14} className="fill-warning" /> {selectedVendor.reliability_rating.toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-secondary uppercase block mb-1">Avg Lead Time</span>
                  <span className="text-sm font-bold flex items-center justify-center gap-1 text-primary">
                    <Clock size={14} className="text-secondary" /> {selectedVendor.average_delivery_time}d
                  </span>
                </div>
              </div>

              {/* GST Verification Card */}
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex gap-3">
                <div className="text-success pt-0.5">
                  <FileCheck2 size={20} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-success">Tax & GST Compliant</p>
                  <p className="text-xs text-secondary mt-0.5">GST Registration: <span className="font-mono text-primary font-semibold">{selectedVendor.gst_number}</span></p>
                </div>
              </div>

              {/* Vendor Information Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">Contact Details</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <Briefcase size={16} className="text-secondary pt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-secondary">Primary Contact</p>
                      <p className="font-medium mt-0.5">{selectedVendor.contact_person}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Mail size={16} className="text-secondary pt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-secondary">Email Address</p>
                      <p className="font-medium mt-0.5">{selectedVendor.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Phone size={16} className="text-secondary pt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-secondary">Phone Number</p>
                      <p className="font-medium mt-0.5">{selectedVendor.phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <MapPin size={16} className="text-secondary pt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-secondary">Physical Address</p>
                      <p className="font-medium mt-0.5 leading-relaxed">{selectedVendor.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Vendor Modal */}
      {isAddOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-lg rounded-2xl p-4 border border-default shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Onboard New Supplier</h2>
              <button
                onClick={() => setIsAddOpen(false)}
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

            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-secondary">Company Name</label>
                <input
                  type="text"
                  {...register("name")}
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {errors.name && <p className="text-xs text-danger font-medium">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary">Contact Person</label>
                <input
                  type="text"
                  {...register("contact_person")}
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {errors.contact_person && <p className="text-xs text-danger font-medium">{errors.contact_person.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary">Category</label>
                <select
                  {...register("category")}
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                >
                  <option value="">Select Category</option>
                  <option value="IT Services">IT Services</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Facilities">Facilities</option>
                </select>
                {errors.category && <p className="text-xs text-danger font-medium">{errors.category.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary">Email Address</label>
                <input
                  type="email"
                  {...register("email")}
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {errors.email && <p className="text-xs text-danger font-medium">{errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary">Phone Number</label>
                <input
                  type="text"
                  {...register("phone")}
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {errors.phone && <p className="text-xs text-danger font-medium">{errors.phone.message}</p>}
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-xs font-semibold text-secondary">GST Identification Number</label>
                <input
                  type="text"
                  {...register("gst_number")}
                  placeholder="e.g. GST-12345-AA"
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {errors.gst_number && <p className="text-xs text-danger font-medium">{errors.gst_number.message}</p>}
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-xs font-semibold text-secondary">Registered Address</label>
                <textarea
                  {...register("address")}
                  rows={2}
                  className="w-full bg-surface-elevated border border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {errors.address && <p className="text-xs text-danger font-medium">{errors.address.message}</p>}
              </div>

              <div className="col-span-2 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-default text-secondary hover:bg-surface-elevated font-semibold text-sm transition-colors btn-premium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl font-semibold text-sm transition-colors btn-premium shadow-md shadow-accent/10"
                >
                  {isSubmitting ? "Onboarding..." : "Verify & Onboard"}
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

export default Vendors;
