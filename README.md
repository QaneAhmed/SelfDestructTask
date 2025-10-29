# SelfDestructTask

Anonymous, time-limited tasks that self-destruct after they expire. Built with Next.js (App Router), TypeScript, Tailwind CSS, and deploy-ready for Vercel.

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root and add your OpenAI credentials:

   ```bash
   OPENAI_API_KEY=sk-...
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

The app lives at [http://localhost:3000](http://localhost:3000) during development.

## Feature Highlights

- AI-powered natural language capture that extracts task title, optional due time, and priority.
- Framer Motion “self-destruct” animations plus confetti bursts when the list hits zero.
- Auto-archiving with daily stats, time-since-added labels, and a daily AI summary toast.
- Local, privacy-first persistence via `localStorage`; expired tasks flow to an archive view.
