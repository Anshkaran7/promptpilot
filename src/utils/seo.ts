export const generateMetadata = (path: string) => {
  const baseUrl = "https://promptpilot7.vercel.app";
  const title = "PromptPilot - Best AI Prompt Engineering & Enhancement Tool";
  const description =
    "Transform simple instructions into powerful, detailed AI prompts with PromptPilot. Free multilingual support with Gemini AI technology.";

  return {
    title,
    description,
    canonical: `${baseUrl}${path}`,
    openGraph: {
      title,
      description,
      url: `${baseUrl}${path}`,
      type: "website",
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/og-image.png`],
    },
  };
};
