import { useState, useEffect, useCallback } from 'react';
import '../styles/shared.css';
import '../styles/admin/demo-tools.css';
import { demoToolsService } from '../services/demoToolsService';
import SearchInput from '../components/SearchInput';
import Modal from '../components/Modal';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  const toggleSort = (colName) => {
    if (sortBy === colName) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(colName);
      setSortDir('asc');
    }
    setPage(1);
  };

  // Debounce search input so we don't hit the API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const currentTable = tables.find((t) => t.name === selectedTable);
  const columns = currentTable ? currentTable.columns : [];

  const loadRows = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const res = await demoToolsService.getRows(selectedTable, { page, pageSize, search: debouncedSearch, sortBy, sortDir });
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
  }, [selectedTable, page, pageSize, debouncedSearch, sortBy, sortDir]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // Back to page 1 and clear sort whenever the table changes
  useEffect(() => {
    setPage(1);
    setSortBy('');
    setSortDir('asc');
  }, [selectedTable]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // ===== Edit row modal =====
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOriginal, setEditOriginal] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);

  const getCellValue = (row, colName) => {
    if (colName in row) return row[colName];
    const key = Object.keys(row).find((k) => k.toLowerCase() === colName.toLowerCase());
    return key !== undefined ? row[key] : null;
  };

  const isTimestampCol = (col) => col.storeType.startsWith('timestamp') || col.clrType === 'DateTime';

  const toInputValue = (col, value) => {
    if (value === null || value === undefined) return '';
    if (isTimestampCol(col)) return String(value).slice(0, 16); // datetime-local wants yyyy-MM-ddTHH:mm
    return String(value);
  };

  const openEditModal = (row) => {
    const values = {};
    columns.forEach((col) => {
      values[col.name] = toInputValue(col, getCellValue(row, col.name));
    });
    setEditOriginal(row);
    setEditValues(values);
    setShowEditModal(true);
  };

  const buildPk = (row) => {
    const pk = {};
    columns.filter((c) => c.isPrimaryKey).forEach((c) => {
      pk[c.name] = getCellValue(row, c.name);
    });
    return pk;
  };

  const handleSaveEdit = () => {
    if (!editOriginal) return;
    // Only send columns the user actually changed — avoids rewriting bytea placeholders etc.
    const changed = {};
    columns.forEach((col) => {
      if (col.isPrimaryKey) return;
      const original = toInputValue(col, getCellValue(editOriginal, col.name));
      if (editValues[col.name] !== original) {
        changed[col.name] = editValues[col.name] === '' && col.isNullable ? null : editValues[col.name];
      }
    });
    if (Object.keys(changed).length === 0) {
      if (window.showToast) window.showToast('Không có thay đổi nào', 'info');
      return;
    }

    const doSave = async () => {
      setSaving(true);
      try {
        const res = await demoToolsService.updateRow(selectedTable, buildPk(editOriginal), changed);
        if (res && res.success) {
          if (window.showToast) window.showToast(res.message, 'success');
          setShowEditModal(false);
          loadRows();
        } else if (window.showToast) {
          window.showToast(res?.message || 'Cập nhật thất bại', 'error');
        }
      } catch (e) {
        if (window.showToast) window.showToast(e.response?.data?.message || 'Lỗi cập nhật row', 'error');
      } finally {
        setSaving(false);
      }
    };

    if (window.showConfirm) {
      window.showConfirm(
        'Xác nhận cập nhật',
        `Cập nhật ${Object.keys(changed).length} cột của bảng "${selectedTable}"? Thay đổi có hiệu lực thật trên database.`,
        doSave
      );
    } else {
      doSave();
    }
  };

  const renderFieldInput = (col, value, onChange, disabled = false) => {
    if (col.enumLabels) {
      return (
        <select className="form-select form-select-sm" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
          {col.isNullable && <option value="">null</option>}
          {Object.entries(col.enumLabels).map(([num, label]) => (
            <option key={num} value={num}>{num} — {label}</option>
          ))}
        </select>
      );
    }
    if (col.clrType === 'Boolean') {
      return (
        <select className="form-select form-select-sm" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
          {col.isNullable && <option value="">null</option>}
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }
    if (isTimestampCol(col)) {
      return (
        <input type="datetime-local" step="1" className="form-control form-control-sm" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      );
    }
    if (['Int32', 'Int64', 'Int16', 'Byte', 'Decimal', 'Double', 'Single'].includes(col.clrType)) {
      return (
        <input type="number" step="any" className="form-control form-control-sm" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      );
    }
    return (
      <input type="text" className="form-control form-control-sm" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    );
  };

  // ===== Insert row modal =====
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertValues, setInsertValues] = useState({});

  const openInsertModal = () => {
    const values = {};
    columns.filter((c) => !c.isAutoGenerated).forEach((col) => {
      values[col.name] = '';
    });
    setInsertValues(values);
    setShowInsertModal(true);
  };

  const handleInsert = () => {
    const values = {};
    Object.entries(insertValues).forEach(([name, v]) => {
      const col = columns.find((c) => c.name === name);
      if (v === '') {
        if (col?.isNullable) values[name] = null;
        // empty + not nullable: skip so the DB default applies (or DB reports the missing column)
      } else {
        values[name] = v;
      }
    });

    const doInsert = async () => {
      setSaving(true);
      try {
        const res = await demoToolsService.insertRow(selectedTable, values);
        if (res && res.success) {
          if (window.showToast) window.showToast(res.message, 'success');
          setShowInsertModal(false);
          loadRows();
        } else if (window.showToast) {
          window.showToast(res?.message || 'Thêm row thất bại', 'error');
        }
      } catch (e) {
        if (window.showToast) window.showToast(e.response?.data?.message || 'Lỗi thêm row', 'error');
      } finally {
        setSaving(false);
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Xác nhận thêm row', `Thêm row mới vào bảng "${selectedTable}"?`, doInsert);
    } else {
      doInsert();
    }
  };

  const handleDelete = (row) => {
    const pk = buildPk(row);
    const pkText = Object.entries(pk).map(([k, v]) => `${k}=${v}`).join(', ');

    const doDelete = async () => {
      try {
        const res = await demoToolsService.deleteRow(selectedTable, pk);
        if (res && res.success) {
          if (window.showToast) window.showToast(res.message, 'success');
          loadRows();
        } else if (window.showToast) {
          window.showToast(res?.message || 'Xóa thất bại', 'error');
        }
      } catch (e) {
        if (window.showToast) window.showToast(e.response?.data?.message || 'Lỗi xóa row', 'error');
      }
    };

    if (window.showConfirm) {
      window.showConfirm(
        'Xác nhận XÓA row',
        `Xóa row (${pkText}) khỏi bảng "${selectedTable}"? Hành động này KHÔNG thể hoàn tác — dữ liệu mất thật trên database.`,
        doDelete
      );
    } else {
      doDelete();
    }
  };

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
          <button className="btn btn-info text-white fw-bold btn-sm" onClick={openInsertModal} disabled={!currentTable}>
            <i className="fas fa-plus me-1"></i> Thêm row
          </button>
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

      <div className="mb-3" style={{ maxWidth: '400px' }}>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Tìm trên mọi cột..." />
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
                  <th
                    key={col.name}
                    className="text-nowrap small"
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleSort(col.name)}
                    title="Bấm để sort"
                  >
                    {col.name}
                    {col.isPrimaryKey && <i className="fas fa-key text-warning ms-1" style={{ fontSize: '0.6rem' }}></i>}
                    {sortBy === col.name && (
                      <i className={`fas fa-sort-${sortDir === 'asc' ? 'up' : 'down'} text-cyan ms-1`}></i>
                    )}
                  </th>
                ))}
                <th className="small" style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={(columns.length || 1) + 1} className="text-center py-4 text-muted">Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={(columns.length || 1) + 1} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} style={{ cursor: 'pointer' }} onClick={() => openEditModal(row)} title="Bấm để sửa row">
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
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-sm btn-outline-danger border-0 py-0 px-1"
                        title="Xóa row"
                        onClick={() => handleDelete(row)}
                      >
                        <i className="fas fa-trash-alt" style={{ fontSize: '0.75rem' }}></i>
                      </button>
                    </td>
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

      {/* Edit row modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Sửa row — ${selectedTable}`}
        maxWidth="640px"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setShowEditModal(false)} disabled={saving}>Hủy</button>
            <button className="btn btn-info text-white fw-bold" onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {columns.map((col) => (
            <div key={col.name} className="row align-items-center mb-2">
              <div className="col-4 small fw-bold text-truncate" title={`${col.name} (${col.storeType})`}>
                {col.name}
                {col.isPrimaryKey && <i className="fas fa-key text-warning ms-1" style={{ fontSize: '0.6rem' }}></i>}
                {!col.isNullable && !col.isPrimaryKey && <span className="text-danger">*</span>}
              </div>
              <div className="col-8">
                {renderFieldInput(
                  col,
                  editValues[col.name] ?? '',
                  (v) => setEditValues((prev) => ({ ...prev, [col.name]: v })),
                  col.isPrimaryKey
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Insert row modal */}
      <Modal
        isOpen={showInsertModal}
        onClose={() => setShowInsertModal(false)}
        title={`Thêm row — ${selectedTable}`}
        maxWidth="640px"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setShowInsertModal(false)} disabled={saving}>Hủy</button>
            <button className="btn btn-info text-white fw-bold" onClick={handleInsert} disabled={saving}>
              {saving ? 'Đang thêm...' : 'Thêm row'}
            </button>
          </>
        }
      >
        <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          <div className="text-muted small mb-2">Cột auto-generated (identity) được DB tự sinh. Để trống = null (hoặc default của DB).</div>
          {columns.filter((c) => !c.isAutoGenerated).map((col) => (
            <div key={col.name} className="row align-items-center mb-2">
              <div className="col-4 small fw-bold text-truncate" title={`${col.name} (${col.storeType})`}>
                {col.name}
                {!col.isNullable && <span className="text-danger">*</span>}
              </div>
              <div className="col-8">
                {renderFieldInput(
                  col,
                  insertValues[col.name] ?? '',
                  (v) => setInsertValues((prev) => ({ ...prev, [col.name]: v }))
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default AdminDemoTools;
