import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, apiRegister, apiLogin, apiLogout, apiChangePassword } from '../lib/authApi';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    name: session.user.user_metadata?.name ?? '',
                    email: session.user.email ?? '',
                });
            }
            setLoading(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    name: session.user.user_metadata?.name ?? '',
                    email: session.user.email ?? '',
                });
            }
            else {
                setUser(null);
            }
        });
        return () => subscription.unsubscribe();
    }, []);
    const login = async (email, password) => {
        const u = await apiLogin(email, password);
        setUser(u);
    };
    const register = async (name, email, password) => {
        const u = await apiRegister(name, email, password);
        setUser(u);
    };
    const logout = async () => {
        await apiLogout();
        setUser(null);
    };
    const changePassword = async (newPassword) => {
        await apiChangePassword(newPassword);
    };
    return (_jsx(AuthContext.Provider, { value: { user, loading, login, register, logout, changePassword }, children: children }));
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}
