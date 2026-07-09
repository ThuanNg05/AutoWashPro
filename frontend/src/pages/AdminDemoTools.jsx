import { useState, useEffect, useCallback } from 'react';
import '../styles/shared.css';
import '../styles/admin/demo-tools.css';
import { demoToolsService } from '../services/demoToolsService';

// Demo-only page: browse and edit raw database tables so demo scenarios
// (booking times, statuses...) can be tweaked without opening Supabase.
export const AdminDemoTools = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('bookings');
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const currentTable = tables.find((t) => t.name === selectedTable);
  const columns = currentTable ? currentTable.columns : [];

  const loadRows = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const res = await demoToolsService.getRows(selectedTable, { page, pageSize });
      if (res && res.success) {
        setRows(res.rows);
        setTotalCount(res.totalCount);
      } else if (window.showToast) {
        window.showToast(res?.message || 'Không thể tải dữ liệu', 'error');
      }
    } catch (e) {
      console.error('Failed to load rows', e);
      if (window.showToast) window.showToast(e.response?.data?.message || 'Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTable, page, pageSize]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // Back to page 1 whenever the table changes
  useEffect(() => {
    setPage(1);
  }, [selectedTable]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const formatCell = (value) => {
    if (value === null || value === undefined) return <span className="text-muted fst-italic">null</span>;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    const s = String(value);
    return s.length > 60 ? s.slice(0, 60) + '…' : s;
  };

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
          {totalCount} row — PK: {currentTable.columns.filter((c) => c.isPrimaryKey).map((c) => c.name).join(', ') || '(không có)'}
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0" style={{ overflowX: 'auto' }}>
          <table className="table table-hover align-middle mb-0 demo-tools-grid">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.name} className="text-nowrap small">
                    {col.name}
                    {col.isPrimaryKey && <i className="fas fa-key text-warning ms-1" style={{ fontSize: '0.6rem' }}></i>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length || 1} className="text-center py-4 text-muted">Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={columns.length || 1} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map((col) => {
                      const key = Object.keys(row).find((k) => k.toLowerCase() === col.name.toLowerCase());
                      return (
                        <td key={col.name} className="text-nowrap small">
                          {formatCell(key !== undefined ? row[key] : undefined)}
                          {col.enumLabels && row[key] !== null && row[key] !== undefined && col.enumLabels[row[key]] !== undefined && (
                            <span className="text-muted ms-1">({col.enumLabels[row[key]]})</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer bg-white d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Hiển thị</span>
            <select
              className="form-select form-select-sm"
              style={{ width: '80px' }}
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-muted small">/ trang — tổng {totalCount} row</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="text-muted small">Trang {page} / {totalPages}</span>
            <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDemoTools;
