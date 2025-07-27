"use client";

import React, { useState, useEffect, useRef } from "react";
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
  History,
  Github,
  Twitter,
  ExternalLink,
  AlertCircle,
  X,
  Clock,
  Trash2,
  Sparkle,
  Check,
  BookmarkPlus,
  Lightbulb,
  Coffee,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import {
  GoogleGenerativeAI,
  GenerateContentResult,
} from "@google/generative-ai";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider"; // Assuming you have a Slider component
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const GEMINI_MODEL = "gemini-1.5-flash";
const API_TIMEOUT = 15000; // 15 seconds timeout

// Initialize Supabase client once
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type User = {
  id: string;
  email?: string;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
    name?: string;
  };
} | null;

type Prompt = {
  id: string;
  input_prompt: string;
  output_response: string;
  created_at: string;
};

const PromptEnhancer = () => {
  const [inputPrompt, setInputPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<User>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [complexity, setComplexity] = useState<number[]>([1]); // Default to intermediate (1), range: 0-2
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  // Rate limiting implementation
  const lastRequestTime = useRef<number | null>(null);
  const minRequestInterval = 30000; // 30 seconds between requests (reduced from 60s for gemini-2.0-flash)
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(session?.user ?? null);
        // Don't fetch prompts here
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
      // Don't fetch prompts here
    });
    return () => subscription.unsubscribe();
  }, []);

  // Add a new useEffect to fetch prompts only when history sheet is opened
  useEffect(() => {
    if (isHistoryOpen && user) {
      fetchUserPrompts(user.id);
    }
  }, [isHistoryOpen, user]);

  const fetchUserPrompts = async (userId: string) => {
    try {
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from("prompts")
        .select("id, input_prompt, output_response, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPrompts(data || []);
    } catch (err) {
      console.error("Error fetching prompts:", err);
      setError("Failed to load prompts");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogin = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
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
      console.log("Attempting to log out...");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log("Logout successful");
      setUser(null);
      setPrompts([]);
    } catch (err) {
      console.error("Logout error:", err);
      setError("Failed to logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const enhancePrompt = async (text: string, complexityLevel: number) => {
    // Expanded Hindi to English translations
    const hindiToEnglish: { [key: string]: string } = {
      बनाओ: "create",
      लिखो: "write",
      समझाओ: "explain",
      "क्या है": "what is",
      "विधि बताएं": "explain how to make",
      "कैसे बनाएं": "how to make",
      "मुझे बताओ": "tell me about",
      "उदाहरण दो": "give examples of",
      "तुलना करें": "compare",
      "विश्लेषण करें": "analyze",
      "सुझाव दें": "suggest",
      "समीक्षा करें": "review",
    };

    // Detect prompt type for better context handling
    const promptTypes = [
      { pattern: /(write|create|generate|draft|compose)/i, type: "creative" },
      {
        pattern: /(explain|what is|how to|tell me about|describe)/i,
        type: "explanatory",
      },
      {
        pattern: /(compare|versus|vs|difference|similarities)/i,
        type: "comparative",
      },
      {
        pattern: /(analyze|review|critique|evaluate|assess)/i,
        type: "analytical",
      },
      {
        pattern: /(list|steps|ways to|methods|techniques)/i,
        type: "structured",
      },
    ];

    // Translate Hindi phrases to English
    let translatedText = text;
    Object.entries(hindiToEnglish).forEach(([hindi, english]) => {
      if (text.toLowerCase().includes(hindi.toLowerCase())) {
        translatedText = translatedText.replace(
          new RegExp(hindi, "gi"),
          english
        );
      }
    });

    // Detect prompt type
    let detectedType = "general";
    for (const { pattern, type } of promptTypes) {
      if (pattern.test(translatedText)) {
        detectedType = type;
        break;
      }
    }

    try {
      console.log("Enhancing prompt:", text);
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("API request timed out")),
          API_TIMEOUT
        );
      });

      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      // Define complexity levels with more detailed guidance
      const complexityGuides = [
        {
          level: "basic",
          description: "concise with clear instructions",
          wordLimit: 150,
          structure: "Simple and direct with minimal elaboration",
        },
        {
          level: "intermediate",
          description: "detailed with specific parameters and context",
          wordLimit: 200,
          structure: "Well-structured with clear sections and details",
        },
        {
          level: "advanced",
          description:
            "comprehensive with extensive context, examples, and nuanced instructions",
          wordLimit: 300,
          structure:
            "Highly detailed with specific guidance, constraints, and creative elements",
        },
      ];

      // Type-specific enhancements
      const typeGuidance = {
        creative:
          "Include specific style, tone, format, and audience guidance.",
        explanatory:
          "Structure with clear progression from basic to advanced concepts, include examples.",
        comparative:
          "Specify dimensions for comparison and desired outcome format.",
        analytical:
          "Include criteria for analysis and expected depth of critique.",
        structured:
          "Specify numbered steps, prioritization, and implementation details.",
        general: "Provide clear context, goals, and expected output format.",
      };

      const selectedComplexity = complexityGuides[complexityLevel];

      // Create enhanced system prompt
      const prompt = `Transform this user prompt into a ${
        selectedComplexity.level
      } AI prompt: "${translatedText}"

Prompt type detected: ${detectedType}
${typeGuidance[detectedType as keyof typeof typeGuidance]}

YOUR TASK:
1. Make the prompt clear, specific, and well-structured
2. Add relevant context and background information
3. Specify desired tone, style, and format where appropriate
4. Include any necessary constraints or requirements
5. Keep it under ${selectedComplexity.wordLimit} words
6. Ensure the prompt follows a ${selectedComplexity.structure}

IMPORTANT: Maintain the original intent but make it more effective for AI responses.`;

      const generationConfig = {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 512,
      };

      try {
        // Race between API call and timeout
        const result = (await Promise.race([
          model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
          }),
          timeoutPromise,
        ])) as GenerateContentResult;
        console.log("Enhancement result:", result);
        return result.response.text();
      } catch (err: unknown) {
        // Check API errors
        const error = err as Error;
        console.error("API Error details:", error.message);

        // Check for API key expired error
        if (
          error.message &&
          (error.message.includes("API key expired") ||
            error.message.includes("API_KEY_INVALID"))
        ) {
          console.error("API key expired error:", error);
          throw new Error(
            "The API key has expired. Please contact the developer to update the API key."
          );
        }

        // Check for quota error
        if (
          error.message &&
          error.message.includes("429") &&
          error.message.includes("quota")
        ) {
          console.error("Quota error:", error);
          throw new Error(
            "Google Gemini API quota exceeded. Please wait before trying again, or try a shorter prompt."
          );
        }

        if (error.message === "API request timed out") {
          throw new Error(
            "Request took too long. Please try again with a simpler prompt."
          );
        }

        // Handle other potential API errors with more descriptive messages
        if (error.message.includes("400")) {
          throw new Error(
            "The API encountered an error with your request. Try simplifying your prompt."
          );
        }

        if (error.message.includes("401") || error.message.includes("403")) {
          throw new Error(
            "Authentication error with the AI service. Please try again later or contact support."
          );
        }

        if (
          error.message.includes("500") ||
          error.message.includes("502") ||
          error.message.includes("503")
        ) {
          throw new Error(
            "The AI service is currently experiencing issues. Please try again later."
          );
        }

        throw error;
      }
    } catch (err: unknown) {
      console.error("Enhancement error:", err);
      if (err instanceof Error) {
        throw err;
      }
      throw new Error("Failed to enhance prompt");
    }
  };

  const storePrompt = async (input: string, output: string): Promise<void> => {
    if (!user) {
      setError("Please login to save prompts");
      return Promise.reject("No user");
    }

    try {
      const { data, error } = await supabase
        .from("prompts")
        .insert([
          { user_id: user.id, input_prompt: input, output_response: output },
        ])
        .select();

      if (error) throw error;

      // Update prompts state directly instead of fetching all prompts again
      if (data && data.length > 0) {
        setPrompts((prevPrompts) => [data[0], ...prevPrompts]);
      }
      return Promise.resolve();
    } catch (err) {
      console.error("Error saving prompt:", err);
      setError("Failed to save prompt");
      return Promise.reject(err);
    }
  };

  const deletePrompt = async (id: string) => {
    if (!user) return;

    try {
      setIsDeleting(id);
      const { error } = await supabase
        .from("prompts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      setPrompts(prompts.filter((prompt) => prompt.id !== id));
    } catch (err) {
      console.error("Error deleting prompt:", err);
      setError("Failed to delete prompt");
    } finally {
      setIsDeleting(null);
    }
  };

  // Update cooldown timer
  useEffect(() => {
    if (lastRequestTime.current) {
      const updateCooldown = () => {
        const now = Date.now();
        const elapsed = now - lastRequestTime.current!;
        if (elapsed < minRequestInterval) {
          const remaining = Math.ceil((minRequestInterval - elapsed) / 1000);
          setCooldownRemaining(remaining);
          cooldownTimerRef.current = setTimeout(updateCooldown, 1000);
        } else {
          setCooldownRemaining(0);
          if (cooldownTimerRef.current) {
            clearTimeout(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
        }
      };

      updateCooldown();
      return () => {
        if (cooldownTimerRef.current) {
          clearTimeout(cooldownTimerRef.current);
        }
      };
    }
  }, [lastRequestTime.current, minRequestInterval]);

  const handleEnhance = async () => {
    if (!user) {
      setError("Please login to enhance prompts");
      return;
    }

    if (!inputPrompt.trim()) {
      setError("Please enter a prompt to enhance");
      return;
    }

    // Rate limiting check
    const now = Date.now();
    if (
      lastRequestTime.current &&
      now - lastRequestTime.current < minRequestInterval
    ) {
      const remainingTime = Math.ceil(
        (minRequestInterval - (now - lastRequestTime.current)) / 1000
      );
      setError(
        `Please wait ${remainingTime} seconds before making another request to avoid API limits`
      );
      setIsQuotaExceeded(true);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setLoadingProgress(0);
    setIsQuotaExceeded(false);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });

      // Update loading messages
      if (loadingProgress < 30) {
        setLoadingMessage("Analyzing your prompt...");
      } else if (loadingProgress < 60) {
        setLoadingMessage("Enhancing content...");
      } else {
        setLoadingMessage("Finalizing your enhanced prompt...");
      }
    }, 800);

    try {
      // Record the request time
      lastRequestTime.current = Date.now();

      const enhanced = await enhancePrompt(inputPrompt, complexity[0]);
      setEnhancedPrompt(enhanced);
      // Don't automatically store the prompt
      // await storePrompt(inputPrompt, enhanced);
      setLoadingProgress(100);
      setLoadingMessage("Complete!");
    } catch (error: unknown) {
      console.error("Enhancement error:", error);
      if (error instanceof Error) {
        // Check for specific error types
        if (
          error.message.includes("API key expired") ||
          error.message.includes("API_KEY_INVALID")
        ) {
          setError(
            "The API key has expired. The developer needs to update the API key. Try again later."
          );
        } else if (error.message.includes("quota exceeded")) {
          setIsQuotaExceeded(true);
          setError(
            "Google Gemini API quota exceeded. Please wait before trying again, or try a shorter prompt."
          );
        } else if (error.message.includes("Authentication error")) {
          setError(
            "Authentication error with the AI service. Please try again later or contact support."
          );
        } else {
          setError(
            error.message || "Failed to enhance prompt. Please try again."
          );
        }
      } else {
        setError("Failed to enhance prompt. Please try again.");
      }
      setLoadingProgress(0);
    } finally {
      clearInterval(progressInterval);
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

  const loadPrompt = (input: string, output: string) => {
    setInputPrompt(input);
    setEnhancedPrompt(output);
    setIsHistoryOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const examples = [
    {
      text: "write a story about a magical forest",
      label: "Story about magical forest",
    },
    { text: "explain quantum computing", label: "Explain quantum computing" },
    { text: "एक केक बनाने की विधि बताएं", label: "एक केक बनाने की विधि" },
  ];

  const truncateText = (text: string, maxLength = 60) => {
    if (!text) return "";
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  function handleSave(): void {
    if (!enhancedPrompt || !inputPrompt) {
      setError("No prompt to save");
      return;
    }

    storePrompt(inputPrompt, enhancedPrompt).then(() => {
      // Show success message
      setError(null);
      const originalMessage = "Prompt saved successfully!";
      setLoadingMessage(originalMessage);

      // Create a temporary success message
      const tempElement = document.createElement("div");
      tempElement.className =
        "fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg";
      tempElement.textContent = "Prompt saved!";
      document.body.appendChild(tempElement);

      // Remove after 2 seconds
      setTimeout(() => {
        document.body.removeChild(tempElement);
      }, 2000);
    });
  }

  // Memoize expensive components to prevent re-renders
  const MemoizedBackgroundElements = React.memo(() => (
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.4 }}
        className="absolute top-1/2 right-1/4 w-64 h-64 bg-pink-400/10 dark:bg-pink-500/10 rounded-full blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-400/10 dark:bg-indigo-500/10 rounded-full blur-3xl"
      />
    </div>
  ));

  // Add display name to the memoized component
  MemoizedBackgroundElements.displayName = "MemoizedBackgroundElements";

  // Determine if button should be disabled due to cooldown
  const isButtonDisabled =
    !inputPrompt || isProcessing || !user || cooldownRemaining > 0;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F0F] px-2 sm:px-4 md:px-6 overflow-hidden relative">
        {/* Background Elements - Memoized to prevent re-renders */}
        <MemoizedBackgroundElements />

        {/* Marquee Banner */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white py-2 overflow-hidden">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: "-100%" }}
            transition={{
              duration: 40,
              repeat: Infinity,
              ease: "linear",
            }}
            className="flex items-center gap-4 whitespace-nowrap"
          >
            <span className="text-sm font-medium">🚀</span>
            <span className="text-sm font-medium">
              I made a new tool! Check it out:
            </span>
            <a
              href="https://git-aura.karandev.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold underline hover:no-underline transition-all duration-200"
            >
              git-aura.karandev.in
            </a>
            <span className="text-sm font-medium">
              ✨ Flex your GitHub aura banner! ✨
            </span>
            <span className="text-sm font-medium">🚀</span>
            <span className="text-sm font-medium">
              I made a new tool! Check it out:
            </span>
            <a
              href="https://git-aura.karandev.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold underline hover:no-underline transition-all duration-200"
            >
              git-aura.karandev.in
            </a>
            <span className="text-sm font-medium">
              ✨ Flex your GitHub aura! ✨
            </span>
            <span className="text-sm font-medium">🚀</span>
            <span className="text-sm font-medium">
              I made a new tool! Check it out:
            </span>
            <a
              href="https://git-aura.karandev.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold underline hover:no-underline transition-all duration-200"
            >
              git-aura.karandev.in
            </a>
            <span className="text-sm font-medium">
              ✨ Flex your GitHub aura! ✨
            </span>

            <span className="text-sm font-medium">🚀</span>
            <span className="text-sm font-medium">
              I made a new tool! Check it out:
            </span>
            <a
              href="https://git-aura.karandev.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold underline hover:no-underline transition-all duration-200"
            >
              git-aura.karandev.in
            </a>
            <span className="text-sm font-medium">
              ✨ Flex your GitHub aura! ✨
            </span>
            <span className="text-sm font-medium">🚀</span>
            <span className="text-sm font-medium">
              I made a new tool! Check it out:
            </span>
            <a
              href="https://git-aura.karandev.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold underline hover:no-underline transition-all duration-200"
            >
              git-aura.karandev.in
            </a>
            <span className="text-sm font-medium">
              ✨ Flex your GitHub aura banner! ✨
            </span>
          </motion.div>
        </div>

        {/* Navigation */}
        <header className="fixed top-8 left-0 right-0 z-50 bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
          <nav className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
            <div className="flex justify-between items-center">
              <motion.div
                className="flex items-center gap-1 sm:gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Image
                  src={"/icon.png"}
                  width={1000}
                  height={1000}
                  className="w-4 h-4 sm:w-8 sm:h-8 object-contain"
                  alt="PromptPilot Logo"
                />
                {/* <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" /> */}
                <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  PromptPilot
                </span>
              </motion.div>
              <motion.div
                className="flex items-center gap-2 sm:gap-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                {user && (
                  <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 bg-white/10 dark:bg-gray-800/20 backdrop-blur-md border border-gray-200/30 dark:border-gray-700/30 rounded-full"
                      >
                        <History className="w-4 h-4" />
                        <span className="hidden sm:inline">History</span>
                        {prompts.length > 0 && (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                            {prompts.length}
                          </span>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-md md:max-w-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg">
                      <SheetHeader className="border-b pb-4 mb-4">
                        <SheetTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span>Your Prompt History</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => user && fetchUserPrompts(user.id)}
                            disabled={isRefreshing}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            {isRefreshing ? (
                              <Spinner className="w-4 h-4 mr-1" />
                            ) : (
                              <ArrowRight className="w-4 h-4 rotate-180 mr-1" />
                            )}
                            Refresh
                          </Button>
                        </SheetTitle>
                      </SheetHeader>
                      {prompts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                          <Clock className="w-12 h-12 mb-4 opacity-40" />
                          <p>No prompts in your history yet</p>
                          <p className="text-sm mt-2">
                            Enhanced prompts will appear here
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-10rem)] pr-2">
                          {prompts.map((prompt) => (
                            <motion.div
                              key={prompt.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0 }}
                              className="relative group"
                            >
                              <Card className="p-4 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-950/20">
                                <div className="mb-2 flex justify-between items-start">
                                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                    <Clock className="w-3 h-3 mr-1" />
                                    <span>{formatDate(prompt.created_at)}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() =>
                                        loadPrompt(
                                          prompt.input_prompt,
                                          prompt.output_response
                                        )
                                      }
                                    >
                                      <ArrowRight className="h-3 w-3" />
                                      <span className="sr-only">Load</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => deletePrompt(prompt.id)}
                                      disabled={isDeleting === prompt.id}
                                    >
                                      {isDeleting === prompt.id ? (
                                        <Spinner className="h-3 w-3" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  </div>
                                </div>
                                <div className="mb-2">
                                  <h4 className="text-sm font-medium">
                                    Original:
                                  </h4>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {truncateText(prompt.input_prompt)}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium">
                                    Enhanced:
                                  </h4>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {truncateText(prompt.output_response, 100)}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full mt-2 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() =>
                                    loadPrompt(
                                      prompt.input_prompt,
                                      prompt.output_response
                                    )
                                  }
                                >
                                  Load this prompt
                                </Button>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </SheetContent>
                  </Sheet>
                )}
                {user ? (
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-slate-700">
                      {user.user_metadata?.avatar_url && (
                        <img
                          src={
                            user.user_metadata.avatar_url || "/placeholder.svg"
                          }
                          alt="Profile"
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full ring-2 ring-blue-500/50"
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
                    className="flex items-center gap-1 sm:gap-2 rounded-full text-sm sm:text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-emerald-500/20 transition-all duration-300"
                  >
                    <LogIn className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Login with Google</span>
                    <span className="sm:hidden">Login</span>
                  </Button>
                )}
                <ThemeToggle />
                <motion.a
                  href="https://github.com/Anshkaran7/promptpilot"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 dark:bg-[#1A1A1A] dark:hover:bg-[#2A2A2A] text-white text-sm font-medium shadow-lg hover:shadow-slate-500/25 transition-all duration-300"
                >
                  <Github className="w-4 h-4" />
                  <span className="hidden sm:inline">Star on GitHub</span>
                  <span className="sm:hidden">Star</span>
                </motion.a>
              </motion.div>
            </div>
          </nav>
        </header>

        <main className="container mx-auto py-4 sm:py-6 mt-24">
          {/* Hero Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-6 sm:mb-8 pt-2 sm:pt-4"
          >
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              Your AI Prompt Co-Pilot
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-4">
              Transform your simple ideas into powerful, detailed AI prompts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto px-4">
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
                  icon: History,
                  title: "Prompt History",
                  description: "Save & Reuse Prompts",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{
                    scale: 1.03,
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Card className="flex flex-col items-center gap-3 p-4 transition-all duration-300 bg-white dark:bg-[#1A1A1A] border-slate-200 dark:border-slate-800 rounded-xl h-full hover:shadow-lg">
                    <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
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
                <Alert
                  variant={isQuotaExceeded ? "default" : "destructive"}
                  className="flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                  {isQuotaExceeded && (
                    <div className="ml-4 text-xs text-gray-500 dark:text-gray-400">
                      <p>
                        Try again in about a minute or reduce your prompt
                        complexity.
                      </p>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-6 w-6"
                    onClick={() => {
                      setError(null);
                      setIsQuotaExceeded(false);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Interface */}
          <motion.section
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-5xl mx-auto px-4 py-4 sm:py-6"
          >
            <Card className="p-4 sm:p-6 md:p-7 shadow-xl bg-white dark:bg-[#1A1A1A] border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Input Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <div className="inline-block w-2 h-6 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                      Your Prompt
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-normal ml-1">
                        (English or Hindi)
                      </span>
                    </h2>
                    {user && prompts.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-sm transition-all duration-200"
                        onClick={() => setIsHistoryOpen(true)}
                      >
                        <History className="w-3.5 h-3.5 mr-1.5" />
                        <span>View History</span>
                      </Button>
                    )}
                  </div>
                  <Textarea
                    placeholder="Enter your prompt in English or Hindi..."
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    className="min-h-[140px] sm:min-h-[160px] resize-none bg-slate-50 dark:bg-[#0F0F0F] border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  {/* Complexity Controls */}
                  <div className="space-y-2 bg-slate-100 dark:bg-[#1A1A1A] p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-emerald-500" />
                        Prompt Complexity
                      </label>
                      <Badge
                        variant="outline"
                        className={`
              px-2 py-0.5 text-xs font-medium rounded-full 
              ${
                complexity[0] === 0
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : complexity[0] === 1
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"
              }`}
                      >
                        {complexity[0] === 0
                          ? "Basic"
                          : complexity[0] === 1
                          ? "Intermediate"
                          : "Advanced"}
                      </Badge>
                    </div>
                    <Slider
                      value={complexity}
                      onValueChange={setComplexity}
                      max={2}
                      step={1}
                      className="w-full"
                      disabled={!user || isProcessing}
                    />
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="text-xs">Basic</span>
                      <span className="text-xs">Intermediate</span>
                      <span className="text-xs">Advanced</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleEnhance}
                    disabled={isButtonDisabled}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-4 shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <motion.span
                        className="flex items-center gap-2"
                        initial={{ opacity: 0.8 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.5,
                          repeatType: "reverse",
                        }}
                      >
                        <Spinner className="w-5 h-5" />
                        Enhancing your prompt...
                      </motion.span>
                    ) : cooldownRemaining > 0 ? (
                      <span className="flex items-center gap-2 text-base font-medium">
                        <Clock className="w-5 h-5 mr-1" />
                        Cooldown: {cooldownRemaining}s
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-base font-medium">
                        <Sparkles className="w-5 h-5 mr-1" />
                        Enhance Prompt
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </Button>
                  {!user && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-xs text-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg border border-amber-200 dark:border-amber-800"
                    >
                      <AlertCircle className="inline-block w-3 h-3 mr-1 mb-0.5" />
                      Please login to enhance prompts and access all features
                    </motion.p>
                  )}
                </div>

                {/* Output Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <div className="inline-block w-2 h-6 bg-amber-500 rounded-full mr-2"></div>
                    Enhanced Prompt
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-normal ml-1">
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
                          className="min-h-[160px] sm:min-h-[200px] flex flex-col items-center justify-center bg-slate-100 dark:bg-[#1A1A1A] rounded-xl border border-slate-200 dark:border-slate-700 gap-3"
                        >
                          {/* Improved loading indicator with progress */}
                          <div className="w-full max-w-xs flex flex-col items-center">
                            <div className="relative w-16 h-16 mb-3">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  repeat: Infinity,
                                  duration: 1.5,
                                  ease: "linear",
                                }}
                                className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900/30 rounded-full"
                              />
                              <motion.div
                                animate={{ rotate: -360 }}
                                transition={{
                                  repeat: Infinity,
                                  duration: 2,
                                  ease: "linear",
                                }}
                                style={{
                                  borderTopColor: "rgb(59, 130, 246)",
                                  borderRightColor: "transparent",
                                  borderBottomColor: "transparent",
                                  borderLeftColor: "transparent",
                                }}
                                className="absolute inset-0 border-4 rounded-full"
                              />
                              <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                                {loadingProgress}%
                              </div>
                            </div>

                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
                              <motion.div
                                className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${loadingProgress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300 text-center">
                              {loadingMessage}
                            </p>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="content"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="relative"
                        >
                          <div className="relative group">
                            <Textarea
                              value={enhancedPrompt}
                              readOnly
                              className="min-h-[160px] sm:min-h-[200px] resize-none bg-slate-50 dark:bg-[#0F0F0F] border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm rounded-xl focus:ring-2 focus:ring-amber-500/50"
                              placeholder="Your enhanced prompt will appear here..."
                            />
                            {enhancedPrompt && (
                              <div className="absolute top-3 right-3 flex gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={handleCopy}
                                      className="rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/40 border-slate-200 dark:border-slate-700 shadow-sm"
                                    >
                                      {copied ? (
                                        <motion.div
                                          initial={{ scale: 0.8 }}
                                          animate={{ scale: 1 }}
                                          className="text-green-500"
                                        >
                                          <Check className="h-4 w-4" />
                                        </motion.div>
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-black/80 text-white py-1.5 px-3 text-xs rounded-lg">
                                    {copied ? "Copied!" : "Copy to clipboard"}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            )}
                          </div>

                          {enhancedPrompt && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="mt-4 flex justify-between items-center"
                            >
                              <div className="flex items-center">
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                >
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  AI Enhanced
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                onClick={handleSave}
                                disabled={!enhancedPrompt}
                              >
                                <BookmarkPlus className="w-4 h-4 mr-1.5" />
                                Save
                              </Button>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {enhancedPrompt && !isProcessing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800"
                    >
                      <h3 className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center mb-1">
                        <Lightbulb className="w-3 h-3 mr-1 text-amber-500" />
                        Prompt Enhancement Tips
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Try adjusting the complexity level to generate different
                        variations. Advanced prompts may include more technical
                        details and creative elements.
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </Card>
          </motion.section>
        </main>

        {/* Footer */}
        <footer className=" py-8 sm:py-10 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F0F0F]">
          <div className="container mx-auto text-center space-y-6 px-4">
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8">
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
                  className="flex items-center gap-2 text-slate-600 hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors bg-white/10 dark:bg-[#1A1A1A]/10 px-4 py-2 rounded-full"
                >
                  <link.icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </motion.a>
              ))}
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-2">
                {/* <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" /> */}
                <Image
                  src={"/icon.png"}
                  width={1000}
                  height={1000}
                  className="w-4 h-4 sm:w-8 sm:h-8 object-contain"
                  alt="PromptPilot Logo"
                />
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  PromptPilot
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                © {new Date().getFullYear()} PromptPilot. Powered by AI.
              </p>

              <a
                href="https://karandev.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
              >
                Developer and Designed by Karan
              </a>
            </div>
          </div>
        </footer>

        {/* Fixed Buy Me a Coffee Button - Bottom Right Corner */}
        <motion.a
          href="https://coff.ee/anshtsxr"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 cursor-pointer"
        >
          <Image
            src="/buymecoffee.png"
            alt="Buy me a coffee"
            width={200}
            height={60}
            className="rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
          />
        </motion.a>
      </div>
    </TooltipProvider>
  );
};

export default PromptEnhancer;
