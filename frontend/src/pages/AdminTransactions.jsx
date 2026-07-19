import { useState, useEffect, useCallback } from "react";
import { adminService } from "../services/adminService";
import { Table } from "../components/Table";
import { BookingDetailDrawer } from "../components/BookingDetailDrawer";
import "../styles/shared.css";

// Payment status (issue #50): 1 Pending, 2 Paid, 3 Failed, 4 Expired
const getPaymentStatusStyle = (status) => {
  switch (status) {
    case 2:
      return { cls: "bg-success bg-opacity-10 text-success", icon: "fa-check-circle" };
    case 1:
      return { cls: "bg-warning bg-opacity-10 text-warning", icon: "fa-clock" };
    case 3:
      return { cls: "bg-danger bg-opacity-10 text-danger", icon: "fa-times-circle" };
    case 4:
      return { cls: "bg-secondary bg-opacity-10 text-secondary", icon: "fa-ban" };
    default:
      return { cls: "bg-secondary bg-opacity-10 text-secondary", icon: "fa-question-circle" };
  }
};

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN");
};

// Today's date as yyyy-mm-dd in local time (used to cap the date filters).
const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export const AdminTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // Client-side quick search over the loaded rows (invoice / booking / name / plate).
  const [searchTerm, setSearchTerm] = useState("");

  // Booking whose detail drawer is open (null = closed).
  const [detailBookingId, setDetailBookingId] = useState(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // Revenue stats (issue #51) share the date range but ignore
      // the status filter: they are defined over Paid rows only.
      const [res, statsRes] = await Promise.all([
        adminService.getTransactions({
          status: statusFilter,
          fromDate,
          toDate,
        }),
        adminService.getRevenueStats({ fromDate, toDate }).catch(() => null),
      ]);
      if (res.success && res.transactions) {
        setTransactions(res.transactions);
      } else {
        setTransactions([]);
        if (window.showToast)
          window.showToast(res.message || "Không tải được lịch sử giao dịch!", "error");
      }
      setStats(statsRes && statsRes.success ? statsRes.stats : null);
    } catch {
      setTransactions([]);
      setStats(null);
      if (window.showToast) window.showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, fromDate, toDate]);

  // Auto-run the filter whenever any field changes (loadTransactions is
  // memoized on the filter values).
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const resetFilters = () => {
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    setSearchTerm("");
  };

  // Stable so BookingDetailDrawer's fetch effect doesn't re-run every render.
  const closeDetail = useCallback(() => setDetailBookingId(null), []);

  // Quick search filters the loaded rows across invoice number, booking id,
  // customer name and license plate (issue #70).
  const q = searchTerm.trim().toLowerCase();
  const filteredTransactions = q
    ? transactions.filter((t) =>
        [t.invoiceNumber, `#${t.bookingId}`, String(t.bookingId), t.customerName, t.licensePlate]
          .some((field) => (field ?? "").toString().toLowerCase().includes(q))
      )
    : transactions;

  // Date filters cannot exceed today (no future transactions exist).
  const maxDate = todayStr();
  const clampToday = (value) => (value && value > maxDate ? maxDate : value);

  // Summary — server-side stats when available, otherwise computed from the
  // loaded rows so the cards still render if the stats call fails (issue #51).
  const paidList = transactions.filter((t) => t.status === 2);
  const grossRevenue = stats ? stats.grossRevenue : paidList.reduce((s, t) => s + Number(t.basePrice ?? t.amount), 0);
  const netRevenue = stats ? stats.netRevenue : paidList.reduce((s, t) => s + Number(t.amount), 0);
  const totalDiscount = stats ? stats.totalDiscount : Math.max(0, grossRevenue - netRevenue);
  const freeCount = stats ? stats.freeCount : paidList.filter((t) => Number(t.amount) === 0).length;
  const discountedCount = stats
    ? stats.discountedCount
    : paidList.filter((t) => Number(t.discount ?? 0) > 0 && Number(t.amount) > 0).length;

  return (
    <div className="container-fluid py-4 text-start">
      <header className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3 animate-up">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ letterSpacing: "-0.5px" }}>
            LỊCH SỬ GIAO DỊCH
          </h4>
          <p className="text-secondary small mb-0">
            Theo dõi toàn bộ giao dịch thanh toán của khách hàng
          </p>
        </div>
        <button
          className="btn btn-dark btn-sm py-2 px-3 fw-bold rounded-3"
          onClick={loadTransactions}
          disabled={loading}
        >
          <i className="fas fa-sync-alt me-1"></i> LÀM MỚI
        </button>
      </header>

      {/* Summary (issue #51): gross → deductions → net */}
      <div className="row g-3 mb-4 animate-up">
        <div className="col-6 col-md-3">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 h-100 d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center bg-light text-cyan"
              style={{ width: "46px", height: "46px", flexShrink: 0 }}
            >
              <i className="fas fa-receipt"></i>
            </div>
            <div>
              <small className="text-muted d-block fw-bold" style={{ fontSize: "0.65rem" }}>
                TỔNG GIAO DỊCH
              </small>
              <h5 className="fw-bold text-dark mb-0">{transactions.length}</h5>
              <small className="text-success fw-bold" style={{ fontSize: "0.65rem" }}>
                {paidList.length} đã thanh toán
              </small>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 h-100 d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center bg-light text-secondary"
              style={{ width: "46px", height: "46px", flexShrink: 0 }}
            >
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
            <div>
              <small className="text-muted d-block fw-bold" style={{ fontSize: "0.65rem" }}>
                TỔNG GIÁ GỐC
              </small>
              <h5 className="fw-bold text-dark mb-0">{grossRevenue.toLocaleString()}đ</h5>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 h-100 d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center bg-light text-danger"
              style={{ width: "46px", height: "46px", flexShrink: 0 }}
            >
              <i className="fas fa-tags"></i>
            </div>
            <div>
              <small className="text-muted d-block fw-bold" style={{ fontSize: "0.65rem" }}>
                GIẢM TRỪ (VOUCHER / MIỄN PHÍ)
              </small>
              <h5 className="fw-bold text-danger mb-0">
                −{totalDiscount.toLocaleString()}đ
              </h5>
              <small className="text-muted" style={{ fontSize: "0.65rem" }}>
                {discountedCount} giảm giá • {freeCount} miễn phí
              </small>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 h-100 d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center bg-light text-warning"
              style={{ width: "46px", height: "46px", flexShrink: 0 }}
            >
              <i className="fas fa-wallet"></i>
            </div>
            <div>
              <small className="text-muted d-block fw-bold" style={{ fontSize: "0.65rem" }}>
                DOANH THU THỰC (NET)
              </small>
              <h5 className="fw-bold text-dark mb-0">
                {netRevenue.toLocaleString()}đ
              </h5>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row g-3 mb-4 animate-up align-items-end">
        <div className="col-md-3 col-sm-6">
          <label className="form-label small fw-bold text-muted">TÌM KIẾM</label>
          <div className="position-relative">
            <i
              className="fas fa-search position-absolute text-muted"
              style={{ left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem" }}
            ></i>
            <input
              type="text"
              className="form-control bg-white border-0 py-2.5 shadow-sm fw-semibold text-dark"
              style={{ borderRadius: "10px", boxShadow: "none", paddingLeft: "38px" }}
              placeholder="Mã HĐ, mã đặt lịch, tên KH, biển số..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <label className="form-label small fw-bold text-muted">TRẠNG THÁI</label>
          <select
            className="form-select bg-white border-0 py-2.5 shadow-sm fw-semibold text-dark"
            style={{ borderRadius: "10px", boxShadow: "none", cursor: "pointer" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="1">Chờ thanh toán</option>
            <option value="2">Đã thanh toán</option>
            <option value="3">Thất bại</option>
            <option value="4">Hết hạn</option>
          </select>
        </div>
        <div className="col-md-2 col-sm-6">
          <label className="form-label small fw-bold text-muted">TỪ NGÀY</label>
          <input
            type="date"
            lang="en-GB"
            max={maxDate}
            className="form-control bg-white border-0 py-2.5 shadow-sm fw-semibold text-dark"
            style={{ borderRadius: "10px", boxShadow: "none" }}
            value={fromDate}
            onChange={(e) => setFromDate(clampToday(e.target.value))}
          />
        </div>
        <div className="col-md-2 col-sm-6">
          <label className="form-label small fw-bold text-muted">ĐẾN NGÀY</label>
          <input
            type="date"
            lang="en-GB"
            max={maxDate}
            className="form-control bg-white border-0 py-2.5 shadow-sm fw-semibold text-dark"
            style={{ borderRadius: "10px", boxShadow: "none" }}
            value={toDate}
            onChange={(e) => setToDate(clampToday(e.target.value))}
          />
        </div>
        <div className="col-md-2 col-sm-12 d-flex gap-2">
          <button
            className="btn flex-grow-1 py-2.5 fw-bold text-white"
            style={{ borderRadius: "10px", background: "var(--cyan-electric)", border: "none" }}
            onClick={resetFilters}
            disabled={loading}
            title="Xóa bộ lọc"
          >
            <i className="fas fa-eraser me-1"></i> Xóa lọc
          </button>
        </div>
      </div>

      {/* Table or states */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-info mb-2" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="text-secondary small">Đang tải lịch sử giao dịch...</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div
          className="app-card border-0 shadow-sm p-5 text-center text-muted animate-up"
          style={{ borderRadius: "24px" }}
        >
          <i className="fas fa-receipt fa-3x mb-3 text-muted" style={{ opacity: 0.25 }}></i>
          <h5 className="fw-bold mb-2" style={{ color: "var(--navy-dark)" }}>
            Không tìm thấy giao dịch nào
          </h5>
          <p className="text-muted small mb-0">
            Hãy thử điều chỉnh lại các bộ lọc ở trên.
          </p>
        </div>
      ) : (
        <Table
          stickyHeader
          className="table-bordered"
          headers={[
            { label: "Mã hóa đơn", className: "ps-4 py-3" },
            { label: "Khách hàng" },
            { label: "Tổng thanh toán", className: "text-end" },
            { label: "Trạng thái", className: "text-center" },
            { label: "Thời gian", className: "text-end" },
            { label: "Chi tiết", className: "text-center pe-4" },
          ]}
        >
          {filteredTransactions.map((t) => {
            const st = getPaymentStatusStyle(t.status);
            return (
              <tr key={t.paymentId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td className="ps-4 py-3">
                  <span className="fw-bold d-block text-dark font-monospace" style={{ fontSize: "0.82rem" }}>
                    {t.invoiceNumber}
                  </span>
                  <small className="text-muted">Lịch hẹn #{t.bookingId}</small>
                </td>
                <td>
                  <span className="fw-bold d-block text-dark" style={{ fontSize: "0.85rem" }}>
                    {t.customerName || "—"}
                  </span>
                  <small className="text-muted">{t.customerPhone || ""}</small>
                </td>
                <td className="text-end">
                  {Number(t.discount ?? 0) > 0 && (
                    <small
                      className="text-muted d-block text-decoration-line-through"
                      style={{ fontSize: "0.7rem" }}
                    >
                      {Number(t.basePrice).toLocaleString()}
                    </small>
                  )}
                  {Number(t.amount) === 0 ? (
                    <span className="fw-bold text-success">Miễn phí</span>
                  ) : (
                    <span className="fw-bold text-dark">{Number(t.amount).toLocaleString()}</span>
                  )}
                </td>
                <td className="text-center">
                  <span className={`badge px-3 py-1.5 rounded-pill fw-bold ${st.cls}`} style={{ fontSize: "0.62rem" }}>
                    <i className={`fas me-1 ${st.icon}`}></i>
                    {t.statusName}
                  </span>
                </td>
                <td className="text-end">
                  <span className="text-dark d-block" style={{ fontSize: "0.78rem" }}>
                    {formatDateTime(t.paidAt || t.createdAt)}
                  </span>
                </td>
                <td className="text-center pe-4">
                  <button
                    className="btn btn-sm border-0 text-cyan"
                    style={{ background: "rgba(0, 191, 255, 0.1)", borderRadius: "8px" }}
                    onClick={() => setDetailBookingId(t.bookingId)}
                    title="Xem chi tiết giao dịch"
                  >
                    <i className="fas fa-eye"></i>
                  </button>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* Transaction detail drawer (reuses the AdminBookings booking-drawer block) */}
      <BookingDetailDrawer bookingId={detailBookingId} onClose={closeDetail} />
    </div>
  );
};

export default AdminTransactions;
