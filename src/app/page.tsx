"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Copy,
  Sparkles,
  Globe,
  Zap,
  ArrowRight,
  LogIn,
  Sparkle,
  Github,
  Twitter,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

type User = {
  id: string;
  email?: string;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
    name?: string;
  };
} | null;

const PromptEnhancer = () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [inputPrompt, setInputPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<User>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(session?.user ?? null);
      } catch (err) {
        console.error("Session error:", err);
        setError("Failed to check authentication status");
        setUser(null);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogin = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to login with Google");
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
      setError("Failed to logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const enhancePrompt = async (text: string) => {
    const hindiToEnglish: { [key: string]: string } = {
      बनाओ: "create",
      लिखो: "write",
      समझाओ: "explain",
      "क्या है": "what is",
      "विधि बताएं": "explain how to make",
      "कैसे बनाएं": "how to make",
    };

    let translatedText = text;
    Object.entries(hindiToEnglish).forEach(([hindi, english]) => {
      if (text.toLowerCase().includes(hindi)) {
        translatedText = text.replace(new RegExp(hindi, "i"), english);
      }
    });

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Transform this prompt into a detailed, comprehensive paragraph. Include specific requirements, context, and desired outcomes. Make it clear and actionable while maintaining a natural flow: "${translatedText}"

Example format:
"Create a detailed [topic/task] that [specific requirements]. Ensure to include [important elements] while focusing on [key aspects]. The output should [desired outcome] and incorporate [specific features/elements]. Consider [relevant context/constraints] and optimize for [quality factors]."

Please provide the enhanced prompt in a single, well-structured paragraph.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      throw new Error("Failed to enhance prompt");
    }
  };

  const handleEnhance = async () => {
    if (!user) {
      setError("Please login to enhance prompts");
      return;
    }

    if (!inputPrompt.trim()) {
      setError("Please enter a prompt to enhance");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const enhanced = await enhancePrompt(inputPrompt);
      setEnhancedPrompt(enhanced);
    } catch (error) {
      console.error("Enhancement error:", error);
      setError("Failed to enhance prompt. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(enhancedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy error:", err);
      setError("Failed to copy text");
    }
  };

  const examples = [
    {
      text: "write a story about a magical forest",
      label: "Story about magical forest",
    },
    {
      text: "explain quantum computing",
      label: "Explain quantum computing",
    },
    {
      text: "एक केक बनाने की विधि बताएं",
      label: "एक केक बनाने की विधि",
    },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-purple-50 to-white dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 px-4 sm:px-6 overflow-hidden relative">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/10 dark:bg-blue-500/10 rounded-full blur-3xl"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-purple-400/10 dark:bg-purple-500/10 rounded-full blur-3xl"
          />
        </div>

        {/* Navigation */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 backdrop-blur-lg border-b border-gray-200/20 dark:border-gray-700/30">
          <nav className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                  PromptPilot
                </span>
              </motion.div>

              <motion.div
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                {user ? (
                  <div className="flex items-center">
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md shadow-lg dark:bg-gray-800/50 border border-gray-200/20 dark:border-gray-700/20">
                      {user.user_metadata?.avatar_url && (
                        <img
                          src={
                            user.user_metadata.avatar_url || "/placeholder.svg"
                          }
                          alt="Profile"
                          className="w-8 h-8 rounded-full ring-2 ring-blue-500/50"
                        />
                      )}
                      <span className="hidden sm:block text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.user_metadata?.full_name ||
                          user.user_metadata?.name}
                      </span>
                      <Button
                        onClick={handleLogout}
                        variant="ghost"
                        size="sm"
                        disabled={isLoggingOut}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      >
                        {isLoggingOut ? (
                          <Spinner className="w-4 h-4" />
                        ) : (
                          <LogIn className="w-4 h-4 rotate-180" />
                        )}
                        <span className="sr-only">Logout</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleLogin}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-blue-500/20 transition-all duration-300"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login with Google</span>
                  </Button>
                )}
                <ThemeToggle />
              </motion.div>
            </div>
          </nav>
        </header>

        <main className="container mx-auto py-12 mt-16">
          {/* Hero Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 pt-8"
          >
            <h1 className="text-5xl sm:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
              Your AI Prompt Co-Pilot
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Transform your simple ideas into powerful, detailed AI prompts
            </p>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto px-4">
              {[
                {
                  icon: Globe,
                  title: "Multilingual",
                  description: "English & Hindi Support",
                },
                {
                  icon: Sparkles,
                  title: "Smart Enhancement",
                  description: "AI-Powered Refinement",
                },
                {
                  icon: Zap,
                  title: "Instant Results",
                  description: "Quick & Efficient",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="flex flex-col items-center gap-4 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-md bg-white/20 dark:bg-gray-800/30 border-gray-200/20 dark:border-gray-700/20 rounded-2xl">
                    <feature.icon className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                    <div className="text-center">
                      <h3 className="font-semibold dark:text-gray-100">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-5xl mx-auto mb-6"
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Interface */}
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-5xl mx-auto"
          >
            <Card className="p-8 shadow-2xl bg-white/5 dark:bg-gray-800/5 backdrop-blur-md border border-gray-200/20 dark:border-gray-700/20 rounded-3xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold dark:text-gray-100 flex items-center gap-2">
                      Your Prompt
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                        (English or Hindi)
                      </span>
                    </h2>
                  </div>
                  <Textarea
                    placeholder="Enter your prompt in English or Hindi..."
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    className="min-h-[200px] resize-none dark:bg-gray-900/50 dark:border-gray-700 dark:text-gray-100 text-base rounded-xl focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
                  />
                  <Button
                    onClick={handleEnhance}
                    disabled={!inputPrompt || isProcessing || !user}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all duration-300"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <Spinner className="w-4 h-4" />
                        Enhancing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Enhance Prompt
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>

                {/* Output Section */}
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold dark:text-gray-100 flex items-center gap-2">
                    Enhanced Prompt
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                      (AI Enhanced)
                    </span>
                  </h2>
                  <div className="relative">
                    <AnimatePresence mode="wait">
                      {isProcessing ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="min-h-[200px] flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border dark:border-gray-700"
                        >
                          <Spinner className="w-8 h-8" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="content"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <Textarea
                            value={enhancedPrompt}
                            readOnly
                            className="min-h-[200px] resize-none bg-gray-50/50 dark:bg-gray-900/50 dark:border-gray-700 dark:text-gray-100 text-base rounded-xl"
                            placeholder="Your enhanced prompt will appear here..."
                          />
                          {enhancedPrompt && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={handleCopy}
                                  className="absolute top-2 right-2 rounded-lg"
                                >
                                  <Copy
                                    className={`h-4 w-4 ${
                                      copied ? "text-green-500" : ""
                                    }`}
                                  />
                                  <span className="sr-only">
                                    Copy to clipboard
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {copied ? "Copied!" : "Copy to clipboard"}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </Card>
          </motion.section>

          {/* Examples Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16 text-center"
          >
            <h2 className="text-2xl font-semibold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
              Quick Start Examples
            </h2>
            <div className="flex flex-wrap gap-4 justify-center max-w-3xl mx-auto">
              {examples.map((example, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    onClick={() => setInputPrompt(example.text)}
                    className="text-sm border border-gray-200/20 dark:border-gray-700/20 bg-white/5 dark:bg-gray-800/5 backdrop-blur-sm hover:bg-blue-500/5 dark:hover:bg-blue-500/5 rounded-xl"
                  >
                    <Sparkle className="w-4 h-4 mr-2" />
                    {example.label}
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </main>

        {/* Footer */}
        <footer className="mt-16 py-8 border-t border-gray-200/20 dark:border-gray-700/30">
          <div className="container mx-auto text-center space-y-4">
            <div className="flex justify-center items-center gap-6">
              {[
                {
                  href: "https://twitter.com/itsmeekaran",
                  icon: Twitter,
                  label: "Twitter",
                },
                {
                  href: "https://github.com/Anshkaran7",
                  icon: Github,
                  label: "GitHub",
                },
                {
                  href: "https://github.com/Anshkaran7/promptpilot",
                  icon: ExternalLink,
                  label: "Project Repository",
                },
              ].map((link) => (
                <motion.a
                  key={link.label}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                >
                  <link.icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </motion.a>
              ))}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} PromptPilot. Powered by AI.
            </p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
};

export default PromptEnhancer;
