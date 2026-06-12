export interface AuthUser {
    id: string;
    name: string;
    email: string;
}
export declare function apiRegister(name: string, email: string, password: string): Promise<AuthUser>;
export declare function apiLogin(email: string, password: string): Promise<AuthUser>;
export declare function apiLogout(): Promise<void>;
export declare function apiChangePassword(newPassword: string): Promise<void>;
