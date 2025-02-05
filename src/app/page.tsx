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
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 px-4 sm:px-6">
        {/* Auth Button */}
        <div className="absolute top-4 right-4 z-10">
          {user ? (
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-3 px-3 sm:px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
                {user.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full"
                  />
                )}
                <div className="hidden sm:block text-sm">
                  <p className="font-medium dark:text-gray-100 text-right">
                    {user.user_metadata?.full_name || user.user_metadata?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-300 text-xs sm:text-sm"
              >
                Logout
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleLogin}
              className="flex items-center gap-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 text-xs sm:text-sm"
            >
              <LogIn className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Login with Google</span>
              <span className="sm:hidden">Login</span>
            </Button>
          )}
        </div>

        {/* Hero Section */}
        <div className="container mx-auto py-8 sm:py-12">
          <div className="text-center mb-8 sm:mb-12 pt-16 sm:pt-12">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 px-4">
              AI Prompt Enhancer
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto px-4">
              Transform simple prompts into powerful, detailed instructions
            </p>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 px-2">
              <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow dark:bg-gray-800/50 dark:border-gray-700">
                <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 dark:text-blue-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="font-semibold mb-2 dark:text-gray-100 text-sm sm:text-base">
                  Multilingual Support
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                  Works with both English and Hindi prompts
                </p>
              </Card>

              <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow dark:bg-gray-800/50 dark:border-gray-700">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 dark:text-purple-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="font-semibold mb-2 dark:text-gray-100 text-sm sm:text-base">
                  Smart Enhancement
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                  Adds structure and detail to your prompts
                </p>
              </Card>

              <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow dark:bg-gray-800/50 dark:border-gray-700">
                <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 dark:text-yellow-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="font-semibold mb-2 dark:text-gray-100 text-sm sm:text-base">
                  Instant Results
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                  Get enhanced prompts in seconds
                </p>
              </Card>
            </div>
          </div>

          {/* Main Interface */}
          <Card className="max-w-4xl mx-auto p-4 sm:p-6 shadow-lg dark:bg-gray-800/50 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Input Section */}
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg font-semibold mb-2 dark:text-gray-100">
                  Your Prompt
                </h2>
                <Textarea
                  placeholder="Enter your prompt in English or Hindi..."
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  className="min-h-[120px] sm:min-h-[160px] resize-none dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 text-sm sm:text-base"
                />

                <Button
                  onClick={handleEnhance}
                  disabled={!inputPrompt || isProcessing || !user}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-sm sm:text-base"
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
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg font-semibold mb-2 dark:text-gray-100">
                  Enhanced Prompt
                </h2>
                <div className="relative">
                  {isProcessing ? (
                    <div className="min-h-[120px] sm:min-h-[160px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-md border dark:border-gray-700">
                      <Spinner
                        size="lg"
                        className="dark:border-gray-400 dark:border-r-transparent"
                      />
                    </div>
                  ) : (
                    <Textarea
                      value={enhancedPrompt}
                      readOnly
                      className="min-h-[120px] sm:min-h-[160px] resize-none bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 text-sm sm:text-base"
                      placeholder="Your enhanced prompt will appear here..."
                    />
                  )}
                  {enhancedPrompt && !isProcessing && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-2 dark:border-gray-700 dark:hover:bg-gray-700"
                      onClick={handleCopy}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Example Section */}
          <div className="mt-8 sm:mt-12 text-center px-2">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 dark:text-gray-100">
              Try these examples
            </h2>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() =>
                  setInputPrompt("write a story about a magical forest")
                }
                className="text-xs sm:text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Story about magical forest
              </Button>
              <Button
                variant="outline"
                onClick={() => setInputPrompt("explain quantum computing")}
                className="text-xs sm:text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Explain quantum computing
              </Button>
              <Button
                variant="outline"
                onClick={() => setInputPrompt("एक केक बनाने की विधि बताएं")}
                className="text-xs sm:text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                एक केक बनाने की विधि
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PromptEnhancer;
