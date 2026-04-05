import { Link } from 'react-router-dom';

function NotFoundPage() {
    return (
        <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
            <div style={{ textAlign: 'center', maxWidth: 480 }}>
                <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 16 }}>🌿</div>
                <h1 style={{ fontSize: 64, fontWeight: 900, color: 'var(--c-primary)', margin: 0, lineHeight: 1 }}>404</h1>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--t-heading)', margin: '12px 0 8px' }}>Trang không tồn tại</h2>
                <p style={{ color: 'var(--t-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
                    Trang bạn đang tìm kiếm đã bị xóa, đổi tên hoặc không tồn tại trong hệ thống.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/" className="btn btn-primary btn-lg">🏠 Về trang chủ</Link>
                    <Link to="/products" className="btn btn-outline btn-lg">🛒 Xem sản phẩm</Link>
                </div>
            </div>
        </div>
    );
}

export default NotFoundPage;
