import { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import "../styles/shared.css";
import "../styles/admin/dashboard.css";

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    revenue7Days: [432000, 216000, 108000, 756000, 540000, 130000, 85000],
    totalRevenue: 2267000,
    prevTotalRevenue: 1950000,
    activeQueue: 0,
    avgMinutes: 22,
    avgStars: 4.8,
    tierDistribution: { Platinum: 1, Gold: 2, Silver: 3, Member: 5 },
    dayLabels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
  });

  const [loading, setLoading] = useState(true);

  // Realtime counters from localStorage
  const [realtimeCounters, setRealtimeCounters] = useState({
    todayRevenue: 0,
    todayBookingsCount: 0,
    waitingCount: 0,
    washingCount: 0,
    completedCount: 0,
    voucherUsedCount: 3,
    loyaltyPointsGrantedToday: 0,
  });

  useEffect(() => {
    fetchDashboardData();
    calculateRealtimeStats(true);

    const intervalId = setInterval(() => {
      calculateRealtimeStats(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const calculateRealtimeStats = async (background = false) => {
    try {
      const response = await adminService.getQueue(background ? { skipGlobalLoader: true } : {});
      if (response) {
        const waiting = response.filter(
          (item) => item.status === "Waiting",
        ).length;
        const washing = response.filter(
          (item) => item.status === "Washing" || item.status === "Drying",
        ).length;
        const completed = response.filter(
          (item) => item.status === "Completed",
        ).length;

        // Calculate revenue from completed orders today
        const completedRevenue = response
          .filter((item) => item.status === "Completed")
          .reduce((sum, item) => sum + (item.finalPrice || 0), 0);

        const pointsGranted = response
          .filter((item) => item.status === "Completed")
          .reduce((sum, item) => sum + (item.pointsEarned || 0), 0);

        setRealtimeCounters({
          todayRevenue: completedRevenue,
          todayBookingsCount: response.length,
          waitingCount: waiting,
          washingCount: washing,
          completedCount: completed,
          voucherUsedCount: 0,
          loyaltyPointsGrantedToday: pointsGranted,
        });
      }
    } catch (e) {
      console.error("Lỗi khi tính toán chỉ số thời gian thực:", e);
      setRealtimeCounters({
        todayRevenue: 0,
        todayBookingsCount: 0,
        waitingCount: 0,
        washingCount: 0,
        completedCount: 0,
        voucherUsedCount: 0,
        loyaltyPointsGrantedToday: 0,
      });
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch data using service endpoints or mock fallback
      let statsRes = null;
      try {
        statsRes = await adminService.getDashboardStats();
      } catch {
        statsRes = {
          revenue7Days: [432000, 216000, 108000, 756000, 540000, 130000, 85000],
          totalRevenue: 2267000,
          prevTotalRevenue: 1950000,
          activeQueue: 0,
          avgMinutes: 22,
          avgStars: 4.8,
          tierDistribution: { Platinum: 1, Gold: 2, Silver: 3, Member: 5 },
          dayLabels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
        };
      }
      setStats(statsRes);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu Admin:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
        <div className="spinner-border text-info" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 text-start">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 gap-3 border-bottom pb-3">
        <div>
          <h4
            className="fw-bold mb-1 text-dark"
            style={{ letterSpacing: "-0.5px" }}
          >
            BẢNG ĐIỀU KHIỂN HỆ THỐNG
          </h4>
          <p className="text-secondary small mb-0">
            Hệ thống quản lý, giám sát và cấu hình đặc quyền rửa xe thông minh
          </p>
        </div>
      </div>

      {/* 8 KPI Cards Grid */}
      <div className="row g-3 mb-4">
        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
            <small
              className="text-muted d-block fw-bold"
              style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
            >
              DOANH THU HÔM NAY
            </small>
            <h4 className="fw-bold text-cyan mt-1 mb-1">
              {realtimeCounters.todayRevenue.toLocaleString()}đ
            </h4>
            <small
              className="text-success fw-bold"
              style={{ fontSize: "0.68rem" }}
            >
              <i className="fas fa-trending-up me-1"></i>Đã thanh toán thực tế
            </small>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
            <small
              className="text-muted d-block fw-bold"
              style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
            >
              LỊCH ĐẶT HÔM NAY
            </small>
            <h4 className="fw-bold text-dark mt-1 mb-1">
              {realtimeCounters.todayBookingsCount} lượt
            </h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Đặt hẹn từ app khách hàng
            </small>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
            <small
              className="text-muted d-block fw-bold"
              style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
            >
              XE ĐANG CHỜ RỬA
            </small>
            <h4 className="fw-bold text-warning mt-1 mb-1">
              {realtimeCounters.waitingCount} xe
            </h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Đang đợi check-in
            </small>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
            <small
              className="text-muted d-block fw-bold"
              style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
            >
              XE ĐANG RỬA & SẤY
            </small>
            <h4 className="fw-bold text-primary mt-1 mb-1">
              {realtimeCounters.washingCount} xe
            </h4>
            <small className="text-cyan fw-bold" style={{ fontSize: "0.68rem" }}>
              Đang thực hiện công việc
            </small>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
            <small
              className="text-muted d-block fw-bold"
              style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
            >
              HOÀN THÀNH HÔM NAY
            </small>
            <h4 className="fw-bold text-success mt-1 mb-1">
              {realtimeCounters.completedCount} xe
            </h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Đã qua quy trình rửa
            </small>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
            <small
              className="text-muted d-block fw-bold"
              style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
            >
              VOUCHER ĐÃ DÙNG
            </small>
            <h4 className="fw-bold text-danger mt-1 mb-1">
              {realtimeCounters.voucherUsedCount} voucher
            </h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Áp dụng ưu đãi giảm giá
            </small>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
            <small
              className="text-muted d-block fw-bold"
              style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
            >
              LOYALTY POINTS ĐÃ CỘNG
            </small>
            <h4 className="fw-bold text-warning mt-1 mb-1">
              +{realtimeCounters.loyaltyPointsGrantedToday} PTS
            </h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Tích điểm cho khách hàng
            </small>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
            <small
              className="text-muted d-block fw-bold"
              style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
            >
              ĐÁNH GIÁ TRUNG BÌNH
            </small>
            <h4 className="fw-bold text-warning mt-1 mb-1">
              {stats.avgStars}{" "}
              <i
                className="fas fa-star"
                style={{ color: "#ffcf33", fontSize: "1.1rem" }}
              ></i>
            </h4>
            <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
              Lượt phản hồi từ khách hàng
            </small>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Revenue Chart */}
        <div className="col-12">
          <div
            className="app-card border-0 shadow-sm p-4 bg-white rounded-4"
            style={{ minHeight: "380px" }}
          >
            <h5
              className="fw-bold mb-4"
              style={{ color: "var(--navy-dark)", fontSize: "0.95rem" }}
            >
              <i className="fas fa-chart-bar text-cyan me-2"></i>BIỂU ĐỒ DOANH
              THU CHI TIẾT 7 NGÀY GẦN NHẤT
            </h5>
            <div
              className="d-flex align-items-end justify-content-between px-3 mt-5"
              style={{
                height: "220px",
                borderBottom: "1.5px solid #f1f5f9",
              }}
            >
              {stats.revenue7Days.map((val, idx) => {
                const max = Math.max(...stats.revenue7Days) || 1;
                const pct = Math.max(10, Math.round((val / max) * 100));
                return (
                  <div
                    key={idx}
                    className="text-center d-flex flex-column align-items-center"
                    style={{ flex: 1 }}
                  >
                    <small
                      className="text-cyan fw-bold mb-2"
                      style={{ fontSize: "0.68rem" }}
                    >
                      {val > 0 ? `${Math.round(val / 1000)}k` : "0"}
                    </small>
                    <div
                      className="w-50 rounded-top animate-pulse"
                      style={{
                        height: `${pct * 1.5}px`,
                        background:
                          "linear-gradient(180deg, #0ea5e9 0%, rgba(14,165,233,0.2) 100%)",
                        boxShadow: "0 4px 12px rgba(14,165,233,0.1)",
                        transition: "height 0.8s ease",
                      }}
                    ></div>
                    <small
                      className="text-muted fw-semibold mt-2"
                      style={{ fontSize: "0.72rem" }}
                    >
                      {stats.dayLabels[idx]}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
