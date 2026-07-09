import { useState, useEffect, useCallback } from 'react';
import '../styles/shared.css';
import '../styles/admin/demo-tools.css';
import { demoToolsService } from '../services/demoToolsService';

// Demo-only page: browse and edit raw database tables so demo scenarios
// (booking times, statuses...) can be tweaked without opening Supabase.
export const AdminDemoTools = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('bookings');

  const currentTable = tables.find((t) => t.name === selectedTable);

  useEffect(() => {
    const loadTables = async () => {
      try {
        const res = await demoToolsService.getTables();
        if (res && res.success) {
          setTables(res.tables);
          if (!res.tables.some((t) => t.name === 'bookings') && res.tables.length > 0) {
            setSelectedTable(res.tables[0].name);
          }
        } else if (window.showToast) {
          window.showToast('Không thể tải danh sách bảng', 'error');
        }
      } catch (e) {
        console.error('Failed to load tables', e);
        if (window.showToast) window.showToast('Lỗi tải danh sách bảng', 'error');
      }
    };
    loadTables();
  }, []);

  return (
    <div className="p-4">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="fas fa-database text-cyan me-2"></i>
            Demo Tool: Database
          </h3>
          <small className="text-muted">
            Chỉnh sửa dữ liệu trực tiếp phục vụ demo — thao tác ghi có hiệu lực thật trên database.
          </small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <label className="fw-bold text-muted small mb-0">Bảng:</label>
          <select
            className="form-select"
            style={{ minWidth: '220px' }}
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
          >
            {tables.map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {currentTable && (
        <div className="text-muted small mb-3">
          {currentTable.columns.length} cột — PK: {currentTable.columns.filter((c) => c.isPrimaryKey).map((c) => c.name).join(', ') || '(không có)'}
        </div>
      )}
    </div>
  );
};

export default AdminDemoTools;
