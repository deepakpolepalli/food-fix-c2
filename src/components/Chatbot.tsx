import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Image as ImageIcon,
  Loader2,
  Trash2,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatMessage {
  text: string;
  isBot: boolean;
  image?: string; // Base64 representation for display in chat
  escalated?: boolean;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      text: "Hi! I am the Food Fix Support Assistant. I can help answer questions about our store policies and evaluate food quality issues for refunds. How can I assist you today?",
      isBot: true,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever messages or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

  // Handle image selection/parsing to Base64
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setSelectedImage(base64String);
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Reset conversation helper
  const handleReset = () => {
    setMessages([
      {
        text: "Hi! I am the Food Fix Support Assistant. I can help answer questions about our store policies and evaluate food quality issues for refunds. How can I assist you today?",
        isBot: true,
      },
    ]);
    setSelectedImage(null);
    setImagePreview(null);
    setIsEscalated(false);
    setError(null);
  };

  const handleSend = async () => {
    if (!message.trim() && !selectedImage) return;

    const userMessageText = message;
    const currentSelectedImage = selectedImage;

    // Append user's message to chat list
    setMessages((prev) => [
      ...prev,
      {
        text: userMessageText || "Uploaded an image for quality inspection.",
        isBot: false,
        image: currentSelectedImage || undefined,
      },
    ]);

    // Clear input bar and preview
    setMessage("");
    handleRemoveImage();
    setIsLoading(true);
    setError(null);

    // Filter down message history to pass to API
    const historyPayload = messages.map((m) => ({
      text: m.text,
      isBot: m.isBot,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: userMessageText || "Please inspect this food image.",
          history: historyPayload,
          image: currentSelectedImage,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to communicate with the chatbot. Please try again.");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Check if this turn got escalated
      if (data.escalated) {
        setIsEscalated(true);
      }

      setMessages((prev) => [
        ...prev,
        {
          text: data.text,
          isBot: true,
          escalated: data.escalated || false,
        },
      ]);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setMessages((prev) => [
        ...prev,
        {
          text: "I am sorry, but I experienced an issue checking that for you. Our support database might be busy. Please try asking again or contact human support directly at support@foodfix.com.",
          isBot: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        id="chatbot-launcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 p-5 bg-orange-600 text-white rounded-full shadow-lg shadow-orange-500/30 z-50 hover:scale-105 transition-transform cursor-pointer"
        aria-label="Toggle Support Chatbot"
      >
        {isOpen ? <X size={26} /> : <MessageCircle size={26} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="chatbot-window-panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`fixed inset-4 sm:bottom-28 sm:right-8 sm:w-[420px] sm:h-[600px] sm:inset-auto bg-white shadow-2xl rounded-3xl border border-zinc-100 z-50 flex flex-col overflow-hidden transition-all duration-200 ${
              isDragging ? "ring-4 ring-orange-500/40 scale-[1.02]" : ""
            }`}
          >
            {/* Dark Orange Header Layer */}
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-950 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center font-bold text-white text-lg tracking-wider">
                    FF
                  </div>
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-zinc-950" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight">AI Agent: Food Quality & Policy</h3>
                  <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                    Automated Refunds & Escalations
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Reset conversation"
                  aria-label="Reset Support Conversation"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close Chatbot"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main Conversation Logs */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-zinc-50 relative">
              {/* Drag over overlay */}
              <AnimatePresence>
                {isDragging && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-orange-50/95 border-2 border-dashed border-orange-500 rounded-inner flex flex-col items-center justify-center gap-2 z-10 p-6 text-center"
                  >
                    <div className="p-4 bg-orange-100 rounded-full text-orange-600">
                      <ImageIcon size={32} />
                    </div>
                    <p className="font-bold text-zinc-800 mt-2">Drop your image here</p>
                    <p className="text-xs text-zinc-500">We will verify if your meal is burnt or has mould</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] ${
                    msg.isBot ? "self-start" : "self-end ml-auto items-end"
                  }`}
                >
                  {/* Optional Image inside Chat Log */}
                  {msg.image && (
                    <div className="mb-1 rounded-2xl overflow-hidden border border-zinc-200 inline-block shadow-sm">
                      <img src={msg.image} alt="Uploaded food" className="max-h-40 max-w-full object-cover" />
                    </div>
                  )}

                  <div
                    className={`p-3.5 px-4 rounded-2xl text-sm leading-relaxed ${
                      msg.isBot
                        ? "bg-white text-zinc-800 rounded-tl-none border border-zinc-100 shadow-xs"
                        : "bg-orange-600 text-white rounded-tr-none shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Specific Escalated flag in chat bubble */}
                  {msg.escalated && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium mt-1">
                      <AlertCircle size={12} />
                      Ticket escalated to human representative
                    </span>
                  )}
                </div>
              ))}

              {/* Loader animation for bot typing response */}
              {isLoading && (
                <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono py-1">
                  <Loader2 size={14} className="animate-spin text-orange-600" />
                  <span>AI agent is evaluating policy & checking image quality...</span>
                </div>
              )}

              {/* Error Alert Display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex gap-2 items-center">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Sticky bottom marker for scroll pinning */}
              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview Box if attached but not sent yet */}
            <AnimatePresence>
              {imagePreview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 py-3 bg-orange-50 border-t border-orange-100 flex items-center justify-between gap-3 text-zinc-700"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img src={imagePreview} alt="Attached preview" className="w-12 h-12 rounded-lg object-cover border border-orange-200 shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-orange-950 flex items-center gap-1">
                        <CheckCircle size={12} className="text-orange-600" /> Attached Food Issue Image
                      </p>
                      <p className="text-[10px] text-zinc-500">Mime size check ok. Ready to submit</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveImage}
                    className="p-1 hover:bg-orange-100 rounded-full text-orange-800 transition-colors cursor-pointer"
                    aria-label="Remove uploaded image"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Escalated status footer notification banner */}
            {isEscalated && (
              <div className="px-5 py-2.5 bg-zinc-900 text-zinc-100 border-t border-zinc-800 text-xs flex items-center justify-between gap-1.5 animate-pulse">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="block h-2 w-2 rounded-full bg-amber-500" />
                  Status: Escalated to Support Staff
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Agent ID: #82-TRG</span>
              </div>
            )}

            {/* User Typing & Options Footer */}
            <div className="p-4 border-t border-zinc-100 flex flex-col gap-2 bg-white">
              <div className="flex gap-2 items-center">
                {/* Image upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-zinc-500 hover:text-orange-600 bg-zinc-50 hover:bg-orange-50 rounded-full transition-all border border-zinc-100 cursor-pointer text-sm"
                  title="Upload an image for verification"
                >
                  <ImageIcon size={18} />
                </button>
                <input
                  type="file"
                  id="chatbot-image-upload"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Main Text Input Bar */}
                <input
                  type="text"
                  placeholder={
                    selectedImage
                      ? "Describe the issue with the uploaded image..."
                      : "Ask about policies, or drop/upload food image..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  disabled={isLoading}
                  className="flex-1 bg-zinc-50 border border-zinc-200/60 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={isLoading || (!message.trim() && !selectedImage)}
                  className="bg-orange-600 hover:bg-orange-500 text-white p-3.5 rounded-full transition-all flex items-center justify-center shrink-0 disabled:opacity-40 disabled:hover:bg-orange-600 disabled:scale-100 hover:scale-105 active:scale-95 cursor-pointer"
                  aria-label="Send Support Query"
                >
                  <Send size={15} />
                </button>
              </div>
              <div className="text-[10px] text-zinc-400 text-center font-medium">
                Drag and drop food images to inspect quality. Refund for burnt or mouldy dishes instantly.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
