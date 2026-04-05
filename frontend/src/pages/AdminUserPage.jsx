import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsersAPI, updateUserRoleAPI } from '../api/userService';

// ── Trang Admin: Quản lý người dùng & phân quyền role ─────────
function AdminUserPage() {
    const { user: currentAdmin } = useAuth();

    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Modal xác nhận thay đổi role
    const [confirmModal, setConfirmModal] = useState(null); // { user, newRole }
    const [submitting, setSubmitting] = useState(false);

    // ── Lấy danh sách users ─────────────────────────────────────
    const fetchUsers = useCallback(
        async (page = 1) => {
            setLoading(true);
            try {
                const result = await getAllUsersAPI({
                    page,
                    limit: 15,
                    search: search.trim(),
                    role: roleFilter,
                });
                setUsers(result.users);
                setPagination(result.pagination);
            } catch (err) {
                const msg = err.response?.data?.message || 'Lỗi khi tải danh sách người dùng';
                toast.error(msg);
            } finally {
                setLoading(false);
            }
        },
        [search, roleFilter]
    );

    useEffect(() => {
        fetchUsers(1);
    }, [fetchUsers]);

    // ── Tìm kiếm ────────────────────────────────────────────────
    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput);
    };

    const handleClearSearch = () => {
        setSearchInput('');
        setSearch('');
        setRoleFilter('');
    };

    // ── Mở modal xác nhận ───────────────────────────────────────
    const handleOpenConfirm = (targetUser, newRole) => {
        setConfirmModal({ user: targetUser, newRole });
    };

    const handleCloseConfirm = () => {
        setConfirmModal(null);
    };

    // ── Xác nhận thay đổi role ──────────────────────────────────
    const handleConfirmRoleChange = async () => {
        if (!confirmModal) return;
        setSubmitting(true);
        try {
            await updateUserRoleAPI(confirmModal.user._id, confirmModal.newRole);
            toast.success(
                `Đã đổi role của "${confirmModal.user.name}" thành "${confirmModal.newRole === 'admin' ? 'Admin' : 'User'}" thành công!`
            );
            setConfirmModal(null);
            fetchUsers(pagination.page);
        } catch (err) {
            const msg = err.response?.data?.message || 'Có lỗi xảy ra khi thay đổi role';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Helpers ─────────────────────────────────────────────────
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('vi-VN');
    };

    // Kiểm tra xem có thể thay đổi role của user này không
    // Rule: Admin không được thay đổi role của Admin khác hoặc của chính mình
    const canChangeRole = (targetUser) => {
        if (!targetUser) return false;
        if (targetUser._id === currentAdmin?._id) return false; // chính mình
        if (targetUser.role === 'admin') return false;           // cùng cấp bậc
        return true;
    };

    // ── Render Role Badge ────────────────────────────────────────
    const RoleBadge = ({ role }) => (
        <span
            style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.5,
                background: role === 'admin' ? '#e8f5e9' : '#e3f2fd',
                color: role === 'admin' ? '#2e7d32' : '#1565c0',
                border: `1px solid ${role === 'admin' ? '#a5d6a7' : '#90caf9'}`,
            }}
        >
            {role === 'admin' ? '🛡️ Admin' : '👤 User'}
        </span>
    );

    // ── Render ──────────────────────────────────────────────────
    return (
        <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
                    👥 Quản lý Người dùng
                </h1>
                <span
                    style={{
                        background: '#f3e5f5',
                        color: '#6a1b9a',
                        border: '1px solid #ce93d8',
                        borderRadius: 12,
                        padding: '2px 10px',
                        fontSize: 13,
                        fontWeight: 600,
                    }}
                >
                    {pagination.total} người dùng
                </span>
            </div>

            {/* Lưu ý quyền hạn */}
            <div
                style={{
                    background: '#fff3e0',
                    border: '1px solid #ffcc80',
                    borderRadius: 8,
                    padding: '10px 16px',
                    marginBottom: 20,
                    fontSize: 13,
                    color: '#e65100',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}
            >
                <span>⚠️</span>
                <span>
                    <strong>Lưu ý:</strong> Bạn chỉ có thể thay đổi role của <strong>User thông
                        thường</strong>. Không thể thay đổi role của <strong>Admin khác</strong> hoặc chính mình (bảo vệ cùng cấp bậc).
                </span>
            </div>

            {/* Search & Filter Bar */}
            <form
                onSubmit={handleSearch}
                style={{
                    display: 'flex',
                    gap: 10,
                    marginBottom: 20,
                    flexWrap: 'wrap',
                }}
            >
                <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Tìm theo tên hoặc email..."
                    style={{
                        flex: 1,
                        minWidth: 220,
                        padding: '8px 14px',
                        border: '1px solid #ccc',
                        borderRadius: 6,
                        fontSize: 14,
                        outline: 'none',
                    }}
                />
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{
                        padding: '8px 14px',
                        border: '1px solid #ccc',
                        borderRadius: 6,
                        fontSize: 14,
                        background: '#fff',
                        cursor: 'pointer',
                    }}
                >
                    <option value="">Tất cả role</option>
                    <option value="user">👤 User</option>
                    <option value="admin">🛡️ Admin</option>
                </select>
                <button
                    type="submit"
                    style={{
                        padding: '8px 20px',
                        background: '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    🔍 Tìm kiếm
                </button>
                {(search || roleFilter) && (
                    <button
                        type="button"
                        onClick={handleClearSearch}
                        style={{
                            padding: '8px 16px',
                            background: '#f5f5f5',
                            color: '#555',
                            border: '1px solid #ccc',
                            borderRadius: 6,
                            fontSize: 14,
                            cursor: 'pointer',
                        }}
                    >
                        ✕ Xóa lọc
                    </button>
                )}
            </form>

            {/* Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#888', fontSize: 16 }}>
                    ⏳ Đang tải danh sách người dùng...
                </div>
            ) : users.length === 0 ? (
                <div
                    style={{
                        textAlign: 'center',
                        padding: 60,
                        color: '#aaa',
                        fontSize: 16,
                        background: '#fafafa',
                        borderRadius: 8,
                        border: '1px dashed #ddd',
                    }}
                >
                    😕 Không tìm thấy người dùng nào
                </div>
            ) : (
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e0e0e0' }}>
                    <table
                        style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: 14,
                            background: '#fff',
                        }}
                    >
                        <thead>
                            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}>Tên</th>
                                <th style={thStyle}>Email</th>
                                <th style={thStyle}>Số điện thoại</th>
                                <th style={thStyle}>Role hiện tại</th>
                                <th style={thStyle}>Trạng thái</th>
                                <th style={thStyle}>Ngày tạo</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Thao tác Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u, idx) => {
                                const isCurrentAdmin = u._id === currentAdmin?._id;
                                const isSameLevel = u.role === 'admin';
                                const disabled = !canChangeRole(u);

                                return (
                                    <tr
                                        key={u._id}
                                        style={{
                                            borderBottom: '1px solid #f0f0f0',
                                            background: isCurrentAdmin ? '#fffde7' : 'transparent',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isCurrentAdmin)
                                                e.currentTarget.style.background = '#f9f9f9';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = isCurrentAdmin
                                                ? '#fffde7'
                                                : 'transparent';
                                        }}
                                    >
                                        <td style={tdStyle}>
                                            {(pagination.page - 1) * pagination.limit + idx + 1}
                                        </td>
                                        <td style={tdStyle}>
                                            <strong>{u.name}</strong>
                                            {isCurrentAdmin && (
                                                <span
                                                    style={{
                                                        marginLeft: 6,
                                                        fontSize: 11,
                                                        color: '#f57c00',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    (Bạn)
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ ...tdStyle, color: '#555' }}>{u.email}</td>
                                        <td style={{ ...tdStyle, color: '#777' }}>
                                            {u.phone || '—'}
                                        </td>
                                        <td style={tdStyle}>
                                            <RoleBadge role={u.role} />
                                        </td>
                                        <td style={tdStyle}>
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    padding: '2px 8px',
                                                    borderRadius: 10,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    background: u.isActive ? '#e8f5e9' : '#ffebee',
                                                    color: u.isActive ? '#2e7d32' : '#c62828',
                                                }}
                                            >
                                                {u.isActive ? '✅ Hoạt động' : '🚫 Vô hiệu'}
                                            </span>
                                        </td>
                                        <td style={{ ...tdStyle, color: '#888', fontSize: 13 }}>
                                            {formatDate(u.createdAt)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            {disabled ? (
                                                <span
                                                    style={{
                                                        fontSize: 12,
                                                        color: '#bbb',
                                                        fontStyle: 'italic',
                                                    }}
                                                >
                                                    {isCurrentAdmin
                                                        ? 'Chính bạn'
                                                        : isSameLevel
                                                            ? 'Cùng cấp bậc'
                                                            : '—'}
                                                </span>
                                            ) : (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        gap: 8,
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    {/* Nút thăng cấp thành Admin */}
                                                    {u.role === 'user' && (
                                                        <button
                                                            onClick={() =>
                                                                handleOpenConfirm(u, 'admin')
                                                            }
                                                            style={{
                                                                padding: '5px 12px',
                                                                background: '#4caf50',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: 5,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            ⬆️ Thăng Admin
                                                        </button>
                                                    )}
                                                    {/* Nút hạ xuống User */}
                                                    {u.role === 'admin' && (
                                                        <button
                                                            onClick={() =>
                                                                handleOpenConfirm(u, 'user')
                                                            }
                                                            style={{
                                                                padding: '5px 12px',
                                                                background: '#f44336',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: 5,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            ⬇️ Hạ xuống User
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Phân trang */}
            {!loading && pagination.totalPages > 1 && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 20,
                    }}
                >
                    <button
                        onClick={() => fetchUsers(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        style={pageButtonStyle(pagination.page <= 1)}
                    >
                        ← Trước
                    </button>
                    <span style={{ fontSize: 14, color: '#555' }}>
                        Trang <strong>{pagination.page}</strong> / {pagination.totalPages}
                        &nbsp;({pagination.total} người dùng)
                    </span>
                    <button
                        onClick={() => fetchUsers(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        style={pageButtonStyle(pagination.page >= pagination.totalPages)}
                    >
                        Tiếp →
                    </button>
                </div>
            )}

            {/* Modal xác nhận thay đổi role */}
            {confirmModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={handleCloseConfirm}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: 12,
                            padding: '28px 32px',
                            maxWidth: 440,
                            width: '90%',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>
                            {confirmModal.newRole === 'admin'
                                ? '⬆️ Xác nhận Thăng cấp Admin'
                                : '⬇️ Xác nhận Hạ xuống User'}
                        </h3>

                        <div
                            style={{
                                background: '#f5f5f5',
                                borderRadius: 8,
                                padding: '12px 16px',
                                marginBottom: 16,
                                fontSize: 14,
                            }}
                        >
                            <div>
                                <strong>Người dùng:</strong> {confirmModal.user.name}
                            </div>
                            <div style={{ color: '#666' }}>
                                <strong>Email:</strong> {confirmModal.user.email}
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <strong>Role hiện tại:</strong>{' '}
                                <RoleBadge role={confirmModal.user.role} />
                                <span style={{ margin: '0 8px', color: '#999' }}>→</span>
                                <RoleBadge role={confirmModal.newRole} />
                            </div>
                        </div>

                        {confirmModal.newRole === 'admin' ? (
                            <p
                                style={{
                                    color: '#e65100',
                                    background: '#fff3e0',
                                    border: '1px solid #ffcc80',
                                    borderRadius: 6,
                                    padding: '8px 12px',
                                    fontSize: 13,
                                    margin: '0 0 20px',
                                }}
                            >
                                ⚠️ Người dùng này sẽ có <strong>toàn quyền Admin</strong> sau khi thăng cấp. Bạn sẽ <strong>không thể thu hồi</strong> quyền này vì họ sẽ có cùng cấp với bạn.
                            </p>
                        ) : (
                            <p
                                style={{
                                    color: '#b71c1c',
                                    background: '#ffebee',
                                    border: '1px solid #ef9a9a',
                                    borderRadius: 6,
                                    padding: '8px 12px',
                                    fontSize: 13,
                                    margin: '0 0 20px',
                                }}
                            >
                                ⚠️ Admin này sẽ bị hạ xuống <strong>User thông thường</strong> và mất toàn bộ quyền Admin.
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleCloseConfirm}
                                disabled={submitting}
                                style={{
                                    padding: '8px 20px',
                                    background: '#f5f5f5',
                                    color: '#333',
                                    border: '1px solid #ccc',
                                    borderRadius: 6,
                                    fontSize: 14,
                                    cursor: 'pointer',
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmRoleChange}
                                disabled={submitting}
                                style={{
                                    padding: '8px 20px',
                                    background:
                                        confirmModal.newRole === 'admin' ? '#4caf50' : '#f44336',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: 14,
                                    fontWeight: 700,
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    opacity: submitting ? 0.7 : 1,
                                }}
                            >
                                {submitting
                                    ? 'Đang xử lý...'
                                    : confirmModal.newRole === 'admin'
                                        ? '✅ Xác nhận thăng cấp'
                                        : '✅ Xác nhận hạ xuống'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Style helpers ───────────────────────────────────────────────
const thStyle = {
    padding: '10px 14px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: 13,
    color: '#555',
    whiteSpace: 'nowrap',
};

const tdStyle = {
    padding: '10px 14px',
    verticalAlign: 'middle',
};

const pageButtonStyle = (disabled) => ({
    padding: '6px 16px',
    background: disabled ? '#f5f5f5' : '#1976d2',
    color: disabled ? '#aaa' : '#fff',
    border: '1px solid',
    borderColor: disabled ? '#ddd' : '#1976d2',
    borderRadius: 6,
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
});

export default AdminUserPage;
