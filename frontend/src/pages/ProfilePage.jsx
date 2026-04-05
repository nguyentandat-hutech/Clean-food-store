import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { getProfileAPI, updateProfileAPI } from '../api/userService';
import '../styles/auth.css';
import '../styles/profile.css';

// Badge màu dựa vào role
const ROLE_BADGE = {
    admin: { label: 'Quản trị viên', cls: 'badge-admin' },
    user: { label: 'Người dùng', cls: 'badge-user' },
};

const ProfilePage = () => {
    const { user: ctxUser, login } = useAuth();

    const [serverUser, setServerUser] = useState(null);
    const [loadingPage, setLoadingPage] = useState(true);
    const [pageError, setPageError] = useState('');
    const [apiError, setApiError] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm({ mode: 'onTouched' });

    // ------ Tải thông tin profile từ server khi mount ------
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { user } = await getProfileAPI();
                setServerUser(user);
                reset({ name: user.name, phone: user.phone || '' });
            } catch (err) {
                setPageError(
                    err.response?.data?.message || 'Không thể tải thông tin. Vui lòng thử lại.'
                );
            } finally {
                setLoadingPage(false);
            }
        };
        fetchProfile();
    }, [reset]);

    // ------ Huỷ chỉnh sửa → khôi phục giá trị cũ ------
    const handleCancel = () => {
        reset({ name: serverUser.name, phone: serverUser.phone || '' });
        setApiError('');
        setIsEditing(false);
    };

    // ------ Submit cập nhật ------
    const onSubmit = async (data) => {
        setApiError('');
        try {
            const { user: updated } = await updateProfileAPI(data);
            setServerUser(updated);
            // Đồng bộ lại AuthContext để Navbar / các trang khác cập nhật tên
            login(updated, localStorage.getItem('accessToken'));
            toast.success('Cập nhật thông tin thành công!');
            setIsEditing(false);
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.message;
            if (status === 400) {
                setApiError(msg || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
            } else {
                setApiError(msg || 'Không thể cập nhật. Vui lòng thử lại.');
            }
        }
    };

    // ------ Loading & Error states ------
    if (loadingPage) {
        return (
            <div className="profile-page">
                <div className="profile-loading">
                    <div className="profile-spinner" />
                    <p>Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    if (pageError) {
        return (
            <div className="profile-page">
                <div className="auth-alert" role="alert">
                    <span className="auth-alert-icon">⚠️</span>
                    <span>{pageError}</span>
                </div>
            </div>
        );
    }

    const roleBadge = ROLE_BADGE[serverUser?.role] || ROLE_BADGE.user;

    return (
        <div className="profile-page">
            <div className="profile-container">
                {/* ── Header card ── */}
                <div className="profile-header-card">
                    <div className="profile-avatar">
                        {serverUser?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="profile-header-info">
                        <h1 className="profile-name">{serverUser?.name}</h1>
                        <p className="profile-email">{serverUser?.email}</p>
                        <span className={`profile-badge ${roleBadge.cls}`}>
                            {roleBadge.label}
                        </span>
                    </div>
                </div>

                {/* ── Info & Edit card ── */}
                <div className="profile-card">
                    <div className="profile-card-header">
                        <h2 className="profile-card-title">Thông tin cá nhân</h2>
                        {!isEditing && (
                            <button
                                className="btn-edit"
                                onClick={() => setIsEditing(true)}
                            >
                                ✏️ Chỉnh sửa
                            </button>
                        )}
                    </div>

                    {/* API error khi submit */}
                    {apiError && (
                        <div className="auth-alert" role="alert">
                            <span className="auth-alert-icon">⚠️</span>
                            <span>{apiError}</span>
                        </div>
                    )}

                    {isEditing ? (
                        /* ──── FORM chỉnh sửa ──── */
                        <form onSubmit={handleSubmit(onSubmit)} noValidate>
                            {/* Họ tên */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="profile-name">
                                    Họ và tên <span className="required">*</span>
                                </label>
                                <div className="input-wrapper">
                                    <span className="input-icon">👤</span>
                                    <input
                                        id="profile-name"
                                        type="text"
                                        placeholder="Nguyễn Văn A"
                                        className={`form-input ${errors.name ? 'is-error' : ''}`}
                                        {...register('name', {
                                            required: 'Họ tên không được để trống.',
                                            minLength: { value: 2, message: 'Họ tên phải có ít nhất 2 ký tự.' },
                                            maxLength: { value: 50, message: 'Họ tên không được vượt quá 50 ký tự.' },
                                        })}
                                    />
                                </div>
                                {errors.name && (
                                    <p className="field-error" role="alert">
                                        <span>⚠</span> {errors.name.message}
                                    </p>
                                )}
                            </div>

                            {/* Số điện thoại */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="profile-phone">
                                    Số điện thoại
                                </label>
                                <div className="input-wrapper">
                                    <span className="input-icon">📱</span>
                                    <input
                                        id="profile-phone"
                                        type="tel"
                                        placeholder="0912345678"
                                        className={`form-input ${errors.phone ? 'is-error' : ''}`}
                                        {...register('phone', {
                                            pattern: {
                                                value: /^(\+?\d{9,15})?$/,
                                                message: 'Số điện thoại không hợp lệ (9-15 chữ số).',
                                            },
                                        })}
                                    />
                                </div>
                                {errors.phone && (
                                    <p className="field-error" role="alert">
                                        <span>⚠</span> {errors.phone.message}
                                    </p>
                                )}
                            </div>

                            {/* Email (readonly) */}
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">✉️</span>
                                    <input
                                        type="email"
                                        value={serverUser?.email}
                                        readOnly
                                        className="form-input profile-input-readonly"
                                    />
                                </div>
                                <p className="profile-readonly-hint">Email không thể thay đổi.</p>
                            </div>

                            {/* Action buttons */}
                            <div className="profile-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={handleCancel}
                                    disabled={isSubmitting}
                                >
                                    Huỷ
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={isSubmitting || !isDirty}
                                    style={{ flex: 1 }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="btn-spinner" />
                                            Đang lưu...
                                        </>
                                    ) : (
                                        'Lưu thay đổi'
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* ──── VIEW thông tin ──── */
                        <div className="profile-info-list">
                            <div className="profile-info-row">
                                <span className="profile-info-label">👤 Họ và tên</span>
                                <span className="profile-info-value">{serverUser?.name}</span>
                            </div>
                            <div className="profile-info-row">
                                <span className="profile-info-label">✉️ Email</span>
                                <span className="profile-info-value">{serverUser?.email}</span>
                            </div>
                            <div className="profile-info-row">
                                <span className="profile-info-label">📱 Số điện thoại</span>
                                <span className="profile-info-value">
                                    {serverUser?.phone || (
                                        <em className="profile-empty">Chưa cập nhật</em>
                                    )}
                                </span>
                            </div>
                            <div className="profile-info-row">
                                <span className="profile-info-label">🔑 Quyền hạn</span>
                                <span className={`profile-badge ${roleBadge.cls}`}>
                                    {roleBadge.label}
                                </span>
                            </div>
                            <div className="profile-info-row">
                                <span className="profile-info-label">📅 Ngày tham gia</span>
                                <span className="profile-info-value">
                                    {serverUser?.createdAt
                                        ? new Date(serverUser.createdAt).toLocaleDateString('vi-VN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                        })
                                        : '—'}
                                </span>
                            </div>
                            <div className="profile-info-row">
                                <span className="profile-info-label">🟢 Trạng thái</span>
                                <span
                                    className={`profile-status ${serverUser?.isActive ? 'status-active' : 'status-inactive'
                                        }`}
                                >
                                    {serverUser?.isActive ? 'Đang hoạt động' : 'Đã khoá'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
