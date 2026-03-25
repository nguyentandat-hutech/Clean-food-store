import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/apiClient';

// Trang đăng nhập
const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Gọi API đăng nhập
            const res = await apiClient.post('/auth/login', formData);
            const { token, user } = res.data.data;

            login(user, token); // Lưu vào Context + localStorage
            toast.success('Đăng nhập thành công!');
            navigate('/');      // Chuyển về trang chủ
        } catch (err) {
            const message = err.response?.data?.message || 'Đăng nhập thất bại!';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: '4rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: 8 }}>
            <h2>Đăng Nhập</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Email</label>
                    <input
                        type="email" name="email" required
                        value={formData.email} onChange={handleChange}
                        style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: 4 }}
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Mật khẩu</label>
                    <input
                        type="password" name="password" required
                        value={formData.password} onChange={handleChange}
                        style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: 4 }}
                    />
                </div>
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem' }}>
                    {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
                </button>
            </form>
            <p style={{ marginTop: '1rem', textAlign: 'center' }}>
                Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
            </p>
        </div>
    );
};

export default LoginPage;
