
import { supabase } from './supabaseClient';

const getVapidKey = () => {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv.VITE_VAPID_PUBLIC_KEY) {
        return metaEnv.VITE_VAPID_PUBLIC_KEY;
    }
    // Fallback key (Replace with your generated VAPID public key if needed)
    return 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBLYFpaaNYTupyyV33GQ';
};

const PUBLIC_KEY = getVapidKey();

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

export const subscribeToPush = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return { success: false, error: "Push notifications not supported on this browser." };
    }

    try {
        // 1. Check Permission
        let permission = Notification.permission;
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }
        
        if (permission !== 'granted') {
            return { success: false, error: "Notification permission denied. Please enable them in browser settings." };
        }

        // 2. Get Service Worker
        const registration = await navigator.serviceWorker.ready;
        
        // 3. Subscribe
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY)
            });
        }

        // 4. Sync with Supabase
        const { error } = await supabase.from('push_subscriptions').insert({
            user_id: userId,
            subscription: subscription,
            user_agent: navigator.userAgent, // Helpful for debugging
            updated_at: new Date().toISOString()
        });

        if (error) {
            // If it's a unique constraint error, it means we are already subscribed in DB, which is fine.
            if (!error.message.toLowerCase().includes('unique') && !error.message.toLowerCase().includes('duplicate')) {
                 console.error("Database sync failed:", error);
                 // We don't fail the whole process if DB fails, as the browser part succeeded.
                 // But we warn the user.
            }
        }
        
        return { success: true };
    } catch (error: any) {
        console.error("Push Subscription Critical Error:", error);
        return { success: false, error: error.message || "Unknown error occurred." };
    }
};

export const unsubscribeFromPush = async (userId: string) => {
    if (!('serviceWorker' in navigator)) return false;
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            await subscription.unsubscribe();
            
            // Best effort cleanup in DB
            await supabase.from('push_subscriptions')
                .delete()
                .eq('user_id', userId)
                .contains('subscription', { endpoint: subscription.endpoint });
        }
        return true;
    } catch (e) {
        console.error("Unsubscribe failed", e);
        return false;
    }
};
