import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ScanLine, Upload, X, CheckCircle, XCircle, HelpCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { scanFreshnessAPI } from '../api/aiService';
import '../styles/freshness-scanner.css';

// ── Hằng số cấu hình ──────────────────────────────────────────
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Format kích thước file sang dạng đọc được (KB / MB).
 * @param {number} bytes
 * @returns {string}
 */
const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * FreshnessScanner — Trang quét AI kiểm tra độ tươi thực phẩm.
 * Upload ảnh (drag & drop hoặc chọn file) → gửi lên API → hiển thị kết quả.
 */
function FreshnessScanner() {
    // ── State ──────────────────────────────────────────────────
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);

    const fileInputRef = useRef(null);

    // ── Validate file trước khi chấp nhận ──────────────────────
    const validateAndSetFile = useCallback((file) => {
        setError('');
        setResult(null);

        if (!file) return;

        // Kiểm tra định dạng
        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Định dạng không hỗ trợ! Chỉ chấp nhận file JPG hoặc PNG.');
            return;
        }

        // Kiểm tra kích thước
        if (file.size > MAX_FILE_SIZE) {
            setError(`File quá lớn (${formatFileSize(file.size)}). Kích thước tối đa cho phép là 5MB.`);
            return;
        }

        setSelectedFile(file);

        // Tạo preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    }, []);

    // ── Xử lý chọn file qua input ─────────────────────────────
    const handleFileChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
        // Reset input để có thể chọn lại cùng file
        e.target.value = '';
    }, [validateAndSetFile]);

    // ── Drag & Drop handlers ───────────────────────────────────
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
    }, [validateAndSetFile]);

    // ── Xóa ảnh preview ────────────────────────────────────────
    const handleRemoveFile = useCallback(() => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setResult(null);
        setError('');
    }, [previewUrl]);

    // ── Gửi ảnh lên API để AI phân tích ────────────────────────
    const handleScan = useCallback(async () => {
        if (!selectedFile) return;

        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const data = await scanFreshnessAPI(selectedFile);
            setResult(data);
        } catch (err) {
            const message =
                err.response?.data?.message ||
                (err.code === 'ECONNABORTED'
                    ? 'Hết thời gian chờ phản hồi từ AI. Vui lòng thử lại.'
                    : 'Có lỗi xảy ra khi phân tích ảnh. Vui lòng thử lại.');
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [selectedFile]);

    // ── Reset toàn bộ về trạng thái ban đầu ────────────────────
    const handleReset = useCallback(() => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setResult(null);
        setError('');
        setIsLoading(false);
    }, [previewUrl]);

    // ── Xác định CSS class cho result card ─────────────────────
    const getResultCardClass = () => {
        if (!result) return '';
        if (result.status === 'Tươi') return 'fresh';
        if (result.status === 'Không tươi') return 'not-fresh';
        return 'unknown';
    };

    // ── Xác định icon cho result ────────────────────────────────
    const getResultIcon = () => {
        if (!result) return null;
        if (result.status === 'Tươi') return <CheckCircle size={24} />;
        if (result.status === 'Không tươi') return <XCircle size={24} />;
        return <HelpCircle size={24} />;
    };

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="scanner-page">
            <div className="scanner-card">
                {/* Header */}
                <div className="scanner-header">
                    <div className="scanner-icon-wrapper">
                        <ScanLine size={28} />
                    </div>
                    <h1>Quét AI Kiểm Tra Độ Tươi</h1>
                    <p>Upload ảnh thực phẩm để AI đánh giá chất lượng</p>
                </div>

                {/* Drop Zone — chỉ hiện khi chưa có file */}
                {!selectedFile && !isLoading && !result && (
                    <div
                        className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="drop-zone-icon">
                            <Upload size={40} />
                        </div>
                        <p className="drop-zone-text">
                            Kéo thả ảnh vào đây hoặc{' '}
                            <span className="drop-zone-browse">chọn file</span>
                        </p>
                        <p className="drop-zone-hint">Chỉ chấp nhận JPG, PNG — Tối đa 5MB</p>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                )}

                {/* Image Preview */}
                {selectedFile && previewUrl && !isLoading && !result && (
                    <div className="preview-section">
                        <div className="preview-container">
                            <img
                                src={previewUrl}
                                alt="Preview ảnh thực phẩm"
                                className="preview-image"
                            />
                            <div className="preview-info">
                                <span className="preview-file-name">{selectedFile.name}</span>
                                <span className="preview-file-size">{formatFileSize(selectedFile.size)}</span>
                                <button
                                    type="button"
                                    className="btn-remove-preview"
                                    onClick={handleRemoveFile}
                                    title="Xóa ảnh"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Nút quét */}
                        <button
                            type="button"
                            className="btn-scan"
                            onClick={handleScan}
                            disabled={isLoading}
                        >
                            <ScanLine size={20} />
                            Quét AI Đánh Giá
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="loading-section">
                        <div className="loading-spinner" />
                        <p className="loading-text">AI đang phân tích ảnh...</p>
                        <p className="loading-hint">Quá trình này có thể mất vài giây</p>
                    </div>
                )}

                {/* Result Card */}
                {result && (
                    <div className="result-section">
                        {/* Preview ảnh nhỏ */}
                        {previewUrl && (
                            <div className="preview-container" style={{ marginBottom: '1rem' }}>
                                <img
                                    src={previewUrl}
                                    alt="Ảnh đã phân tích"
                                    className="preview-image"
                                />
                            </div>
                        )}

                        <div className={`result-card ${getResultCardClass()}`}>
                            {/* Status Header */}
                            <div className="result-header">
                                <div className="result-status-icon">
                                    {getResultIcon()}
                                </div>
                                <div>
                                    <div className="result-status-label">{result.status}</div>
                                    <div className="result-status-sub">Kết quả đánh giá AI</div>
                                </div>
                            </div>

                            {/* Confidence Bar */}
                            <div className="confidence-section">
                                <div className="confidence-header">
                                    <span className="confidence-label">Độ tin cậy</span>
                                    <span className="confidence-value">{result.confidence}%</span>
                                </div>
                                <div className="confidence-bar-track">
                                    <div
                                        className="confidence-bar-fill"
                                        style={{ width: `${result.confidence}%` }}
                                    />
                                </div>
                            </div>

                            {/* AI Message */}
                            <div className="result-message">
                                <div className="result-message-title">Nhận xét từ AI</div>
                                {result.message}
                            </div>
                        </div>

                        {/* Scan Again */}
                        <button
                            type="button"
                            className="btn-scan-again"
                            onClick={handleReset}
                        >
                            <RotateCcw size={18} />
                            Quét ảnh khác
                        </button>
                    </div>
                )}

                {/* Error Alert */}
                {error && (
                    <div className="scanner-error">
                        <AlertTriangle size={18} className="scanner-error-icon" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Footer / Back link */}
                <div className="scanner-footer">
                    <Link to="/">← Quay về trang chủ</Link>
                </div>
            </div>
        </div>
    );
}

export default FreshnessScanner;
