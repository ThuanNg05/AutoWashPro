import { useState, useEffect, useCallback, useMemo } from 'react';
import '../styles/shared.css';
import '../styles/admin/demo-tools.css';
import { demoToolsService } from '../services/demoToolsService';
import Modal from '../components/Modal';

// Demo-only page: browse and edit raw database tables so demo scenarios
// (booking times, statuses...) can be tweaked without opening Supabase.
// Layout mirrors the Supabase Table Editor: table list on the left, data grid
// with a toolbar + footer on the right.
export const AdminDemoTools = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('bookings');
  const [tableFilter, setTableFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedKeys, setSelectedKeys] = useState(new Set());

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
  const columns = useMemo(() => (currentTable ? currentTable.columns : []), [currentTable]);
  const pkColumns = useMemo(() => columns.filter((c) => c.isPrimaryKey), [columns]);

  const filteredTables = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    return q ? tables.filter((t) => t.name.toLowerCase().includes(q)) : tables;
  }, [tables, tableFilter]);

  const loadRows = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    setSelectedKeys(new Set());
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

  // Back to page 1, clear sort/search whenever the table changes
  useEffect(() => {
    setPage(1);
    setSortBy('');
    setSortDir('asc');
    setSearchTerm('');
  }, [selectedTable]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const getCellValue = (row, colName) => {
    if (colName in row) return row[colName];
    const key = Object.keys(row).find((k) => k.toLowerCase() === colName.toLowerCase());
    return key !== undefined ? row[key] : null;
  };

  const rowKey = useCallback((row) => {
    if (pkColumns.length === 0) return JSON.stringify(row);
    return pkColumns.map((c) => `${c.name}=${getCellValue(row, c.name)}`).join('|');
  }, [pkColumns]);

  // Short Postgres type label for the column header (int4, timestamp, varchar...)
  const shortType = (storeType) => {
    if (!storeType) return '';
    const t = storeType.toLowerCase();
    if (t.startsWith('timestamp')) return 'timestamp';
    if (t.startsWith('character varying')) return 'varchar';
    if (t === 'integer') return 'int4';
    if (t === 'bigint') return 'int8';
    if (t === 'smallint') return 'int2';
    if (t === 'boolean') return 'bool';
    if (t.startsWith('numeric')) return 'numeric';
    if (t.startsWith('character(') || t === 'char') return 'char';
    return t.split('(')[0];
  };

  // ===== Selection =====
  const allSelected = rows.length > 0 && rows.every((r) => selectedKeys.has(rowKey(r)));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(rows.map(rowKey)));
    }
  };

  const toggleSelectRow = (row) => {
    const key = rowKey(row);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ===== Edit row modal =====
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOriginal, setEditOriginal] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);

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
    pkColumns.forEach((c) => {
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

  // ===== Delete (bulk, selection-based) =====
  const handleDeleteSelected = () => {
    const targets = rows.filter((r) => selectedKeys.has(rowKey(r)));
    if (targets.length === 0) return;
    if (pkColumns.length === 0) {
      if (window.showToast) window.showToast('Bảng không có khóa chính — không xóa được', 'error');
      return;
    }

    const doDelete = async () => {
      let ok = 0;
      let fail = 0;
      for (const row of targets) {
        try {
          const res = await demoToolsService.deleteRow(selectedTable, buildPk(row));
          if (res && res.success) ok++; else fail++;
        } catch {
          fail++;
        }
      }
      if (window.showToast) {
        window.showToast(`Đã xóa ${ok} row${fail ? `, lỗi ${fail}` : ''}`, fail ? 'error' : 'success');
      }
      loadRows();
    };

    if (window.showConfirm) {
      window.showConfirm(
        'Xác nhận XÓA',
        `Xóa ${targets.length} row khỏi bảng "${selectedTable}"? Hành động này KHÔNG thể hoàn tác — dữ liệu mất thật trên database.`,
        doDelete
      );
    } else {
      doDelete();
    }
  };

  // ===== Booking time-shift panel =====
  const [showShift, setShowShift] = useState(false);
  const [shiftBookingId, setShiftBookingId] = useState('');

  const shiftPresets = [
    { label: '-1 ngày', minutes: -1440 },
    { label: '-1 giờ', minutes: -60 },
    { label: '-15p', minutes: -15 },
    { label: '+15p', minutes: 15 },
    { label: '+1 giờ', minutes: 60 },
    { label: '+1 ngày', minutes: 1440 }
  ];

  const handleShift = (minutes) => {
    const id = parseInt(shiftBookingId, 10);
    if (!id) {
      if (window.showToast) window.showToast('Nhập Booking ID trước', 'error');
      return;
    }

    const doShift = async () => {
      try {
        const res = await demoToolsService.shiftBookingTime(id, minutes);
        if (res && res.success) {
          if (window.showToast) window.showToast(res.message, 'success');
          if (selectedTable === 'bookings' || selectedTable === 'queue') loadRows();
        } else if (window.showToast) {
          window.showToast(res?.message || 'Shift thất bại', 'error');
        }
      } catch (e) {
        if (window.showToast) window.showToast(e.response?.data?.message || 'Lỗi shift thời gian', 'error');
      }
    };

    if (window.showConfirm) {
      window.showConfirm(
        'Xác nhận dịch thời gian',
        `Dịch mọi mốc thời gian của booking #${id} (kèm queue liên quan) đi ${minutes > 0 ? '+' : ''}${minutes} phút?`,
        doShift
      );
    } else {
      doShift();
    }
  };

  const formatCell = (value) => {
    if (value === null || value === undefined) return <span className="dt-null">NULL</span>;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    const s = String(value);
    return s.length > 80 ? s.slice(0, 80) + '…' : s;
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

  const selectedCount = selectedKeys.size;

  return (
    <div className="demo-tools-wrapper">
      {/* ── Left: table list ─────────────────────────── */}
      <aside className="dt-sidebar">
        <div className="dt-sidebar-header">
          <i className="fas fa-table-cells-large me-2"></i> Table Editor
        </div>
        <div className="dt-schema">
          <i className="fas fa-layer-group me-2 text-muted"></i>
          schema <span className="dt-schema-name">public</span>
        </div>
        <div className="dt-table-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Tìm bảng..."
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
          />
        </div>
        <div className="dt-table-list">
          {filteredTables.map((t) => (
            <button
              key={t.name}
              className={`dt-table-item ${t.name === selectedTable ? 'active' : ''}`}
              onClick={() => setSelectedTable(t.name)}
              title={t.name}
            >
              <i className="fas fa-table"></i>
              <span className="text-truncate">{t.name}</span>
            </button>
          ))}
          {filteredTables.length === 0 && (
            <div className="dt-table-empty">Không có bảng khớp</div>
          )}
        </div>
      </aside>

      {/* ── Right: data grid ─────────────────────────── */}
      <main className="dt-main">
        {/* Tab bar */}
        <div className="dt-tabbar">
          <div className="dt-tab active">
            <i className="fas fa-table me-2"></i>{selectedTable}
          </div>
        </div>

        {/* Toolbar */}
        <div className="dt-toolbar">
          {selectedCount > 0 ? (
            <>
              <span className="dt-selected-label">{selectedCount} đã chọn</span>
              <button className="dt-btn dt-btn-danger" onClick={handleDeleteSelected}>
                <i className="fas fa-trash-alt me-1"></i> Xóa
              </button>
              <button className="dt-btn" onClick={() => setSelectedKeys(new Set())}>Bỏ chọn</button>
              <div className="flex-grow-1" />
            </>
          ) : (
            <>
              <div className="dt-toolbar-search">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder={`Tìm trong ${selectedTable}... (mọi cột)`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {sortBy && (
                <button className="dt-btn dt-btn-active" onClick={() => { setSortBy(''); setSortDir('asc'); }} title="Xóa sort">
                  <i className="fas fa-arrow-down-short-wide me-1"></i>
                  {sortBy} {sortDir === 'asc' ? '↑' : '↓'} <i className="fas fa-times ms-1"></i>
                </button>
              )}
              <div className="flex-grow-1" />
              <button className="dt-btn" onClick={loadRows} title="Tải lại">
                <i className="fas fa-rotate-right"></i>
              </button>
              {(selectedTable === 'bookings' || selectedTable === 'queue') && (
                <button className={`dt-btn ${showShift ? 'dt-btn-active' : ''}`} onClick={() => setShowShift((s) => !s)}>
                  <i className="fas fa-clock me-1"></i> Dịch thời gian
                </button>
              )}
              <button className="dt-btn dt-btn-primary" onClick={openInsertModal} disabled={!currentTable}>
                <i className="fas fa-plus me-1"></i> Insert
              </button>
            </>
          )}
        </div>

        {/* Booking time-shift strip */}
        {showShift && (selectedTable === 'bookings' || selectedTable === 'queue') && (
          <div className="dt-shift-strip">
            <span className="dt-shift-label"><i className="fas fa-clock me-1"></i> Dịch nhanh thời gian booking:</span>
            <input
              type="number"
              className="dt-shift-input"
              placeholder="Booking ID"
              value={shiftBookingId}
              onChange={(e) => setShiftBookingId(e.target.value)}
            />
            {shiftPresets.map((p) => (
              <button key={p.label} className="dt-btn dt-btn-sm" onClick={() => handleShift(p.minutes)}>{p.label}</button>
            ))}
            <span className="dt-shift-hint">Dịch về tương lai sẽ tự reset cờ email nhắc lịch.</span>
          </div>
        )}

        {/* Grid */}
        <div className="dt-grid-container">
          <table className="dt-grid">
            <thead>
              <tr>
                <th className="dt-check-col">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                {columns.map((col) => (
                  <th key={col.name} onClick={() => toggleSort(col.name)} title="Bấm để sort">
                    <div className="dt-th-inner">
                      {col.isPrimaryKey && <i className="fas fa-key dt-pk-icon"></i>}
                      <span className="dt-col-name">{col.name}</span>
                      <span className="dt-col-type">{shortType(col.storeType)}</span>
                      {sortBy === col.name && (
                        <i className={`fas fa-caret-${sortDir === 'asc' ? 'up' : 'down'} dt-sort-icon`}></i>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length + 1} className="dt-msg">Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="dt-msg">Không có dữ liệu</td></tr>
              ) : (
                rows.map((row) => {
                  const key = rowKey(row);
                  const isSel = selectedKeys.has(key);
                  return (
                    <tr key={key} className={isSel ? 'selected' : ''} onClick={() => openEditModal(row)} title="Bấm để sửa row">
                      <td className="dt-check-col" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSel} onChange={() => toggleSelectRow(row)} />
                      </td>
                      {columns.map((col) => {
                        const k = Object.keys(row).find((rk) => rk.toLowerCase() === col.name.toLowerCase());
                        const raw = k !== undefined ? row[k] : undefined;
                        return (
                          <td key={col.name} className={isTimestampCol(col) || ['Int32', 'Int64', 'Int16', 'Byte', 'Decimal', 'Double', 'Single'].includes(col.clrType) ? 'dt-mono' : ''}>
                            {formatCell(raw)}
                            {col.enumLabels && raw !== null && raw !== undefined && col.enumLabels[raw] !== undefined && (
                              <span className="dt-enum">({col.enumLabels[raw]})</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / pagination */}
        <div className="dt-footer">
          <div className="dt-footer-left">
            <button className="dt-page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="dt-page-label">Trang</span>
            <span className="dt-page-num">{page}</span>
            <span className="dt-page-label">/ {totalPages}</span>
            <button className="dt-page-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <i className="fas fa-chevron-right"></i>
            </button>
            <select
              className="dt-page-size"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100, 200].map((n) => <option key={n} value={n}>{n} rows</option>)}
            </select>
          </div>
          <div className="dt-footer-right">
            {totalCount} records
          </div>
        </div>
      </main>

      {/* Edit row modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Sửa row — ${selectedTable}`}
        maxWidth="640px"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setShowEditModal(false)} disabled={saving}>Hủy</button>
            <button className="btn btn-success fw-bold" onClick={handleSaveEdit} disabled={saving}>
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
            <button className="btn btn-success fw-bold" onClick={handleInsert} disabled={saving}>
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
