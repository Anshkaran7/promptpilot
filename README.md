# PromptCraft - AI Prompt Enhancement Tool

PromptCraft is a modern web application that helps users create more effective and detailed AI prompts. It transforms simple instructions into comprehensive, well-structured prompts that get better results from AI models.

![PromptCraft Screenshot](./public/screenshot.png)

## Features

- 🌐 **Multilingual Support**: Works with both English and Hindi prompts
- ✨ **Smart Enhancement**: Automatically adds structure and detail to your prompts
- ⚡ **Instant Results**: Get enhanced prompts in seconds
- 🌓 **Dark/Light Mode**: Comfortable viewing in any lighting condition
- 🔒 **Secure Authentication**: Google login integration
- 📋 **Easy Copying**: One-click copy of enhanced prompts

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Authentication**: Supabase Auth
- **AI Integration**: Google Gemini Pro
- **Theme**: next-themes for dark/light mode

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/Anshkaran7/promptpilot.git
cd promptcraft
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
   Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

4. Run the development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

1. Log in using your Google account
2. Enter your prompt in English or Hindi
3. Click "Enhance Prompt"
4. Get your enhanced, detailed prompt
5. Copy and use with your favorite AI model

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- AI powered by [Google Gemini](https://deepmind.google/technologies/gemini/)
- Authentication by [Supabase](https://supabase.com/)
