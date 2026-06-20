import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] rounded-full bg-red-500/5 blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center space-y-4 z-10 border border-red-500/20">
        <div className="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
          <ShieldAlert size={32} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Access Restricted</h1>
          <p className="text-sm text-secondary">
            Your user account role does not have the authorization privileges required to view this internal procurement page.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-surface-elevated hover:bg-surface border border-default text-primary rounded-xl font-medium transition-all duration-300 btn-premium"
          >
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
