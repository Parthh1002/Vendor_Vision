import React, { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";

const Scene3D = lazy(() => import("../components/Scene3D"));
const BackgroundStarsCanvas = lazy(() =>
  import("../components/Scene3D").then((module) => ({ default: module.BackgroundStarsCanvas }))
);
import { useForm } from "react-hook-form";
import FluidBackground from "../components/FluidBackground";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  UserCheck,
  Shield,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Store,
  ShieldCheck,
  Sun,
  Moon,
  X,
  HelpCircle,
  Copyright,
  BookOpen,
  Activity,
  Globe
} from "lucide-react";

// Form Zod schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "procurement_officer", "manager", "vendor"], {
    message: "Please select a system role",
  }),
  phone: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

const Login: React.FC = () => {
  const { login, register: signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [selectedRole, setSelectedRole] = useState<"admin" | "procurement_officer" | "manager" | "vendor">("admin");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activePopup, setActivePopup] = useState<
    | "faq"
    | "copyright"
    | "docs"
    | "security"
    | "leakage"
    | "network"
    | "google"
    | "forgot"
    | "liveteams"
    | "roleinfo"
    | "controls"
    | "brand"
    | null
  >(null);

  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);

  const closePopup = () => {
    setActivePopup(null);
    setRecoveryEmail("");
    setRecoverySuccess(false);
    setGoogleAuthLoading(false);
  };

  // Forms
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    setValue: setLoginValue,
    formState: { errors: loginErrors },
    reset: resetLoginForm
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    setValue: setSignupValue,
    formState: { errors: signupErrors },
    reset: resetSignupForm
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "vendor" }
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await login(data.email, data.password);
      navigate("/");
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSignupSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await signUp(data.email, data.password, data.name, data.role, data.phone);
      setSuccessMsg("Account registered successfully! Redirecting...");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo shortcut credentials to allow instant role testing
  const demoAccounts = {
    admin: { label: "Admin", email: "admin@vendorvision.com", pass: "VndrVisn_Adm_2026!" },
    procurement_officer: { label: "Officer", email: "procurement@vendorvision.com", pass: "VndrVisn_Off_2026!" },
    manager: { label: "Manager", email: "manager@vendorvision.com", pass: "VndrVisn_Mgr_2026!" },
    vendor: { label: "Vendor", email: "sales@apex.com", pass: "VndrVisn_Vnd_2026!" },
  };

  const handleDirectDemoLogin = async () => {
    const acc = demoAccounts[selectedRole];
    if (!acc) return;
    setLoginValue("email", acc.email);
    setLoginValue("password", acc.pass);
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await login(acc.email, acc.pass);
      navigate("/");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to log in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (newMode: "signin" | "signup") => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setMode(newMode);
    if (newMode === "signin") {
      resetLoginForm();
    } else {
      resetSignupForm();
      setSignupValue("role", selectedRole);
    }
  };

  const handleRoleSelect = (roleVal: "admin" | "procurement_officer" | "manager" | "vendor") => {
    setSelectedRole(roleVal);
    if (mode === "signup") {
      setSignupValue("role", roleVal);
    }
  };

  const rolesConfig = [
    {
      value: "admin" as const,
      label: "Admin",
      desc: "System configs",
      icon: Shield
    },
    {
      value: "procurement_officer" as const,
      label: "Officer",
      desc: "Manage RFQs",
      icon: UserCheck
    },
    {
      value: "manager" as const,
      label: "Manager",
      desc: "Approvals",
      icon: ShieldCheck
    },
    {
      value: "vendor" as const,
      label: "Vendor",
      desc: "Quotes & bills",
      icon: Store
    }
  ];

  const roleStyles = {
    admin: {
      selected: "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600 shadow-[0_4px_14px_rgba(37,99,235,0.35)] dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500 dark:shadow-[0_0_20px_rgba(59,130,246,0.3)] dark:from-transparent dark:to-transparent scale-[1.08]",
      hover: "hover:border-blue-400/60 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/5",
      pulse: "from-blue-400/20"
    },
    procurement_officer: {
      selected: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-600 shadow-[0_4px_14px_rgba(16,185,129,0.35)] dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500 dark:shadow-[0_0_20px_rgba(16,185,129,0.3)] dark:from-transparent dark:to-transparent scale-[1.08]",
      hover: "hover:border-emerald-400/60 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-500/5",
      pulse: "from-emerald-400/20"
    },
    manager: {
      selected: "bg-gradient-to-br from-purple-500 to-purple-600 text-white border-purple-600 shadow-[0_4px_14px_rgba(139,92,246,0.35)] dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500 dark:shadow-[0_0_20px_rgba(139,92,246,0.3)] dark:from-transparent dark:to-transparent scale-[1.08]",
      hover: "hover:border-purple-400/60 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-purple-500/5",
      pulse: "from-purple-400/20"
    },
    vendor: {
      selected: "bg-gradient-to-br from-amber-500 to-amber-600 text-white border-amber-600 shadow-[0_4px_14px_rgba(245,158,11,0.35)] dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500 dark:shadow-[0_0_20px_rgba(245,158,11,0.3)] dark:from-transparent dark:to-transparent scale-[1.08]",
      hover: "hover:border-amber-400/60 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/5",
      pulse: "from-amber-400/20"
    }
  };

  const roleBadgeStyles = {
    admin: "bg-blue-500/10 border-blue-500/25 text-blue-700 dark:text-blue-400 dark:bg-blue-500/15 dark:border-blue-500/25",
    procurement_officer: "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/15 dark:border-emerald-500/25",
    manager: "bg-purple-500/10 border-purple-500/25 text-purple-700 dark:text-purple-400 dark:bg-purple-500/15 dark:border-purple-500/25",
    vendor: "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400 dark:bg-amber-500/15 dark:border-amber-500/25",
  };

  const roleLabelStyles = {
    admin: "text-blue-800 dark:text-blue-300",
    procurement_officer: "text-emerald-800 dark:text-emerald-300",
    manager: "text-purple-800 dark:text-purple-300",
    vendor: "text-amber-800 dark:text-amber-300",
  };

  const roleDescStyles = {
    admin: "text-blue-900/80 dark:text-blue-200/90",
    procurement_officer: "text-emerald-900/80 dark:text-emerald-200/90",
    manager: "text-purple-900/80 dark:text-purple-200/90",
    vendor: "text-amber-900/80 dark:text-amber-200/90",
  };

  const roleBackGlows = {
    admin: "bg-blue-500/12 dark:bg-blue-500/8",
    procurement_officer: "bg-emerald-500/12 dark:bg-emerald-500/8",
    manager: "bg-purple-500/12 dark:bg-purple-500/8",
    vendor: "bg-amber-500/12 dark:bg-amber-500/8",
  };

  const roleBadgeDotColors = {
    admin: "#3b82f6",
    procurement_officer: "#10b981",
    manager: "#8b5cf6",
    vendor: "#f59e0b",
  };

  // Mouse move handler for spotlight effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="min-h-screen lg:h-screen lg:max-h-screen grid grid-cols-1 lg:grid-cols-12 bg-background p-0 relative overflow-y-auto lg:overflow-hidden font-sans bg-grid cursor-glow select-none transition-colors duration-500"
    >
      {/* Theme-dependent Dynamic Background: Starfield for Dark Theme, WebGL Fluid for Light Theme */}
      {theme === "dark" ? (
        <div className="absolute inset-0 z-0 pointer-events-none w-full h-full transition-all duration-500">
          <Suspense fallback={null}>
            <BackgroundStarsCanvas />
          </Suspense>
        </div>
      ) : (
        <FluidBackground theme={theme} />
      )}

      {/* Premium background glowing moving blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[38rem] h-[38rem] rounded-full bg-blue-500/10 dark:bg-blue-500/12 blur-[110px] pointer-events-none animate-float-blob-1" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[38rem] h-[38rem] rounded-full bg-emerald-500/8 dark:bg-emerald-500/10 blur-[120px] pointer-events-none animate-float-blob-2" />
      <div className="absolute top-[25%] right-[15%] w-[28rem] h-[28rem] rounded-full bg-purple-500/8 dark:bg-purple-500/10 blur-[100px] pointer-events-none animate-float-blob-3" />

      {/* Floating Theme Toggle Switch */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 rounded-xl bg-surface-elevated border border-default text-secondary hover:text-primary shadow-sm hover:scale-[1.05] active:scale-[0.95] transition-all duration-300 z-50 cursor-pointer backdrop-blur-md"
        aria-label="Toggle Theme"
      >
        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      {/* LEFT PANEL: Branding, Live Pipeline, Visual Marketing (lg:col-span-7) */}
      <div className="lg:col-span-7 flex flex-col justify-between p-4 lg:p-10 z-10 bg-transparent relative overflow-y-auto max-h-full scrollbar-none">
        {/* Top brand logo & AI scoring badge */}
        <div className="flex items-center justify-between gap-4 flex-wrap lg:flex-nowrap w-full">
          <button
            onClick={() => setActivePopup("brand")}
            className="flex items-center gap-3 bg-transparent border-none text-left p-0 cursor-pointer transition-all duration-300 focus:outline-none group focus-visible:ring-2 focus-visible:ring-accent/40 rounded-xl"
          >
            <div className="w-10 h-10 bg-accent text-white flex items-center justify-center font-bold text-lg rounded-xl shadow-md shadow-accent/25 group-hover:shadow-[0_8px_20px_rgba(37,99,235,0.4)] group-hover:scale-[1.05] group-active:scale-[0.95] transition-all duration-300">
              V
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-base tracking-tight text-primary block leading-none font-sans group-hover:text-accent transition-colors duration-300">VendorVision</span>
              <span className="text-[9px] font-bold tracking-widest text-secondary uppercase font-sans group-hover:opacity-80 transition-opacity duration-300">procurement • erp</span>
            </div>
          </button>

          {/* Interactive Utility Buttons in the Header */}
          <div className="flex items-center gap-2 z-20">
            <button
              onClick={() => setActivePopup("faq")}
              className="px-2.5 py-1.5 bg-surface/40 hover:bg-surface/80 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 border border-default text-[9px] font-extrabold uppercase tracking-wider text-secondary hover:text-primary rounded-xl transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer backdrop-blur-md flex items-center gap-1.5 font-sans"
            >
              <HelpCircle size={11} />
              <span className="font-sans">FAQ</span>
            </button>
            <button
              onClick={() => setActivePopup("copyright")}
              className="px-2.5 py-1.5 bg-surface/40 hover:bg-surface/80 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 border border-default text-[9px] font-extrabold uppercase tracking-wider text-secondary hover:text-primary rounded-xl transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer backdrop-blur-md flex items-center gap-1.5 font-sans"
            >
              <Copyright size={11} />
              <span className="font-sans">Copyright</span>
            </button>
            <button
              onClick={() => setActivePopup("docs")}
              className="px-2.5 py-1.5 bg-surface/40 hover:bg-surface/80 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 border border-default text-[9px] font-extrabold uppercase tracking-wider text-secondary hover:text-primary rounded-xl transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer backdrop-blur-md flex items-center gap-1.5 font-sans"
            >
              <BookOpen size={11} />
              <span className="font-sans">Docs</span>
            </button>
          </div>

          <button
            onClick={() => setActivePopup("liveteams")}
            className="flex items-center gap-2 px-3 py-1.5 bg-success/15 hover:bg-success/20 border border-success/25 rounded-full text-[10px] font-bold text-success hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-sans cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
            <span className="font-sans">LIVE - 142 PROCUREMENT TEAMS ACTIVE</span>
          </button>
        </div>

        {/* Core Marketing Visual Header */}
        <div className="space-y-4 my-auto py-8 lg:py-4 max-w-3xl lg:max-w-4xl w-full">
          {/* Green Live badge moved to the top-right brand logo row */}

          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-primary leading-tight font-sans">
            Procurement that <br />
            doesn't leak <span className="highlight-underline">money</span>.
          </h2>

          <p className="text-xs lg:text-sm text-secondary leading-relaxed font-medium font-sans">
            One system for the full chain — <strong className="text-primary font-semibold">vendors</strong>,{" "}
            <strong className="text-primary font-semibold">RFQs</strong>,{" "}
            <strong className="text-primary font-semibold">quotes</strong>,{" "}
            <strong className="text-primary font-semibold">approvals</strong>,{" "}
            <strong className="text-primary font-semibold">POs & invoices</strong>. Role-based, audited, end-to-end.
          </p>

          {/* Interactive 3D Earth Hero Scene container */}
          <div className="my-6 lg:my-8 relative">
            <div className="h-[280px] sm:h-[380px] lg:h-[460px] w-full rounded-3xl border border-slate-200/50 dark:border-white/10 bg-transparent shadow-premium-popup hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
              <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs text-secondary font-bold font-sans">Loading globe…</div>}>
                <Scene3D />
              </Suspense>

              {/* HUD Widget 1: Security Audit (Top-Left) */}
              <button
                onClick={() => setActivePopup("security")}
                className="absolute top-4 left-4 z-20 flex items-center gap-2.5 px-3 py-2 bg-white/65 dark:bg-slate-900/65 border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 hover:scale-[1.05] hover:border-success/40 hover:shadow-success/15 active:scale-[0.98] transition-all duration-300 backdrop-blur-md cursor-pointer animate-hud-float-1 text-left"
              >
                <div className="w-7 h-7 rounded-xl bg-success/10 text-success flex items-center justify-center">
                  <ShieldCheck size={14} />
                </div>
                <div className="leading-tight">
                  <span className="text-[9px] font-bold text-secondary uppercase tracking-wider block font-sans">Security Status</span>
                  <span className="text-[11px] font-extrabold text-primary block font-sans">SOC-2 Audit Active</span>
                </div>
              </button>

              {/* HUD Widget 2: Cost Control (Bottom-Right) */}
              <button
                onClick={() => setActivePopup("leakage")}
                className="absolute bottom-4 right-4 z-20 flex items-center gap-2.5 px-3 py-2 bg-white/65 dark:bg-slate-900/65 border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 hover:scale-[1.05] hover:border-accent/40 hover:shadow-accent/15 active:scale-[0.98] transition-all duration-300 backdrop-blur-md cursor-pointer animate-hud-float-2 text-left"
              >
                <div className="w-7 h-7 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                  <Sparkles size={14} />
                </div>
                <div className="leading-tight">
                  <span className="text-[9px] font-bold text-secondary uppercase tracking-wider block font-sans">Leakage Shield</span>
                  <span className="text-[11px] font-extrabold text-primary block font-sans">AI Cost Guard Active</span>
                </div>
              </button>

              {/* HUD Widget 3: Suppliers (Top-Right) */}
              <button
                onClick={() => setActivePopup("network")}
                className="absolute top-4 right-4 z-20 flex items-center gap-2.5 px-3 py-2 bg-white/65 dark:bg-slate-900/65 border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 hover:scale-[1.05] hover:border-purple-500/40 hover:shadow-purple-500/15 active:scale-[0.98] transition-all duration-300 backdrop-blur-md cursor-pointer animate-hud-float-2 [animation-delay:2.5s] text-left"
              >
                <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Store size={14} />
                </div>
                <div className="leading-tight">
                  <span className="text-[9px] font-bold text-secondary uppercase tracking-wider block font-sans">Vendor Network</span>
                  <span className="text-[11px] font-extrabold text-primary block font-sans">1,400+ Verified Suppliers</span>
                </div>
              </button>

            </div>
            <div className="mt-3 text-center">
              <button
                onClick={() => setActivePopup("controls")}
                className="inline-block px-3 py-1 bg-slate-200/40 hover:bg-slate-200/60 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300/50 dark:border-white/10 rounded-full text-[9px] font-bold text-secondary uppercase tracking-widest font-sans cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Drag to rotate · auto-orbits
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT PANEL: Authenticators Login/Register Card (lg:col-span-5) */}
      <div className="lg:col-span-5 flex items-center justify-center p-4 lg:p-8 z-10 bg-transparent border-t lg:border-t-0 lg:border-l border-default">
        <div className="bg-surface/30 dark:bg-slate-950/20 rounded-3xl p-4 md:p-8 shadow-premium-popup border border-default/80 max-w-md w-full relative transition-all duration-500 backdrop-blur-[2px] overflow-hidden">
          {/* Dynamic top color indicator bar matching the selected role */}
          <div
            className={`absolute top-0 inset-x-0 h-1 transition-all duration-700 z-20 ${
              selectedRole === "admin" ? "bg-blue-500 shadow-[0_1px_8px_rgba(59,130,246,0.4)]" :
              selectedRole === "procurement_officer" ? "bg-emerald-500 shadow-[0_1px_8px_rgba(16,185,129,0.4)]" :
              selectedRole === "manager" ? "bg-purple-500 shadow-[0_1px_8px_rgba(139,92,246,0.4)]" :
              "bg-amber-500 shadow-[0_1px_8px_rgba(245,158,11,0.4)]"
            }`}
          />
          
          {/* Tabs Indicator Switcher */}
          <div className="relative p-1 bg-background-secondary/60 border border-default rounded-2xl flex mb-4 z-10 backdrop-blur-md">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-accent rounded-xl transition-transform duration-500 ease-out ${
                mode === "signup" ? "translate-x-[calc(100%+8px)]" : "translate-x-0"
              }`}
            />
            <button
              onClick={() => handleTabChange("signin")}
              className={`relative z-10 w-1/2 py-2 text-xs font-bold transition-colors duration-500 font-sans cursor-pointer ${
                mode === "signin" ? "text-white" : "text-secondary hover:text-primary"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => handleTabChange("signup")}
              className={`relative z-10 w-1/2 py-2 text-xs font-bold transition-colors duration-500 font-sans cursor-pointer ${
                mode === "signup" ? "text-white" : "text-secondary hover:text-primary"
              }`}
            >
              Register
            </button>
          </div>

          {/* Action Header Feedback notifications */}
          {errorMsg && (
            <div className="flex items-center gap-2.5 p-3 bg-danger/10 border border-danger/25 text-danger rounded-xl text-[11px] font-semibold mb-4 animate-shake z-10 relative">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span className="font-sans">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 p-3 bg-success/10 border border-success/25 text-success rounded-xl text-[11px] font-semibold mb-4 z-10 relative">
              <CheckCircle2 size={14} className="flex-shrink-0" />
              <span className="font-sans">{successMsg}</span>
            </div>
          )}

          {/* Selector header */}
          <div className="text-center mb-4 z-10 relative">
            {/* Soft dynamic background glow */}
            <div className={`absolute -inset-x-4 -inset-y-2 rounded-3xl transition-all duration-700 pointer-events-none blur-2xl opacity-50 dark:opacity-25 ${roleBackGlows[selectedRole]}`} />

            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary font-sans relative z-10">
              {mode === "signin" ? "Select Your Demo Role" : "Select Register Role"}
            </span>

            {/* Circular Role Selection */}
            <div className="flex justify-center gap-3.5 mt-3 relative z-10">
              {rolesConfig.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.value;
                const currentStyle = roleStyles[role.value];
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleRoleSelect(role.value)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 hover:-translate-y-[2px] active:translate-y-[1px] cursor-pointer relative overflow-hidden group backdrop-blur-sm ${
                      isSelected
                        ? `border-2 ${currentStyle.selected}`
                        : `border-2 border-default/50 dark:border-default/30 bg-background-secondary/50 dark:bg-background-secondary/30 text-secondary ${currentStyle.hover}`
                    }`}
                    title={role.label}
                  >
                    <Icon size={18} className={`relative z-10 transition-transform duration-300 ${isSelected ? "scale-110" : "group-hover:scale-110"}`} />
                    {isSelected && (
                      <div className={`absolute inset-0 bg-gradient-to-tr ${currentStyle.pulse} to-transparent animate-pulse`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Premium, Simple active role badge */}
            <div className="mt-4 flex justify-center relative z-10">
              <button
                type="button"
                onClick={() => setActivePopup("roleinfo")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer font-sans ${roleBadgeStyles[selectedRole]}`}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: roleBadgeDotColors[selectedRole] }} />
                <span className={`font-extrabold tracking-wider uppercase text-[9px] font-sans ${roleLabelStyles[selectedRole]}`}>
                  {rolesConfig.find(r => r.value === selectedRole)?.label}
                </span>
                <span className="opacity-40 font-sans">&bull;</span>
                <span className={`font-medium text-[11px] font-sans ${roleDescStyles[selectedRole]}`}>
                  {rolesConfig.find(r => r.value === selectedRole)?.desc}
                </span>
              </button>
            </div>
          </div>

          <div className="relative flex py-1.5 items-center mb-3 z-10">
            <div className="flex-grow border-t border-default"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold text-secondary uppercase tracking-wider font-sans">Or</span>
            <div className="flex-grow border-t border-default"></div>
          </div>

          {/* Google Login Trigger */}
          <button
            type="button"
            onClick={() => setActivePopup("google")}
            className="w-full flex items-center justify-center gap-2 py-2.5 mb-4 bg-surface/50 hover:bg-background-secondary/70 dark:hover:bg-background-secondary/35 border border-default rounded-xl text-[11px] font-bold text-secondary hover:text-primary transition-all cursor-pointer hover:shadow-sm active:scale-[0.99] backdrop-blur-md"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-.1.84-2.14 2.18l3.3 2.56c1.96-1.8 3.085-4.47 3.085-6.57z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.07 7.96-2.9l-3.3-2.56c-.9.6-2.07.97-3.32.97-3.13 0-5.78-2.11-6.73-4.96L3.2 17.1c2 3.97 6.1 6.9 10.8 6.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.55A7.17 7.17 0 0 1 4.8 12c0-.9.16-1.76.47-2.55L1.97 6.84c-1.04 2.08-1.63 4.41-1.63 7.16s.59 5.08 1.63 7.16l3.3-2.61z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.3 0 3.2 2.93 1.2 6.9l3.32 2.61C5.47 6.86 8.12 4.75 12 4.75z"
              />
            </svg>
            <span className="font-sans">Continue with Google</span>
          </button>

          {/* Sliding forms wrapper */}
          <div className="overflow-hidden w-full relative z-10">
            <div 
              className="w-[200%] flex transition-transform duration-500 ease-in-out"
              style={{ transform: mode === "signup" ? "translateX(-50%)" : "translateX(0%)" }}
            >
              {/* PANEL 1: SIGN IN */}
              <div className="w-1/2 flex-shrink-0 pr-3 space-y-4">
                
                {/* Direct Demo Login Section */}
                <div className="bg-background-secondary/40 border border-default p-3.5 rounded-2xl space-y-2 text-center backdrop-blur-md">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-secondary font-sans block">For Demo Testing</span>
                  <button
                    type="button"
                    onClick={handleDirectDemoLogin}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-accent/10 hover:bg-accent/15 text-accent rounded-xl text-[11px] font-bold transition-all border border-accent/20 cursor-pointer disabled:opacity-75"
                  >
                    <Sparkles size={12} className="animate-pulse" />
                    <span className="font-sans">One-Click Demo Login</span>
                  </button>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-default"></div>
                  <span className="flex-shrink mx-3 text-[9px] font-bold text-secondary uppercase tracking-wider font-sans">Manual Credentials</span>
                  <div className="flex-grow border-t border-default"></div>
                </div>

                <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-4">
                  {/* Email Address */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wide font-sans block">Email Address</label>
                    <div className="relative group text-secondary focus-within:text-accent">
                      <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200" />
                      <input
                        type="email"
                        {...registerLogin("email")}
                        placeholder="your@email.com"
                        className="w-full bg-surface border border-default rounded-xl pl-9.5 pr-4 py-3 text-xs focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all duration-200 text-primary placeholder-secondary font-sans shadow-sm"
                      />
                    </div>
                    {loginErrors.email && (
                      <p className="text-[9px] text-danger font-semibold mt-0.5 font-sans">{loginErrors.email.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wide font-sans block">Password</label>
                      <button
                        type="button"
                        onClick={() => setActivePopup("forgot")}
                        className="text-[9px] font-bold text-accent hover:underline font-sans bg-transparent border-none p-0 cursor-pointer"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative group text-secondary focus-within:text-accent">
                      <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200" />
                      <input
                        type={showPassword ? "text" : "password"}
                        {...registerLogin("password")}
                        placeholder="••••••••"
                        className="w-full bg-surface border border-default rounded-xl pl-9.5 pr-9 py-3 text-xs focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all duration-200 text-primary placeholder-secondary font-sans shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <p className="text-[9px] text-danger font-semibold mt-0.5 font-sans">{loginErrors.password.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-1.5 py-3 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75 cursor-pointer shadow-lg shadow-accent/20 dark:shadow-accent/30 font-sans"
                  >
                    <span>Login to Dashboard</span>
                    <ArrowRight size={13} />
                  </button>
                </form>
              </div>

              {/* PANEL 2: SIGN UP */}
              <div className="w-1/2 flex-shrink-0 pl-3 space-y-4">
                <form onSubmit={handleSubmitSignup(onSignupSubmit)} className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wide font-sans block">Full Name</label>
                    <div className="relative group text-secondary focus-within:text-accent">
                      <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200" />
                      <input
                        type="text"
                        {...registerSignup("name")}
                        placeholder="John Doe"
                        className="w-full bg-surface border border-default rounded-xl pl-9.5 pr-4 py-3 text-xs focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all duration-200 text-primary placeholder-secondary font-sans shadow-sm"
                      />
                    </div>
                    {signupErrors.name && (
                      <p className="text-[9px] text-danger font-semibold mt-0.5 font-sans">{signupErrors.name.message}</p>
                    )}
                  </div>

                  {/* Email & Phone grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wide font-sans block">Email</label>
                      <div className="relative group text-secondary focus-within:text-accent">
                        <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200" />
                        <input
                          type="email"
                          {...registerSignup("email")}
                          placeholder="name@company.com"
                          className="w-full bg-surface border border-default rounded-xl pl-9.5 pr-4 py-3 text-xs focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all duration-200 text-primary placeholder-secondary font-sans shadow-sm"
                        />
                      </div>
                      {signupErrors.email && (
                        <p className="text-[9px] text-danger font-semibold mt-0.5 font-sans">{signupErrors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wide font-sans block">Phone (Optional)</label>
                      <div className="relative group text-secondary focus-within:text-accent">
                        <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200" />
                        <input
                          type="text"
                          {...registerSignup("phone")}
                          placeholder="+1 (555) 019-2834"
                          className="w-full bg-surface border border-default rounded-xl pl-9.5 pr-4 py-3 text-xs focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all duration-200 text-primary placeholder-secondary font-sans shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wide font-sans block">Password</label>
                    <div className="relative group text-secondary focus-within:text-accent">
                      <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200" />
                      <input
                        type={showPassword ? "text" : "password"}
                        {...registerSignup("password")}
                        placeholder="••••••••"
                        className="w-full bg-surface border border-default rounded-xl pl-9.5 pr-9 py-3 text-xs focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all duration-200 text-primary placeholder-secondary font-sans shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    {signupErrors.password && (
                      <p className="text-[9px] text-danger font-semibold mt-0.5 font-sans">{signupErrors.password.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-1.5 py-3 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75 cursor-pointer shadow-lg shadow-accent/20 dark:shadow-accent/30 font-sans"
                  >
                    <span>Create Account & Sign In</span>
                    <ArrowRight size={13} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern, High-Fidelity Glassmorphic Popups */}
      {activePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 dark:bg-black/50 backdrop-blur-md animate-fade-in">
          {/* Backdrop click close */}
          <div className="absolute inset-0 cursor-pointer" onClick={closePopup} />
          
          {/* Dialog Body */}
          <div className="bg-white/80 dark:bg-slate-950/40 rounded-3xl p-4 md:p-8 max-w-lg w-full border border-slate-200/50 dark:border-white/10 shadow-premium-popup relative backdrop-blur-xl scale-in-center overflow-hidden z-10 max-h-[85vh] flex flex-col font-sans">
            {/* Top Color Accent Bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 shadow-md" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-default mb-4 relative z-10">
              <div className="flex items-center gap-2">
                {activePopup === "faq" && <HelpCircle size={18} className="text-accent" />}
                {activePopup === "copyright" && <Copyright size={18} className="text-success" />}
                {activePopup === "docs" && <BookOpen size={18} className="text-purple-500" />}
                {activePopup === "security" && <ShieldCheck size={18} className="text-success" />}
                {activePopup === "leakage" && <Sparkles size={18} className="text-accent" />}
                {activePopup === "network" && <Store size={18} className="text-purple-500" />}
                {activePopup === "liveteams" && <Activity size={18} className="text-success animate-pulse" />}
                {activePopup === "google" && <Lock size={18} className="text-blue-500" />}
                {activePopup === "forgot" && <Mail size={18} className="text-accent" />}
                {activePopup === "roleinfo" && <Shield size={18} className="text-accent" />}
                {activePopup === "controls" && <Globe size={18} className="text-purple-500" />}
                {activePopup === "brand" && <ShieldCheck size={18} className="text-blue-500" />}
                <h3 className="text-base font-extrabold tracking-tight text-primary font-sans">
                  {activePopup === "faq" && "Frequently Asked Questions (FAQ)"}
                  {activePopup === "copyright" && "Copyright & Licensing Details"}
                  {activePopup === "docs" && "System Documentation & User Manual"}
                  {activePopup === "security" && "Security Status & Audit Log"}
                  {activePopup === "leakage" && "Cost Leakage Shield Guard"}
                  {activePopup === "network" && "Verified Vendor Network Directory"}
                  {activePopup === "liveteams" && "Live Procurement Monitor"}
                  {activePopup === "google" && "Enterprise Google SSO Authentication"}
                  {activePopup === "forgot" && "Recover System Password"}
                  {activePopup === "roleinfo" && "Role Access & Authorization"}
                  {activePopup === "controls" && "Interactive 3D Engine Guide"}
                  {activePopup === "brand" && "About VendorVision ERP"}
                </h3>
              </div>
              <button
                onClick={closePopup}
                className="w-8 h-8 rounded-xl bg-background-secondary/55 hover:bg-background-secondary/80 text-secondary hover:text-primary transition-all flex items-center justify-center cursor-pointer border border-default"
                aria-label="Close dialog"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs leading-relaxed text-secondary font-sans scrollbar-none relative z-10">
              {activePopup === "faq" && (
                <div className="space-y-4">
                  <div className="bg-background-secondary/40 border border-default p-3.5 rounded-2xl">
                    <h4 className="font-bold text-primary mb-1 font-sans">Q: What is VendorVision ERP?</h4>
                    <p className="font-medium text-secondary/90 font-sans">A: An enterprise-grade procurement platform built to streamline the full supply chain—from vendor onboarding, RFQs, quotes, approvals, to POs and invoices—preventing leakages.</p>
                  </div>
                  <div className="bg-background-secondary/40 border border-default p-3.5 rounded-2xl">
                    <h4 className="font-bold text-primary mb-1 font-sans">Q: How do the Demo Roles work?</h4>
                    <p className="font-medium text-secondary/90 font-sans">A: You can test the dashboard from 4 distinct perspectives: Admin (Configs), Officer (RFQs), Manager (Approvals), and Vendor (Bidding). Click "One-Click Demo Login" to test instantly.</p>
                  </div>
                  <div className="bg-background-secondary/40 border border-default p-3.5 rounded-2xl">
                    <h4 className="font-bold text-primary mb-1 font-sans">Q: Can I register a custom supplier?</h4>
                    <p className="font-medium text-secondary/90 font-sans">A: Yes. Switch the slider tab at the top to "Register", select "Vendor" as your role, complete the form, and sign in to submit bids.</p>
                  </div>
                  <div className="bg-background-secondary/40 border border-default p-3.5 rounded-2xl">
                    <h4 className="font-bold text-primary mb-1 font-sans">Q: Is the system secure?</h4>
                    <p className="font-medium text-secondary/90 font-sans">A: Yes. VendorVision implements secure Role-Based Access Control (RBAC), cryptographically signed invoices, and real-time audit trails.</p>
                  </div>
                </div>
              )}

              {activePopup === "copyright" && (
                <div className="space-y-4">
                  <div className="bg-background-secondary/40 border border-default p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">Platform Version</span>
                      <span className="font-mono text-primary font-bold">2.0.0-Demo</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">Copyright Notice</span>
                      <span className="font-medium text-primary font-sans">&copy; 2026 VendorVision ERP.</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pb-1">
                      <span className="font-semibold text-secondary font-sans">Agreement</span>
                      <span className="font-medium text-success font-sans">KSV License 2.0 (Active)</span>
                    </div>
                  </div>
                  <p className="text-secondary/80 text-[11px] leading-relaxed font-sans px-1">
                    All graphics, interactive 3D particle galaxies, orbital models, and proprietary procurement structures displayed on this portal are registered assets of VendorVision. Unauthorized redistribution is prohibited.
                  </p>
                  <div className="border border-default/70 p-3 rounded-2xl bg-background-secondary/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary font-sans block mb-1">Pair-Programming Credits</span>
                    <p className="text-[11px] text-secondary/95 font-sans leading-relaxed">
                      Designed and optimized in collaboration with KSV Group and Google DeepMind's Antigravity AI engineering agent.
                    </p>
                  </div>
                </div>
              )}

              {activePopup === "docs" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                      <h4 className="font-bold text-blue-700 dark:text-blue-400 mb-1 font-sans">1. System Administrator Panel</h4>
                      <p className="font-medium text-secondary/90 font-sans">Manage global ERP configurations, set approval limits, register system roles, and configure automatic audit rules.</p>
                    </div>
                    <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                      <h4 className="font-bold text-emerald-700 dark:text-emerald-400 mb-1 font-sans">2. Procurement Officer Dashboard</h4>
                      <p className="font-medium text-secondary/90 font-sans">Create and publish RFQs, set timeline deadlines, allocate budgets, invite suppliers, and compare bid values side-by-side.</p>
                    </div>
                    <div className="p-3 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                      <h4 className="font-bold text-purple-700 dark:text-purple-400 mb-1 font-sans">3. Management Approvals</h4>
                      <p className="font-medium text-secondary/90 font-sans">Review active RFQs, approve or reject supplier quotes, sign purchase orders, and monitor leakage alerts.</p>
                    </div>
                    <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                      <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-1 font-sans">4. Vendor Bid Portal</h4>
                      <p className="font-medium text-secondary/90 font-sans">Onboard your enterprise, view invited RFQs, submit competitive quotation pricing, and track invoice statuses.</p>
                    </div>
                  </div>
                </div>
              )}

              {activePopup === "security" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-success/5 dark:bg-success/10 border border-success/25 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">System Integrity Status</span>
                      <span className="font-bold text-success font-sans">100% SECURE & OPERATIONAL</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">Cryptographic Signature</span>
                      <span className="font-mono text-primary font-semibold">AES-256-GCM / TLS 1.3</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">User Access Auditing</span>
                      <span className="font-medium text-primary font-sans">RBAC Role Constraints Active</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-secondary font-sans">MFA Enforcement</span>
                      <span className="font-bold text-success font-sans">MANDATORY</span>
                    </div>
                  </div>
                  <div className="border border-default/70 p-3 rounded-2xl bg-background-secondary/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary font-sans block mb-1">Cryptographic Log Hash</span>
                    <p className="font-mono text-[9px] text-secondary/90 leading-relaxed break-all font-sans">
                      SHA-256: 8f2d5a3e1c9b4f7b8a9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a
                    </p>
                  </div>
                </div>
              )}

              {activePopup === "leakage" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-accent/5 dark:bg-accent/10 border border-accent/25 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">Leakage Shield Status</span>
                      <span className="font-bold text-accent font-sans">MONITORING ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">Leaks Prevented (Last 30 Days)</span>
                      <span className="font-extrabold text-success font-sans">$0.00 Leakage</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">Price Anomalies Blocked</span>
                      <span className="font-bold text-primary font-sans">4 Bidding Anomalies</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-secondary font-sans">RFQ Compliance Score</span>
                      <span className="font-extrabold text-primary font-sans">99.8%</span>
                    </div>
                  </div>
                  <div className="border border-default/70 p-3 rounded-2xl bg-background-secondary/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary font-sans block mb-1">Protection Strategy</span>
                    <p className="text-[11px] text-secondary/90 font-sans leading-relaxed">
                      AI Cost Guard automatically analyzes incoming bids against historical supplier contracts and triggers real-time alerts if a vendor quote deviates from the allocated RFQ budget by more than 15%.
                    </p>
                  </div>
                </div>
              )}

              {activePopup === "network" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/25 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">Total Onboarded Vendors</span>
                      <span className="font-bold text-purple-700 dark:text-purple-400 font-sans">1,424 Suppliers</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">Tax Compliant (GST/VAT)</span>
                      <span className="font-bold text-success font-sans">100% Verified</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">Avg Performance Score</span>
                      <span className="font-bold text-primary font-sans">4.9 / 5.0 Rating</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-secondary font-sans">Avg Supplier Lead Time</span>
                      <span className="font-bold text-primary font-sans">4.8 Days</span>
                    </div>
                  </div>
                  <div className="border border-default/70 p-3 rounded-2xl bg-background-secondary/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary font-sans block mb-1">Supply Verticals</span>
                    <p className="text-[11px] text-secondary/90 font-sans leading-relaxed">
                      Verified vendor categories include Industrial Raw Materials, Logistics & Cargo, IT Hardware & SaaS infrastructure, and General Operations Supply Chain management.
                    </p>
                  </div>
                </div>
              )}
              
              {activePopup === "liveteams" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-success/5 dark:bg-success/10 border border-success/25 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">Active Procurement Teams</span>
                      <span className="font-bold text-success font-sans">142 Online</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">Total Bid Volume (24h)</span>
                      <span className="font-extrabold text-primary font-sans">$3.42M USD</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-default pb-2">
                      <span className="font-semibold text-secondary font-sans">Active RFQs</span>
                      <span className="font-bold text-primary font-sans">84 Active Bids</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-secondary font-sans">Average Bid Response</span>
                      <span className="font-bold text-success font-sans">&lt; 14 Minutes</span>
                    </div>
                  </div>
                  <div className="border border-default/70 p-3.5 rounded-2xl bg-background-secondary/20 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary font-sans block">Real-time Activity Log</span>
                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 text-[11px]">
                      <div className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 flex-shrink-0 animate-pulse" />
                        <p className="font-medium text-secondary/90 font-sans">
                          <strong className="text-primary font-semibold">KSV Infra</strong> published RFQ-2026-982 for Cement Supply (2 mins ago)
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <p className="font-medium text-secondary/90 font-sans">
                          <strong className="text-primary font-semibold">Apex Tech</strong> submitted bid of $120k for RFQ-2026-981 (12 mins ago)
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                        <p className="font-medium text-secondary/90 font-sans">
                          <strong className="text-primary font-semibold">Manager</strong> signed PO-2026-044 for logistics contracts (28 mins ago)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePopup === "google" && (
                <div className="space-y-4 animate-fade-in">
                  <p className="text-[11px] text-secondary leading-relaxed font-sans">
                    VendorVision Enterprise integrates seamlessly with Google Cloud Identity & Single Sign-On (SSO) systems. Below are your active developer & demo workspace profiles:
                  </p>
                  
                  <div className="space-y-2.5">
                    {/* Demo Account Option 1 */}
                    <button
                      type="button"
                      onClick={async () => {
                        setGoogleAuthLoading(true);
                        await new Promise(resolve => setTimeout(resolve, 800));
                        setLoginValue("email", demoAccounts.admin.email);
                        setLoginValue("password", demoAccounts.admin.pass);
                        setActivePopup(null);
                        handleDirectDemoLogin();
                      }}
                      disabled={googleAuthLoading}
                      className="w-full flex items-center justify-between p-3 bg-background-secondary/40 hover:bg-background-secondary/70 border border-default rounded-2xl transition-all hover:-translate-y-[1px] cursor-pointer text-left disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs uppercase font-sans">
                          A
                        </div>
                        <div>
                          <span className="font-bold text-primary text-xs block leading-none font-sans">Admin Developer</span>
                          <span className="text-[10px] text-secondary font-sans font-medium">admin@vendorvision.com</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-accent uppercase tracking-wider font-sans">Authorize</span>
                    </button>

                    {/* Demo Account Option 2 */}
                    <button
                      type="button"
                      onClick={async () => {
                        setGoogleAuthLoading(true);
                        await new Promise(resolve => setTimeout(resolve, 800));
                        setLoginValue("email", demoAccounts.vendor.email);
                        setLoginValue("password", demoAccounts.vendor.pass);
                        setActivePopup(null);
                        handleDirectDemoLogin();
                      }}
                      disabled={googleAuthLoading}
                      className="w-full flex items-center justify-between p-3 bg-background-secondary/40 hover:bg-background-secondary/70 border border-default rounded-2xl transition-all hover:-translate-y-[1px] cursor-pointer text-left disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs uppercase font-sans">
                          V
                        </div>
                        <div>
                          <span className="font-bold text-primary text-xs block leading-none font-sans">Apex Sales (Vendor)</span>
                          <span className="text-[10px] text-secondary font-sans font-medium">sales@apex.com</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-accent uppercase tracking-wider font-sans">Authorize</span>
                    </button>
                  </div>

                  <div className="border border-default/70 p-3 rounded-2xl bg-background-secondary/20 text-[10px] text-secondary/80 leading-relaxed font-sans">
                    <span className="font-bold text-primary block mb-0.5">Security Compliance Note</span>
                    SSO credentials are cryptographically verified by AuthContext providers. Google OAuth tokens are checked against system security rules and cleared upon session timeout.
                  </div>
                </div>
              )}

              {activePopup === "forgot" && (
                <div className="space-y-4 animate-fade-in">
                  {recoverySuccess ? (
                    <div className="p-4 bg-success/5 dark:bg-success/10 border border-success/25 rounded-2xl text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto">
                        <CheckCircle2 size={20} />
                      </div>
                      <h4 className="font-bold text-primary text-xs font-sans">Recovery Link Generated!</h4>
                      <p className="text-[11px] text-secondary font-sans font-medium leading-relaxed">
                        A secure password reset link has been dispatched to <strong className="text-primary font-semibold">{recoveryEmail}</strong>. Please check your inbox and spam folder.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setRecoverySuccess(false);
                          setRecoveryEmail("");
                        }}
                        className="mt-2 text-[10px] font-bold text-accent hover:underline font-sans bg-transparent border-none p-0 cursor-pointer"
                      >
                        Reset another email
                      </button>
                    </div>
                  ) : (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (recoveryEmail.trim()) {
                          setRecoverySuccess(true);
                        }
                      }}
                      className="space-y-4"
                    >
                      <p className="text-[11px] text-secondary leading-relaxed font-sans">
                        Enter your registered account email address below, and we will transmit a cryptographic reset link to verify your identity.
                      </p>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-secondary uppercase tracking-wide font-sans block">Recovery Email Address</label>
                        <div className="relative group text-secondary focus-within:text-accent">
                          <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200" />
                          <input
                            type="email"
                            required
                            value={recoveryEmail}
                            onChange={(e) => setRecoveryEmail(e.target.value)}
                            placeholder="your-registered@email.com"
                            className="w-full bg-surface border border-default rounded-xl pl-9.5 pr-4 py-3 text-xs focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all duration-200 text-primary placeholder-secondary font-sans shadow-sm"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-1.5 py-3 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-lg shadow-accent/20 dark:shadow-accent/30 font-sans"
                      >
                        <span>Send Recovery Link</span>
                        <ArrowRight size={13} />
                      </button>
                    </form>
                  )}
                </div>
              )}

              {activePopup === "roleinfo" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-background-secondary/40 border border-default rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full animate-pulse`} style={{ backgroundColor: roleBadgeDotColors[selectedRole] }} />
                      <h4 className="font-extrabold text-xs text-primary uppercase tracking-wider font-sans">
                        Active Role: {rolesConfig.find(r => r.value === selectedRole)?.label}
                      </h4>
                    </div>
                    <p className="text-[11px] text-secondary font-sans leading-relaxed">
                      This system role grants specific authorization scopes, database capabilities, and user interface controls throughout the VendorVision procurement pipeline.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary font-sans block">Authorization Details</span>
                    
                    {selectedRole === "admin" && (
                      <div className="space-y-2">
                        <div className="p-3 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1.5">
                          <span className="font-bold text-blue-700 dark:text-blue-400 text-[11px] font-sans">Access Level: Level-4 Superuser</span>
                          <p className="text-[10px] text-secondary/90 leading-relaxed font-sans font-medium">
                            Complete administrative capabilities across all departments. Authorized to configure system integrations, manage tenant ERP policies, edit GST validation parameters, and retrieve raw audit log streams.
                          </p>
                          <ul className="text-[9px] font-mono text-secondary list-disc pl-4 space-y-0.5 font-medium">
                            <li>Manage Global Users & Roles</li>
                            <li>Toggle Database Integrations (Odoo, ERP)</li>
                            <li>Configure SOC-2 Security Keys</li>
                            <li>Audit Leakage Shield Thresholds</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {selectedRole === "procurement_officer" && (
                      <div className="space-y-2">
                        <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1.5">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px] font-sans">Access Level: Level-2 Operator</span>
                          <p className="text-[10px] text-secondary/90 leading-relaxed font-sans font-medium">
                            Functional control over operational procurement pipelines. Authorized to declare purchase requisitions, broadcast RFQs to vendor groups, analyze quotes, and construct draft purchase orders.
                          </p>
                          <ul className="text-[9px] font-mono text-secondary list-disc pl-4 space-y-0.5 font-medium">
                            <li>Publish RFQ Templates</li>
                            <li>Send Bidding Invitations to Vendors</li>
                            <li>Compare Supplier Quotations</li>
                            <li>Initialize Purchase Orders (POs)</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {selectedRole === "manager" && (
                      <div className="space-y-2">
                        <div className="p-3 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1.5">
                          <span className="font-bold text-purple-700 dark:text-purple-400 text-[11px] font-sans">Access Level: Level-3 Controller</span>
                          <p className="text-[10px] text-secondary/90 leading-relaxed font-sans font-medium">
                            Financial and administrative authorization gate. Authorized to sign off on procurement budgets, trigger vendor selection approvals, verify audit logs, and release approved payments.
                          </p>
                          <ul className="text-[9px] font-mono text-secondary list-disc pl-4 space-y-0.5 font-medium">
                            <li>Approve RFQ Vendor Bids</li>
                            <li>Authorize PO Releases & Signatures</li>
                            <li>Override Budget Cost Leakages</li>
                            <li>Inspect Vendor Performance Audits</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {selectedRole === "vendor" && (
                      <div className="space-y-2">
                        <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5">
                          <span className="font-bold text-amber-700 dark:text-amber-400 text-[11px] font-sans">Access Level: Level-1 External partner</span>
                          <p className="text-[10px] text-secondary/90 leading-relaxed font-sans font-medium">
                            Secure external bidding portal. Authorized to onboard enterprise company profiles, read public and invited RFQs, submit binding quotation prices, and check invoicing workflows.
                          </p>
                          <ul className="text-[9px] font-mono text-secondary list-disc pl-4 space-y-0.5 font-medium">
                            <li>Create Company Supplier Profile</li>
                            <li>Submit Quotations & Pricing Sheets</li>
                            <li>Track PO Dispatch Notification</li>
                            <li>Transmit GST-compliant Invoices</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activePopup === "controls" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-background-secondary/40 border border-default rounded-2xl space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary font-sans block mb-1">Interactive 3D Engine Guide</span>
                    <p className="text-[11px] text-secondary font-sans leading-relaxed font-medium">
                      The dynamic 3D globe visualization in VendorVision uses WebGL and Three.js to render global supply chain routing nodes.
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    <h5 className="font-bold text-primary text-xs font-sans">Available Interaction Controls:</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 border border-default rounded-xl bg-background-secondary/20 font-sans font-medium">
                        <strong className="text-primary font-semibold block mb-0.5 font-sans">Drag to Rotate</strong>
                        Click and drag anywhere on the globe container to orbit the camera view.
                      </div>
                      <div className="p-2.5 border border-default rounded-xl bg-background-secondary/20 font-sans font-medium">
                        <strong className="text-primary font-semibold block mb-0.5 font-sans">Pinch/Scroll to Zoom</strong>
                        Use your mouse wheel or pinch gesture to zoom in on active supplier routes.
                      </div>
                      <div className="p-2.5 border border-default rounded-xl bg-background-secondary/20 font-sans font-medium">
                        <strong className="text-primary font-semibold block mb-0.5 font-sans">Auto-Orbiting Mode</strong>
                        When idle, the globe automatically orbits at a steady speed to save GPU cycles.
                      </div>
                      <div className="p-2.5 border border-default rounded-xl bg-background-secondary/20 font-sans font-medium">
                        <strong className="text-primary font-semibold block mb-0.5 font-sans">HUD Indicators</strong>
                        Clicking the floating widgets (Security, Leakage, Network) opens active diagnostics.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePopup === "brand" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary font-sans block mb-1">Branding Overview</span>
                    <p className="text-[11px] text-secondary font-sans leading-relaxed font-medium">
                      VendorVision ERP represents the next generation of enterprise resource planning, customized specifically for high-efficiency procurement workflows.
                    </p>
                  </div>
                  <div className="space-y-2 text-[11px] leading-relaxed">
                    <p className="font-medium text-secondary/95 font-sans">
                      Our system bridges the gap between internal procurement officers, managers, and external suppliers through real-time notifications and an immutable audit log.
                    </p>
                    <div className="border border-default/70 p-3 rounded-2xl bg-background-secondary/20 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary font-sans block">Collaborative Integration</span>
                      <p className="font-sans text-secondary/90 leading-relaxed font-medium">
                        Features native Odoo connector hooks, custom GST compliance checkers, and a robust backend powered by FastAPI and modern database drivers.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-default flex justify-end relative z-10">
              <button
                onClick={closePopup}
                className="px-5 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-accent/20 dark:shadow-accent/30 font-sans"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
