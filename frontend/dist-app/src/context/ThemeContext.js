import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from "react";
const ThemeContext = createContext({
    theme: "dark",
    toggleTheme: () => { },
});
export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("theme") ?? "dark";
    });
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);
    const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));
    return (_jsx(ThemeContext.Provider, { value: { theme, toggleTheme }, children: children }));
}
export function useTheme() {
    return useContext(ThemeContext);
}
