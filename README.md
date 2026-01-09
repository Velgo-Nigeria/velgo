# Velgo Nigeria

The trusted app bridging the gap between verified local Workers and Clients in Nigeria.

## 🚀 Deployment Guide

### Step 1: Database Setup
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** > **New Query**.
3. Copy the entire content of **`fix_database.sql`** from this project.
4. Paste and click **Run**.

### Step 2: Environment Variables
The `.env` file has been created with your keys. 
- **Local:** No action needed, `npm run dev` will pick it up.
- **Vercel:** Add these to your Project Settings > Environment Variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_PAYSTACK_PUBLIC_KEY`
  - `GEMINI_API_KEY`

## ✨ Features
- **0% Commission Model**
- **Verification System**
- **AI Integration (Gemini)**
- **PWA Ready**

## 🛠️ Run Locally
```bash
npm install
npm run dev
```
