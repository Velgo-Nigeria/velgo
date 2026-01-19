# Velgo: The Trusted Naija Gig Marketplace 🇳🇬

Velgo is a hyper-local, zero-commission platform designed to bridge the trust gap between verified Nigerian artisans (Workers) and Clients. Originally conceived in Edo State, Velgo now serves the entire Federal Republic of Nigeria.

## 🌟 Key Features

- **0% Commission**: Workers keep 100% of their earnings. No middleman fees.
- **Verification First**: Mandatory ID/NIN verification for a safer community.
- **AI-Powered Insights**: Real-time Nigerian market price insights using Google Gemini.
- **Direct & Post Hiring**: Choose between direct hiring via the market or posting a public job request.
- **PWA Ready**: Install Velgo on your home screen for a native app experience.
- **Safety Center**: 24/7 priority incident reporting and emergency contact protocols.

## 🛠️ Technical Stack

- **Frontend**: React (TypeScript), Tailwind CSS, Vite.
- **Backend**: Supabase (Auth, Postgres, Realtime, Storage).
- **AI**: Google Gemini API (gemini-3-flash-preview).
- **Payments**: Paystack Integration for subscriptions.
- **PWA**: Custom Service Worker for offline functionality and push notifications.

## 🚀 Getting Started

### 1. Database Setup
1. Create a project on [Supabase](https://supabase.com).
2. Go to the SQL Editor and run the content of `setup.sql`.

### 2. Environment Configuration
Create a `.env` file with the following keys:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_key
GEMINI_API_KEY=your_google_ai_key
```

### 3. Installation
```bash
npm install
npm run dev
```

## 📜 License
© 2025 Velgo Nigeria. All rights reserved. Built with trust for the local economy.