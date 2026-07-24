import { useState, useEffect, useCallback } from "react";
import { adminService } from "../services/adminService";
import "../styles/shared.css";
import "../styles/admin/dashboard.css";

// ── Date helpers (local time YYYY-MM-DD) ──
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
const firstDayOfMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

// ── ISO Week Date Range Helper ──
const getWeekRangeDetails = (bar) => {
  let year, week;
  if (bar.date && bar.date.includes("-W")) {
    const parts = bar.date.split("-W");
    year = parseInt(parts[0], 10);
    week = parseInt(parts[1], 10);
  } else if (bar.label && (bar.label.toLowerCase().includes("week") || bar.label.toLowerCase().includes("tuần"))) {
    const match = bar.label.match(/\d+/);
    if (match) {
      week = parseInt(match[0], 10);
      year = new Date().getFullYear();
    }
  }

  if (year && week) {
    const simple = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = simple.getUTCDay() || 7;
    const monday = new Date(simple);
    monday.setUTCDate(simple.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
    
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const pad = (n) => String(n).padStart(2, "0");
    const monStr = `${pad(monday.getUTCDate())}/${pad(monday.getUTCMonth() + 1)}`;
    const sunStr = `${pad(sunday.getUTCDate())}/${pad(sunday.getUTCMonth() + 1)}`;
    
    const fullMonStr = `${monStr}/${monday.getUTCFullYear()}`;
    const fullSunStr = `${sunStr}/${sunday.getUTCFullYear()}`;

    return {
      axisLabel: `${monStr} - ${sunStr}`,
      tooltipTitle: `Week ${week}\n${fullMonStr} - ${fullSunStr}`
    };
  }

  return {
    axisLabel: bar.label || bar.date,
    tooltipTitle: bar.label || bar.date
  };
};

// ── Point Formatters (prevents double minus "--") ──
const formatEarnedPoints = (val) => {
  const num = Math.abs(Number(val) || 0);
  return num > 0 ? `+${num.toLocaleString()}` : "0";
};

const formatRedeemedPoints = (val) => {
  const num = Math.abs(Number(val) || 0);
  return num > 0 ? `−${num.toLocaleString()}` : "0";
};

const DEFAULT_DATA = {
  todaySummary: {
    bookingsToday: 0,
    completedToday: 0,
    cancelledToday: 0,
    noShowToday: 0,
    netRevenueToday: 0,
  },
  revenueOverview: {
    grossRevenue: 0,
    voucherDiscount: 0,
    loyaltyDiscount: 0,
    netRevenue: 0,
    paidTransactions: 0,
  },
  revenueChart: [],
  paymentMethodBreakdown: [],
  voucherAnalytics: {
    totalRedeemed: 0,
    totalUsed: 0,
    totalDiscountValue: 0,
    voucherUsageRate: 0,
  },
  customerAnalytics: {
    totalCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    retentionRate: 0,
  },
  loyaltyAnalytics: {
    totalLoyaltyMembers: 0,
    pointsIssued: 0,
    pointsRedeemed: 0,
    tierDistribution: {
      Platinum: 0,
      Gold: 0,
      Silver: 0,
      Member: 0,
    },
  },
};

export default function AdminDashboard() {
  // Filters State
  const [preset, setPreset] = useState("7days"); // today, 7days, 30days, thisMonth, custom
  const [fromDate, setFromDate] = useState(() => daysAgoStr(6));
  const [toDate, setToDate] = useState(() => todayStr());
  const [groupBy, setGroupBy] = useState("day"); // day, week, month

  // Data & Loading state
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [rangeLoading, setRangeLoading] = useState(false);

  // Fetch Dashboard data
  const fetchDashboardData = useCallback(async () => {
    setRangeLoading(true);
    try {
      const res = await adminService.getDashboardStats({
        fromDate,
        toDate,
        groupBy,
      });

      if (res) {
        setData({
          todaySummary: res.todaySummary || DEFAULT_DATA.todaySummary,
          revenueOverview: res.revenueOverview || DEFAULT_DATA.revenueOverview,
          revenueChart: res.revenueChart || res.period?.dailyRevenue || [],
          paymentMethodBreakdown: res.paymentMethodBreakdown || [],
          voucherAnalytics: res.voucherAnalytics || DEFAULT_DATA.voucherAnalytics,
          customerAnalytics: res.customerAnalytics || DEFAULT_DATA.customerAnalytics,
          loyaltyAnalytics: res.loyaltyAnalytics || {
            ...DEFAULT_DATA.loyaltyAnalytics,
            tierDistribution: res.tierDistribution || DEFAULT_DATA.loyaltyAnalytics.tierDistribution,
          },
        });
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu Business Analytics:", err);
    } finally {
      setRangeLoading(false);
      setLoading(false);
    }
  }, [fromDate, toDate, groupBy]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Interval refresh for realtime summary (every 15s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Preset switch helper
  const applyPreset = (p) => {
    setPreset(p);
    const today = todayStr();
    if (p === "today") {
      setFromDate(today);
      setToDate(today);
      setGroupBy("day");
    } else if (p === "7days") {
      setFromDate(daysAgoStr(6));
      setToDate(today);
      setGroupBy("day");
    } else if (p === "30days") {
      setFromDate(daysAgoStr(29));
      setToDate(today);
      setGroupBy("week"); // 30+ days -> default Week grouping
    } else if (p === "thisMonth") {
      setFromDate(firstDayOfMonthStr());
      setToDate(today);
      setGroupBy("week"); // 30+ days -> default Week grouping
    }
  };

  const maxDate = todayStr();
  const clampToday = (val) => (val && val > maxDate ? maxDate : val);

  const handleCustomDateChange = (newFrom, newTo) => {
    setPreset("custom");
    const f = newFrom !== undefined ? newFrom : fromDate;
    const t = newTo !== undefined ? newTo : toDate;
    if (newFrom !== undefined) setFromDate(clampToday(newFrom));
    if (newTo !== undefined) setToDate(clampToday(newTo));

    if (f && t) {
      const d1 = new Date(f);
      const d2 = new Date(t);
      const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      if (diffDays > 90) {
        setGroupBy("month"); // 90+ days -> recommend Month
      } else if (diffDays >= 30) {
        setGroupBy("week"); // 30+ days -> recommend Week
      }
    }
  };

  if (loading) return null;

  const {
    todaySummary,
    revenueOverview,
    revenueChart,
    paymentMethodBreakdown,
    voucherAnalytics,
    customerAnalytics,
    loyaltyAnalytics,
  } = data;

  const maxChartNet = Math.max(
    ...revenueChart.map((x) => Number(x.netRevenue || x.total || 0)),
    1
  );

  // Requirement 4: Sort Payment Breakdown by Percentage Descending
  const sortedPaymentMethods = [...paymentMethodBreakdown].sort(
    (a, b) => (b.percentageShare || 0) - (a.percentageShare || 0) || (b.totalAmount || 0) - (a.totalAmount || 0)
  );

  return (
    <div className="container-fluid py-4 px-4 dashboard-business-root">
      {/* ── SECTION 1: HEADER & FILTERS ── */}
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-3.5 gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="fas fa-chart-line text-cyan section-title-icon"></i> BÁO CÁO BUSINESS ANALYTICS
          </h4>
          <p className="text-secondary small mb-0">
            Thống kê doanh thu, khách hàng, ưu đãi và phân tích hiệu quả kinh doanh.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {rangeLoading && (
            <small className="text-cyan fw-bold me-2 pulse">
              <i className="fas fa-sync fa-spin me-1"></i> Đang tải...
            </small>
          )}
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm rounded-3 px-3 fw-bold"
            onClick={fetchDashboardData}
          >
            <i className="fas fa-redo-alt me-1"></i> Làm mới
          </button>
        </div>
      </div>

      {/* Filter Control Card */}
      <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 mb-3.5">
        <div className="row g-3 align-items-center">
          {/* Quick Presets */}
          <div className="col-lg-5 col-md-12">
            <label className="form-label small fw-bold text-muted mb-1.5 d-block">
              <i className="fas fa-filter me-1 text-cyan"></i>KHOẢNG THỜI GIAN
            </label>
            <div className="btn-group w-100 p-1 bg-light rounded-3" role="group">
              <button
                type="button"
                className={`btn btn-sm fw-bold border-0 rounded-2 py-1.5 ${
                  preset === "today" ? "btn-white shadow-sm text-primary" : "text-secondary"
                }`}
                onClick={() => applyPreset("today")}
              >
                Hôm nay
              </button>
              <button
                type="button"
                className={`btn btn-sm fw-bold border-0 rounded-2 py-1.5 ${
                  preset === "7days" ? "btn-white shadow-sm text-primary" : "text-secondary"
                }`}
                onClick={() => applyPreset("7days")}
              >
                7 ngày
              </button>
              <button
                type="button"
                className={`btn btn-sm fw-bold border-0 rounded-2 py-1.5 ${
                  preset === "30days" ? "btn-white shadow-sm text-primary" : "text-secondary"
                }`}
                onClick={() => applyPreset("30days")}
              >
                30 ngày
              </button>
              <button
                type="button"
                className={`btn btn-sm fw-bold border-0 rounded-2 py-1.5 ${
                  preset === "thisMonth" ? "btn-white shadow-sm text-primary" : "text-secondary"
                }`}
                onClick={() => applyPreset("thisMonth")}
              >
                Tháng này
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="col-lg-4 col-md-7 col-sm-12">
            <div className="row g-2">
              <div className="col-6">
                <label className="form-label small fw-bold text-muted mb-1">TỪ NGÀY</label>
                <input
                  type="date"
                  lang="en-GB"
                  max={maxDate}
                  className="form-control form-control-sm bg-light border-0 py-2 fw-semibold text-dark rounded-3"
                  value={fromDate}
                  onChange={(e) => handleCustomDateChange(e.target.value, undefined)}
                />
              </div>
              <div className="col-6">
                <label className="form-label small fw-bold text-muted mb-1">ĐẾN NGÀY</label>
                <input
                  type="date"
                  lang="en-GB"
                  max={maxDate}
                  className="form-control form-control-sm bg-light border-0 py-2 fw-semibold text-dark rounded-3"
                  value={toDate}
                  onChange={(e) => handleCustomDateChange(undefined, e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Chart Grouping Selector */}
          <div className="col-lg-3 col-md-5 col-sm-12">
            <label className="form-label small fw-bold text-muted mb-1.5 d-block">
              <i className="fas fa-layer-group me-1 text-cyan"></i>GOM NHÓM BIỂU ĐỒ
            </label>
            <div className="btn-group w-100 p-1 bg-light rounded-3" role="group">
              <button
                type="button"
                className={`btn btn-sm fw-bold border-0 rounded-2 py-1.5 ${
                  groupBy === "day" ? "btn-white shadow-sm text-cyan" : "text-secondary"
                }`}
                onClick={() => setGroupBy("day")}
              >
                Ngày
              </button>
              <button
                type="button"
                className={`btn btn-sm fw-bold border-0 rounded-2 py-1.5 ${
                  groupBy === "week" ? "btn-white shadow-sm text-cyan" : "text-secondary"
                }`}
                onClick={() => setGroupBy("week")}
              >
                Tuần
              </button>
              <button
                type="button"
                className={`btn btn-sm fw-bold border-0 rounded-2 py-1.5 ${
                  groupBy === "month" ? "btn-white shadow-sm text-cyan" : "text-secondary"
                }`}
                onClick={() => setGroupBy("month")}
              >
                Tháng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: TODAY'S BUSINESS SUMMARY ── */}
      <h6 className="fw-bold text-secondary mb-2.5 text-uppercase" style={{ fontSize: "0.78rem", letterSpacing: "0.6px" }}>
        <i className="fas fa-calendar-day text-cyan me-2 section-title-icon"></i>KẾT QUẢ KINH DOANH HÔM NAY
      </h6>
      <div className="row g-3 mb-3.5">
        <div className="col-lg-2.4 col-md-4 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100 border-start border-4 border-primary">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              LỊCH ĐẶT HÔM NAY
            </small>
            <h3 className="fw-bold text-dark mt-1.5 mb-0">{(todaySummary.bookingsToday || 0).toLocaleString()}</h3>
            <small className="text-secondary" style={{ fontSize: "0.7rem" }}>Lịch đăng ký rửa xe</small>
          </div>
        </div>

        <div className="col-lg-2.4 col-md-4 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100 border-start border-4 border-success">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              HOÀN THÀNH HÔM NAY
            </small>
            <h3 className="fw-bold text-success mt-1.5 mb-0">{(todaySummary.completedToday || 0).toLocaleString()}</h3>
            <small className="text-secondary" style={{ fontSize: "0.7rem" }}>Đã rửa xe thành công</small>
          </div>
        </div>

        <div className="col-lg-2.4 col-md-4 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100 border-start border-4 border-danger">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              ĐÃ HỦY HÔM NAY
            </small>
            <h3 className="fw-bold text-danger mt-1.5 mb-0">{(todaySummary.cancelledToday || 0).toLocaleString()}</h3>
            <small className="text-secondary" style={{ fontSize: "0.7rem" }}>Khách hoặc hệ thống hủy</small>
          </div>
        </div>

        <div className="col-lg-2.4 col-md-4 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100 border-start border-4 border-warning">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              BỎ QUÊN / NO-SHOW
            </small>
            <h3 className="fw-bold text-warning mt-1.5 mb-0">{(todaySummary.noShowToday || 0).toLocaleString()}</h3>
            <small className="text-secondary" style={{ fontSize: "0.7rem" }}>Không đến theo giờ đặt</small>
          </div>
        </div>

        <div className="col-lg-2.4 col-md-4 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100 border-start border-4 border-cyan">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              DOANH THU HÔM NAY
            </small>
            <h3 className="fw-bold text-cyan mt-1.5 mb-0">{(todaySummary.netRevenueToday || 0).toLocaleString()}đ</h3>
            <small className="text-secondary" style={{ fontSize: "0.7rem" }}>Thực thu phát sinh trong ngày</small>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: REVENUE OVERVIEW ── */}
      <h6 className="fw-bold text-secondary mb-2.5 text-uppercase" style={{ fontSize: "0.78rem", letterSpacing: "0.6px" }}>
        <i className="fas fa-coins text-cyan me-2 section-title-icon"></i>TỔNG QUAN DOANH THU & GIẢM TRỪ (THEO KỲ BÁO CÁO)
      </h6>
      <div className="row g-3 mb-3.5">
        <div className="col-lg-4 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100 position-relative overflow-hidden">
            <span className="position-absolute top-0 end-0 p-3 opacity-10">
              <i className="fas fa-file-invoice-dollar fa-3x text-dark"></i>
            </span>
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.64rem" }}>
              DOANH THU GIÁ GỐC (GROSS)
            </small>
            <h3 className="fw-bold text-dark mt-1.5 mb-1">{(revenueOverview.grossRevenue || 0).toLocaleString()}đ</h3>
            <small className="text-secondary" style={{ fontSize: "0.7rem" }}>
              Trước khi giảm trừ ưu đãi
            </small>
          </div>
        </div>

        <div className="col-lg-4 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100 position-relative overflow-hidden">
            <span className="position-absolute top-0 end-0 p-3 opacity-10">
              <i className="fas fa-ticket-alt fa-3x text-danger"></i>
            </span>
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.64rem" }}>
              GIẢM GIÁ VOUCHER (−)
            </small>
            <h3 className="fw-bold text-danger mt-1.5 mb-1">−{Math.abs(Number(revenueOverview.voucherDiscount) || 0).toLocaleString()}đ</h3>
            <small className="text-secondary" style={{ fontSize: "0.7rem" }}>
              Khuyến mãi áp dụng từ Voucher
            </small>
          </div>
        </div>

        <div className="col-lg-4 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-primary text-white rounded-4 h-100 position-relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" }}>
            <span className="position-absolute top-0 end-0 p-3 opacity-20 text-white">
              <i className="fas fa-wallet fa-3x"></i>
            </span>
            <small className="text-white-50 d-block fw-bold text-uppercase" style={{ fontSize: "0.64rem" }}>
              DOANH THU THỰC NHẬN (= NET)
            </small>
            <h3 className="fw-bold text-white mt-1.5 mb-1">{(revenueOverview.netRevenue || 0).toLocaleString()}đ</h3>
            <small className="text-white-50" style={{ fontSize: "0.7rem" }}>
              {(revenueOverview.paidTransactions || 0).toLocaleString()} giao dịch đã thu tiền
            </small>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: REVENUE TREND CHART ── */}
      <div className="row g-4 mb-3.5">
        <div className="col-12">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 gap-2">
              <div>
                <h6 className="fw-bold text-dark mb-0 text-uppercase" style={{ fontSize: "0.88rem" }}>
                  <i className="fas fa-chart-area text-cyan me-2 section-title-icon"></i>BIỂU ĐỒ BIẾN ĐỘNG DOANH THU & GIẢM TRỪ
                </h6>
                {/* Requirement 3: Dynamic Subtitle */}
                <small className="text-muted">
                  Hiển thị chi tiết theo {groupBy === "month" ? "Tháng" : groupBy === "week" ? "Tuần" : "Ngày"}
                </small>
              </div>
              <div className="d-flex align-items-center gap-3">
                <small className="d-flex align-items-center gap-1.5 text-secondary">
                  <span style={{ width: "10px", height: "10px", borderRadius: "3px", backgroundColor: "#0ea5e9" }}></span>
                  Doanh Thu Thực
                </small>
                <small className="d-flex align-items-center gap-1.5 text-secondary">
                  <span style={{ width: "10px", height: "10px", borderRadius: "3px", backgroundColor: "#ef4444" }}></span>
                  Giảm Giá Voucher
                </small>
              </div>
            </div>

            {revenueChart.length === 0 ? (
              <div className="text-center text-muted py-5">
                <i className="fas fa-chart-bar fa-3x mb-3 text-secondary opacity-25"></i>
                <p className="small mb-0">Không có phát sinh doanh thu trong thời gian này.</p>
              </div>
            ) : (
              <div
                className="d-flex align-items-end justify-content-between px-2 pt-4"
                style={{ height: "240px", borderBottom: "1.5px solid #e2e8f0", overflowX: "auto" }}
              >
                {revenueChart.map((bar, idx) => {
                  const netVal = Number(bar.netRevenue || bar.total || 0);
                  const voucherVal = Number(bar.voucherDiscount || 0);
                  const pct = netVal > 0 ? Math.max(8, Math.round((netVal / maxChartNet) * 100)) : 3;

                  // Requirement 1: Weekly Date Range Labels & Tooltip Format
                  const labelDetails = groupBy === "week"
                    ? getWeekRangeDetails(bar)
                    : { axisLabel: bar.label || bar.date, tooltipTitle: bar.label || bar.date };

                  const tooltipText = `${labelDetails.tooltipTitle}\n\nRevenue:\n${netVal.toLocaleString()}đ\n\nVoucher Discount:\n${voucherVal.toLocaleString()}đ`;

                  const isZero = netVal === 0;

                  return (
                    <div
                      key={idx}
                      className="text-center d-flex flex-column align-items-center position-relative group-bar"
                      style={{ flex: "1 0 45px", minWidth: "45px" }}
                      title={tooltipText}
                    >
                      {/* Requirement 2: Hide Zero Value Labels above bars */}
                      <small
                        className="text-cyan fw-bold mb-1"
                        style={{ fontSize: "0.65rem", visibility: isZero ? "hidden" : "visible" }}
                      >
                        {netVal > 0 ? `${Math.round(netVal / 1000)}k` : "0"}
                      </small>

                      {/* Requirement 8 & 9: Chart Polish & Zero Bar Styling */}
                      <div
                        className="rounded-top w-75 position-relative"
                        style={{
                          height: isZero ? "4px" : `${pct * 1.6}px`,
                          background: isZero
                            ? "#cbd5e1"
                            : "linear-gradient(180deg, #0ea5e9 0%, rgba(14,165,233,0.35) 100%)",
                          opacity: isZero ? 0.35 : 1,
                          transition: "height 0.3s ease, opacity 0.3s ease, transform 0.2s ease",
                        }}
                      >
                        {voucherVal > 0 && !isZero && (
                          <div
                            className="position-absolute top-0 start-0 w-100 rounded-top"
                            style={{ height: "4px", backgroundColor: "#ef4444" }}
                          ></div>
                        )}
                      </div>

                      <small
                        className="text-muted fw-semibold mt-2 text-nowrap"
                        style={{
                          fontSize: revenueChart.length > 14 ? "0.6rem" : "0.68rem",
                          transform: revenueChart.length > 14 ? "rotate(-35deg)" : "none",
                          transformOrigin: "top left",
                          display: "inline-block",
                          marginTop: revenueChart.length > 14 ? "12px" : "8px",
                        }}
                      >
                        {labelDetails.axisLabel}
                      </small>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 5: PAYMENT METHOD BREAKDOWN ── */}
      <h6 className="fw-bold text-secondary mb-2.5 text-uppercase" style={{ fontSize: "0.78rem", letterSpacing: "0.6px" }}>
        <i className="fas fa-credit-card text-primary me-2 section-title-icon"></i>THỐNG KÊ PHƯƠNG THỨC THANH TOÁN
      </h6>
      <div className="row g-3 mb-3.5">
        <div className="col-12">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4">
            {sortedPaymentMethods.length === 0 ? (
              <p className="text-muted small mb-0 py-2">Chưa có giao dịch thanh toán trong kỳ.</p>
            ) : (
              <div className="row g-3">
                {/* Requirement 4: Sorted Payment Methods */}
                {sortedPaymentMethods.map((item, idx) => {
                  const isCash = item.methodId === 1;
                  const isPayOS = item.methodId === 3;
                  const isVNPay = item.methodId === 2;
                  const isFree = item.methodId === 4;

                  const badgeBg = isCash
                    ? "bg-success-subtle text-success"
                    : isPayOS || isVNPay
                    ? "bg-primary-subtle text-primary"
                    : isFree
                    ? "bg-warning-subtle text-warning"
                    : "bg-secondary-subtle text-secondary";

                  const barBg = isCash ? "#22c55e" : isPayOS || isVNPay ? "#0ea5e9" : isFree ? "#f59e0b" : "#64748b";

                  return (
                    <div key={idx} className="col-lg-3 col-sm-6">
                      <div className="p-3 bg-light rounded-3 h-100 border border-light-subtle">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className={`badge rounded-pill px-2.5 py-1 ${badgeBg} fw-bold`}>
                            {item.methodName || `Phương thức #${item.methodId}`}
                          </span>
                          <span className="fw-bold text-dark small">{item.percentageShare || 0}%</span>
                        </div>
                        <h4 className="fw-bold text-dark mb-1">{(item.totalAmount || 0).toLocaleString()}đ</h4>
                        <div className="progress mb-2" style={{ height: "6px" }}>
                          <div
                            className="progress-bar rounded-pill"
                            role="progressbar"
                            style={{ width: `${item.percentageShare || 0}%`, backgroundColor: barBg }}
                          ></div>
                        </div>
                        <small className="text-muted" style={{ fontSize: "0.68rem" }}>
                          {(item.transactionCount || 0).toLocaleString()} giao dịch thành công
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 6: VOUCHER ANALYTICS (Requirement 1: Clean 4-card Layout) ── */}
      <h6 className="fw-bold text-secondary mb-2.5 text-uppercase" style={{ fontSize: "0.78rem", letterSpacing: "0.6px" }}>
        <i className="fas fa-tags text-danger me-2 section-title-icon"></i>HIỆU QUẢ VOUCHER & ƯU ĐÃI
      </h6>
      <div className="row g-3 mb-3.5">
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              TỔNG VOUCHER ĐÃ ĐỔI
            </small>
            <h4 className="fw-bold text-dark mt-1.5 mb-1">{(voucherAnalytics.totalRedeemed || 0).toLocaleString()}</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>Quy đổi từ điểm thưởng</small>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              VOUCHER ĐÃ SỬ DỤNG
            </small>
            <h4 className="fw-bold text-danger mt-1.5 mb-1">{(voucherAnalytics.totalUsed || 0).toLocaleString()}</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>Đã áp dụng vào hóa đơn</small>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              TỔNG GIÁ TRỊ GIẢM VOUCHER
            </small>
            <h4 className="fw-bold text-primary mt-1.5 mb-1">{(voucherAnalytics.totalDiscountValue || 0).toLocaleString()}đ</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>Tổng ngân sách ưu đãi</small>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              TỶ LỆ SỬ DỤNG VOUCHER
            </small>
            <h4 className="fw-bold text-cyan mt-1.5 mb-1">{(voucherAnalytics.voucherUsageRate || 0).toLocaleString()}%</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>Tỷ lệ sử dụng thực tế</small>
          </div>
        </div>
      </div>

      {/* ── SECTION 7: CUSTOMER ANALYTICS ── */}
      <h6 className="fw-bold text-secondary mb-2.5 text-uppercase" style={{ fontSize: "0.78rem", letterSpacing: "0.6px" }}>
        <i className="fas fa-users text-cyan me-2 section-title-icon"></i>PHÂN TÍCH KHÁCH HÀNG
      </h6>
      <div className="row g-3 mb-3.5">
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              TỔNG KHÁCH HÀNG HỆ THỐNG
            </small>
            <h4 className="fw-bold text-dark mt-1.5 mb-1">{(customerAnalytics.totalCustomers || 0).toLocaleString()}</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>Tài khoản đã đăng ký</small>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              KHÁCH HÀNG MỚI TRONG KỲ
            </small>
            <h4 className="fw-bold text-success mt-1.5 mb-1">+{(customerAnalytics.newCustomers || 0).toLocaleString()}</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>Đăng ký trong khoảng thời gian</small>
          </div>
        </div>

        {/* Requirement 2 & 6: Clean Returning Customers Subtitle */}
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              KHÁCH HÀNG QUAY LẠI
            </small>
            <h4 className="fw-bold text-info mt-1.5 mb-1">{(customerAnalytics.returningCustomers || 0).toLocaleString()}</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Đã rửa xe &gt;1 lần ({(customerAnalytics.retentionRate || 0).toLocaleString()}% tỷ lệ giữ chân)
            </small>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              TỶ LỆ GIỮ CHÂN KHÁCH HÀNG
            </small>
            <h4 className="fw-bold text-cyan mt-1.5 mb-1">{(customerAnalytics.retentionRate || 0).toLocaleString()}%</h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>Khách hàng trung thành</small>
          </div>
        </div>
      </div>

      {/* ── SECTION 8: LOYALTY ANALYTICS ── */}
      <h6 className="fw-bold text-secondary mb-2.5 text-uppercase" style={{ fontSize: "0.78rem", letterSpacing: "0.6px" }}>
        <i className="fas fa-crown text-warning me-2 section-title-icon"></i>THỐNG KÊ LOYALTY & HẠNG THÀNH VIÊN
      </h6>
      <div className="row g-4 mb-4">
        {/* Requirement 3 & 4: Balanced Loyalty Cards */}
        <div className="col-lg-6 col-12">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100 d-flex flex-column justify-content-between">
            <h6 className="fw-bold text-dark mb-2.5" style={{ fontSize: "0.85rem" }}>TÍCH ĐIỂM & ĐỔI QUÀ</h6>
            <div className="row g-2.5 my-auto">
              <div className="col-4">
                <div className="p-3 bg-light rounded-3 text-center h-100 d-flex flex-column justify-content-center">
                  <small className="text-muted d-block fw-bold mb-1.5" style={{ fontSize: "0.6rem" }}>
                    THÀNH VIÊN LOYALTY
                  </small>
                  <h4 className="fw-bold text-dark mb-0" style={{ fontSize: "1.35rem" }}>
                    {(loyaltyAnalytics.totalLoyaltyMembers || 0).toLocaleString()}
                  </h4>
                </div>
              </div>
              <div className="col-4">
                <div className="p-3 bg-warning-subtle rounded-3 text-center h-100 d-flex flex-column justify-content-center">
                  <small className="text-warning-emphasis d-block fw-bold mb-1.5" style={{ fontSize: "0.6rem" }}>
                    POINTS ĐÃ CỘNG
                  </small>
                  <h4 className="fw-bold text-warning mb-0" style={{ fontSize: "1.35rem" }}>
                    {formatEarnedPoints(loyaltyAnalytics.pointsIssued)}
                  </h4>
                </div>
              </div>
              <div className="col-4">
                <div className="p-3 bg-danger-subtle rounded-3 text-center h-100 d-flex flex-column justify-content-center">
                  <small className="text-danger d-block fw-bold mb-1.5" style={{ fontSize: "0.6rem" }}>
                    POINTS ĐÃ ĐỔI
                  </small>
                  <h4 className="fw-bold text-danger mb-0" style={{ fontSize: "1.35rem" }}>
                    {formatRedeemedPoints(loyaltyAnalytics.pointsRedeemed)}
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Requirement 5: Ascending Progression Tier Distribution (8px Progress Bar) */}
        <div className="col-lg-6 col-12">
          <div className="app-card border-0 shadow-sm p-3.5 bg-white rounded-4 h-100">
            <h6 className="fw-bold text-dark mb-3" style={{ fontSize: "0.85rem" }}>PHÂN BỐ HẠNG THÀNH VIÊN</h6>
            {(() => {
              const tiers = loyaltyAnalytics.tierDistribution || {};
              const total = Object.values(tiers).reduce((a, b) => a + Number(b), 0) || 1;
              const plat = tiers.Platinum || 0;
              const gold = tiers.Gold || 0;
              const silv = tiers.Silver || 0;
              const memb = tiers.Member || 0;

              return (
                <div className="d-flex flex-column gap-3">
                  {/* 1. Member */}
                  <div>
                    <div className="d-flex justify-content-between small fw-bold mb-1">
                      <span className="text-dark">
                        <i className="fas fa-user text-muted me-1.5"></i> Member
                      </span>
                      <span>{memb.toLocaleString()} ({Math.round((memb / total) * 100)}%)</span>
                    </div>
                    <div className="progress" style={{ height: "8px" }}>
                      <div className="progress-bar bg-secondary-subtle border" style={{ width: `${(memb / total) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* 2. Silver */}
                  <div>
                    <div className="d-flex justify-content-between small fw-bold mb-1">
                      <span className="text-dark">
                        <i className="fas fa-medal text-secondary me-1.5"></i> Silver
                      </span>
                      <span>{silv.toLocaleString()} ({Math.round((silv / total) * 100)}%)</span>
                    </div>
                    <div className="progress" style={{ height: "8px" }}>
                      <div className="progress-bar bg-secondary" style={{ width: `${(silv / total) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* 3. Gold */}
                  <div>
                    <div className="d-flex justify-content-between small fw-bold mb-1">
                      <span className="text-dark">
                        <i className="fas fa-crown text-warning me-1.5"></i> Gold
                      </span>
                      <span>{gold.toLocaleString()} ({Math.round((gold / total) * 100)}%)</span>
                    </div>
                    <div className="progress" style={{ height: "8px" }}>
                      <div className="progress-bar bg-warning" style={{ width: `${(gold / total) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* 4. Platinum */}
                  <div>
                    <div className="d-flex justify-content-between small fw-bold mb-1">
                      <span className="text-dark">
                        <i className="fas fa-gem text-info me-1.5"></i> Platinum
                      </span>
                      <span>{plat.toLocaleString()} ({Math.round((plat / total) * 100)}%)</span>
                    </div>
                    <div className="progress" style={{ height: "8px" }}>
                      <div className="progress-bar bg-info" style={{ width: `${(plat / total) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
