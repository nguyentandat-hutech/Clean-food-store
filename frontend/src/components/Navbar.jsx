import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_LINKS = [
    { to: '/products', label: '🛒 Sản phẩm' },
    { to: '/cart', label: '🧺 Giỏ hàng' },
    { to: '/wishlist', label: '❤️ Yêu thích' },
    { to: '/orders', label: '📦 Đơn hàng' },
];

const ADMIN_LINKS = [
    { to: '/admin/dashboard', label: '📊 Dashboard' },
    { to: '/admin/products', label: '🥬 Sản phẩm' },
    { to: '/admin/categories', label: '🏷️ Danh mục' },
    { to: '/admin/farms', label: '🌾 Trang trại' },
    { to: '/admin/batches', label: '📦 Lô hàng' },
    { to: '/admin/inventory', label: '🏪 Tồn kho' },
    { to: '/admin/orders', label: '🧾 Đơn hàng' },
    { to: '/admin/discounts', label: '🏷️ Giảm giá' },
    { to: '/admin/users', label: '👥 Người dùng' },
];

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isAdmin = user?.role === 'admin';
    const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/');

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitial = () => {
        const name = user?.name || user?.email || '';
        return name.charAt(0).toUpperCase() || '?';
    };

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                {/* Logo */}
                <Link to="/" className="navbar-logo" style={{ textDecoration: 'none' }}>
                    <div className="navbar-logo-icon">🥗</div>
                    <div>
                        <div className="navbar-logo-text">Clean Food Store</div>
                        <span className="navbar-logo-sub">Thực phẩm sạch & tươi ngon</span>
                    </div>
                </Link>

                {/* Main nav links */}
                <nav className="navbar-nav">
                    {!isAdmin && NAV_LINKS.map(({ to, label }) => (
                        <Link
                            key={to}
                            to={to}
                            className={`navbar-link${isActive(to) ? ' active' : ''}`}
                        >
                            {label}
                        </Link>
                    ))}
                    {isAdmin && ADMIN_LINKS.map(({ to, label }) => (
                        <Link
                            key={to}
                            to={to}
                            className={`navbar-link${isActive(to) ? ' active' : ''}`}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>

                <div className="navbar-spacer" />

                {/* User area */}
                {user ? (
                    <div className="navbar-actions">
                        <Link
                            to="/profile"
                            className="navbar-user"
                            style={{ textDecoration: 'none' }}
                        >
                            <div className="navbar-avatar">{getInitial()}</div>
                            <span className="navbar-username">
                                {user.name || user.email}
                            </span>
                            {isAdmin && (
                                <span className="navbar-badge">Admin</span>
                            )}
                        </Link>
                        <button className="navbar-logout" onClick={handleLogout}>
                            Đăng xuất
                        </button>
                    </div>
                ) : (
                    <div className="navbar-actions">
                        <Link to="/login" className="btn btn-outline btn-sm">
                            Đăng nhập
                        </Link>
                        <Link to="/register" className="btn btn-primary btn-sm">
                            Đăng ký
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
}
