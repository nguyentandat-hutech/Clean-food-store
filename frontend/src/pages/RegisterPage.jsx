import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { registerAPI } from '../api/authService';
import '../styles/auth.css';

/* Tính độ mạnh mật khẩu: 0-4 */
const getPasswordStrength = (password = '') => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
};

const strengthConfig = [
    { label: '', color: '#e0e0e0', width: '0%' },
    { label: 'Rất yếu', color: '#f44336', width: '20%' },
    { label: 'Yếu', color: '#ff9800', width: '40%' },
    { label: 'Trung bình', color: '#ffeb3b', width: '60%' },
    { label: 'Mạnh', color: '#8bc34a', width: '80%' },
    { label: 'Rất mạnh', color: '#4caf50', width: '100%' },
];

const RegisterPage = () => {
    const navigate = useNavigate();

    const [apiError, setApiError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm({ mode: 'onTouched' });

    const passwordValue = watch('password', '');
    const strength = getPasswordStrength(passwordValue);
    const strengthInfo = strengthConfig[Math.min(strength, 5)];

    const onSubmit = async (data) => {
        setApiError('');
        try {
            // Không gửi confirmPassword lên server
            const { confirmPassword, ...payload } = data;
            await registerAPI(payload);
            toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
            navigate('/login');
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.message;

            if (status === 409) {
                setApiError(msg || 'Email này đã được sử dụng. Vui lòng chọn email khác.');
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

                <h2 className="auth-title">Tạo tài khoản mới</h2>

                {/* API error banner */}
                {apiError && (
                    <div className="auth-alert" role="alert">
                        <span className="auth-alert-icon">⚠️</span>
                        <span>{apiError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    {/* Full name */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-name">
                            Họ và tên <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon">👤</span>
                            <input
                                id="reg-name"
                                type="text"
                                autoComplete="name"
                                placeholder="Nguyễn Văn A"
                                className={`form-input ${errors.name ? 'is-error' : ''}`}
                                {...register('name', {
                                    required: 'Họ tên là bắt buộc.',
                                    minLength: { value: 2, message: 'Họ tên phải có ít nhất 2 ký tự.' },
                                    maxLength: { value: 50, message: 'Họ tên không vượt quá 50 ký tự.' },
                                })}
                            />
                        </div>
                        {errors.name && (
                            <p className="field-error" role="alert">
                                <span>⚠</span> {errors.name.message}
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-email">
                            Email <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon">✉️</span>
                            <input
                                id="reg-email"
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
                        <label className="form-label" htmlFor="reg-password">
                            Mật khẩu <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                id="reg-password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Tối thiểu 6 ký tự"
                                className={`form-input has-toggle ${errors.password ? 'is-error' : ''}`}
                                {...register('password', {
                                    required: 'Mật khẩu là bắt buộc.',
                                    minLength: { value: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự.' },
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
                        {/* Strength meter */}
                        {passwordValue.length > 0 && (
                            <div className="password-strength">
                                <div className="strength-bar-track">
                                    <div
                                        className="strength-bar-fill"
                                        style={{ width: strengthInfo.width, background: strengthInfo.color }}
                                    />
                                </div>
                                <span
                                    className="strength-label"
                                    style={{ color: strengthInfo.color }}
                                >
                                    {strengthInfo.label}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-confirm">
                            Xác nhận mật khẩu <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                id="reg-confirm"
                                type={showConfirm ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Nhập lại mật khẩu"
                                className={`form-input has-toggle ${errors.confirmPassword ? 'is-error' : ''}`}
                                {...register('confirmPassword', {
                                    required: 'Vui lòng xác nhận mật khẩu.',
                                    validate: (value) =>
                                        value === passwordValue || 'Mật khẩu xác nhận không khớp.',
                                })}
                            />
                            <button
                                type="button"
                                className="input-toggle"
                                onClick={() => setShowConfirm((v) => !v)}
                                aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                                {showConfirm ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="field-error" role="alert">
                                <span>⚠</span> {errors.confirmPassword.message}
                            </p>
                        )}
                    </div>

                    {/* Submit */}
                    <button type="submit" className="btn-submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <span className="btn-spinner" />
                                Đang đăng ký...
                            </>
                        ) : (
                            'Đăng Ký Ngay'
                        )}
                    </button>
                </form>

                <p className="auth-divider">
                    Đã có tài khoản?{' '}
                    <Link to="/login">Đăng nhập</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
