import apiClient from '../services/apiClient';

/**
 * Gửi ảnh thực phẩm lên API để AI đánh giá độ tươi.
 * @param {File} imageFile - File ảnh (JPG/PNG) từ input hoặc drag-drop
 * @returns {Promise<{ status: string, confidence: number, message: string }>}
 */
export const scanFreshnessAPI = async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const res = await apiClient.post('/ai/scan-freshness', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // AI cần thời gian xử lý — timeout 30 giây
    });

    return res.data.data;
};
