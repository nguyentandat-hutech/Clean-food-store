import apiClient from '../services/apiClient';

// ── API Lô hàng (Batch) ────────────────────────────────────────

/**
 * Lấy danh sách tất cả lô hàng (có phân trang, filter).
 * @param {object} params - Query params: { page, limit, product, expired }
 * @returns {{ batches: Array, pagination: object }}
 */
export const getAllBatchesAPI = async (params = {}) => {
    const res = await apiClient.get('/batches', { params });
    return res.data.data;
};

/**
 * Lấy chi tiết 1 lô hàng theo ID.
 * @param {string} id - ID lô hàng
 * @returns {{ batch: object }}
 */
export const getBatchByIdAPI = async (id) => {
    const res = await apiClient.get(`/batches/${id}`);
    return res.data.data;
};

/**
 * Tạo lô hàng mới (Admin only).
 * @param {object} data - { product, batchNumber, quantity, manufacturingDate, expiryDate }
 * @returns {{ batch: object }}
 */
export const createBatchAPI = async (data) => {
    const res = await apiClient.post('/batches', data);
    return res.data.data;
};

/**
 * Cập nhật thông tin lô hàng (Admin only).
 * @param {string} id   - ID lô hàng
 * @param {object} data - Dữ liệu cần cập nhật
 * @returns {{ batch: object }}
 */
export const updateBatchAPI = async (id, data) => {
    const res = await apiClient.put(`/batches/${id}`, data);
    return res.data.data;
};

/**
 * Xóa lô hàng (Admin only).
 * @param {string} id - ID lô hàng
 * @returns {{ id: string, batchNumber: string }}
 */
export const deleteBatchAPI = async (id) => {
    const res = await apiClient.delete(`/batches/${id}`);
    return res.data.data;
};

/**
 * Lấy tồn kho thực tế của 1 sản phẩm (chỉ tính lô còn hạn).
 * @param {string} productId - ID sản phẩm
 */
export const getEffectiveStockAPI = async (productId) => {
    const res = await apiClient.get(`/batches/stock/${productId}`);
    return res.data.data;
};

/**
 * Báo cáo tồn kho tổng hợp: tất cả sản phẩm + tồn kho thực tế.
 * @returns {{ report: Array }}
 */
export const getInventoryReportAPI = async () => {
    const res = await apiClient.get('/batches/inventory-report');
    return res.data.data;
};

/**
 * Lấy danh sách lô sắp hết hạn trong N ngày tới.
 * @param {number} days - Số ngày (mặc định 7)
 * @returns {{ batches: Array }}
 */
export const getExpiringBatchesAPI = async (days = 7) => {
    const res = await apiClient.get('/batches/expiring', { params: { days } });
    return res.data.data;
};
