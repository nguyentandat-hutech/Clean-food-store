import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import các trang
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

// ── Protected Route: chặn trang yêu cầu đăng nhập ────────────
const ProtectedRoute = ({ children }) => {
    const { user } = useAuth();
    // Nếu chưa đăng nhập, chuyển hướng về /login
    return user ? children : <Navigate to="/login" replace />;
};

// ── App Component ─────────────────────────────────────────────
function App() {
    return (
        <BrowserRouter>
            {/* AuthProvider bọc toàn bộ app để mọi trang đều dùng được context */}
            <AuthProvider>
                <Routes>
                    {/* --- Routes công khai (không cần đăng nhập) --- */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* --- Routes bảo vệ (cần đăng nhập) --- */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <HomePage />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Bắt mọi route không tồn tại --- */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
