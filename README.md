# VOLDMORT - Ephemeral Chat Application

A secure, self-destructing chat application with 6-digit join codes. Messages and rooms auto-expire after 10 minutes.

## Features

- ✅ **Ephemeral Rooms** - Auto-destruct after 10 minutes of creation
- ✅ **6-Digit Join Codes** - Easy sharing via numeric codes instead of long URLs
- ✅ **Real-time Messaging** - Powered by Upstash Realtime
- ✅ **Anonymous Users** - Auto-generated usernames
- ✅ **Responsive Design** - Mobile-friendly UI with dark theme
- ✅ **In-Memory Fallback** - Works offline without Upstash Redis

## Quick Start

### Prerequisites

- Node.js 20.17+ or 22.9+ (not 22.7.0)
- npm 11+

### Installation

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at `http://localhost:3000`

## Using the App

### Create a Room
1. Go to `http://localhost:3000`
2. Click **CREATE SECURE CHANNEL**
3. You'll be redirected to a new room
4. Share the 6-digit code displayed in the header with others

### Join via Code
1. Go to `http://localhost:3000`
2. Click **JOIN**
3. Enter the 6-digit code
4. Click **ACCESS CHANNEL**

### Send Messages
- Type a message in the input field
- Press Enter or click Send
- Messages are visible to all users in the room

### Destroy Room
- Click the **💣 Destroy** button in the header
- This immediately deletes the room and all messages

## Architecture

### Frontend
- **Next.js 16** with React 19
- **TanStack React Query** for data fetching
- **Upstash Realtime** for real-time messaging
- **Tailwind CSS** for styling

### Backend
- **Elysia** framework for API routes
- **Upstash Redis** for persistent storage (with in-memory fallback)
- **Zod** for schema validation

## Troubleshooting

### Redis Connection Errors
- If you see `ENOTFOUND` errors, the app automatically falls back to in-memory storage
- This is normal for development!
- To use real Redis, set env vars: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### Messages not appearing
- Ensure you're in the same room (check roomId in URL)
- Try refreshing the page
- Check browser DevTools Network tab for errors

## Project Structure

- `app/page.tsx` - Home page (create/join rooms)
- `app/room/[roomId]/page.tsx` - Chat room page
- `app/api/[[...slugs]]/route.ts` - API endpoints
- `lib/redis.ts` - Redis client with fallback to mock
- `lib/redis-mock.ts` - In-memory Redis implementation

## All Issues Fixed ✅

1. ✅ Resolved Upstash Redis connection errors with in-memory fallback
2. ✅ Fixed auth middleware cookie extraction
3. ✅ Fixed realtime schema timestamp field
4. ✅ Added 6-digit join code generation and validation
5. ✅ Improved message storage/retrieval (JSON serialization)
6. ✅ Fixed responsive UI for mobile/tablet/desktop
7. ✅ Added proper error handling throughout


This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# VOLDMORT
