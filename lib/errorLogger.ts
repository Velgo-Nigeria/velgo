import { supabase } from './supabaseClient';

export const logErrorToSupabase = async (
    message: string, 
    source?: string, 
    lineno?: number, 
    colno?: number, 
    errorObj?: any
) => {
    try {
        const errorStack = errorObj instanceof Error ? errorObj.stack : String(errorObj);
        
        await supabase.from('app_errors').insert([{
            error_message: message,
            source: source || window.location.href,
            line_number: lineno || null,
            column_number: colno || null,
            error_stack: errorStack || null,
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
        }]);
    } catch (e) {
        // Fallback to console if logging fails so we don't cause infinite loops
        console.error("Failed to log error to Supabase:", e);
    }
};

export const initGlobalErrorLogger = () => {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
        logErrorToSupabase(
            event.message,
            event.filename,
            event.lineno,
            event.colno,
            event.error
        );
    });

    window.addEventListener('unhandledrejection', (event) => {
        logErrorToSupabase(
            event.reason?.message || 'Unhandled Promise Rejection',
            undefined,
            undefined,
            undefined,
            event.reason
        );
    });
};
