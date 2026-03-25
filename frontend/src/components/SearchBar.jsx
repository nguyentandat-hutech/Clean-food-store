import { useState } from 'react';

/**
 * SearchBar — Thanh tìm kiếm sản phẩm theo tên.
 * @param {{ onSearch: function }} props
 *   onSearch(searchText) — callback khi user nhấn tìm kiếm
 */
function SearchBar({ onSearch }) {
    const [searchText, setSearchText] = useState('');

    // Xử lý submit form tìm kiếm
    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(searchText.trim());
    };

    // Xử lý xóa tìm kiếm
    const handleClear = () => {
        setSearchText('');
        onSearch(''); // Reset kết quả
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Tìm kiếm sản phẩm theo tên..."
                style={{
                    flex: 1, padding: '10px 14px', border: '1px solid #ced4da',
                    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box',
                }}
            />
            <button
                type="submit"
                style={{
                    padding: '10px 20px', backgroundColor: '#007bff', color: '#fff',
                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
                }}
            >
                🔍 Tìm kiếm
            </button>
            {searchText && (
                <button
                    type="button"
                    onClick={handleClear}
                    style={{
                        padding: '10px 16px', backgroundColor: '#6c757d', color: '#fff',
                        border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
                    }}
                >
                    Xóa
                </button>
            )}
        </form>
    );
}

export default SearchBar;
