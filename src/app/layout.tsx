import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://promptpilot7.vercel.app"),
  title: {
    default: "PromptPilot - Best AI Prompt Engineering & Enhancement Tool",
    template: "%s | PromptPilot - AI Prompt Engineering",
  },
  description:
    "PromptPilot: Your AI prompt engineering assistant. Transform simple instructions into powerful, detailed prompts. Support for English & Hindi, powered by Google's Gemini AI. Try free now!",
  keywords: [
    "PromptPilot",
    "AI prompt generator",
    "prompt engineering tool",
    "AI writing assistant",
    "Gemini AI prompts",
    "best prompt generator",
    "Hindi to English prompts",
    "free prompt engineering",
    "AI prompt optimization",
    "prompt enhancement tool",
    "multilingual AI prompts",
    "professional prompt writer",
  ],
  verification: {
    google: "your-google-verification-code", // Add your Google Search Console verification code
  },
  authors: [{ name: "Ansh Karan", url: "https://github.com/Anshkaran7" }],
  creator: "Ansh Karan",
  publisher: "PromptPilot",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://promptpilot7.vercel.app/",
    title: "PromptPilot - AI Prompt Engineering & Enhancement Tool",
    description:
      "Transform simple instructions into powerful, detailed AI prompts with PromptPilot. Supports English & Hindi with Gemini AI technology.",
    siteName: "PromptPilot",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PromptPilot - AI Prompt Enhancement Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PromptPilot - AI Prompt Engineering & Enhancement Tool",
    description:
      "Transform simple instructions into powerful, detailed AI prompts with PromptPilot. Supports English & Hindi with Gemini AI technology.",
    images: ["/og-image.png"],
    creator: "@anshkaran7",
    site: "@promptpilot",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://promptpilot7.vercel.app",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Add structured data for better SEO */}
        <Script
          id="schema-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "PromptPilot",
              applicationCategory: "UtilityApplication",
              operatingSystem: "Any",
              description:
                "An intelligent AI prompt engineering companion that transforms simple instructions into powerful, detailed prompts.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Person",
                name: "Ansh Karan",
                url: "https://github.com/Anshkaran7",
              },
              inLanguage: ["en", "hi"],
              url: "https://promptpilot7.vercel.app",
              image: "https://promptpilot7.vercel.app/og-image.png",
              screenshot: "https://promptpilot7.vercel.app/screenshot.png",
              featureList: [
                "Multilingual Support (English & Hindi)",
                "AI-Powered Prompt Enhancement",
                "Real-time Processing",
                "Google Authentication",
                "Dark/Light Theme",
              ],
            }),
          }}
        />

        {/* Social Media Preview */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://promptpilot7.vercel.app/" />
        <meta
          property="og:title"
          content="PromptPilot - Best AI Prompt Engineering Tool"
        />
        <meta
          property="og:description"
          content="Transform your simple ideas into powerful, detailed AI prompts with PromptPilot. Free tool with English & Hindi support."
        />
        <meta
          property="og:image"
          content="https://promptpilot7.vercel.app/og-image.png"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@promptpilot" />
        <meta name="twitter:creator" content="@anshkaran7" />

        {/* Additional SEO Meta Tags */}
        <link rel="canonical" href="https://promptpilot7.vercel.app" />
        <meta name="author" content="Ansh Karan" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={montserrat.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
