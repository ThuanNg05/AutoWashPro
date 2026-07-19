import { useState, useEffect, useCallback } from "react";
import { adminService } from "../services/adminService";
import "../styles/shared.css";
import "../styles/admin/dashboard.css";

// ── Local date helpers (yyyy-mm-dd in local time, never UTC) ──
const toLocalYmd = (d) => {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};
const todayStr = () => toLocalYmd(new Date());
const daysAgoStr = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalYmd(d);
};

const DEFAULT_STATS = {
  avgStars: 0,
  tierDistribution: { Platinum: 0, Gold: 0, Silver: 0, Member: 0 },
  period: {
    netRevenue: 0,
    grossRevenue: 0,
    totalDiscount: 0,
    paidCount: 0,
    bookingCount: 0,
    completedCount: 0,
    pointsGranted: 0,
    voucherUsedCount: 0,
    avgStars: 0,
    dailyRevenue: [],
  },
};

export const AdminDashboard = () => {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(true); // first paint only
  const [rangeLoading, setRangeLoading] = useState(false);

  // ── Date range filter (drives the period statistics + chart) ──
  const [fromDate, setFromDate] = useState(daysAgoStr(6)); // last 7 days incl. today
  const [toDate, setToDate] = useState(todayStr());

  // Today's statistics (not filtered). Pulled from the same authoritative
  // stats endpoint as the period cards — scoped to today — so the figures
  // match payment/booking records instead of the transient queue snapshot.
  const [todayStats, setTodayStats] = useState(DEFAULT_STATS.period);

  // Dashboard stats scoped to the selected date range (backend does the work).
  const fetchDashboardData = useCallback(async () => {
    setRangeLoading(true);
    try {
      const res = await adminService.getDashboardStats({ fromDate, toDate });
      if (res) setStats(res);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu Admin:", err);
    } finally {
      setRangeLoading(false);
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchTodayStats();
    const intervalId = setInterval(fetchTodayStats, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Today's figures, refreshed on an interval for a realtime feel. Uses the
  // authoritative stats endpoint (fromDate = toDate = today) so revenue,
  // discount, paid count, completed washes, points and rating stay in sync
  // with payment/booking records — unlike the queue, which drops rows once a
  // booking is paid and archived.
  const fetchTodayStats = async () => {
    try {
      const t = todayStr();
      const res = await adminService.getDashboardStats(
        { fromDate: t, toDate: t },
        { skipGlobalLoader: true },
      );
      if (res && res.period) setTodayStats(res.period);
    } catch (e) {
      console.error("Lỗi khi tải thống kê hôm nay:", e);
    }
  };

  const maxDate = todayStr();
  const clampToday = (value) => (value && value > maxDate ? maxDate : value);
  const resetRange = () => {
    setFromDate(daysAgoStr(6));
    setToDate(todayStr());
  };

  // ── Period figures from the backend ──
  const p = stats.period || DEFAULT_STATS.period;
  const td = todayStats || DEFAULT_STATS.period; // today's figures (realtime)
  const dailyRevenue = p.dailyRevenue || [];
  const maxDaily = Math.max(...dailyRevenue.map((x) => Number(x.total) || 0), 1);

  // First paint is covered by the full-screen GlobalLoader ring (mounted in
  // AdminLayout); render nothing here so the ring is the sole loader.
  if (loading) return null;

  return (
    <div className="container-fluid py-4 text-start">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 gap-3 border-bottom pb-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ letterSpacing: "-0.5px" }}>
            BẢNG ĐIỀU KHIỂN HỆ THỐNG
          </h4>
          <p className="text-secondary small mb-0">
            Hệ thống quản lý, giám sát và cấu hình đặc quyền rửa xe thông minh
          </p>
        </div>
      </div>

      {/* ── Date range filter (drives period statistics + chart) ── */}
      <div className="app-card border-0 shadow-sm p-3 bg-white rounded-4 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-4 col-sm-6">
            <label className="form-label small fw-bold text-muted">TỪ NGÀY</label>
            <input
              type="date"
              lang="en-GB"
              max={maxDate}
              className="form-control bg-light border-0 py-2.5 fw-semibold text-dark"
              style={{ borderRadius: "10px" }}
              value={fromDate}
              onChange={(e) => setFromDate(clampToday(e.target.value))}
            />
          </div>
          <div className="col-md-4 col-sm-6">
            <label className="form-label small fw-bold text-muted">ĐẾN NGÀY</label>
            <input
              type="date"
              lang="en-GB"
              max={maxDate}
              className="form-control bg-light border-0 py-2.5 fw-semibold text-dark"
              style={{ borderRadius: "10px" }}
              value={toDate}
              onChange={(e) => setToDate(clampToday(e.target.value))}
            />
          </div>
          <div className="col-md-4 col-sm-12 d-flex align-items-center gap-2">
            <button
              className="btn py-2.5 px-3 fw-bold text-white"
              style={{ borderRadius: "10px", background: "var(--cyan-electric)", border: "none" }}
              onClick={resetRange}
              disabled={rangeLoading}
              title="Đặt lại 7 ngày gần nhất"
            >
              <i className="fas fa-eraser me-1"></i> 7 ngày gần nhất
            </button>
            {rangeLoading && (
              <span className="text-muted small">
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                Đang cập nhật...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Period statistics (depend on the filter) ── */}
      <h6 className="fw-bold text-secondary mb-3" style={{ fontSize: "0.8rem", letterSpacing: "0.5px" }}>
        <i className="fas fa-calendar-day text-cyan me-2"></i>THỐNG KÊ THEO KHOẢNG ĐÃ CHỌN
      </h6>
      <div className="row g-3 mb-4">
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              DOANH THU THỰC (NET)
            </small>
            <h4 className="fw-bold text-cyan mt-1 mb-1">{(p.netRevenue || 0).toLocaleString()}đ</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Sau giảm trừ voucher / miễn phí
            </small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              TỔNG GIÁ GỐC
            </small>
            <h4 className="fw-bold text-dark mt-1 mb-1">{(p.grossRevenue || 0).toLocaleString()}đ</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Trước khi áp dụng ưu đãi
            </small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              GIẢM TRỪ (VOUCHER / MIỄN PHÍ)
            </small>
            <h4 className="fw-bold text-danger mt-1 mb-1">−{(p.totalDiscount || 0).toLocaleString()}đ</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              {p.voucherUsedCount || 0} voucher đã dùng
            </small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              GIAO DỊCH ĐÃ THANH TOÁN
            </small>
            <h4 className="fw-bold text-dark mt-1 mb-1">{p.paidCount || 0}</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              {p.bookingCount || 0} lịch đặt trong kỳ
            </small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              LƯỢT RỬA HOÀN THÀNH
            </small>
            <h4 className="fw-bold text-success mt-1 mb-1">{p.completedCount || 0} xe</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Đã qua quy trình rửa
            </small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              LOYALTY POINTS ĐÃ CỘNG
            </small>
            <h4 className="fw-bold text-warning mt-1 mb-1">+{p.pointsGranted || 0} PTS</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Tích điểm cho khách hàng
            </small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              ĐÁNH GIÁ TRUNG BÌNH
            </small>
            <h4 className="fw-bold text-warning mt-1 mb-1">
              {p.avgStars || 0}{" "}
              <i className="fas fa-star" style={{ color: "#ffcf33", fontSize: "1.1rem" }}></i>
            </h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Phản hồi trong khoảng đã chọn
            </small>
          </div>
        </div>
      </div>

      {/* Revenue Chart — built from the selected range */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4" style={{ minHeight: "380px" }}>
            <h5 className="fw-bold mb-4" style={{ color: "var(--navy-dark)", fontSize: "0.95rem" }}>
              <i className="fas fa-chart-bar text-cyan me-2"></i>BIỂU ĐỒ DOANH THU THEO KHOẢNG ĐÃ CHỌN
            </h5>
            {dailyRevenue.length === 0 ? (
              <div className="text-center text-muted py-5">
                <i className="fas fa-chart-bar fa-2x mb-2" style={{ opacity: 0.25 }}></i>
                <div className="small">Không có doanh thu trong khoảng thời gian này.</div>
              </div>
            ) : (
              <div
                className="d-flex align-items-end justify-content-between px-3 mt-5"
                style={{ height: "220px", borderBottom: "1.5px solid #f1f5f9", overflowX: "auto" }}
              >
                {dailyRevenue.map((bar, idx) => {
                  const val = Number(bar.total) || 0;
                  const pct = val > 0 ? Math.max(6, Math.round((val / maxDaily) * 100)) : 2;
                  const [, mm, dd] = String(bar.date).split("-");
                  return (
                    <div
                      key={idx}
                      className="text-center d-flex flex-column align-items-center"
                      style={{ flex: "1 0 34px", minWidth: "34px" }}
                    >
                      <small className="text-cyan fw-bold mb-2" style={{ fontSize: "0.66rem" }}>
                        {val > 0 ? `${Math.round(val / 1000)}k` : "0"}
                      </small>
                      <div
                        className="rounded-top"
                        style={{
                          width: "60%",
                          height: `${pct * 1.5}px`,
                          background: "linear-gradient(180deg, #0ea5e9 0%, rgba(14,165,233,0.2) 100%)",
                          boxShadow: "0 4px 12px rgba(14,165,233,0.1)",
                          transition: "height 0.8s ease",
                        }}
                      ></div>
                      <small className="text-muted fw-semibold mt-2" style={{ fontSize: "0.68rem" }}>
                        {dd}/{mm}
                      </small>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Realtime "today" statistics (NOT affected by the filter) ── */}
      <h6 className="fw-bold text-secondary mb-3" style={{ fontSize: "0.8rem", letterSpacing: "0.5px" }}>
        <i className="fas fa-bolt text-warning me-2"></i>THỜI GIAN THỰC · HÀNG ĐỢI HÔM NAY
      </h6>
      <div className="row g-3 mb-4">
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              DOANH THU THỰC (NET)
            </small>
            <h4 className="fw-bold text-cyan mt-1 mb-1">{(td.netRevenue || 0).toLocaleString()}đ</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Sau giảm trừ voucher / miễn phí
            </small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              TỔNG GIÁ GỐC
            </small>
            <h4 className="fw-bold text-dark mt-1 mb-1">{(td.grossRevenue || 0).toLocaleString()}đ</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Trước khi áp dụng ưu đãi
            </small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              GIẢM TRỪ (VOUCHER / MIỄN PHÍ)
            </small>
            <h4 className="fw-bold text-danger mt-1 mb-1">−{(td.totalDiscount || 0).toLocaleString()}đ</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              {td.voucherUsedCount || 0} voucher đã dùng
            </small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              GIAO DỊCH ĐÃ THANH TOÁN
            </small>
            <h4 className="fw-bold text-dark mt-1 mb-1">{td.paidCount || 0}</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              {td.bookingCount || 0} lịch đặt hôm nay
            </small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              LƯỢT RỬA HOÀN THÀNH
            </small>
            <h4 className="fw-bold text-success mt-1 mb-1">{td.completedCount || 0} xe</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Đã qua quy trình rửa
            </small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              LOYALTY POINTS ĐÃ CỘNG
            </small>
            <h4 className="fw-bold text-warning mt-1 mb-1">+{td.pointsGranted || 0} PTS</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Tích điểm cho khách hàng
            </small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
              ĐÁNH GIÁ TRUNG BÌNH
            </small>
            <h4 className="fw-bold text-warning mt-1 mb-1">
              {td.avgStars || 0}{" "}
              <i className="fas fa-star" style={{ color: "#ffcf33", fontSize: "1.1rem" }}></i>
            </h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Phản hồi trong hôm nay
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
