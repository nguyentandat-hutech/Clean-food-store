import { Link } from 'react-router-dom';

// Trang 404 - hiển thị khi route không tồn tại
const NotFoundPage = () => {
    return (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
            <h1 style={{ fontSize: '5rem', margin: 0 }}>404</h1>
            <p>Trang bạn tìm kiếm không tồn tại.</p>
            <Link to="/">← Quay về trang chủ</Link>
        </div>
    );
};

export default NotFoundPage;
