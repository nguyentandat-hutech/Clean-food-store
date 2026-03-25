import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, Send, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
    getReviewsAPI,
    createReviewAPI,
    updateReviewAPI,
    deleteReviewAPI,
} from '../api/reviewService';
import '../styles/product-reviews.css';

/**
 * Render N ngôi sao (filled/empty).
 * @param {number} rating - Số sao (1-5)
 * @param {number} size - Kích thước icon (px)
 */
const StarDisplay = ({ rating, size = 16 }) => {
    return (
        <>
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    size={size}
                    className={star <= rating ? 'star-filled' : 'star-empty'}
                    fill={star <= rating ? '#ffa726' : 'none'}
                />
            ))}
        </>
    );
};

/**
 * Component hiển thị đánh giá sản phẩm + form gửi đánh giá.
 * Đặt tại trang chi tiết sản phẩm.
 *
 * @param {{ productId: string }} props
 */
function ProductReviews({ productId }) {
    const { user } = useAuth();

    // State
    const [reviews, setReviews] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [productRating, setProductRating] = useState({ averageRating: 0, reviewCount: 0 });
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [formRating, setFormRating] = useState(5);
    const [formComment, setFormComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    // Edit state
    const [editingReview, setEditingReview] = useState(null);

    // ── Lấy danh sách reviews ──────────────────────────────────
    const fetchReviews = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getReviewsAPI(productId, { page, limit: 5 });
            setReviews(data.reviews);
            setPagination(data.pagination);
            setProductRating(data.productRating);
        } catch (err) {
            console.error('Lỗi khi tải đánh giá:', err);
        } finally {
            setLoading(false);
        }
    }, [productId, page]);

    useEffect(() => {
        if (productId) {
            fetchReviews();
        }
    }, [fetchReviews, productId]);

    // ── Kiểm tra user đã đánh giá chưa ────────────────────────
    const userExistingReview = reviews.find(
        (r) => r.userId?._id === user?._id
    );

    // ── Bắt đầu sửa review ────────────────────────────────────
    const startEdit = (review) => {
        setEditingReview(review);
        setFormRating(review.rating);
        setFormComment(review.comment);
        setShowForm(true);
        setFormError('');
        setFormSuccess('');
    };

    // ── Reset form ─────────────────────────────────────────────
    const resetForm = () => {
        setShowForm(false);
        setEditingReview(null);
        setFormRating(5);
        setFormComment('');
        setFormError('');
        setFormSuccess('');
    };

    // ── Submit review (tạo mới hoặc cập nhật) ──────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        if (formComment.trim().length < 2) {
            setFormError('Bình luận phải có ít nhất 2 ký tự.');
            return;
        }

        setSubmitting(true);

        try {
            if (editingReview) {
                await updateReviewAPI(editingReview._id, {
                    rating: formRating,
                    comment: formComment.trim(),
                });
                setFormSuccess('Đã cập nhật đánh giá thành công!');
            } else {
                await createReviewAPI({
                    productId,
                    rating: formRating,
                    comment: formComment.trim(),
                });
                setFormSuccess('Đã gửi đánh giá thành công!');
            }

            // Refresh danh sách
            await fetchReviews();

            // Reset form sau 1.5 giây
            setTimeout(() => {
                resetForm();
            }, 1500);
        } catch (err) {
            const msg = err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
            setFormError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Xóa review ─────────────────────────────────────────────
    const handleDelete = async (reviewId) => {
        if (!window.confirm('Bạn có chắc muốn xóa đánh giá này?')) return;

        try {
            await deleteReviewAPI(reviewId);
            await fetchReviews();
        } catch (err) {
            const msg = err.response?.data?.message || 'Không thể xóa đánh giá.';
            alert(msg);
        }
    };

    // ── Format ngày ────────────────────────────────────────────
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    // ── Lấy chữ cái đầu của tên user làm avatar ────────────────
    const getInitial = (name) => {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    };

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="reviews-section">
            {/* Header với rating tổng quan */}
            <div className="reviews-header">
                <h2>⭐ Đánh giá sản phẩm</h2>
                {productRating.reviewCount > 0 && (
                    <div className="rating-summary">
                        <span className="rating-summary-value">
                            {productRating.averageRating}
                        </span>
                        <div className="rating-summary-stars">
                            <StarDisplay rating={Math.round(productRating.averageRating)} size={18} />
                        </div>
                        <span className="rating-summary-count">
                            ({productRating.reviewCount} đánh giá)
                        </span>
                    </div>
                )}
            </div>

            {/* Prompt đăng nhập nếu chưa đăng nhập */}
            {!user && (
                <div className="review-login-prompt">
                    Vui lòng <Link to="/login">đăng nhập</Link> để viết đánh giá.
                </div>
            )}

            {/* Nút viết đánh giá (chỉ hiện khi user đã đăng nhập + chưa đánh giá + chưa mở form) */}
            {user && !userExistingReview && !showForm && (
                <button
                    className="btn-submit-review"
                    onClick={() => {
                        setShowForm(true);
                        setFormError('');
                        setFormSuccess('');
                    }}
                    style={{ marginBottom: 16 }}
                >
                    <Pencil size={16} />
                    Viết đánh giá
                </button>
            )}

            {/* Form đánh giá */}
            {showForm && (
                <form className="review-form" onSubmit={handleSubmit}>
                    <h3>{editingReview ? 'Sửa đánh giá' : 'Viết đánh giá mới'}</h3>

                    {/* Chọn số sao */}
                    <div className="review-form-rating">
                        <label>Số sao:</label>
                        <div className="star-picker">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className="star-picker-btn"
                                    onClick={() => setFormRating(star)}
                                    title={`${star} sao`}
                                >
                                    <Star
                                        size={24}
                                        className={star <= formRating ? 'star-filled' : 'star-empty'}
                                        fill={star <= formRating ? '#ffa726' : 'none'}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                        value={formComment}
                        onChange={(e) => setFormComment(e.target.value)}
                        placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                        maxLength={1000}
                        required
                    />

                    {/* Alerts */}
                    {formError && <div className="review-alert error">{formError}</div>}
                    {formSuccess && <div className="review-alert success">{formSuccess}</div>}

                    {/* Action buttons */}
                    <div className="review-form-actions">
                        <button
                            type="submit"
                            className="btn-submit-review"
                            disabled={submitting || formComment.trim().length < 2}
                        >
                            {submitting ? (
                                'Đang gửi...'
                            ) : (
                                <>
                                    <Send size={16} />
                                    {editingReview ? 'Cập nhật' : 'Gửi đánh giá'}
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            className="btn-cancel-review"
                            onClick={resetForm}
                        >
                            Hủy
                        </button>
                    </div>
                </form>
            )}

            {/* Loading */}
            {loading && <p style={{ textAlign: 'center', color: '#9e9e9e' }}>Đang tải đánh giá...</p>}

            {/* Danh sách reviews */}
            {!loading && reviews.length === 0 && (
                <div className="reviews-empty">
                    Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên! 🌟
                </div>
            )}

            {!loading && reviews.length > 0 && (
                <div className="review-list">
                    {reviews.map((review) => (
                        <div key={review._id} className="review-item">
                            {/* Avatar */}
                            <div className="review-avatar">
                                {getInitial(review.userId?.name)}
                            </div>

                            {/* Content */}
                            <div className="review-content">
                                <div className="review-meta">
                                    <span className="review-user-name">
                                        {review.userId?.name || 'Ẩn danh'}
                                    </span>
                                    <span className="review-date">
                                        {formatDate(review.createdAt)}
                                    </span>
                                </div>
                                <div className="review-stars">
                                    <StarDisplay rating={review.rating} size={14} />
                                </div>
                                <p className="review-comment">{review.comment}</p>

                                {/* Actions - chỉ hiện cho chủ review hoặc admin */}
                                {user && (user._id === review.userId?._id || user.role === 'admin') && (
                                    <div className="review-actions">
                                        {user._id === review.userId?._id && (
                                            <button
                                                className="btn-review-action"
                                                onClick={() => startEdit(review)}
                                            >
                                                <Pencil size={14} /> Sửa
                                            </button>
                                        )}
                                        <button
                                            className="btn-review-action delete"
                                            onClick={() => handleDelete(review._id)}
                                        >
                                            <Trash2 size={14} /> Xóa
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="reviews-pagination">
                    <button
                        className="btn-page"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        ← Trước
                    </button>
                    <span className="page-info">
                        Trang {pagination.currentPage} / {pagination.totalPages}
                    </span>
                    <button
                        className="btn-page"
                        disabled={page >= pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Sau →
                    </button>
                </div>
            )}
        </div>
    );
}

export default ProductReviews;
