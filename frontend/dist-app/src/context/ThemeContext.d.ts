type Theme = "dark" | "light";
interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
}
export declare function ThemeProvider({ children }: {
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useTheme(): ThemeContextValue;
export {};
