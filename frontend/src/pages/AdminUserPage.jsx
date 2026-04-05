import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsersAPI, updateUserRoleAPI } from '../api/userService';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

function AdminUserPage() {
    const { user: currentAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [confirmModal, setConfirmModal] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchUsers = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const r = await getAllUsersAPI({ page, limit: 15, search: search.trim(), role: roleFilter });
            setUsers(r.users); setPagination(r.pagination);
        } catch (err) { toast.error(err.response?.data?.message || 'Lỗi tải danh sách người dùng'); }
        finally { setLoading(false); }
    }, [search, roleFilter]);

    useEffect(() => { fetchUsers(1); }, [fetchUsers]);

    const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); };
    const handleClearSearch = () => { setSearchInput(''); setSearch(''); setRoleFilter(''); };

    const handleConfirmRoleChange = async () => {
        if (!confirmModal) return;
        setSubmitting(true);
        try {
            await updateUserRoleAPI(confirmModal.user._id, confirmModal.newRole);
            toast.success(`Đổi role "${confirmModal.user.name}" thành "${confirmModal.newRole === 'admin' ? 'Admin' : 'User'}"`);
            setConfirmModal(null); fetchUsers(pagination.page);
        } catch (err) { toast.error(err.response?.data?.message || 'Thay đổi role thất bại'); }
        finally { setSubmitting(false); }
    };

    const canChangeRole = (u) => {
        if (!u) return false;
        if (u._id === currentAdmin?._id) return false;
        if (u.role === 'admin') return false;
        return true;
    };

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            <div className="admin-header">
                <div className="admin-header-inner">
                    <h1 className="admin-title">👥 Quản lý Người dùng</h1>
                    <span className="badge badge-purple" style={{ fontSize: 13 }}>{pagination.total} người dùng</span>
                </div>
            </div>
            <div className="admin-content">
                {/* ── Warning note ── */}
                <div className="alert" style={{ background: '#fff8e1', border: '1px solid #ffe082', color: '#e65100', marginBottom: 16, borderRadius: 8, padding: '10px 16px', fontSize: 13 }}>
                    ⚠️ <strong>Lưu ý:</strong> Bạn chỉ có thể thay đổi role của <strong>User thông thường</strong>. Không thể thay đổi role của Admin khác hoặc chính mình.
                </div>

                {/* ── Search bar ── */}
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <input
                        className="form-control"
                        style={{ flex: 1, minWidth: 200 }}
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="Tìm theo tên hoặc email..."
                    />
                    <select className="form-control" style={{ width: 'auto' }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                        <option value="">Tất cả</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button type="submit" className="btn btn-primary">Tìm</button>
                    <button type="button" className="btn btn-ghost" onClick={handleClearSearch}>Xóa lọc</button>
                </form>

                {loading ? (
                    <div className="loading-wrap"><div className="spinner" /><p className="loading-text">Đang tải...</p></div>
                ) : (
                    <>
                        <div className="table-wrap">
                            <table className="table">
                                <thead><tr>
                                    <th>#</th><th>Họ tên</th><th>Email</th><th>Role</th><th>Ngày tham gia</th><th className="table-center">Thay đổi role</th>
                                </tr></thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr><td colSpan={6}><div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-state-icon">👥</div><p>Không tìm thấy người dùng.</p></div></td></tr>
                                    ) : users.map((u, idx) => (
                                        <tr key={u._id}>
                                            <td>{(pagination.page - 1) * 15 + idx + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.role === 'admin' ? 'var(--c-primary)' : '#1565c0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                                        {(u.name || '?')[0].toUpperCase()}
                                                    </div>
                                                    <strong>{u.name}</strong>
                                                    {u._id === currentAdmin?._id && <span className="badge badge-orange" style={{ fontSize: 10 }}>Bạn</span>}
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--t-muted)', fontSize: 13 }}>{u.email}</td>
                                            <td><span className={`badge ${u.role === 'admin' ? 'badge-green' : 'badge-blue'}`}>{u.role === 'admin' ? '🛡️ Admin' : '👤 User'}</span></td>
                                            <td style={{ fontSize: 12 }}>{fmtDate(u.createdAt)}</td>
                                            <td className="table-center">
                                                {canChangeRole(u) ? (
                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                        {u.role !== 'admin' && <button className="btn btn-secondary btn-sm" onClick={() => setConfirmModal({ user: u, newRole: 'admin' })}>→ Admin</button>}
                                                        {u.role !== 'user' && <button className="btn btn-ghost btn-sm" onClick={() => setConfirmModal({ user: u, newRole: 'user' })}>→ User</button>}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--t-muted)', fontSize: 12 }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {pagination.totalPages > 1 && (
                            <div className="pagination">
                                <button className="page-btn" onClick={() => fetchUsers(pagination.page - 1)} disabled={pagination.page === 1}>‹</button>
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => fetchUsers(p)}>{p}</button>
                                ))}
                                <button className="page-btn" onClick={() => fetchUsers(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>›</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Confirm Modal ── */}
            {confirmModal && (
                <div className="modal-backdrop" onClick={() => setConfirmModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <h3 style={{ marginTop: 0 }}>⚠️ Xác nhận thay đổi quyền</h3>
                        <p>Bạn muốn đổi role của <strong>{confirmModal.user.name}</strong> thành <strong>{confirmModal.newRole === 'admin' ? '🛡️ Admin' : '👤 User'}</strong>?</p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                            <button className="btn btn-ghost" onClick={() => setConfirmModal(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleConfirmRoleChange} disabled={submitting}>{submitting ? 'Đang xử lý...' : 'Xác nhận'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminUserPage;
