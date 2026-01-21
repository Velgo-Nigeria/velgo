
import { supabase } from './supabaseClient';

const getVapidKey = () => {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv.VITE_VAPID_PUBLIC_KEY) {
        return metaEnv.VITE_VAPID_PUBLIC_KEY;
    }
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env && process.env.VITE_VAPID_PUBLIC_KEY) {
            // @ts-ignore
            return process.env.VITE_VAPID_PUBLIC_KEY;
        }
    } catch(e) {}
    return 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBLYFpaaNYTupyyV33GQ';
};

const PUBLIC_KEY = getVapidKey();

// Helper to convert VAPID key
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

export const checkSubscriptionStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
    }
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return !!subscription;
    } catch (e) {
        console.error("Error checking push status", e);
        return false;
    }
};

export const subscribeToPush = async (userId: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn("Push notifications are not supported in this browser.");
        return false;
    }

    try {
        // 1. Explicitly request permission first
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn("Notification permission denied by user.");
            return false;
        }

        // 2. Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;
        
        // 3. Subscribe to browser push service
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY)
        });

        // 4. Save to Supabase (using plain insert, the Edge Function handles cleanup)
        const { error } = await supabase.from('push_subscriptions').insert({
            user_id: userId,
            subscription: subscription,
            updated_at: new Date().toISOString()
        });

        if (error) {
            // Ignore duplicate key errors, it just means they are already subscribed in DB
            if (!error.message.includes('unique constraint') && !error.message.includes('duplicate key')) {
                 console.error("Database sync failed:", error.message);
            }
        }
        
        return true;
    } catch (error) {
        console.error("Push Subscription Critical Error:", error);
        return false;
    }
};

export const unsubscribeFromPush = async (userId: string) => {
    if (!('serviceWorker' in navigator)) return false;
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            // 1. Unsubscribe from browser
            await subscription.unsubscribe();
            
            // 2. Remove from Supabase
            // We delete all subscriptions for this user that match the endpoint to keep it clean
            // Note: In a complex app, we might match the exact JSON, but endpoint is usually unique enough
            const { error } = await supabase.from('push_subscriptions')
                .delete()
                .eq('user_id', userId)
                .contains('subscription', { endpoint: subscription.endpoint });
                
            if (error) console.warn("DB Delete error", error);
        }
        return true;
    } catch (e) {
        console.error("Unsubscribe failed", e);
        return false;
    }
};
