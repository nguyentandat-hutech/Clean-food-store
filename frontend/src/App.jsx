import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Import các trang
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import AdminCategoryPage from './pages/AdminCategoryPage';
import AdminProductPage from './pages/AdminProductPage';
import AdminBatchPage from './pages/AdminBatchPage';
import InventoryReportPage from './pages/InventoryReportPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderListPage from './pages/OrderListPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import AdminOrderPage from './pages/AdminOrderPage';

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
                    <Route path="/products" element={<ProductListPage />} />
                    <Route path="/products/:id" element={<ProductDetailPage />} />

                    {/* --- Routes bảo vệ (cần đăng nhập) --- */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <HomePage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Routes Giỏ hàng & Đặt hàng (cần đăng nhập) --- */}
                    <Route
                        path="/cart"
                        element={
                            <ProtectedRoute>
                                <CartPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/checkout"
                        element={
                            <ProtectedRoute>
                                <CheckoutPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders"
                        element={
                            <ProtectedRoute>
                                <OrderListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/order-success"
                        element={
                            <ProtectedRoute>
                                <OrderSuccessPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Routes Admin (cần đăng nhập + quyền admin) --- */}
                    <Route
                        path="/admin/categories"
                        element={
                            <ProtectedRoute>
                                <AdminCategoryPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin/products"
                        element={
                            <ProtectedRoute>
                                <AdminProductPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Quản lý Lô hàng */}
                    <Route
                        path="/admin/batches"
                        element={
                            <ProtectedRoute>
                                <AdminBatchPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Báo cáo Tồn kho */}
                    <Route
                        path="/admin/inventory"
                        element={
                            <ProtectedRoute>
                                <InventoryReportPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Dashboard Admin — Cảnh báo kho hàng */}
                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute>
                                <AdminDashboardPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Quản lý Đơn hàng (Admin) */}
                    <Route
                        path="/admin/orders"
                        element={
                            <ProtectedRoute>
                                <AdminOrderPage />
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

