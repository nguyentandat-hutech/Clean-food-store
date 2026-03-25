import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../services/apiClient';

// Trang đăng ký tài khoản
const RegisterPage = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiClient.post('/auth/register', formData);
            toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
            navigate('/login');
        } catch (err) {
            const message = err.response?.data?.message || 'Đăng ký thất bại!';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: '4rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: 8 }}>
            <h2>Đăng Ký</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Họ tên</label>
                    <input
                        type="text" name="name" required
                        value={formData.name} onChange={handleChange}
                        style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: 4 }}
                    />
                </div>
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
                        type="password" name="password" required minLength={6}
                        value={formData.password} onChange={handleChange}
                        style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: 4 }}
                    />
                </div>
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem' }}>
                    {loading ? 'Đang đăng ký...' : 'Đăng Ký'}
                </button>
            </form>
            <p style={{ marginTop: '1rem', textAlign: 'center' }}>
                Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
            </p>
        </div>
    );
};

export default RegisterPage;
