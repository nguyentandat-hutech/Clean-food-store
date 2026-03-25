import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Trang chủ - hiển thị sau khi đăng nhập thành công
const HomePage = () => {
    const { user, logout } = useAuth();

    return (
        <div style={{ padding: '2rem' }}>
            <h1>🏠 Trang Chủ - Clean Food Store</h1>
            <p>Xin chào, <strong>{user?.name || user?.email}</strong>!</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <Link to="/profile" style={{ padding: '0.5rem 1rem', background: '#2e7d32', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>
                    👤 Tài khoản
                </Link>
                <button onClick={logout} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
                    Đăng xuất
                </button>
            </div>
        </div>
    );
};

export default HomePage;
