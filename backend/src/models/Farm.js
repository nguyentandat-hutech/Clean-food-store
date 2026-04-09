// ============================================================
// FILE: backend/src/models/Farm.js
// Mục đích: Định nghĩa Schema cho Trang trại (đối tác cung cấp thực phẩm)
// Mỗi Farm đại diện cho 1 nhà cung cấp/trang trại thực phẩm sạch
// ============================================================

// Nhập mongoose để làm việc với MongoDB
const mongoose = require('mongoose');

// ── Tạo Schema cho Farm ────────────────────────────────────────────────────
const farmSchema = new mongoose.Schema(
    {
        // Tên trang trại (bắt buộc, phải duy nhất trong cùng địa điểm)
        name: {
            type: String,
            required: [true, 'Tên trang trại không được để trống'],
            trim: true,                                                 // Xóa khoảng trắng đầu/cuối
            minlength: [2, 'Tên trang trại phải có ít nhất 2 ký tự'],
            maxlength: [100, 'Tên trang trại không được vượt quá 100 ký tự'],
        },

        // Địa chỉ/tỉnh thành của trang trại
        location: {
            type: String,
            required: [true, 'Địa chỉ trang trại không được để trống'],
            trim: true,
            maxlength: [200, 'Địa chỉ không được vượt quá 200 ký tự'],
        },

        // Mô tả về trang trại (không bắt buộc)
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Mô tả không được vượt quá 1000 ký tự'],
            default: '',    // Mặc định là chuỗi rỗng nếu không nhập
        },

        // Thông tin liên hệ (số điện thoại hoặc email)
        contact: {
            type: String,
            required: [true, 'Thông tin liên hệ không được để trống'],
            trim: true,
            maxlength: [200, 'Thông tin liên hệ không được vượt quá 200 ký tự'],
        },

        // Chứng nhận tiêu chuẩn canh tác của trang trại
        certificate: {
            type: String,
            required: [true, 'Chứng nhận không được để trống'],
            enum: {
                // Chỉ chấp nhận 4 giá trị sau
                values: ['VietGAP', 'Organic', 'GlobalGAP', 'Khác'],
                message: 'Chứng nhận phải là: VietGAP, Organic, GlobalGAP hoặc Khác',
            },
        },

        // Trạng thái hoạt động của trang trại
        isActive: {
            type: Boolean,
            default: true,  // Mặc định là đang hoạt động
        },

        // Lưu ID của admin đã tạo farm này (dùng để audit — xem ai tạo)
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,   // Kiểu ObjectId (khóa ngoại)
            ref: 'User',                             // Tham chiếu đến collection "users"
            required: true,                          // Bắt buộc phải có
        },
    },
    {
        timestamps: true,   // Tự động thêm createdAt và updatedAt
    }
);

// ── Tạo Text Index để hỗ trợ tìm kiếm full-text trên name và location ─────
// Khi gọi search="Hà Nội", MongoDB sẽ tìm trong cả name lẫn location
farmSchema.index({ name: 'text', location: 'text' });

// Tạo Model từ Schema — Model tương ứng với collection "farms" trong MongoDB
const Farm = mongoose.model('Farm', farmSchema);

// Xuất để sử dụng ở các file khác
module.exports = Farm;
