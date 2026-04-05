import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PageLayout from './components/PageLayout';

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
import AdminFarmPage from './pages/AdminFarmPage';
import AdminDiscountPage from './pages/AdminDiscountPage';
import AdminUserPage from './pages/AdminUserPage';
import WishlistPage from './pages/WishlistPage';

// ── App Component ─────────────────────────────────────────────
function App() {
    return (
        <BrowserRouter>
            {/* AuthProvider bọc toàn bộ app để mọi trang đều dùng được context */}
            <AuthProvider>
                <Routes>
                    {/* --- Routes công khai (không cần đăng nhập) — NO Navbar --- */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* --- Routes công khai có Navbar --- */}
                    <Route path="/products" element={<PageLayout><ProductListPage /></PageLayout>} />
                    <Route path="/products/:id" element={<PageLayout><ProductDetailPage /></PageLayout>} />

                    {/* --- Routes bảo vệ (cần đăng nhập) --- */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <PageLayout><HomePage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <PageLayout><ProfilePage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Routes Giỏ hàng & Đặt hàng (cần đăng nhập) --- */}
                    <Route
                        path="/cart"
                        element={
                            <ProtectedRoute>
                                <PageLayout><CartPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/checkout"
                        element={
                            <ProtectedRoute>
                                <PageLayout><CheckoutPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders"
                        element={
                            <ProtectedRoute>
                                <PageLayout><OrderListPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/order-success"
                        element={
                            <ProtectedRoute>
                                <PageLayout><OrderSuccessPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/wishlist"
                        element={
                            <ProtectedRoute>
                                <PageLayout><WishlistPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Routes Admin (cần đăng nhập + quyền admin) --- */}
                    <Route
                        path="/admin/categories"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <PageLayout><AdminCategoryPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin/farms"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <PageLayout><AdminFarmPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin/products"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <PageLayout><AdminProductPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin/batches"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <PageLayout><AdminBatchPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin/inventory"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <PageLayout><InventoryReportPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <PageLayout><AdminDashboardPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin/orders"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <PageLayout><AdminOrderPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin/discounts"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <PageLayout><AdminDiscountPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin/users"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <PageLayout><AdminUserPage /></PageLayout>
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Bắt mọi route không tồn tại --- */}
                    <Route path="*" element={<PageLayout><NotFoundPage /></PageLayout>} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;

