import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Import các trang
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

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
