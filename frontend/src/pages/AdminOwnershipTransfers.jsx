import { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/shared.css';

export const AdminOwnershipTransfers = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [selectedRequestDetail, setSelectedRequestDetail] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rejectRequest, setRejectRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/ownership-transfer/admin/requests', {
        params: {
          status: statusFilter,
          search: searchTerm
        }
      });
      if (response.data.success) {
        setRequests(response.data.requests);
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) {
        window.showToast('Không thể tải danh sách yêu cầu chuyển nhượng!', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequests();
  };

  const handleApprove = async (requestId) => {
    const performApprove = async () => {
      try {
        const response = await api.post(`/api/ownership-transfer/${requestId}/admin-decision`, {
          Approve: true
        });
        if (response.data.success) {
          if (window.showToast) {
            window.showToast('Đã duyệt yêu cầu chuyển nhượng xe thành công!', 'success');
          }
          setSelectedRequestDetail(null); // Close modal if open
          fetchRequests();
        }
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi phê duyệt!';
        if (window.showToast) {
          window.showToast(errMsg, 'error');
        }
      }
    };

    if (window.showConfirm) {
      window.showConfirm(
        'Phê duyệt chuyển nhượng',
        'Bạn có chắc chắn muốn phê duyệt yêu cầu này? Thao tác này sẽ chuyển quyền sở hữu phương tiện ngay lập tức.',
        performApprove
      );
    } else if (window.confirm('Bạn có chắc chắn phê duyệt yêu cầu chuyển nhượng này?')) {
      performApprove();
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectRequest) return;

    try {
      const response = await api.post(`/api/ownership-transfer/${rejectRequest.requestId}/admin-decision`, {
        Approve: false,
        Reason: rejectReason.trim()
      });
      if (response.data.success) {
        if (window.showToast) {
          window.showToast('Đã từ chối yêu cầu chuyển nhượng xe!', 'success');
        }
        setRejectRequest(null);
        setRejectReason('');
        setSelectedRequestDetail(null); // Close modal if open
        fetchRequests();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi từ chối!';
      if (window.showToast) {
        window.showToast(errMsg, 'error');
      }
    }
  };

  const viewHistory = async (vehicleId, plate) => {
    setHistoryLoading(true);
    setSelectedHistory({ plate, logs: [] });
    try {
      const response = await api.get(`/api/ownership-transfer/vehicle/${vehicleId}/history`);
      if (response.data.success) {
        setSelectedHistory({ plate, logs: response.data.history });
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) {
        window.showToast('Không thể tải lịch sử sở hữu của phương tiện!', 'error');
      }
      setSelectedHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PendingOwnerConfirmation':
        return 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-20';
      case 'PendingAdminApproval':
      case 'PendingAdminReview':
        return 'bg-info bg-opacity-10 text-info border border-info border-opacity-20';
      case 'Approved':
        return 'bg-success bg-opacity-10 text-success border border-success border-opacity-20';
      case 'Rejected':
        return 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20';
      case 'Cancelled':
        return 'bg-secondary bg-opacity-15 text-muted border border-secondary border-opacity-10';
      default:
        return 'bg-light text-dark';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PendingOwnerConfirmation':
        return 'Chờ chủ xe duyệt';
      case 'PendingAdminApproval':
        return 'Chờ Admin duyệt (Chủ xe đồng ý)';
      case 'PendingAdminReview':
        return 'Chờ Admin duyệt (Hết hạn)';
      case 'Approved':
        return 'Đã hoàn tất';
      case 'Rejected':
        return 'Đã từ chối';
      case 'Cancelled':
        return 'Đã hủy bỏ';
      default:
        return status;
    }
  };

  return (
    <div className="container-fluid py-4 text-start">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'Outfit, sans-serif' }}>Quản lý Yêu cầu Chuyển nhượng xe</h4>
          <p className="text-muted small mb-0">Xem và phê duyệt các hồ sơ yêu cầu bàn giao, chuyển quyền sở hữu phương tiện.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
        <form onSubmit={handleSearchSubmit} className="row g-3">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-light border-0"><i className="fas fa-search text-muted"></i></span>
              <input
                type="text"
                className="form-control bg-light border-0 py-2.5"
                placeholder="Tìm theo biển số, khách hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-4">
            <select
              className="form-select bg-light border-0 py-2.5"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">-- Tất cả trạng thái --</option>
              <option value="PendingOwnerConfirmation">Chờ chủ xe duyệt</option>
              <option value="PendingAdminApproval">Chờ Admin duyệt (Chủ xe đồng ý)</option>
              <option value="PendingAdminReview">Chờ Admin duyệt (Hết hạn)</option>
              <option value="Approved">Đã hoàn tất</option>
              <option value="Rejected">Đã từ chối</option>
              <option value="Cancelled">Đã hủy bỏ</option>
            </select>
          </div>
          <div className="col-md-3">
            <button type="submit" className="app-btn-primary w-100 py-2.5 text-dark fw-bold border-0" style={{ borderRadius: '10px' }}>
              <i className="fas fa-filter me-2"></i> LỌC TÌM KIẾM
            </button>
          </div>
        </form>
      </div>

      {/* Requests Table */}
      <div className="app-card border-0 shadow-sm bg-white rounded-4 overflow-hidden">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-info mb-3" role="status"></div>
            <div className="text-muted">Đang tải dữ liệu...</div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="fas fa-exchange-alt fa-3x mb-3 text-secondary" style={{ opacity: 0.3 }}></i>
            <div>Không tìm thấy yêu cầu chuyển nhượng nào.</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light table-light">
                <tr>
                  <th className="py-3 ps-4" style={{ width: '80px' }}>ID</th>
                  <th className="py-3">Phương tiện</th>
                  <th className="py-3">Chủ sở hữu hiện tại</th>
                  <th className="py-3">Khách hàng yêu cầu</th>
                  <th className="py-3">Xác minh OCR</th>
                  <th className="py-3">Trạng thái</th>
                  <th className="py-3">Ngày gửi</th>
                  <th className="py-3 pe-4 text-end" style={{ width: '300px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.requestId}>
                    <td className="ps-4 fw-bold text-secondary">#{r.requestId}</td>
                    <td>
                      <div>
                        <span className="badge bg-dark text-white font-monospace py-1.5 px-2 mb-1 rounded">{r.vehiclePlate}</span>
                      </div>
                      <small className="text-muted d-block">{r.brand} {r.model}</small>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{r.currentOwnerName}</div>
                      <small className="text-muted" style={{ fontSize: '11px' }}>{r.currentOwnerEmail}</small>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{r.requestedOwnerName}</div>
                      <small className="text-muted" style={{ fontSize: '11px' }}>{r.requestedOwnerEmail}</small>
                    </td>
                    <td>
                      <div className="d-flex flex-column gap-1">
                        <div>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline-secondary py-0.5 px-2 rounded small"
                            style={{ fontSize: '0.72rem' }}
                            onClick={() => setPreviewImage(r.registrationImageUrl)}
                          >
                            <i className="fas fa-image me-1"></i> Xem ảnh
                          </button>
                        </div>
                        <small className="text-secondary font-monospace" style={{ fontSize: '0.72rem' }}>
                          OCR: <strong className={r.ocrPlate === r.vehiclePlate ? 'text-success' : 'text-danger'}>{r.ocrPlate}</strong>
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className={`badge px-2.5 py-1.5 rounded-pill text-xs fw-semibold ${getStatusBadgeClass(r.status)}`}>
                        {getStatusText(r.status)}
                      </span>
                    </td>
                    <td>
                      <small className="text-secondary">{formatDate(r.createdAt)}</small>
                    </td>
                    <td className="pe-4 text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          className="btn btn-sm btn-light fw-bold px-2.5 py-1.5 rounded-3 border text-secondary"
                          style={{ fontSize: '0.8rem' }}
                          onClick={() => setSelectedRequestDetail(r)}
                        >
                          <i className="fas fa-info-circle me-1"></i> Chi tiết
                        </button>
                        
                        <button
                          className="btn btn-sm btn-outline-secondary px-2.5 py-1.5 rounded-3"
                          style={{ fontSize: '0.8rem' }}
                          title="Lịch sử sở hữu"
                          onClick={() => viewHistory(r.vehicleId, r.vehiclePlate)}
                        >
                          <i className="fas fa-history"></i>
                        </button>

                        {(r.status === 'PendingAdminApproval' || r.status === 'PendingAdminReview') && (
                          <>
                            <button
                              className="btn btn-sm btn-success text-white fw-bold px-2.5 py-1.5 rounded-3 border-0"
                              style={{ fontSize: '0.8rem', backgroundColor: '#22c55e' }}
                              onClick={() => handleApprove(r.requestId)}
                            >
                              Duyệt
                            </button>
                            <button
                              className="btn btn-sm btn-danger text-white fw-bold px-2.5 py-1.5 rounded-3 border-0"
                              style={{ fontSize: '0.8rem', backgroundColor: '#ef4444' }}
                              onClick={() => setRejectRequest(r)}
                            >
                              Từ chối
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

      {/* Request Details Modal */}
      {selectedRequestDetail && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
              <div className="modal-header border-0 bg-light p-3 px-4 d-flex justify-content-between align-items-center">
                <h6 className="modal-title fw-bold m-0 text-dark">
                  <i className="fas fa-info-circle me-2 text-cyan"></i>Chi tiết Yêu cầu Chuyển nhượng #{selectedRequestDetail.requestId}
                </h6>
                <button type="button" className="btn-close shadow-none" onClick={() => setSelectedRequestDetail(null)}></button>
              </div>
              <div className="modal-body p-4 text-start">
                <div className="row g-4">
                  {/* Left Column - Form & Data Details */}
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3 text-secondary border-bottom pb-1"><i className="fas fa-car me-1"></i> Thông tin phương tiện</h6>
                    <div className="mb-2.5">
                      <span className="text-muted small">Biển số:</span>{' '}
                      <span className="badge bg-dark text-white font-monospace ms-1">{selectedRequestDetail.vehiclePlate}</span>
                    </div>
                    <div className="mb-2.5">
                      <span className="text-muted small">OCR Biển số:</span>{' '}
                      <span className={`badge font-monospace ms-1 ${selectedRequestDetail.ocrPlate === selectedRequestDetail.vehiclePlate ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-20' : 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20'}`}>{selectedRequestDetail.ocrPlate}</span>
                    </div>
                    <div className="mb-2.5">
                      <span className="text-muted small">Hãng & Model:</span>{' '}
                      <strong className="text-dark">{selectedRequestDetail.brand} {selectedRequestDetail.model}</strong>
                    </div>
                    <div className="mb-4">
                      <span className="text-muted small">Phân khúc:</span>{' '}
                      <strong className="text-dark">{selectedRequestDetail.vehicleClass || 'N/A'}</strong>
                    </div>

                    <h6 className="fw-bold mb-3 text-secondary border-bottom pb-1"><i className="fas fa-users me-1"></i> Thông tin chủ sở hữu</h6>
                    <div className="mb-2.5">
                      <span className="text-muted small">Chủ hiện tại:</span>{' '}
                      <strong className="text-dark">{selectedRequestDetail.currentOwnerName}</strong>{' '}
                      <span className="text-muted small">({selectedRequestDetail.currentOwnerEmail})</span>
                    </div>
                    <div className="mb-4">
                      <span className="text-muted small">Chủ mới đề xuất:</span>{' '}
                      <strong className="text-dark">{selectedRequestDetail.requestedOwnerName}</strong>{' '}
                      <span className="text-muted small">({selectedRequestDetail.requestedOwnerEmail})</span>
                    </div>

                    <h6 className="fw-bold mb-3 text-secondary border-bottom pb-1"><i className="fas fa-clock me-1"></i> Trạng thái & Mốc thời gian</h6>
                    <div className="mb-2.5">
                      <span className="text-muted small">Trạng thái:</span>{' '}
                      <span className={`badge px-2.5 py-1 rounded-pill text-xs fw-semibold ms-1 ${getStatusBadgeClass(selectedRequestDetail.status)}`}>
                        {getStatusText(selectedRequestDetail.status)}
                      </span>
                    </div>
                    <div className="mb-2.5">
                      <span className="text-muted small">Ngày tạo:</span>{' '}
                      <strong className="text-dark">{formatDate(selectedRequestDetail.createdAt)}</strong>
                    </div>
                    <div className="mb-2.5">
                      <span className="text-muted small">Chủ xe phản hồi:</span>{' '}
                      <strong className="text-dark">{formatDate(selectedRequestDetail.ownerConfirmedAt)}</strong>
                    </div>
                    {selectedRequestDetail.reason && (
                      <div className="mt-3 p-3 rounded bg-light border">
                        <div className="text-xs fw-bold text-secondary mb-1">Lý do/Ghi chú:</div>
                        <div className="small text-dark font-sans">{selectedRequestDetail.reason}</div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Document Image View */}
                  <div className="col-md-6 text-center">
                    <h6 className="fw-bold mb-3 text-secondary border-bottom pb-1 text-start"><i className="fas fa-file-image me-1"></i> Giấy đăng ký tải lên</h6>
                    <div className="p-2 border rounded-3 bg-light d-flex align-items-center justify-content-center overflow-hidden" style={{ height: '300px' }}>
                      <img
                        src={selectedRequestDetail.registrationImageUrl}
                        alt="Registration Cert Detail"
                        className="img-fluid rounded hover-scale"
                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', cursor: 'pointer' }}
                        onClick={() => setPreviewImage(selectedRequestDetail.registrationImageUrl)}
                      />
                    </div>
                    <small className="text-muted mt-1.5 d-block"><i className="fas fa-search-plus me-1"></i>Click vào ảnh để phóng to</small>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 p-3 px-4 bg-light d-flex justify-content-between">
                <div>
                  <button
                    type="button"
                    className="btn btn-outline-secondary py-2 px-3 rounded-3 text-sm fw-bold"
                    onClick={() => viewHistory(selectedRequestDetail.vehicleId, selectedRequestDetail.vehiclePlate)}
                  >
                    <i className="fas fa-history me-1"></i> Xem lịch sử xe
                  </button>
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-secondary py-2 px-4 rounded-3 text-sm fw-bold border-0" style={{ backgroundColor: '#cbd5e1', color: '#334155' }} onClick={() => setSelectedRequestDetail(null)}>Đóng</button>
                  
                  {(selectedRequestDetail.status === 'PendingAdminApproval' || selectedRequestDetail.status === 'PendingAdminReview') && (
                    <>
                      <button
                        type="button"
                        className="btn btn-danger py-2 px-4 rounded-3 text-sm fw-bold border-0 text-white"
                        style={{ backgroundColor: '#ef4444' }}
                        onClick={() => setRejectRequest(selectedRequestDetail)}
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        className="btn btn-success py-2 px-4 rounded-3 text-sm fw-bold border-0 text-white"
                        style={{ backgroundColor: '#22c55e' }}
                        onClick={() => handleApprove(selectedRequestDetail.requestId)}
                      >
                        Phê duyệt
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
              <div className="modal-header border-0 bg-light p-3 px-4 d-flex justify-content-between align-items-center">
                <h6 className="modal-title fw-bold m-0 text-dark">
                  <i className="fas fa-image me-2 text-cyan"></i>Giấy đăng ký phương tiện
                </h6>
                <button type="button" className="btn-close shadow-none" onClick={() => setPreviewImage(null)}></button>
              </div>
              <div className="modal-body p-4 text-center bg-dark">
                <img
                  src={previewImage}
                  alt="Registration Certificate"
                  className="img-fluid rounded-3 border shadow-sm"
                  style={{ maxHeight: '70vh', objectFit: 'contain' }}
                />
              </div>
              <div className="modal-footer border-0 p-3 px-4 bg-light d-flex justify-content-end">
                <button type="button" className="btn btn-secondary py-2 px-4 rounded-3 text-sm fw-bold border-0" style={{ backgroundColor: '#cbd5e1', color: '#334155' }} onClick={() => setPreviewImage(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ownership History Modal */}
      {selectedHistory && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
              <div className="modal-header border-0 bg-light p-3 px-4 d-flex justify-content-between align-items-center">
                <h6 className="modal-title fw-bold m-0 text-dark">
                  <i className="fas fa-history me-2 text-cyan"></i>Lịch sử sở hữu xe {selectedHistory.plate}
                </h6>
                <button type="button" className="btn-close shadow-none" onClick={() => setSelectedHistory(null)}></button>
              </div>
              <div className="modal-body p-4 text-start">
                {historyLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-info mb-2" role="status"></div>
                    <div className="text-muted small">Đang tải lịch sử...</div>
                  </div>
                ) : selectedHistory.logs.length === 0 ? (
                  <div className="text-center py-4 text-muted small">Không tìm thấy bản ghi lịch sử sở hữu.</div>
                ) : (
                  <div className="position-relative ps-4 border-start border-2 border-light ms-2">
                    {selectedHistory.logs.map((log, idx) => (
                      <div key={log.historyId} className="mb-4 position-relative">
                        <div
                          className="position-absolute rounded-circle border border-white"
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: log.toDate ? '#cbd5e1' : '#06b6d4',
                            left: '-32px',
                            top: '4px',
                            borderWidth: '2px'
                          }}
                        ></div>
                        <div className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>{log.customerName}</div>
                        <div className="small text-muted">{log.email}</div>
                        <div className="small text-secondary mt-1">
                          <strong>Sở hữu từ:</strong> {formatDate(log.fromDate)}
                        </div>
                        {log.toDate ? (
                          <div className="small text-secondary">
                            <strong>Đến:</strong> {formatDate(log.toDate)}
                          </div>
                        ) : (
                          <div className="small text-success fw-bold">Chủ sở hữu hiện tại</div>
                        )}
                        <span className="badge bg-light text-dark mt-1 text-xs fw-semibold border">
                          {log.transferType === 'InitialRegistration' ? 'Đăng ký lần đầu' : 'Chuyển nhượng'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 p-3 px-4 bg-light d-flex justify-content-end">
                <button type="button" className="btn btn-secondary py-2 px-4 rounded-3 text-sm fw-bold border-0" style={{ backgroundColor: '#cbd5e1', color: '#334155' }} onClick={() => setSelectedHistory(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectRequest && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
              <div className="modal-header border-0 bg-light p-3 px-4 d-flex justify-content-between align-items-center">
                <h6 className="modal-title fw-bold m-0 text-dark">
                  <i className="fas fa-times-circle me-2 text-danger"></i>Từ chối yêu cầu chuyển nhượng #{rejectRequest.requestId}
                </h6>
                <button type="button" className="btn-close shadow-none" onClick={() => setRejectRequest(null)}></button>
              </div>
              <form onSubmit={handleRejectSubmit}>
                <div className="modal-body p-4 text-start">
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">LÝ DO TỪ CHỐI *</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Nhập lý do từ chối yêu cầu này..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-0 p-3 px-4 bg-light d-flex gap-2 justify-content-end">
                  <button type="button" className="btn btn-secondary py-2 px-4 rounded-3 text-sm fw-bold border-0" style={{ backgroundColor: '#cbd5e1', color: '#475569' }} onClick={() => setRejectRequest(null)}>Hủy bỏ</button>
                  <button type="submit" className="btn btn-danger py-2 px-4 rounded-3 text-sm fw-bold border-0 text-white" style={{ backgroundColor: '#ef4444' }}>Xác nhận Từ chối</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOwnershipTransfers;
