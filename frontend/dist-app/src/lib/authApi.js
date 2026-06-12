import { supabase } from './supabase';
function toAuthUser(user) {
    return {
        id: user.id,
        name: user.user_metadata?.name ?? '',
        email: user.email ?? '',
    };
}
export async function apiRegister(name, email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
    });
    if (error)
        throw new Error(error.message);
    if (!data.user)
        throw new Error('Registration failed — please try again.');
    return toAuthUser(data.user);
}
export async function apiLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error)
        throw new Error(error.message);
    if (!data.user)
        throw new Error('Login failed — please try again.');
    return toAuthUser(data.user);
}
export async function apiLogout() {
    const { error } = await supabase.auth.signOut();
    if (error)
        throw new Error(error.message);
}
export async function apiChangePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error)
        throw new Error(error.message);
}
