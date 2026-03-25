import { useState, useEffect } from 'react';
import { getAllCategoriesAPI } from '../api/categoryService';
import { getAllFarmsAPI } from '../api/farmService';

/**
 * FilterBar — Bộ lọc nâng cao cho sản phẩm.
 * @param {{ onFilter: function }} props
 *   onFilter(filterParams) — callback khi user thay đổi bộ lọc
 */
function FilterBar({ onFilter }) {
    // State danh sách dropdown
    const [categories, setCategories] = useState([]);
    const [farms, setFarms] = useState([]);

    // State giá trị filter hiện tại
    const [filters, setFilters] = useState({
        category: '',
        farm: '',
        standards: '',
        minPrice: '',
        maxPrice: '',
    });

    // Lấy danh sách danh mục & trang trại cho dropdown
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catResult, farmResult] = await Promise.all([
                    getAllCategoriesAPI({ limit: 50 }),
                    getAllFarmsAPI({ limit: 50 }),
                ]);
                setCategories(catResult.categories || []);
                setFarms(farmResult.farms || []);
            } catch (error) {
                console.error('Lỗi khi tải dữ liệu filter:', error);
            }
        };
        fetchData();
    }, []);

    // Xử lý thay đổi giá trị filter
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    // Áp dụng bộ lọc
    const handleApply = () => {
        // Chỉ gửi những filter có giá trị
        const activeFilters = {};
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== '' && value !== undefined) {
                activeFilters[key] = value;
            }
        });
        onFilter(activeFilters);
    };

    // Xóa tất cả bộ lọc
    const handleClear = () => {
        setFilters({ category: '', farm: '', standards: '', minPrice: '', maxPrice: '' });
        onFilter({}); // Reset
    };

    const labelStyle = { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold', color: '#495057' };
    const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' };

    return (
        <div style={{
            padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px',
            marginBottom: '20px', border: '1px solid #dee2e6',
        }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>🔎 Bộ lọc nâng cao</h3>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {/* Danh mục */}
                <div style={{ minWidth: '160px', flex: 1 }}>
                    <label style={labelStyle}>Danh mục</label>
                    <select name="category" value={filters.category} onChange={handleChange} style={inputStyle}>
                        <option value="">Tất cả</option>
                        {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                {/* Trang trại */}
                <div style={{ minWidth: '160px', flex: 1 }}>
                    <label style={labelStyle}>Trang trại</label>
                    <select name="farm" value={filters.farm} onChange={handleChange} style={inputStyle}>
                        <option value="">Tất cả</option>
                        {farms.map((f) => (
                            <option key={f._id} value={f._id}>{f.name}</option>
                        ))}
                    </select>
                </div>

                {/* Tiêu chuẩn */}
                <div style={{ minWidth: '140px', flex: 1 }}>
                    <label style={labelStyle}>Tiêu chuẩn</label>
                    <select name="standards" value={filters.standards} onChange={handleChange} style={inputStyle}>
                        <option value="">Tất cả</option>
                        <option value="VietGAP">VietGAP</option>
                        <option value="Organic">Organic</option>
                        <option value="GlobalGAP">GlobalGAP</option>
                        <option value="Khác">Khác</option>
                    </select>
                </div>

                {/* Giá tối thiểu */}
                <div style={{ minWidth: '120px', flex: 1 }}>
                    <label style={labelStyle}>Giá từ (VNĐ)</label>
                    <input type="number" name="minPrice" value={filters.minPrice} onChange={handleChange}
                        min="0" step="1000" placeholder="0" style={inputStyle} />
                </div>

                {/* Giá tối đa */}
                <div style={{ minWidth: '120px', flex: 1 }}>
                    <label style={labelStyle}>Giá đến (VNĐ)</label>
                    <input type="number" name="maxPrice" value={filters.maxPrice} onChange={handleChange}
                        min="0" step="1000" placeholder="1000000" style={inputStyle} />
                </div>

                {/* Nút áp dụng & xóa */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleApply}
                        style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        Áp dụng
                    </button>
                    <button onClick={handleClear}
                        style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        Xóa lọc
                    </button>
                </div>
            </div>
        </div>
    );
}

export default FilterBar;
