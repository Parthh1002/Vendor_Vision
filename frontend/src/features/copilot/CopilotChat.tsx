import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  X,
  Minus,
  Send,
  PlusCircle,
  ExternalLink,
  Bot,
  Trash2
} from "lucide-react";
import { copilotApi } from "../../services/api";

interface CopilotChatProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: Date;
  suggested_rfq?: any;
  suggested_vendors?: any[];
}

const CopilotChat: React.FC<CopilotChatProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("vendorvision_chat_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: "welcome",
        sender: "copilot",
        text: "👋 Hello! I am the **VendorVision Copilot**, your procurement assistant.\n\nI can analyze our spend history, recommend vendors, or auto-generate RFQ drafts based on your natural language instructions. How can I help you today?",
        timestamp: new Date(),
      },
    ];
  });
  
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("vendorvision_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    const userMessage: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      const res = await copilotApi.query(textToSend);
      const { response, suggested_rfq, suggested_vendors } = res.data;

      const copilotMessage: Message = {
        id: Math.random().toString(),
        sender: "copilot",
        text: response,
        timestamp: new Date(),
        suggested_rfq,
        suggested_vendors,
      };

      setMessages((prev) => [...prev, copilotMessage]);
    } catch (err) {
      console.error(err);
      const errorMessage: Message = {
        id: Math.random().toString(),
        sender: "copilot",
        text: "⚠️ Sorry, I encountered an error checking the procurement context database. Please check your backend connection.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = () => {
    const defaultWelcome: Message[] = [
      {
        id: "welcome",
        sender: "copilot",
        text: "👋 Hello! I am the **VendorVision Copilot**, your procurement assistant.\n\nI can analyze our spend history, recommend vendors, or auto-generate RFQ drafts based on your natural language instructions. How can I help you today?",
        timestamp: new Date(),
      }
    ];
    setMessages(defaultWelcome);
    localStorage.removeItem("vendorvision_chat_history");
  };

  const applySuggestedRFQ = (rfq: any) => {
    navigate("/rfqs", { state: { draftRFQ: rfq } });
    onClose();
  };

  const viewVendorDetails = (vendorId: number) => {
    navigate("/vendors", { state: { highlightVendorId: vendorId } });
    onClose();
  };

  const suggestedQuickActions = [
    { label: "Analyze Vendor", prompt: "Perform an analysis of Apex Solutions Ltd performance score" },
    { label: "Forecast Demand", prompt: "Forecast our IT Services demand for Q3 2026" },
    { label: "Generate RFQ", prompt: "Draft an RFQ for 15 Developer Laptops with $20000 budget" },
    { label: "Procurement Insights", prompt: "Give me spend insights and cost saving recommendations" },
    { label: "Inventory Status", prompt: "Check stock and pending order status for office desks" }
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-24 sm:right-6 w-full sm:w-[420px] h-full sm:h-[580px] max-h-screen sm:max-h-[calc(100vh-120px)] bg-surface-elevated/95 backdrop-blur-xl border border-default shadow-premium-popup rounded-none sm:rounded-2xl flex flex-col z-50 scale-in-center animate-fade-in transition-all duration-300">
      {/* Floating Header */}
      <div className="p-4 border-b border-default flex items-center justify-between bg-background-secondary rounded-t-none sm:rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center shadow-md shadow-accent/20">
            <Bot size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-bold text-primary font-sans leading-none">Vision AI Copilot</h2>
              <div className="flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-success">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active</span>
              </div>
            </div>
            <p className="text-[10px] text-secondary mt-0.5 leading-none font-sans">Enterprise Procurement Agent</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 1 && (
            <button
              onClick={handleClearHistory}
              className="p-1.5 rounded-lg border border-transparent text-secondary hover:text-danger hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-all duration-200 cursor-pointer"
              title="Clear Chat History"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-transparent text-secondary hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-all duration-200 cursor-pointer"
            title="Minimize Assistant"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-transparent text-secondary hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-all duration-200 cursor-pointer"
            title="Close Assistant"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isCopilot = msg.sender === "copilot";
          return (
            <div key={msg.id} className={`flex flex-col ${isCopilot ? "items-start" : "items-end"} animate-fade-in`}>
              <div className="flex items-start gap-2 max-w-[85%]">
                {isCopilot && (
                  <div className="w-6 h-6 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 text-[10px] mt-0.5 font-bold">
                    AI
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    isCopilot
                      ? "bg-background border border-default text-primary rounded-tl-none"
                      : "bg-accent text-white rounded-tr-none shadow-md shadow-accent/10"
                  }`}
                >
                  {isCopilot ? (
                    <div className="prose prose-xs dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-line font-sans">{msg.text}</p>
                  )}

                  {/* AI Structured Vendor Recommendation */}
                  {isCopilot && msg.suggested_vendors && msg.suggested_vendors.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-secondary font-sans">Copilot Suggestions</p>
                      {msg.suggested_vendors.map((vendor, index) => (
                        <div key={index} className="p-2.5 bg-surface border border-default rounded-xl flex items-center justify-between hover:border-accent/40 hover:bg-background-secondary transition-all duration-300">
                          <div>
                            <p className="font-bold text-[11px] text-accent font-sans">{vendor.vendor_name}</p>
                            <p className="text-[9px] text-secondary mt-0.5">Confidence: {vendor.confidence_score}%</p>
                          </div>
                          <button
                            onClick={() => viewVendorDetails(vendor.vendor_id)}
                            className="flex items-center gap-0.5 text-[10px] font-bold text-accent hover:underline cursor-pointer"
                          >
                            <span>Profile</span>
                            <ExternalLink size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Generated RFQ Card */}
                  {isCopilot && msg.suggested_rfq && (
                    <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-secondary font-sans">Generated RFQ Draft</p>
                      <div className="p-2.5 bg-surface border border-default rounded-xl space-y-2">
                        <p className="font-bold text-[11px] text-primary font-sans">{msg.suggested_rfq.title}</p>
                        <p className="text-[10px] text-secondary line-clamp-2">{msg.suggested_rfq.description}</p>
                        <div className="flex items-center justify-between text-[10px] font-bold text-secondary">
                          <span>Qty: {msg.suggested_rfq.quantity}</span>
                          <span>Budget: ₹{msg.suggested_rfq.budget.toLocaleString()}</span>
                        </div>
                        <button
                          onClick={() => applySuggestedRFQ(msg.suggested_rfq)}
                          className="w-full flex items-center justify-center gap-1 mt-1 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-[10px] font-bold transition-all duration-300 cursor-pointer shadow-sm shadow-accent/15"
                        >
                          <PlusCircle size={11} />
                          <span>Initialize RFQ Template</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[8px] text-secondary mt-1 px-8 font-sans">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {/* Loading skeleton while AI responds */}
        {isSending && (
          <div className="flex items-start gap-2 max-w-[85%] animate-pulse">
            <div className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-[10px] flex items-center justify-center text-secondary font-bold">
              AI
            </div>
            <div className="bg-neutral-100/50 dark:bg-neutral-800/30 border border-neutral-200/30 dark:border-neutral-750/20 rounded-2xl rounded-tl-none p-3.5 space-y-2 w-72">
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6" />
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-4/6" />
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Commands */}
      <div className="p-2.5 border-t border-default bg-background-secondary flex gap-1.5 overflow-x-auto no-scrollbar">
        {suggestedQuickActions.map((action, i) => (
          <button
            key={i}
            onClick={() => handleSend(action.prompt)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full border border-default bg-surface text-[10px] font-bold text-secondary hover:text-accent hover:border-accent/40 hover:-translate-y-[1px] active:translate-y-0 transition-all duration-300 cursor-pointer"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputValue);
        }}
        className="p-3 border-t border-default flex gap-2 bg-surface-elevated rounded-b-none sm:rounded-b-2xl"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask Copilot something..."
          className="flex-1 bg-surface border border-default rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-accent transition-all text-primary placeholder-secondary"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isSending}
          className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent-dark disabled:opacity-50 disabled:hover:bg-accent transition-all duration-300 cursor-pointer shadow-sm shadow-accent/15"
        >
          <Send size={13} />
        </button>
      </form>
    </div>
  );
};

export default CopilotChat;
