import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { loginAPI } from '../api/authService';
import '../styles/auth.css';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [apiError, setApiError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({ mode: 'onTouched' });

    const onSubmit = async (data) => {
        setApiError('');
        try {
            const { user, token } = await loginAPI(data);
            login(user, token);
            toast.success(`Chào mừng, ${user.name}!`);
            navigate('/');
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.message;

            if (status === 401) {
                setApiError(msg || 'Email hoặc mật khẩu không chính xác.');
            } else if (status === 403) {
                setApiError(msg || 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ hỗ trợ.');
            } else if (status === 400) {
                setApiError(msg || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
            } else {
                setApiError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
            }
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* Brand */}
                <div className="auth-brand">
                    <div className="auth-brand-icon">🥗</div>
                    <h1>Clean Food Store</h1>
                    <p>Thực phẩm sạch cho cuộc sống khoẻ mạnh</p>
                </div>

                <h2 className="auth-title">Đăng nhập tài khoản</h2>

                {/* API error banner */}
                {apiError && (
                    <div className="auth-alert" role="alert">
                        <span className="auth-alert-icon">⚠️</span>
                        <span>{apiError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    {/* Email */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">
                            Email <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon">✉️</span>
                            <input
                                id="login-email"
                                type="email"
                                autoComplete="email"
                                placeholder="example@email.com"
                                className={`form-input ${errors.email ? 'is-error' : ''}`}
                                {...register('email', {
                                    required: 'Email là bắt buộc.',
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: 'Email không đúng định dạng.',
                                    },
                                })}
                            />
                        </div>
                        {errors.email && (
                            <p className="field-error" role="alert">
                                <span>⚠</span> {errors.email.message}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-password">
                            Mật khẩu <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="Nhập mật khẩu"
                                className={`form-input has-toggle ${errors.password ? 'is-error' : ''}`}
                                {...register('password', {
                                    required: 'Mật khẩu là bắt buộc.',
                                    minLength: {
                                        value: 6,
                                        message: 'Mật khẩu phải có ít nhất 6 ký tự.',
                                    },
                                })}
                            />
                            <button
                                type="button"
                                className="input-toggle"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="field-error" role="alert">
                                <span>⚠</span> {errors.password.message}
                            </p>
                        )}
                    </div>

                    {/* Submit */}
                    <button type="submit" className="btn-submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <span className="btn-spinner" />
                                Đang đăng nhập...
                            </>
                        ) : (
                            'Đăng Nhập'
                        )}
                    </button>
                </form>

                <p className="auth-divider">
                    Chưa có tài khoản?{' '}
                    <Link to="/register">Đăng ký ngay</Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
