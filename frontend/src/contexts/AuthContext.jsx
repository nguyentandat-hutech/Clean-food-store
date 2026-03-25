import { createContext, useContext, useState, useCallback } from 'react';

// Tạo Context
const AuthContext = createContext(null);

// ── AuthProvider: bọc ngoài toàn bộ app trong App.jsx ─────────
export const AuthProvider = ({ children }) => {
    // Đọc user từ localStorage để giữ phiên đăng nhập khi F5
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    // Gọi hàm login sau khi API trả về token & user
    const login = useCallback((userData, token) => {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    }, []);

    // Hàm logout: xóa toàn bộ dữ liệu phiên
    const logout = useCallback(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    const value = { user, login, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook tiện lợi để dùng trong bất kỳ component nào
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth phải được dùng bên trong <AuthProvider>');
    }
    return context;
};
