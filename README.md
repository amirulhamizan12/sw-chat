# SuperWizard AI Chat

A modern AI chat interface built with Next.js and OpenRouter API, supporting multiple AI models with streaming and text response types.

## Features

- 🤖 Multiple AI models via OpenRouter API
- ⚡ Real-time streaming responses
- 🎨 Modern dark theme UI
- 📱 Responsive design
- 💰 Cost tracking and model pricing
- 🔄 Model switching
- 📋 Copy responses
- 🧹 Clear chat history

## Getting Started

### Prerequisites

- Node.js 18+ 
- OpenRouter API key

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sw-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```bash
   NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```
   
   Get your API key from [OpenRouter](https://openrouter.ai/keys)

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Select a Model**: Choose from available AI models in the dropdown
2. **Choose Response Type**: Select between streaming or text responses
3. **Start Chatting**: Type your message and press Enter or click Send
4. **Copy Responses**: Click the copy button to copy AI responses
5. **Clear Chat**: Use the clear button to start a new conversation

## Supported Models

The app supports all models available through OpenRouter, including:
- OpenAI GPT models (GPT-4o, GPT-4o Mini, etc.)
- Google Gemini models
- Anthropic Claude models
- And many more!

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **API**: OpenRouter
- **Language**: TypeScript

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# sw-chat
