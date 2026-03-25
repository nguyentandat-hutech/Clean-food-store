import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Bảo vệ một route: chỉ cho phép user đã đăng nhập truy cập.
 * Nếu chưa đăng nhập, redirect về /login và lưu lại trang
 * người dùng đang cố vào (để sau khi login có thể redirect back).
 *
 * Dùng trong App.jsx:
 *   <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
 *
 * Giới hạn theo role (tuỳ chọn):
 *   <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
 */
const ProtectedRoute = ({ children, roles }) => {
    const { user } = useAuth();
    const location = useLocation();

    // Chưa đăng nhập → redirect /login, giữ lại location để redirect back sau
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Đã đăng nhập nhưng không đủ role → redirect về trang chủ
    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
