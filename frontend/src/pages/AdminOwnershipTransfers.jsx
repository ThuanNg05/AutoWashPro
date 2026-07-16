import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService';
import api from '../services/api';
import '../styles/shared.css';

export const AdminOwnershipTransfers = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewBlobLoading, setPreviewBlobLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getOwnershipTransfers(statusFilter, searchTerm);
      if (response.success) {
        setRequests(response.requests);
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) {
        window.showToast('Không thể tải danh sách yêu cầu chuyển nhượng!', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  useEffect(() => {
    if (!previewDoc) {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
      setPreviewBlobUrl(null);
      return;
    }

    let active = true;
    setPreviewBlobLoading(true);
    (async () => {
      try {
        const response = await api.get(`/api/admin/ownership-transfers/document/${previewDoc.documentId}`, {
          responseType: 'blob'
        });
        if (active) {
          const blobUrl = URL.createObjectURL(response.data);
          setPreviewBlobUrl(blobUrl);
        }
      } catch (err) {
        console.error('Lỗi khi tải tệp xem trước:', err);
      } finally {
        if (active) {
          setPreviewBlobLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [previewDoc]);

  const handleDownloadDocument = async (doc) => {
    try {
      const response = await api.get(`/api/admin/ownership-transfers/document/${doc.documentId}/download`, {
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Lỗi tải xuống:', err);
      if (window.showToast) {
        window.showToast('Không thể tải xuống tài liệu này!', 'error');
      }
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequests();
  };

  const handleViewDetail = async (requestId) => {
    setDetailLoading(true);
    try {
      const response = await adminService.getOwnershipTransferDetail(requestId);
      if (response.success) {
        setSelectedDetail(response.request);
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) {
        window.showToast('Không thể tải chi tiết yêu cầu!', 'error');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = (requestId) => {
    const approveAction = async () => {
      setActionLoading(true);
      try {
        const res = await adminService.approveTransfer(requestId);
        if (res.success) {
          if (window.showToast) {
            window.showToast('✔ Đã phê duyệt', 'success');
          }
          fetchRequests();
          setSelectedDetail(null);
        } else {
          if (window.showToast) {
            window.showToast('Không thể xử lý yêu cầu.', 'error');
          }
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast(err.response?.data?.message || 'Có lỗi xảy ra!', 'error');
        }
      } finally {
        setActionLoading(false);
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Bạn có chắc muốn phê duyệt yêu cầu này?', approveAction);
    } else {
      const confirmApprove = window.confirm('Bạn có chắc muốn phê duyệt yêu cầu này?');
      if (confirmApprove) {
        approveAction();
      }
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      if (window.showToast) {
        window.showToast('Vui lòng nhập lý do từ chối!', 'warning');
      }
      return;
    }
    setActionLoading(true);
    try {
      const res = await adminService.rejectTransfer(rejectModal, rejectReason.trim());
      if (res.success) {
        if (window.showToast) {
          window.showToast('✔ Đã từ chối', 'success');
        }
        setRejectModal(null);
        setRejectReason('');
        fetchRequests();
        setSelectedDetail(null);
      } else {
        if (window.showToast) {
          window.showToast('Không thể xử lý yêu cầu.', 'error');
        }
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast(err.response?.data?.message || 'Có lỗi xảy ra!', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending': return <span className="badge bg-warning text-dark px-2 py-1.5 fw-semibold">Chờ duyệt</span>;
      case 'Approved': return <span className="badge bg-success px-2 py-1.5 fw-semibold">Đã duyệt</span>;
      case 'Rejected': return <span className="badge bg-danger px-2 py-1.5 fw-semibold">Từ chối</span>;
      case 'Cancelled': return <span className="badge bg-secondary px-2 py-1.5 fw-semibold">Đã hủy</span>;
      default: return <span className="badge bg-secondary px-2 py-1.5 fw-semibold">{status}</span>;
    }
  };

  const getFileTypeBadge = (contentType, fileName) => {
    const ext = fileName ? fileName.split('.').pop().toLowerCase() : '';
    if (ext === 'pdf' || (contentType && contentType.includes('pdf'))) {
      return <span className="badge bg-danger text-uppercase me-2" style={{ fontSize: '0.7rem' }}>PDF</span>;
    }
    if (ext === 'png' || (contentType && contentType.includes('png'))) {
      return <span className="badge bg-info text-uppercase me-2" style={{ fontSize: '0.7rem' }}>PNG</span>;
    }
    if (ext === 'jpg' || ext === 'jpeg' || (contentType && (contentType.includes('jpeg') || contentType.includes('jpg')))) {
      return <span className="badge bg-success text-uppercase me-2" style={{ fontSize: '0.7rem' }}>JPG</span>;
    }
    return <span className="badge bg-secondary text-uppercase me-2" style={{ fontSize: '0.7rem' }}>FILE</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const isImage = (contentType) => contentType && contentType.startsWith('image/');

  const renderTimeline = (status, submittedAt, reviewedAt, rejectReason, reviewedByName) => {
    const isPending = status === 'Pending';
    const isApproved = status === 'Approved';
    const isRejected = status === 'Rejected';
    const isCancelled = status === 'Cancelled';

    return (
      <div className="timeline-container-v2 text-start mt-3">
        <style>{`
          .timeline-v2 {
            position: relative;
            padding-left: 30px;
            margin-bottom: 0;
          }
          .timeline-v2::before {
            content: '';
            position: absolute;
            left: 11px;
            top: 5px;
            bottom: 5px;
            width: 2px;
            background-color: #cbd5e1;
            z-index: 1;
          }
          .timeline-item-v2 {
            position: relative;
            margin-bottom: 20px;
          }
          .timeline-item-v2:last-child {
            margin-bottom: 0;
          }
          .timeline-dot-v2 {
            position: absolute;
            left: -30px;
            top: 3px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background-color: #ffffff;
            border: 2px solid #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
          }
          .timeline-dot-v2.completed {
            border-color: #22c55e;
            background-color: #22c55e;
            color: #ffffff;
          }
          .timeline-dot-v2.active {
            border-color: #0ea5e9;
            background-color: #f0f9ff;
            color: #0ea5e9;
          }
          .timeline-dot-v2.cancelled {
            border-color: #64748b;
            background-color: #64748b;
            color: #ffffff;
          }
          .timeline-dot-v2.rejected {
            border-color: #ef4444;
            background-color: #ef4444;
            color: #ffffff;
          }
          .timeline-title-v2 {
            font-size: 0.88rem;
            font-weight: 700;
            color: #1e293b;
          }
          .timeline-desc-v2 {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 2px;
          }
          .timeline-time-v2 {
            font-size: 0.72rem;
            color: #94a3b8;
            margin-top: 2px;
          }
        `}</style>

        <div className="timeline-v2">
          {/* Bước 1: Khởi tạo yêu cầu */}
          <div className="timeline-item-v2">
            <div className="timeline-dot-v2 completed">
              <i className="fas fa-paper-plane" style={{ fontSize: '0.65rem' }}></i>
            </div>
            <div>
              <div className="timeline-title-v2">📝 Đã gửi yêu cầu (Submitted)</div>
              <div className="timeline-desc-v2">Yêu cầu chuyển quyền sở hữu xe đã được khởi tạo thành công và gửi lên hệ thống.</div>
              <div className="timeline-time-v2">{formatDate(submittedAt)}</div>
            </div>
          </div>

          {/* Bước 2: Xem xét và đánh giá */}
          <div className="timeline-item-v2">
            <div className={`timeline-dot-v2 ${isPending ? 'active' : 'completed'}`}>
              {isPending ? (
                <span className="spinner-border spinner-border-sm text-info" style={{ width: '10px', height: '10px', borderWidth: '1.5px' }}></span>
              ) : (
                <i className="fas fa-search" style={{ fontSize: '0.65rem' }}></i>
              )}
            </div>
            <div>
              <div className="timeline-title-v2">🔍 Đang kiểm tra (Under Review)</div>
              <div className="timeline-desc-v2">
                {isPending 
                  ? 'Ban quản trị đang xem xét tài liệu, đối chiếu biển số và xác thực thông tin đăng ký xe.' 
                  : 'Review completed. Quá trình kiểm tra hồ sơ và giấy tờ đăng ký xe đã hoàn tất.'}
              </div>
              <div className="timeline-time-v2">{isPending ? 'Đang xử lý...' : formatDate(reviewedAt)}</div>
            </div>
          </div>

          {/* Bước 3: Kết quả duyệt/từ chối/hủy */}
          {!isPending && (
            <div className="timeline-item-v2">
              <div className={`timeline-dot-v2 ${isApproved ? 'completed' : isRejected ? 'rejected' : 'cancelled'}`}>
                {isApproved ? (
                  <i className="fas fa-check" style={{ fontSize: '0.65rem' }}></i>
                ) : isRejected ? (
                  <i className="fas fa-times" style={{ fontSize: '0.65rem' }}></i>
                ) : (
                  <i className="fas fa-ban" style={{ fontSize: '0.65rem' }}></i>
                )}
              </div>
              <div>
                <div className="timeline-title-v2">
                  {isApproved ? '🎉 Đã duyệt (Approved)' : isRejected ? '❌ Đã từ chối (Rejected)' : '🚫 Đã hủy (Cancelled)'}
                </div>
                <div className="timeline-desc-v2">
                  {isApproved && (reviewedByName ? `Yêu cầu chuyển quyền được phê duyệt bởi ${reviewedByName}. Xe đã được chuyển sang chủ mới.` : 'Yêu cầu chuyển nhượng đã được phê duyệt. Xe đã được chuyển sang chủ sở hữu mới.')}
                  {isRejected && `Ban quản trị đã từ chối yêu cầu chuyển quyền này. Lý do: ${rejectReason || 'Không có lý do cụ thể.'}`}
                  {isCancelled && 'Yêu cầu chuyển quyền đã được hủy bỏ bởi khách hàng.'}
                </div>
                <div className="timeline-time-v2">{formatDate(reviewedAt)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h4 className="mb-4 text-start fw-bold" style={{ fontFamily: 'Be Vietnam Pro, sans-serif' }}>
        <i className="fas fa-exchange-alt me-2 text-info"></i>Quản lý chuyển nhượng xe
      </h4>

      {/* Filters */}
      <div className="card border border-slate-100 shadow-sm mb-4 rounded-3">
        <div className="card-body">
          <div className="row g-3 align-items-end text-start">
            <div className="col-md-4">
              <label className="form-label fw-bold small text-muted text-uppercase">Trạng thái</label>
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tất cả</option>
                <option value="Pending">Chờ duyệt</option>
                <option value="Approved">Đã duyệt</option>
                <option value="Rejected">Từ chối</option>
                <option value="Cancelled">Đã hủy</option>
              </select>
            </div>
            <div className="col-md-8">
              <label className="form-label fw-bold small text-muted text-uppercase">Tìm kiếm</label>
              <form onSubmit={handleSearchSubmit} className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm theo biển số, chủ xe, người yêu cầu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit" className="btn btn-info text-white px-4 fw-semibold">
                  <i className="fas fa-search me-1"></i> Tìm
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border border-slate-100 shadow-sm rounded-3 overflow-hidden">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-info" role="status"></div>
              <p className="text-muted mt-2 small">Đang tải dữ liệu...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-5 text-muted small bg-light border border-dashed rounded-3 m-3">
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📄</div>
              <div className="fw-bold" style={{ fontSize: '15px' }}>Bạn chưa có yêu cầu chuyển quyền nào.</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle text-start">
                <thead className="table-light">
                  <tr className="small text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    <th className="py-3 px-3">#</th>
                    <th className="py-3">Biển số</th>
                    <th className="py-3">Chủ xe hiện tại</th>
                    <th className="py-3">Người yêu cầu</th>
                    <th className="py-3">Trạng thái</th>
                    <th className="py-3">Ngày gửi</th>
                    <th className="py-3">Tài liệu</th>
                    <th className="py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r, idx) => (
                    <tr key={r.requestId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td className="text-muted small px-3">{idx + 1}</td>
                      <td><span className="badge bg-dark font-monospace px-2 py-1.5" style={{ fontSize: '0.85rem' }}>{r.vehiclePlate}</span></td>
                      <td>
                        <div className="fw-bold text-slate-800" style={{ fontSize: '0.9rem' }}>{r.currentOwnerName}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{r.currentOwnerEmail}</div>
                      </td>
                      <td>
                        <div className="fw-bold text-slate-800" style={{ fontSize: '0.9rem' }}>{r.requestedOwnerName}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{r.requestedOwnerEmail}</div>
                      </td>
                      <td>{getStatusBadge(r.status)}</td>
                      <td className="small text-slate-600">{formatDate(r.submittedAt)}</td>
                      <td><span className="badge bg-info px-2 py-1.5">{r.documentCount || 0} tệp</span></td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          <button
                            className="btn btn-sm btn-outline-primary px-3 rounded-2 fw-semibold"
                            onClick={() => handleViewDetail(r.requestId)}
                            title="Chi tiết"
                          >
                            Chi tiết
                          </button>
                          {r.status === 'Pending' && (
                            <>
                              <button
                                className="btn btn-sm btn-success px-2.5"
                                onClick={() => handleApprove(r.requestId)}
                                title="Phê duyệt"
                                disabled={actionLoading}
                              >
                                {actionLoading ? <span className="spinner-border spinner-border-sm"></span> : <i className="fas fa-check"></i>}
                              </button>
                              <button
                                className="btn btn-sm btn-danger px-2.5"
                                onClick={() => { setRejectModal(r.requestId); setRejectReason(''); }}
                                title="Từ chối"
                                disabled={actionLoading}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }} onClick={() => setSelectedDetail(null)}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4 bg-white overflow-hidden">
              <div className="modal-header border-0 bg-light p-3 px-4 d-flex justify-content-between align-items-center">
                <h6 className="modal-title fw-bold m-0 text-slate-800">
                  <i className="fas fa-info-circle text-info me-2"></i>Chi tiết yêu cầu #{selectedDetail.requestId}
                </h6>
                <button type="button" className="btn-close shadow-none" onClick={() => setSelectedDetail(null)}></button>
              </div>
              <div className="modal-body p-4 text-start">
                {detailLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    <div className="row g-3">
                      {/* Vehicle card */}
                      <div className="col-md-6">
                        <div className="card border border-slate-100 rounded-3 p-3 h-100 shadow-sm bg-light">
                          <h6 className="fw-bold mb-3 text-slate-700" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>
                            🚗 Phương tiện
                          </h6>
                          <div className="d-flex flex-column gap-1.5" style={{ fontSize: '0.9rem' }}>
                            <div><strong>Biển số:</strong> <span className="badge bg-dark font-monospace px-2 py-1.5">{selectedDetail.vehiclePlate}</span></div>
                            <div><strong>Hãng:</strong> {selectedDetail.brand}</div>
                            <div><strong>Dòng xe:</strong> {selectedDetail.model}</div>
                            <div><strong>Phân khúc:</strong> {selectedDetail.vehicleClass}</div>
                          </div>
                        </div>
                      </div>

                      {/* Sides card */}
                      <div className="col-md-6">
                        <div className="card border border-slate-100 rounded-3 p-3 h-100 shadow-sm">
                          <h6 className="fw-bold mb-3 text-slate-700" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>
                            👥 Bên liên quan
                          </h6>
                          <div style={{ fontSize: '0.88rem' }}>
                            <div className="mb-2">
                              <strong>Chủ hiện tại:</strong> {selectedDetail.currentOwnerName}
                              <div className="text-muted small">{selectedDetail.currentOwnerEmail} • {selectedDetail.currentOwnerPhone}</div>
                            </div>
                            <hr className="my-2 border-slate-100" />
                            <div>
                              <strong>Người yêu cầu:</strong> {selectedDetail.requestedOwnerName}
                              <div className="text-muted small">{selectedDetail.requestedOwnerEmail} • {selectedDetail.requestedOwnerPhone}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Request Information */}
                    <div className="card border border-slate-100 rounded-3 p-3 shadow-sm">
                      <h6 className="fw-bold mb-3 text-slate-700" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>
                        📋 Thông tin yêu cầu
                      </h6>
                      <div className="row g-3" style={{ fontSize: '0.88rem' }}>
                        <div className="col-md-6 d-flex flex-column gap-1.5">
                          <div><strong>Trạng thái:</strong> {getStatusBadge(selectedDetail.status)}</div>
                          <div><strong>Ngày gửi:</strong> {formatDate(selectedDetail.submittedAt)}</div>
                          {selectedDetail.status === 'Approved' && (
                            <>
                              <div><strong>Ngày phê duyệt:</strong> {formatDate(selectedDetail.reviewedAt)}</div>
                              <div><strong>Người phê duyệt:</strong> {selectedDetail.reviewedByName || 'Admin'}</div>
                            </>
                          )}
                          {selectedDetail.status === 'Rejected' && (
                            <>
                              <div><strong>Ngày từ chối:</strong> {formatDate(selectedDetail.reviewedAt)}</div>
                              <div><strong>Người từ chối:</strong> {selectedDetail.reviewedByName || 'Admin'}</div>
                            </>
                          )}
                          {selectedDetail.status === 'Cancelled' && (
                            <>
                              <div><strong>Ngày hủy:</strong> {formatDate(selectedDetail.reviewedAt)}</div>
                              <div className="text-secondary fw-semibold">Đã hủy bởi khách hàng.</div>
                            </>
                          )}
                        </div>
                        <div className="col-md-6">
                          {selectedDetail.description && (
                            <div className="mb-2">
                              <strong>Mô tả từ khách hàng:</strong>
                              <p className="mb-0 text-slate-600 mt-1 p-2 bg-light rounded border border-slate-100" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>{selectedDetail.description}</p>
                            </div>
                          )}
                          {selectedDetail.status === 'Rejected' && selectedDetail.rejectReason && (
                            <div className="alert alert-danger py-2 mb-0" style={{ fontSize: '13px' }}>
                              <strong>Lý do từ chối (Reject Reason):</strong> {selectedDetail.rejectReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="card border border-slate-100 rounded-3 p-3 shadow-sm">
                      <h6 className="fw-bold mb-3 text-slate-700" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>
                        🕒 Lịch sử xử lý (Timeline)
                      </h6>
                      {renderTimeline(selectedDetail.status, selectedDetail.submittedAt, selectedDetail.reviewedAt, selectedDetail.rejectReason, selectedDetail.reviewedByName)}
                    </div>

                    {/* Documents */}
                    {selectedDetail.documents && selectedDetail.documents.length > 0 && (
                      <div className="card border border-slate-100 rounded-3 p-3 shadow-sm">
                        <h6 className="fw-bold mb-3 text-slate-700" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>
                          📄 Tài liệu đính kèm ({selectedDetail.documents.length})
                        </h6>
                        <div className="list-group list-group-flush border-bottom">
                          {selectedDetail.documents.map((doc) => (
                            <div key={doc.documentId} className="list-group-item px-0 py-2.5 d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center">
                                {getFileTypeBadge(doc.contentType, doc.fileName)}
                                <span className="small text-slate-800 fw-bold">{doc.fileName}</span>
                                <span className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>({formatFileSize(doc.fileSize)})</span>
                              </div>
                              <div className="d-flex gap-1">
                                <button
                                  className="btn btn-sm btn-light text-slate-600 rounded p-1 px-2.5"
                                  title="Xem trước"
                                  onClick={() => setPreviewDoc(doc)}
                                >
                                  <i className="fas fa-eye" style={{ fontSize: '0.8rem' }}></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light text-slate-600 rounded p-1 px-2.5"
                                  title="Tải về"
                                  onClick={() => handleDownloadDocument(doc)}
                                >
                                  <i className="fas fa-download" style={{ fontSize: '0.8rem' }}></i>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 p-3 px-4 bg-light d-flex justify-content-end gap-2">
                {selectedDetail && selectedDetail.status === 'Pending' && !detailLoading && (
                  <>
                    <button
                      className="btn btn-success py-2 px-4 rounded-3 text-sm fw-bold border-0"
                      onClick={() => handleApprove(selectedDetail.requestId)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check me-1"></i> Phê duyệt
                        </>
                      )}
                    </button>
                    <button
                      className="btn btn-danger py-2 px-4 rounded-3 text-sm fw-bold border-0"
                      onClick={() => { setRejectModal(selectedDetail.requestId); setRejectReason(''); }}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-times me-1"></i> Từ chối
                    </button>
                  </>
                )}
                <button
                  className="btn btn-secondary py-2 px-4 rounded-3 text-sm fw-bold border-0"
                  style={{ backgroundColor: '#e2e8f0', color: '#475569' }}
                  onClick={() => setSelectedDetail(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', zIndex: 1060 }} onClick={() => setPreviewDoc(null)}>
          <div className="modal-dialog modal-xl modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4 bg-white overflow-hidden">
              <div className="modal-header bg-light border-0 p-3 px-4 d-flex justify-content-between align-items-center">
                <h6 className="modal-title fw-bold m-0 text-slate-800"><i className="fas fa-file me-2 text-info"></i>{previewDoc.fileName}</h6>
                <button type="button" className="btn-close" onClick={() => setPreviewDoc(null)}></button>
              </div>
              <div className="modal-body text-center p-4" style={{ minHeight: '400px', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {previewBlobLoading ? (
                  <div className="spinner-border text-info" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                  </div>
                ) : previewBlobUrl ? (
                  isImage(previewDoc.contentType) ? (
                    <img
                      src={previewBlobUrl}
                      alt={previewDoc.fileName}
                      style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }}
                    />
                  ) : (
                    <iframe
                      src={previewBlobUrl}
                      title={previewDoc.fileName}
                      style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px' }}
                    ></iframe>
                  )
                ) : (
                  <div className="text-white small">Không thể hiển thị tài liệu này.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1055 }} onClick={() => setRejectModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4 bg-white overflow-hidden">
              <div className="modal-header bg-danger text-white border-0 p-3 px-4 d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold m-0" style={{ fontSize: '16px' }}><i className="fas fa-times-circle me-2"></i>Từ chối yêu cầu</h5>
                <button className="btn-close btn-close-white" onClick={() => setRejectModal(null)}></button>
              </div>
              <div className="modal-body p-4 text-start">
                <label className="form-label fw-bold text-slate-700 small text-uppercase mb-2">Lý do từ chối <span className="text-danger">*</span></label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Nhập lý do từ chối..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ resize: 'none' }}
                ></textarea>
              </div>
              <div className="modal-footer border-0 p-3 px-4 bg-light d-flex justify-content-end gap-2">
                <button className="btn btn-secondary py-2 px-4 rounded-3 text-sm fw-bold border-0" style={{ backgroundColor: '#e2e8f0', color: '#475569' }} onClick={() => setRejectModal(null)}>Hủy</button>
                <button
                  className="btn btn-danger py-2 px-4 rounded-3 text-sm fw-bold border-0"
                  onClick={handleRejectSubmit}
                  disabled={!rejectReason.trim() || actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-times me-1"></i> Xác nhận từ chối
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOwnershipTransfers;
