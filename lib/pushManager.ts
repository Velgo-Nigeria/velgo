
import { supabase } from './supabaseClient';

const getVapidKey = () => {
    const metaEnv = (import.meta as any).env;
    // We use a known test public key that matches the backend default for instant setup
    return metaEnv?.VITE_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBLYFpaaNYTupyyV33GQ';
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
        return false;
    }
};

export const subscribeToPush = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return { success: false, error: "Push notifications not supported on this browser/device." };
    }

    try {
        let permission = Notification.permission;
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }
        
        if (permission !== 'granted') {
            return { success: false, error: "Permission denied. Check browser settings." };
        }

        const registration = await navigator.serviceWorker.ready;
        
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY)
            });
        }

        const { error } = await supabase.from('push_subscriptions').upsert({
            user_id: userId,
            subscription: JSON.parse(JSON.stringify(subscription)),
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
        }, { onConflict: 'subscription' });

        if (error) throw error;
        
        return { success: true };
    } catch (error: any) {
        console.error("Push Subscription Error:", error);
        return { success: false, error: error.message || "Failed to subscribe." };
    }
};

export const unsubscribeFromPush = async (userId: string) => {
    if (!('serviceWorker' in navigator)) return false;
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            await subscription.unsubscribe();
            await supabase.from('push_subscriptions')
                .delete()
                .eq('user_id', userId)
                .contains('subscription', { endpoint: subscription.endpoint });
        }
        return true;
    } catch (e) {
        return false;
    }
};
