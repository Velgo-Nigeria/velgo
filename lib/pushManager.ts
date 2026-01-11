
import { supabase } from './supabaseClient';

// Helper to safely get VAPID Key
const getVapidKey = () => {
    // 1. Check import.meta.env (Standard Vite) with safe check
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv.VITE_VAPID_PUBLIC_KEY) {
        return metaEnv.VITE_VAPID_PUBLIC_KEY;
    }
    
    // 2. Check process.env (Compat / Define replacement from vite.config.ts)
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env && process.env.VITE_VAPID_PUBLIC_KEY) {
            // @ts-ignore
            return process.env.VITE_VAPID_PUBLIC_KEY;
        }
    } catch(e) {}

    // 3. Fallback to hardcoded key if env vars are missing
    return 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBLYFpaaNYTupyyV33GQ';
};

const PUBLIC_KEY = getVapidKey();

export const subscribeToPush = async (userId: string) => {
    if (!('serviceWorker' in navigator)) return false;
    if (!('PushManager' in window)) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        
        // 1. Subscribe to browser push service
        // This prompts the user if permission is 'default', or succeeds if 'granted'
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY)
        });

        // 2. Send subscription to Supabase
        // We assume a table 'push_subscriptions' exists.
        // If the table doesn't exist, this will fail gracefully (log to console) without breaking the app.
        const { error } = await supabase.from('push_subscriptions').upsert({
            user_id: userId,
            subscription: subscription,
            updated_at: new Date().toISOString()
        }, { onConflict: 'subscription' });

        if (error) {
            console.warn("Push Subscription Saved locally but DB Sync failed (Table might be missing):", error.message);
        }
        
        return true;
    } catch (error) {
        console.error("Push Subscription Error:", error);
        return false;
    }
};

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
