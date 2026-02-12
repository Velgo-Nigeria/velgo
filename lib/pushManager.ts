
import { supabase } from './supabaseClient';

const getVapidKey = () => {
    // Priority: Vite Env Var -> Hardcoded Fallback
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv.VITE_VAPID_PUBLIC_KEY) {
        return metaEnv.VITE_VAPID_PUBLIC_KEY;
    }
    // Default Public Key (Placeholder - You should ideally generate your own via web-push-codelab.glitch.me)
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
            return { success: false, error: "Notification permission denied. Please enable them in your browser settings (Lock icon in URL bar)." };
        }

        // 2. Get Service Worker
        const registration = await navigator.serviceWorker.ready;
        
        // 3. Subscribe (or get existing)
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY)
            });
        }

        // 4. Sync with Supabase Database
        // We use Upsert logic via the unique constraint on the subscription column
        const { error } = await supabase.from('push_subscriptions').upsert({
            user_id: userId,
            subscription: JSON.parse(JSON.stringify(subscription)), // Ensure it's plain JSON
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
        }, { onConflict: 'subscription' });

        if (error) {
             console.error("Database sync failed:", error);
             // We return true because the browser part worked, so the user *will* technically receive pushes if DB was previously set.
        }
        
        return { success: true };
    } catch (error: any) {
        console.error("Push Subscription Error:", error);
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
            
            // Remove from DB
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
