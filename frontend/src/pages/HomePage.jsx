import { useAuth } from '../contexts/AuthContext';

// Trang chủ - hiển thị sau khi đăng nhập thành công
const HomePage = () => {
    const { user, logout } = useAuth();

    return (
        <div style={{ padding: '2rem' }}>
            <h1>🏠 Trang Chủ - Clean Food Store</h1>
            <p>Xin chào, <strong>{user?.name || user?.email}</strong>!</p>
            <button onClick={logout} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
                Đăng xuất
            </button>
        </div>
    );
};

export default HomePage;
