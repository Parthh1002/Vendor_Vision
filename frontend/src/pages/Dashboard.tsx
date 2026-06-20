import React, { useEffect, useState } from "react";
import { analyticsApi } from "../services/api";
import { useTheme } from "../contexts/ThemeContext";
import type { SpendAnalytics } from "../types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  DollarSign,
  Users,
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  ChevronDown
} from "lucide-react";

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard: React.FC = () => {
  const [data, setData] = useState<SpendAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"monthly" | "quarterly">("monthly");
  
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await analyticsApi.getSpendAnalytics();
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load analytics dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-secondary font-bold tracking-wide uppercase">Loading ERP Spend Analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center text-danger font-sans">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} />
          <span className="font-extrabold text-sm uppercase tracking-wider">{error || "Data load error"}</span>
        </div>
      </div>
    );
  }

  // --- Theme-Aware Chart.js Styling Defaults ---
  const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(15, 23, 42, 0.05)";
  const tickColor = isDark ? "#94A3B8" : "#475569";
  const tooltipBg = isDark ? "#1E293B" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const tooltipText = isDark ? "#F8FAFC" : "#0F172A";

  const chartThemeOptions = {
    plugins: {
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipText,
        bodyColor: tooltipText,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: "Inter", weight: "bold" as const, size: 11 },
        bodyFont: { family: "Inter", size: 11 },
      }
    }
  };

  // --- CHART CONFIGURATIONS ---
  // 1. Monthly/Quarterly Spend Line Chart
  let chartLabels: string[] = [];
  let chartDataValues: number[] = [];

  if (timeframe === "monthly") {
    chartLabels = data.monthly_spend.map((item) => item.month);
    chartDataValues = data.monthly_spend.map((item) => item.spend);
  } else {
    const quarters: { [key: string]: number } = {};
    data.monthly_spend.forEach((item) => {
      const parts = item.month.split(" ");
      if (parts.length === 2) {
        const month = parts[0];
        const year = parts[1];
        let q = "";
        if (["Jan", "Feb", "Mar"].includes(month)) {
          q = `Q1 ${year}`;
        } else if (["Apr", "May", "Jun"].includes(month)) {
          q = `Q2 ${year}`;
        } else if (["Jul", "Aug", "Sep"].includes(month)) {
          q = `Q3 ${year}`;
        } else if (["Oct", "Nov", "Dec"].includes(month)) {
          q = `Q4 ${year}`;
        }
        if (q) {
          quarters[q] = (quarters[q] || 0) + item.spend;
        }
      }
    });
    chartLabels = Object.keys(quarters);
    chartDataValues = Object.values(quarters);
  }

  const lineChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Approved spend (₹)",
        data: chartDataValues,
        fill: true,
        borderColor: "#4f46e5", // Indigo Primary Accent
        backgroundColor: isDark ? "rgba(99, 102, 241, 0.04)" : "rgba(79, 70, 229, 0.03)",
        tension: 0.38,
        pointBackgroundColor: "#4f46e5",
        pointBorderColor: isDark ? "#1E293B" : "#ffffff",
        pointHoverBackgroundColor: "#ffffff",
        pointHoverBorderColor: "#4f46e5",
        pointHoverRadius: 6,
        pointRadius: 4,
        borderWidth: 2
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      ...chartThemeOptions.plugins
    },
    scales: {
      y: { 
        grid: { color: gridColor },
        ticks: { color: tickColor, font: { family: "Inter", size: 10 } }
      },
      x: { 
        grid: { display: false },
        ticks: { color: tickColor, font: { family: "Inter", size: 10 } }
      },
    },
  };

  // 2. Category Spend Doughnut Chart
  const doughnutChartData = {
    labels: data.category_spend.map((item) => item.category),
    datasets: [
      {
        data: data.category_spend.map((item) => item.spend),
        backgroundColor: [
          "#4f46e5", // Indigo
          "#06b6d4", // Cyan
          "#f59e0b", // Amber
          "#8b5cf6", // Violet
        ],
        borderWidth: isDark ? 2 : 1,
        borderColor: isDark ? "#1E293B" : "#ffffff",
        hoverOffset: 6
      },
    ],
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { 
          boxWidth: 8, 
          padding: 16,
          color: tickColor,
          font: { family: "Inter", size: 10, weight: "bold" as const } 
        },
      },
      ...chartThemeOptions.plugins
    },
    cutout: "70%"
  };

  // 3. RFQ Volume Trends Bar Chart
  const barChartData = {
    labels: data.rfq_trends.map((item) => item.month),
    datasets: [
      {
        label: "RFQs Created",
        data: data.rfq_trends.map((item) => item.count),
        backgroundColor: isDark ? "rgba(99, 102, 241, 0.75)" : "rgba(79, 70, 229, 0.65)",
        borderRadius: 8,
        barThickness: 16,
        hoverBackgroundColor: "#06b6d4" // Cyan hover accent
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      ...chartThemeOptions.plugins
    },
    scales: {
      y: { 
        grid: { color: gridColor }, 
        ticks: { stepSize: 1, color: tickColor, font: { family: "Inter", size: 10 } } 
      },
      x: { 
        grid: { display: false },
        ticks: { color: tickColor, font: { family: "Inter", size: 10 } }
      },
    },
  };

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0 font-sans">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-primary leading-none">Spend Analytics</h1>
          <p className="text-xs sm:text-sm text-secondary mt-2 font-medium">Executive operations and transaction metrics</p>
        </div>
        
        {/* Dynamic Spend Toggler */}
        <div className="relative inline-block text-left">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as "monthly" | "quarterly")}
            className="text-xs text-secondary bg-surface border border-default rounded-xl pl-3.5 pr-8 py-2 outline-none cursor-pointer hover:border-accent hover:text-accent font-bold transition-all appearance-none flex items-center shadow-sm"
          >
            <option value="monthly">Monthly Timeline</option>
            <option value="quarterly">Quarterly Timeline</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
            <ChevronDown size={11} />
          </div>
        </div>
      </div>
 
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Spend */}
        <div className="p-3 bg-surface border border-default rounded-2xl flex flex-col justify-between hover-lift shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
          <div className="flex justify-between items-start text-secondary">
            <span className="text-[10px] font-extrabold uppercase tracking-wider font-sans">Total Spend</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign size={14} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-black truncate text-primary font-sans">₹{data.total_spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-[9px] sm:text-xs text-success font-bold flex items-center gap-0.5 mt-1 font-sans">
              <TrendingUp size={9} /> +12.3% from last quarter
            </span>
          </div>
        </div>
 
        {/* KPI 2: Active Vendors */}
        <div className="p-3 bg-surface border border-default rounded-2xl flex flex-col justify-between hover-lift shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex justify-between items-start text-secondary">
            <span className="text-[10px] font-extrabold uppercase tracking-wider font-sans">Active Vendors</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users size={14} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-primary font-sans">{data.active_vendors}</h3>
            <span className="text-[9px] sm:text-xs text-secondary font-bold block mt-1 font-sans">
              Verified suppliers onboarded
            </span>
          </div>
        </div>
 
        {/* KPI 3: Open RFQs */}
        <div className="p-3 bg-surface border border-default rounded-2xl flex flex-col justify-between hover-lift shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
          <div className="flex justify-between items-start text-secondary">
            <span className="text-[10px] font-extrabold uppercase tracking-wider font-sans">Open RFQs</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <FileText size={14} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-primary font-sans">{data.open_rfqs}</h3>
            <span className="text-[9px] sm:text-xs text-secondary font-bold block mt-1 font-sans">
              Awaiting submissions
            </span>
          </div>
        </div>
 
        {/* KPI 4: Pending Approvals */}
        <div className="p-3 bg-surface border border-default rounded-2xl flex flex-col justify-between hover-lift shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <div className="flex justify-between items-start text-secondary">
            <span className="text-[10px] font-extrabold uppercase tracking-wider font-sans">Pending POs</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <CheckCircle size={14} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-primary font-sans">{data.pending_approvals}</h3>
            <span className="text-[9px] sm:text-xs text-amber-500 font-bold flex items-center gap-0.5 mt-1 font-sans">
              Requires manager sign-off
            </span>
          </div>
        </div>
 
        {/* KPI 5: Avg Cycle Time */}
        <div className="p-3 bg-surface border border-default rounded-2xl flex flex-col justify-between hover-lift shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-pink-500" />
          <div className="flex justify-between items-start text-secondary">
            <span className="text-[10px] font-extrabold uppercase tracking-wider font-sans">Avg Cycle</span>
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-primary font-sans">{data.avg_procurement_cycle_days} days</h3>
            <span className="text-[9px] sm:text-xs text-success font-bold flex items-center gap-0.5 mt-1 font-sans">
              -1.4 days improvement
            </span>
          </div>
        </div>
      </div>
 
      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Chart 1: Spend Trends (Line) */}
        <div className="lg:col-span-2 p-4 sm:p-3 bg-surface border border-default rounded-2xl flex flex-col h-[300px] lg:h-auto min-h-0 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-primary uppercase font-sans">Approved Spend Trends</h2>
            <span className="text-[10px] text-secondary font-bold uppercase tracking-wider font-sans">Timeframe: {timeframe}</span>
          </div>
          <div className="flex-1 min-h-0">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>
 
        {/* Chart 2: Category Spend (Doughnut) */}
        <div className="p-4 sm:p-3 bg-surface border border-default rounded-2xl flex flex-col h-[300px] lg:h-auto min-h-0 shadow-sm">
          <h2 className="text-xs sm:text-sm font-bold tracking-tight mb-4 text-primary uppercase font-sans">Spend by Category</h2>
          <div className="flex-1 min-h-0 relative flex items-center justify-center">
            <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
          </div>
        </div>
      </div>
 
      {/* Row 3: RFQ Trends & Vendor leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Chart 3: RFQ Trends (Bar) */}
        <div className="p-4 sm:p-3 bg-surface border border-default rounded-2xl flex flex-col h-[280px] min-h-0 shadow-sm">
          <h2 className="text-xs sm:text-sm font-bold tracking-tight mb-4 text-primary uppercase font-sans">RFQ Volume Trends</h2>
          <div className="flex-1 min-h-0">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
 
        {/* Vendor Scorecard Leaderboard Table */}
        <div className="p-4 sm:p-3 bg-surface border border-default rounded-2xl flex flex-col h-[280px] min-h-0 shadow-sm">
          <h2 className="text-xs sm:text-sm font-bold tracking-tight mb-4 text-primary uppercase font-sans">Supplier Performance Scorecard</h2>
          
          <div className="flex-1 overflow-y-auto overflow-x-auto w-full pr-1">
            <table className="w-full text-left text-xs border-collapse min-w-[360px]">
              <thead>
                <tr className="border-b border-default text-secondary pb-2">
                  <th className="font-bold pb-2 text-[10px] uppercase">Vendor Name</th>
                  <th className="font-bold pb-2 text-center text-[10px] uppercase">Perf. Score</th>
                  <th className="font-bold pb-2 text-center text-[10px] uppercase">Reliability</th>
                  <th className="font-bold pb-2 text-right text-[10px] uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.vendor_performance.map((v, index) => (
                  <tr key={index} className="border-b border-default last:border-0 hover:bg-background-secondary transition-colors">
                    <td className="py-2.5 font-bold text-primary">{v.vendor_name}</td>
                    <td className="py-2.5 text-center font-bold text-accent">{v.score.toFixed(1)}%</td>
                    <td className="py-2.5 text-center font-bold text-success">{v.reliability.toFixed(1)} / 5.0</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded bg-success/10 border border-success/15 text-success font-bold text-[9px] uppercase tracking-wide">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
