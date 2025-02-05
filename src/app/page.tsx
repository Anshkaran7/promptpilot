"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Sparkles, Globe, Zap, ArrowRight, LogIn } from "lucide-react";
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

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

// Update the User type to include more profile fields
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
  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [inputPrompt, setInputPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  // Update user state with proper type
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const enhancePrompt = async (text: string) => {
    // Translate Hindi commands to English
    let translatedText = text;
    const hindiToEnglish: { [key: string]: string } = {
      बनाओ: "create",
      लिखो: "write",
      समझाओ: "explain",
      "क्या है": "what is",
      "विधि बताएं": "explain how to make",
      "कैसे बनाएं": "how to make",
    };

    // Replace Hindi commands with English equivalents
    Object.entries(hindiToEnglish).forEach(([hindi, english]) => {
      if (text.toLowerCase().includes(hindi)) {
        translatedText = text.replace(new RegExp(hindi, "i"), english);
      }
    });

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `Please enhance the following prompt by adding detailed structure and requirements. Make it comprehensive and well-organized: "${translatedText}"`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error generating enhanced prompt:", error);
      return "Error enhancing prompt. Please try again.";
    }
  };

  const handleEnhance = async () => {
    if (!user) {
      alert("Please login to enhance prompts");
      return;
    }

    setIsProcessing(true);
    try {
      const enhanced = await enhancePrompt(inputPrompt);
      setEnhancedPrompt(enhanced);
    } catch (error) {
      console.error("Error:", error);
      setEnhancedPrompt("Error enhancing prompt. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(enhancedPrompt);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-white to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 px-4 sm:px-6 overflow-hidden">
        {/* Navigation Bar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 backdrop-blur-lg border-b border-gray-200/20 dark:border-gray-700/30">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                PromptPilot
              </span>
            </div>
            {/* Auth Button moved to nav */}
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md shadow-lg dark:bg-gray-800/50 dark:border dark:border-gray-700">
                    {user.user_metadata?.avatar_url && (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        className="w-8 h-8 rounded-full ring-2 ring-blue-500/50"
                      />
                    )}
                    <div className="hidden sm:block text-sm">
                      <p className="font-medium dark:text-gray-100">
                        {user.user_metadata?.full_name ||
                          user.user_metadata?.name}
                      </p>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="ghost"
                      size="sm"
                      className="ml-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    >
                      <LogIn className="w-4 h-4 rotate-180" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleLogin}
                  className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md shadow-lg hover:shadow-blue-500/20 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 dark:text-gray-100 text-sm transition-all duration-300"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login with Google</span>
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </nav>

        {/* Hero Section - Updated */}
        <div className="container mx-auto py-8 sm:py-12 mt-16">
          <div className="text-center mb-12 sm:mb-16 pt-8">
            <div className="relative inline-block mb-8">
              <h1 className="text-4xl sm:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 px-4 filter drop-shadow-lg">
                Your AI Prompt Co-Pilot
              </h1>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg opacity-20 blur-2xl -z-10"></div>
            </div>
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto px-4 leading-relaxed">
              Transform your simple ideas into powerful, detailed AI prompts
            </p>

            {/* Feature Cards - Horizontal Layout */}
            <div className="flex flex-wrap justify-center gap-6 mb-12 px-2">
              <Card className="flex items-center gap-4 p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-md bg-white/20 dark:bg-gray-800/30 dark:border-gray-700 rounded-2xl w-auto">
                <Globe className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-pulse" />
                <div className="text-left">
                  <h3 className="font-semibold dark:text-gray-100 text-base">
                    Multilingual
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    English & Hindi Support
                  </p>
                </div>
              </Card>

              <Card className="flex items-center gap-4 p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-md bg-white/20 dark:bg-gray-800/30 dark:border-gray-700 rounded-2xl w-auto">
                <Sparkles className="w-8 h-8 text-purple-500 dark:text-purple-400 animate-pulse" />
                <div className="text-left">
                  <h3 className="font-semibold dark:text-gray-100 text-base">
                    Smart Enhancement
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    AI-Powered Refinement
                  </p>
                </div>
              </Card>

              <Card className="flex items-center gap-4 p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-md bg-white/20 dark:bg-gray-800/30 dark:border-gray-700 rounded-2xl w-auto">
                <Zap className="w-8 h-8 text-yellow-500 dark:text-yellow-400 animate-pulse" />
                <div className="text-left">
                  <h3 className="font-semibold dark:text-gray-100 text-base">
                    Instant Results
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Quick & Efficient
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* Main Interface - Updated */}
          <Card className="max-w-5xl mx-auto p-8 shadow-2xl dark:bg-gray-800/30 dark:border-gray-700 backdrop-blur-md bg-white/20 rounded-2xl">
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
                  {!user && (
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      Login to start enhancing
                    </span>
                  )}
                </div>
                <Textarea
                  placeholder="Enter your prompt in English or Hindi..."
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  className="min-h-[160px] sm:min-h-[200px] resize-none dark:bg-gray-900/50 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 text-sm sm:text-base rounded-xl focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
                />

                <Button
                  onClick={handleEnhance}
                  disabled={!inputPrompt || isProcessing || !user}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-sm sm:text-base rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all duration-300"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <Spinner
                        size="sm"
                        className="border-white border-r-transparent"
                      />
                      Enhancing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Enhance Prompt <ArrowRight className="w-4 h-4" />
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
                  {isProcessing ? (
                    <div className="min-h-[160px] sm:min-h-[200px] flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border dark:border-gray-700 backdrop-blur-sm">
                      <Spinner
                        size="lg"
                        className="dark:border-gray-400 dark:border-r-transparent"
                      />
                    </div>
                  ) : (
                    <Textarea
                      value={enhancedPrompt}
                      readOnly
                      className="min-h-[160px] sm:min-h-[200px] resize-none bg-gray-50/50 dark:bg-gray-900/50 dark:border-gray-700 dark:text-gray-100 text-sm sm:text-base rounded-xl backdrop-blur-sm"
                      placeholder="Your enhanced prompt will appear here..."
                    />
                  )}
                  {enhancedPrompt && !isProcessing && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute top-2 right-2 rounded-lg dark:bg-gray-800/50 dark:border-gray-700 dark:hover:bg-gray-700/50 backdrop-blur-sm transition-all duration-300"
                          onClick={handleCopy}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy to clipboard</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Example Section - Updated */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-semibold mb-8 dark:text-gray-100">
              Quick Start Examples
            </h2>
            <div className="flex flex-wrap gap-4 justify-center max-w-3xl mx-auto">
              <Button
                variant="outline"
                onClick={() =>
                  setInputPrompt("write a story about a magical forest")
                }
                className="text-xs sm:text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50 rounded-xl backdrop-blur-sm hover:shadow-lg transition-all duration-300"
              >
                Story about magical forest
              </Button>
              <Button
                variant="outline"
                onClick={() => setInputPrompt("explain quantum computing")}
                className="text-xs sm:text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50 rounded-xl backdrop-blur-sm hover:shadow-lg transition-all duration-300"
              >
                Explain quantum computing
              </Button>
              <Button
                variant="outline"
                onClick={() => setInputPrompt("एक केक बनाने की विधि बताएं")}
                className="text-xs sm:text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50 rounded-xl backdrop-blur-sm hover:shadow-lg transition-all duration-300"
              >
                एक केक बनाने की विधि
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 py-8 border-t border-gray-200/20 dark:border-gray-700/30">
          <div className="container mx-auto text-center text-sm text-gray-600 dark:text-gray-400">
            <p>© 2024 PromptPilot. Powered by AI.</p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
};

export default PromptEnhancer;
