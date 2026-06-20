import React, { useState, useEffect, lazy, Suspense } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const BackgroundStarsCanvas = lazy(() =>
  import("../components/Scene3D").then((module) => ({ default: module.BackgroundStarsCanvas }))
);
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquareQuote,
  FileCheck,
  Receipt,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Bot,
  Bell,
  Upload,
  CheckCircle2,
  ChevronDown
} from "lucide-react";
import CopilotChat from "../features/copilot/CopilotChat";

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "settings" | "security">("profile");
  
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" });

  const showToast = (message: string) => {
    setToast({ show: true, message });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ show: false, message: "" }), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    {
      label: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
      roles: ["admin", "procurement_officer", "manager"],
    },
    {
      label: "Vendors",
      path: "/vendors",
      icon: Users,
      roles: ["admin", "procurement_officer", "manager"],
    },
    {
      label: "RFQs",
      path: "/rfqs",
      icon: FileText,
      roles: ["admin", "procurement_officer", "manager", "vendor"],
    },
    {
      label: "Quotations",
      path: "/quotations",
      icon: MessageSquareQuote,
      roles: ["admin", "procurement_officer", "manager", "vendor"],
    },
    {
      label: "Purchase Orders",
      path: "/purchase-orders",
      icon: FileCheck,
      roles: ["admin", "procurement_officer", "manager", "vendor"],
    },
    {
      label: "Invoices",
      path: "/invoices",
      icon: Receipt,
      roles: ["admin", "procurement_officer", "manager", "vendor"],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !user || item.roles.includes(user.role)
  );

  const formatRole = (role: string) => {
    switch (role) {
      case "admin": return "Administrator";
      case "procurement_officer": return "Procurement Officer";
      case "manager": return "Approving Manager";
      case "vendor": return "Supplier Portal";
      default: return role;
    }
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard Overview";
    if (path === "/vendors") return "Vendors Registry";
    if (path === "/rfqs") return "Request for Quotes (RFQs)";
    if (path === "/quotations") return "Quotations Registry";
    if (path === "/purchase-orders") return "Purchase Orders (POs)";
    if (path === "/invoices") return "Invoices Ledger";
    return "VendorVision ERP";
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setProfilePopupOpen(false);
    };
    if (profilePopupOpen) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => window.removeEventListener("click", handleClickOutside);
  }, [profilePopupOpen]);

  return (
    <div className="min-h-screen flex bg-background text-primary transition-colors duration-300 relative overflow-hidden font-sans">
      {/* Dynamic 3D Starfield Background for Dark Mode */}
      {theme === "dark" && (
        <div className="absolute inset-0 z-0 pointer-events-none w-full h-full">
          <Suspense fallback={null}>
            <BackgroundStarsCanvas />
          </Suspense>
        </div>
      )}

      {/* Background ambient lighting effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[45rem] h-[45rem] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[110px] pointer-events-none" />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-card border-r border-default m-4 mr-0 rounded-2xl p-4 z-20 transition-all duration-300">
        {/* Brand Header */}
        <Link
          to="/"
          className="flex items-center gap-3 mb-6 select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-xl p-1 -m-1 transition-all duration-300 hover:opacity-95 active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20 group-hover:scale-[1.05] group-active:scale-[0.95] transition-all duration-300">
            <Bot size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight font-sans text-primary leading-none group-hover:text-accent transition-colors duration-300">VendorVision</h1>
            <span className="text-[10px] font-bold tracking-widest text-secondary uppercase group-hover:opacity-85 transition-opacity duration-300">erp platform</span>
          </div>
        </Link>

        {/* Navigation Section */}
        <nav className="space-y-1.5 mb-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 font-sans font-medium text-xs sm:text-sm ${
                  isActive
                    ? "bg-accent text-white shadow-md shadow-accent/15 translate-x-1"
                    : "text-secondary hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800/40 hover:translate-x-1"
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer & User Section */}
        <div className="border-t border-neutral-200/60 dark:border-neutral-800/60 pt-3 mt-2 space-y-3 relative">
          
          {/* User Popover Profile Dropper trigger block */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setProfilePopupOpen(!profilePopupOpen);
            }}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer border border-transparent hover:border-neutral-200/50 dark:hover:border-neutral-750/30 transition-all duration-300"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700" 
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-accent/10 dark:bg-accent/20 text-accent flex items-center justify-center font-bold text-xs uppercase border border-accent/20">
                  {user?.name ? user.name.charAt(0) : "U"}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-primary leading-none">{user?.name || "Guest"}</p>
                <p className="text-[9px] text-secondary mt-1 font-bold tracking-wide uppercase leading-none">{user?.role ? user.role.replace("_", " ") : "guest"}</p>
              </div>
            </div>
            <ChevronDown size={14} className={`text-secondary transition-transform duration-350 ${profilePopupOpen ? "rotate-180" : ""}`} />
          </div>

          {/* Inline Profile Dropdown Popover */}
          {profilePopupOpen && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full left-0 w-full mt-2 bg-surface-elevated border border-default shadow-premium-popup rounded-2xl p-4 flex flex-col gap-2 z-30 scale-in-center animate-fade-in"
            >
              {/* Header Info */}
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-default">
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-10 h-10 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-accent/10 dark:bg-accent/20 text-accent flex items-center justify-center font-bold text-sm uppercase">
                    {user?.name ? user.name.charAt(0) : "U"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-primary truncate leading-none">{user?.name || "Guest"}</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  </div>
                  <p className="text-[10px] text-secondary truncate mt-1 leading-none">{user?.email}</p>
                  <p className="text-[9px] font-bold text-accent mt-1 leading-none">
                    {user?.designation || (user?.role === "admin" ? "Systems Architect" : "Manager")} • {user?.department || "Operations"}
                  </p>
                </div>
              </div>

              {/* Action Links */}
              <div className="flex flex-col gap-0.5 text-xs font-semibold">
                <button 
                  onClick={() => {
                    setProfilePopupOpen(false);
                    setActiveTab("profile");
                    setProfileModalOpen(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  My Profile
                </button>
                <button 
                  onClick={() => {
                    setProfilePopupOpen(false);
                    setActiveTab("profile");
                    setProfileModalOpen(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Edit Profile
                </button>
                <button 
                  onClick={() => {
                    setProfilePopupOpen(false);
                    setActiveTab("settings");
                    setProfileModalOpen(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Account Settings
                </button>
                <button 
                  onClick={toggleTheme}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-secondary hover:text-primary transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>Theme Preference</span>
                  <span className="text-[10px] text-accent uppercase font-bold">{theme}</span>
                </button>
                <button 
                  onClick={() => {
                    setProfilePopupOpen(false);
                    setActiveTab("security");
                    setProfileModalOpen(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Security Settings
                </button>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 mt-1.5 py-1.5 rounded-lg bg-danger/10 hover:bg-danger text-danger hover:text-white transition-all duration-300 font-bold text-xs cursor-pointer shadow-sm shadow-danger/5"
              >
                <LogOut size={12} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Top Navbar Header */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 glass-card border-b border-default flex items-center justify-between px-6 z-30 transition-all">
        <Link
          to="/"
          className="flex items-center gap-2.5 select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-lg p-0.5 -m-0.5 transition-all duration-300 hover:opacity-95 active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white group-hover:scale-[1.05] group-active:scale-[0.95] transition-all duration-300">
            <Bot size={18} />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-primary group-hover:text-accent transition-colors duration-300">VendorVision</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-default text-secondary hover:text-primary"
          >
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          
          {/* User Profile Avatar in Mobile Header */}
          <div 
            onClick={() => {
              setActiveTab("profile");
              setProfileModalOpen(true);
            }}
            className="w-7 h-7 rounded-lg bg-accent/10 border border-default flex items-center justify-center text-accent font-bold text-xs uppercase cursor-pointer"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="User" className="w-full h-full rounded-lg object-cover" />
            ) : (
              <span>{user?.name ? user.name.charAt(0) : "U"}</span>
            )}
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg border border-default text-secondary hover:text-primary"
          >
            {sidebarOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Drawer overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-fade-in" onClick={() => setSidebarOpen(false)}>
          <div
            className="absolute top-0 right-0 w-64 h-full bg-surface p-4 flex flex-col border-l border-default shadow-premium-popup animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <span className="font-extrabold text-xs sm:text-sm tracking-wider uppercase text-secondary">Navigation</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg border border-default text-secondary hover:text-primary">
                <X size={16} />
              </button>
            </div>

            <nav className="flex-1 space-y-1.5">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      isActive
                        ? "bg-accent text-white"
                        : "text-secondary hover:text-primary hover:bg-background-secondary"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-default pt-4 space-y-4">
              <div 
                onClick={() => {
                  setSidebarOpen(false);
                  setActiveTab("profile");
                  setProfileModalOpen(true);
                }}
                className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-background-secondary cursor-pointer"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="User" className="w-8 h-8 rounded-lg object-cover border border-default" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-accent/10 border border-default flex items-center justify-center font-bold text-xs uppercase text-accent">
                    {user?.name ? user.name.charAt(0) : "U"}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-primary">{user?.name}</p>
                  <p className="text-[10px] text-secondary mt-0.5 font-bold tracking-wider uppercase">{formatRole(user?.role || "")}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-default text-danger hover:bg-danger/10 text-xs font-bold cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col md:m-4 m-0 mt-16 md:mt-0 p-4 md:p-4 overflow-y-auto z-10">
        
        {/* Top Desktop Workspace Navbar Header */}
        <header className="hidden md:flex items-center justify-between mb-4 px-2 select-none z-20">
          <div>
            <span className="text-[9px] font-extrabold tracking-widest text-secondary uppercase">Procurement Portal</span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-primary font-sans mt-0.5 leading-none">{getPageTitle()}</h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Quick action buttons */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-background-secondary border border-default rounded-full text-[10px] font-bold text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span>GCP Connected</span>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => showToast("No new system alerts.")}
              className="p-2 rounded-xl bg-surface hover:bg-background-secondary border border-default text-secondary hover:text-primary transition-all cursor-pointer shadow-sm"
              title="System Alerts"
            >
              <Bell size={15} />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-surface hover:bg-background-secondary border border-default text-secondary hover:text-primary transition-all cursor-pointer shadow-sm"
              title="Toggle theme"
            >
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {/* Workspace Profile Button */}
            <button
              onClick={() => {
                setActiveTab("profile");
                setProfileModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-default bg-surface hover:bg-background-secondary transition-all cursor-pointer shadow-sm select-none"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-5.5 h-5.5 rounded object-cover" />
              ) : (
                <div className="w-5.5 h-5.5 rounded bg-accent/10 dark:bg-accent/20 text-accent flex items-center justify-center font-bold text-[10px] uppercase border border-accent/25">
                  {user?.name ? user.name.charAt(0) : "U"}
                </div>
              )}
              <span className="text-xs font-bold text-primary">{user?.name ? user.name.split(" ")[0] : "User"}</span>
            </button>
          </div>
        </header>

        {/* Outer Workspace Box */}
        <div className="flex-1 p-2 md:p-4 flex flex-col min-h-0 relative bg-transparent border-0 shadow-none">
          <Outlet />
        </div>
      </main>

      {/* Floating Chatbot Assistant */}
      <CopilotLauncher isOpen={copilotOpen} setIsOpen={setCopilotOpen} />

      {/* Profile Management Modal via Portal */}
      {profileModalOpen && createPortal(
        <ProfileModal 
          onClose={() => setProfileModalOpen(false)} 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showToast={showToast}
        />,
        document.body
      )}

      {/* Premium Notification Toast */}
      {toast.show && (
        <div className="fixed bottom-6 left-6 z-50 bg-neutral-900/90 dark:bg-white text-white dark:text-neutral-900 border border-neutral-800 dark:border-neutral-200 px-4 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 scale-in-center animate-fade-in font-sans">
          <CheckCircle2 size={15} className="text-success" />
          <span className="text-xs font-extrabold">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

// Subcomponent: Persistent Floating Action Button (FAB)
interface CopilotLauncherProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

const CopilotLauncher: React.FC<CopilotLauncherProps> = ({ isOpen, setIsOpen }) => {
  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:shadow-accent/40 btn-premium group hover:scale-[1.04] transition-all duration-300 cursor-pointer"
        title="Open AI Procurement Copilot"
        style={{
          boxShadow: "0 0 24px rgba(37, 99, 235, 0.45)"
        }}
      >
        <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping group-hover:animate-none" />
        <Bot size={22} className="relative z-10 transition-transform duration-300 group-hover:rotate-12" />
      </button>

      <CopilotChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

// Profile Modal Subcomponent (Portal Mounted)
interface ProfileModalProps {
  onClose: () => void;
  activeTab: "profile" | "settings" | "security";
  setActiveTab: (tab: "profile" | "settings" | "security") => void;
  showToast: (msg: string) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose, activeTab, setActiveTab, showToast }) => {
  const { user, updateProfile } = useAuth();
  
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [company, setCompany] = useState(user?.company || "VendorVision ERP");
  const [designation, setDesignation] = useState(user?.designation || "Enterprise Lead");
  const [department, setDepartment] = useState(user?.department || "Operations");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, avatar: "Image size must be less than 2MB" }));
        return;
      }
      setErrors((prev) => ({ ...prev, avatar: "" }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) newErrors.email = "Valid email is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    updateProfile({
      name,
      email,
      phone: phone || null,
      company,
      designation,
      department,
      avatar
    });
    
    showToast("Profile changes saved successfully!");
    onClose();
  };

  const presetAvatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-neutral-900/60 dark:bg-neutral-950/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-surface-elevated border-t md:border border-default md:rounded-3xl w-full h-full md:h-auto max-h-screen md:max-h-[90vh] max-w-2xl overflow-hidden shadow-premium-popup flex flex-col scale-in-center transition-all duration-300">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-default flex items-center justify-between bg-background-secondary">
          <div>
            <h2 className="text-base font-extrabold text-primary leading-none font-sans">Account Center</h2>
            <p className="text-[10px] text-secondary mt-1.5 font-bold tracking-wider uppercase font-sans">Settings & Preferences</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-background-secondary transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Layout Split */}
        <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
          {/* Modal Sidebar tabs */}
          <div className="w-full md:w-48 bg-background-secondary border-r border-default p-4 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-shrink-0 text-left px-3 py-2.5 rounded-xl font-bold text-xs font-sans transition-colors cursor-pointer w-full ${
                activeTab === "profile" 
                  ? "bg-accent text-white" 
                  : "text-secondary hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
              }`}
            >
              My Profile
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-shrink-0 text-left px-3 py-2.5 rounded-xl font-bold text-xs font-sans transition-colors cursor-pointer w-full ${
                activeTab === "settings" 
                  ? "bg-accent text-white" 
                  : "text-secondary hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
              }`}
            >
              Preferences
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex-shrink-0 text-left px-3 py-2.5 rounded-xl font-bold text-xs font-sans transition-colors cursor-pointer w-full ${
                activeTab === "security" 
                  ? "bg-accent text-white" 
                  : "text-secondary hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
              }`}
            >
              Security
            </button>
          </div>

          {/* Modal Form Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === "profile" && (
              <form onSubmit={handleSave} className="space-y-5">
                {/* Profile Picture Upload Block */}
                <div className="flex flex-col sm:flex-row items-center gap-4.5 p-4 bg-background-secondary border border-default rounded-2xl">
                  <div className="relative group select-none">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover border border-default" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-accent/10 dark:bg-accent/20 text-accent flex items-center justify-center font-black text-xl uppercase border border-accent/20">
                        {name ? name.charAt(0) : "U"}
                      </div>
                    )}
                    <label 
                      htmlFor="avatar-file-upload" 
                      className="absolute inset-0 bg-black/60 text-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                    >
                      <Upload size={16} />
                    </label>
                    <input 
                      type="file" 
                      id="avatar-file-upload"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden" 
                    />
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-xs font-bold text-primary leading-none">Profile Picture</p>
                    <p className="text-[10px] text-secondary leading-none">Upload files (JPEG/PNG up to 2MB) or choose preset:</p>
                    {errors.avatar && <p className="text-[9px] text-danger font-bold leading-none">{errors.avatar}</p>}
                    
                    {/* Preset Avatars */}
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      {presetAvatars.map((url, i) => (
                        <img 
                          key={i} 
                          src={url} 
                          alt="Preset" 
                          onClick={() => setAvatar(url)}
                          className="w-7 h-7 rounded-lg object-cover cursor-pointer border border-transparent hover:border-accent hover:scale-105 transition-all duration-200" 
                        />
                      ))}
                      {avatar && (
                        <button 
                          type="button" 
                          onClick={() => setAvatar("")}
                          className="text-[9px] font-extrabold text-danger hover:underline cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form inputs grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wide">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-surface border border-default rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent text-primary"
                    />
                    {errors.name && <p className="text-[9px] text-danger font-bold mt-0.5">{errors.name}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wide">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface border border-default rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent text-primary"
                    />
                    {errors.email && <p className="text-[9px] text-danger font-bold mt-0.5">{errors.email}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wide">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1-555-0100"
                      className="w-full bg-surface border border-default rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent text-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wide">Company</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-surface border border-default rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent text-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wide">Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full bg-surface border border-default rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent text-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wide">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-surface border border-default rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent text-primary"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-default flex justify-end gap-3.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-default hover:bg-background-secondary text-secondary rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-bold shadow-md shadow-accent/15 transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {activeTab === "settings" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Workspace Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-background-secondary border border-default rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-primary">Email Notifications</p>
                        <p className="text-[10px] text-secondary mt-0.5">Receive digests of quotes and RFQ changes.</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-accent border-neutral-300 rounded focus:ring-accent" />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background-secondary border border-default rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-primary">AI Assist Suggestions</p>
                        <p className="text-[10px] text-secondary mt-0.5">Show quick suggestions from AI inside the dashboard pages.</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-accent border-neutral-300 rounded focus:ring-accent" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-default flex justify-end">
                  <button
                    onClick={() => {
                      showToast("Preferences saved successfully!");
                      onClose();
                    }}
                    className="px-4.5 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    Apply Settings
                  </button>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Security & Audits</h3>
                  <div className="space-y-3">
                    <div className="p-3.5 bg-background-secondary border border-default rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-primary">System Role Permissions</p>
                        <p className="text-[10px] text-secondary mt-1 font-semibold uppercase">Current: {user?.role}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/15 text-accent text-[9px] font-bold">RBAC Audited</span>
                    </div>

                    <div className="p-3.5 bg-background-secondary border border-default rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-primary">Account API Keys</p>
                        <p className="text-[10px] text-secondary mt-0.5">Manage personal API access tokens.</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => showToast("API key settings are managed by administrator.")}
                        className="text-xs font-bold text-accent hover:underline cursor-pointer"
                      >
                        Manage keys
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-default flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4.5 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
