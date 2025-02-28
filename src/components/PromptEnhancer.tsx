import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Import Supabase client

interface Prompt {
  id: string;
  input_prompt: string;
  output_response: string;
  created_at: string;
}

const PromptEnhancer = () => {
  const [inputPrompt, setInputPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) throw error;
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const storePrompt = async (input: string, output: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser(); // Get the current user
    if (!user) {
      alert("Please login to save prompts");
      return;
    }

    try {
      const { error } = await supabase.from("prompts").insert([
        {
          user_id: user.id,
          input_prompt: input,
          output_response: output,
        },
      ]);

      if (error) throw error;
      alert("Prompt saved successfully!");
    } catch (err) {
      console.error("Error saving prompt:", err);
      alert("Failed to save prompt.");
    }
  };

  const enhancePrompt = async (input: string) => {
    // Placeholder for the actual enhancement logic
    return `Enhanced: ${input}`;
  };

  const handleEnhance = async () => {
    if (!inputPrompt.trim()) {
      alert("Please enter a prompt to enhance");
      return;
    }

    setIsProcessing(true);

    try {
      const enhanced = await enhancePrompt(inputPrompt);
      setEnhancedPrompt(enhanced);

      // Store in Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await storePrompt(inputPrompt, enhanced);
    } catch (error) {
      console.error("Enhancement error:", error);
      alert("Failed to enhance prompt.");
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchUserPrompts = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("prompts")
      .select("id, input_prompt, output_response, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching prompts:", error);
      alert("Failed to load prompts.");
    }

    return data;
  };

  useEffect(() => {
    const loadPrompts = async () => {
      const data = await fetchUserPrompts();
      setPrompts(data || []);
    };

    loadPrompts();
  }, []);

  return (
    <div>
      <h2>Your Saved Prompts</h2>
      <ul>
        {prompts.map((p) => (
          <li key={p.id}>
            <strong>Prompt:</strong> {p.input_prompt} <br />
            <strong>Response:</strong> {p.output_response}
          </li>
        ))}
      </ul>
      <button onClick={handleLogin}>Login with Google</button>
      <button onClick={handleLogout}>Logout</button>
      {/* Add input and enhance button here */}
    </div>
  );
};

export default PromptEnhancer;
