import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const FEATURES = [
    { icon: '🥦', title: 'Thực phẩm 100% sạch', desc: 'Nguồn gốc rõ ràng, kiểm định đầy đủ, an toàn cho cả gia đình.' },
    { icon: '🌾', title: 'Truy xuất nguồn gốc', desc: 'Biết rõ từng lô hàng đến từ trang trại nào, thu hoạch ngày nào.' },
    { icon: '🚚', title: 'Giao hàng tận nơi', desc: 'Đặt hàng trực tuyến, nhận tại nhà trong vòng 24 giờ.' },
    { icon: '💰', title: 'Giá cả hợp lý', desc: 'Minh bạch giá, nhiều mã giảm giá, thanh toán linh hoạt.' },
];

const USER_QUICK = [
    { to: '/products', icon: '🛒', label: 'Sản phẩm', desc: 'Xem toàn bộ thực phẩm sạch', color: '#e8f5e9', border: '#c8e6c9' },
    { to: '/cart', icon: '🧺', label: 'Giỏ hàng', desc: 'Xem giỏ hàng của bạn', color: '#fff3e0', border: '#ffcc80' },
    { to: '/orders', icon: '📦', label: 'Đơn hàng', desc: 'Theo dõi đơn hàng', color: '#e3f2fd', border: '#90caf9' },
    { to: '/wishlist', icon: '❤️', label: 'Yêu thích', desc: 'Danh sách yêu thích', color: '#fce4ec', border: '#f48fb1' },
    { to: '/profile', icon: '👤', label: 'Tài khoản', desc: 'Cập nhật hồ sơ cá nhân', color: '#f3e5f5', border: '#ce93d8' },
];

const ADMIN_QUICK = [
    { to: '/admin/dashboard', icon: '📊', label: 'Dashboard', desc: 'Thống kê & tổng quan' },
    { to: '/admin/products', icon: '🥬', label: 'Sản phẩm', desc: 'Quản lý sản phẩm' },
    { to: '/admin/categories', icon: '🏷️', label: 'Danh mục', desc: 'Phân loại sản phẩm' },
    { to: '/admin/farms', icon: '🌾', label: 'Trang trại', desc: 'Quản lý trang trại' },
    { to: '/admin/batches', icon: '📋', label: 'Lô hàng', desc: 'Quản lý lô hàng' },
    { to: '/admin/inventory', icon: '🏪', label: 'Tồn kho', desc: 'Báo cáo tồn kho' },
    { to: '/admin/orders', icon: '🧾', label: 'Đơn hàng', desc: 'Xử lý đơn hàng' },
    { to: '/admin/discounts', icon: '🎟️', label: 'Giảm giá', desc: 'Mã khuyến mãi' },
    { to: '/admin/users', icon: '👥', label: 'Người dùng', desc: 'Phân quyền tài khoản' },
];

const HomePage = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const name = user?.name || user?.email || 'bạn';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--c-bg)' }}>

            {/* ── Hero ─────────────────────────────────────── */}
            <div style={{
                background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 40%, #388e3c 75%, #43a047 100%)',
                padding: '56px 24px 64px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative circles */}
                <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
                <div style={{ position: 'absolute', bottom: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />

                <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
                    <div style={{ fontSize: 56, marginBottom: 12, lineHeight: 1 }}>🥗</div>
                    <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.15, letterSpacing: '-.02em' }}>
                        Xin chào, <span style={{ color: '#a5d6a7' }}>{name}</span>!
                    </h1>
                    <p style={{ fontSize: 17, color: 'rgba(255,255,255,.85)', marginBottom: 28, lineHeight: 1.6, maxWidth: 520, margin: '0 auto 28px' }}>
                        Chào mừng bạn đến với <strong>Clean Food Store</strong> — nơi mua sắm thực phẩm sạch, an toàn và truy xuất nguồn gốc rõ ràng.
                    </p>
                    {isAdmin && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.15)', border: '1.5px solid rgba(255,255,255,.25)', borderRadius: 9999, padding: '5px 14px', marginBottom: 24 }}>
                            <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>⚡ Chế độ Admin</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                        <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 28px', background: '#fff', color: '#2e7d32', borderRadius: 8, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.15)', transition: 'transform .2s' }}>
                            🛒 Mua sắm ngay
                        </Link>
                        {isAdmin && (
                            <Link to="/admin/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 28px', background: 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 15, border: '2px solid rgba(255,255,255,.4)', textDecoration: 'none' }}>
                                📊 Admin Dashboard
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Feature cards ─────────────────────────────── */}
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
                    {FEATURES.map((f) => (
                        <div key={f.title} style={{ background: '#fff', borderRadius: 16, padding: '22px 20px', border: '1.5px solid #c8e6c9', boxShadow: '0 2px 10px rgba(46,125,50,.07)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                            <div style={{ width: 44, height: 44, background: '#e8f5e9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{f.icon}</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a2e1a', marginBottom: 4 }}>{f.title}</div>
                                <div style={{ fontSize: 13, color: '#78939a', lineHeight: 1.5 }}>{f.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── User quick links ──────────────────────── */}
                {!isAdmin && (
                    <div style={{ marginBottom: 40 }}>
                        <h2 className="section-title">Truy cập nhanh</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
                            {USER_QUICK.map((item) => (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    style={{ background: item.color, border: `1.5px solid ${item.border}`, borderRadius: 14, padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, textDecoration: 'none', transition: 'transform .2s, box-shadow .2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                                >
                                    <span style={{ fontSize: 28 }}>{item.icon}</span>
                                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1a2e1a' }}>{item.label}</span>
                                    <span style={{ fontSize: 12, color: '#4a7c59' }}>{item.desc}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Admin quick links ─────────────────────── */}
                {isAdmin && (
                    <div style={{ marginBottom: 40 }}>
                        <h2 className="section-title">Quản trị hệ thống</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                            {ADMIN_QUICK.map((item) => (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    style={{ background: '#fff', border: '1.5px solid #c8e6c9', borderRadius: 14, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, textDecoration: 'none', boxShadow: '0 1px 6px rgba(46,125,50,.06)', transition: 'all .2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f8e9'; e.currentTarget.style.borderColor = '#2e7d32'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#c8e6c9'; e.currentTarget.style.transform = ''; }}
                                >
                                    <span style={{ fontSize: 24 }}>{item.icon}</span>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1a2e1a' }}>{item.label}</span>
                                    <span style={{ fontSize: 12, color: '#78939a' }}>{item.desc}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Footer note ─────────────────────────────── */}
                <div style={{ textAlign: 'center', padding: '24px 0 40px', borderTop: '1px solid #e8f5e9' }}>
                    <p style={{ fontSize: 13, color: '#78939a' }}>🌿 Clean Food Store — Thực phẩm sạch vì sức khỏe cộng đồng</p>
                </div>
            </div>
        </div>
    );
};

export default HomePage;

