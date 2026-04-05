import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Trang chủ - hiển thị sau khi đăng nhập thành công
const HomePage = () => {
    const { user, logout } = useAuth();
    const isAdmin = user?.role === 'admin';

    return (
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            <h1>🏠 Clean Food Store</h1>
            <p>Xin chào, <strong>{user?.name || user?.email}</strong>!
                {isAdmin && <span style={{ marginLeft: '8px', padding: '2px 10px', backgroundColor: '#dc3545', color: '#fff', borderRadius: '12px', fontSize: '13px' }}>Admin</span>}
            </p>

            {/* ── Điều hướng người dùng ────────────────────── */}
            <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ color: '#555', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Dành cho khách hàng</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link to="/products" style={linkStyle('#1976d2')}>🛒 Sản phẩm</Link>
                    <Link to="/cart" style={linkStyle('#e65100')}>🛍️ Giỏ hàng</Link>
                    <Link to="/orders" style={linkStyle('#6a1b9a')}>📦 Đơn hàng</Link>
                    <Link to="/wishlist" style={linkStyle('#e91e63')}>❤️ Yêu thích</Link>
                    <Link to="/profile" style={linkStyle('#2e7d32')}>👤 Tài khoản</Link>
                </div>
            </div>

            {/* ── Điều hướng admin ─────────────────────────── */}
            {isAdmin && (
                <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ color: '#555', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Quản trị viên</h3>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <Link to="/admin/dashboard" style={linkStyle('#b71c1c')}>📊 Dashboard</Link>
                        <Link to="/admin/products" style={linkStyle('#1b5e20')}>🥦 Sản phẩm</Link>
                        <Link to="/admin/categories" style={linkStyle('#f57c00')}>🏷️ Danh mục</Link>
                        <Link to="/admin/farms" style={linkStyle('#2e7d32')}>🌱 Trang trại</Link>
                        <Link to="/admin/batches" style={linkStyle('#0277bd')}>📋 Lô hàng</Link>
                        <Link to="/admin/orders" style={linkStyle('#6a1b9a')}>🧾 Đơn hàng</Link>
                        <Link to="/admin/inventory" style={linkStyle('#4e342e')}>📊 Tồn kho</Link>
                        <Link to="/admin/discounts" style={linkStyle('#e65100')}>🏷️ Mã giảm giá</Link>
                        <Link to="/admin/users" style={linkStyle('#37474f')}>👥 Người dùng</Link>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '2rem' }}>
                <button onClick={logout} style={{ padding: '0.5rem 1.25rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '6px', backgroundColor: '#f5f5f5' }}>
                    Đăng xuất
                </button>
            </div>
        </div>
    );
};

// Helper tạo style cho link
const linkStyle = (color) => ({
    padding: '0.5rem 1rem',
    background: color,
    color: '#fff',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '14px',
});

export default HomePage;
