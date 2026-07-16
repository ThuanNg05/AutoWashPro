import { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import "../styles/shared.css";
import "../styles/admin/dashboard.css";

const DEFAULT_CONFIG = {
  pointsPerThousandVND: 1,
  pointExpiryMonths: 12,
  tierReviewDayOfMonth: 1,
  rankingWindowYears: 2,
  tiers: [
    {
      tierId: 1,
      tierName: "Standard",
      minRankingBalance: 0,
      pointMultiplier: 1.0,
      discountPercent: 0,
      bookingWindowDays: 7,
    },
    {
      tierId: 2,
      tierName: "Silver",
      minRankingBalance: 500,
      pointMultiplier: 1.1,
      discountPercent: 2,
      bookingWindowDays: 10,
    },
    {
      tierId: 3,
      tierName: "Gold",
      minRankingBalance: 2000,
      pointMultiplier: 1.2,
      discountPercent: 5,
      bookingWindowDays: 12,
    },
    {
      tierId: 4,
      tierName: "Platinum",
      minRankingBalance: 5000,
      pointMultiplier: 1.5,
      discountPercent: 10,
      bookingWindowDays: 14,
    },
  ],
};

export const AdminLoyalty = () => {
  const [loyaltyConfig, setLoyaltyConfig] = useState(DEFAULT_CONFIG);
  const [tierDistribution, setTierDistribution] = useState({
    Platinum: 1,
    Gold: 2,
    Silver: 3,
    Member: 5,
  });
  const [reviewList, setReviewList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("config"); // 'config' | 'tiers' | 'review' | 'stats'

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  const fetchLoyaltyData = async () => {
    setLoading(true);
    try {
      let configRes = null;
      try {
        configRes = await adminService.getLoyaltyConfig();
      } catch {
        configRes = DEFAULT_CONFIG;
      }
      setLoyaltyConfig(configRes);

      try {
        const statsRes = await adminService.getDashboardStats();
        if (statsRes?.tierDistribution) setTierDistribution(statsRes.tierDistribution);
      } catch {
        setTierDistribution({ Platinum: 1, Gold: 2, Silver: 3, Member: 5 });
      }

      try {
        const reviewRes = await adminService.tierReview();
        setReviewList(reviewRes || []);
      } catch (e) {
        console.error("Lỗi khi lấy danh sách dự báo thăng hạng:", e);
        setReviewList([]);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu Loyalty:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLoyaltyConfig = async (e) => {
    e.preventDefault();
    try {
      const response = await adminService.saveLoyaltyConfig({
        PointsPerThousandVND: loyaltyConfig.pointsPerThousandVND,
        PointExpiryMonths: loyaltyConfig.pointExpiryMonths,
        TierReviewDayOfMonth: loyaltyConfig.tierReviewDayOfMonth,
        RankingWindowYears: loyaltyConfig.rankingWindowYears,
        TierUpdates: loyaltyConfig.tiers.map((t) => ({
          TierId: t.tierId,
          PointMultiplier: t.pointMultiplier,
          DiscountPercent: t.discountPercent,
          BookingWindowDays: t.bookingWindowDays,
        })),
      });

      if (response.success) {
        if (window.showToast)
          window.showToast(
            "Lưu cấu hình AutoWash Loyalty thành công!",
            "success",
          );
      } else {
        if (window.showToast)
          window.showToast(
            response.message || "Lưu cấu hình thất bại!",
            "error",
          );
      }
    } catch (err) {
      console.error(err);
      if (window.showToast)
        window.showToast("Lỗi kết nối khi lưu cấu hình!", "error");
    }
  };

  const handleRunTierReview = async () => {
    const run = async () => {
      if (window.showToast) {
        window.showToast(
          "Đang chạy xếp hạng định kỳ cho tất cả khách hàng...",
          "info",
        );
      }
      try {
        const response = await adminService.runTierReview();
        if (response.success) {
          if (window.showToast) {
            window.showToast(
              `Đã áp dụng thăng/hạ hạng Loyalty thành công (Thăng hạng: ${response.upgrades}, Hạ hạng: ${response.downgrades})!`,
              "success",
            );
          }
          fetchLoyaltyData();
        } else {
          if (window.showToast)
            window.showToast("Lỗi khi chạy xếp hạng định kỳ!", "error");
        }
      } catch (err) {
        console.error(err);
        if (window.showToast)
          window.showToast("Lỗi kết nối khi chạy xếp hạng định kỳ!", "error");
      }
    };

    if (window.showConfirm) {
      window.showConfirm(
        "Chạy Xếp Hạng Định Kỳ",
        "Bạn có chắc chắn muốn áp dụng xếp hạng mới cho toàn bộ khách hàng ngay bây giờ?",
        run,
      );
    } else {
      if (window.confirm("Chạy xếp hạng?")) {
        run();
      }
    }
  };

  const handleUpdateTierConfig = (idx, field, val) => {
    const updatedTiers = [...loyaltyConfig.tiers];
    updatedTiers[idx] = { ...updatedTiers[idx], [field]: Number(val) };
    setLoyaltyConfig({ ...loyaltyConfig, tiers: updatedTiers });
  };

  const tierCardColors = {
    Standard: "linear-gradient(135deg, #64748b, #334155)",
    Silver: "linear-gradient(135deg, #94a3b8, #475569)",
    Gold: "linear-gradient(135deg, #fbbf24, #d97706)",
    Platinum: "linear-gradient(135deg, #475569, #0f172a)",
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
      {/* Header and navigation tabs */}
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 gap-3 border-bottom pb-3">
        <div>
          <h4
            className="fw-bold mb-1 text-dark"
            style={{ letterSpacing: "-0.5px" }}
          >
            QUẢN LÝ LOYALTY
          </h4>
          <p className="text-secondary small mb-0">
            Cấu hình quy chế đặc quyền, phân hạng thành viên và xếp hạng định kỳ
          </p>
        </div>
        <div className="dashboard-tabs d-flex bg-white shadow-sm p-1 rounded-3 gap-1 flex-wrap">
          <button
            className={`btn btn-sm px-3 border-0 dashboard-tab ${
              activeTab === "config" ? "active" : ""
            }`}
            onClick={() => setActiveTab("config")}
          >
            <i className="fas fa-cogs me-2"></i>Cấu hình Loyalty
          </button>
          <button
            className={`btn btn-sm px-3 border-0 dashboard-tab ${
              activeTab === "tiers" ? "active" : ""
            }`}
            onClick={() => setActiveTab("tiers")}
          >
            <i className="fas fa-layer-group me-2"></i>Quản lý phân hạng
          </button>
          <button
            className={`btn btn-sm px-3 border-0 dashboard-tab ${
              activeTab === "review" ? "active" : ""
            }`}
            onClick={() => setActiveTab("review")}
          >
            <i className="fas fa-users-cog me-2"></i>Xếp hạng tháng
          </button>
          <button
            className={`btn btn-sm px-3 border-0 dashboard-tab ${
              activeTab === "stats" ? "active" : ""
            }`}
            onClick={() => setActiveTab("stats")}
          >
            <i className="fas fa-chart-pie me-2"></i>Thống kê Loyalty
          </button>
        </div>
      </div>

      {/* ── Loyalty Configuration ─────────────────────────────── */}
      {activeTab === "config" && (
        <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
          <h5
            className="fw-bold mb-4 border-bottom pb-2.5"
            style={{ color: "var(--navy-dark)" }}
          >
            <i className="fas fa-cogs text-cyan me-2"></i>CẤU HÌNH QUY CHẾ ĐẶC
            QUYỀN AUTOWASH LOYALTY
          </h5>
          <form onSubmit={handleSaveLoyaltyConfig}>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted">
                  SỐ ĐIỂM TÍCH LŨY / 1.000đ CHI TIÊU
                </label>
                <input
                  type="number"
                  className="form-control bg-light border-0 py-2.5 rounded-3 text-dark fw-bold"
                  value={loyaltyConfig.pointsPerThousandVND}
                  onChange={(e) =>
                    setLoyaltyConfig({
                      ...loyaltyConfig,
                      pointsPerThousandVND: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted">
                  HẠN DÙNG ĐIỂM LOYALTY (THÁNG)
                </label>
                <input
                  type="number"
                  className="form-control bg-light border-0 py-2.5 rounded-3 text-dark fw-bold"
                  value={loyaltyConfig.pointExpiryMonths}
                  onChange={(e) =>
                    setLoyaltyConfig({
                      ...loyaltyConfig,
                      pointExpiryMonths: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted">
                  NGÀY XẾP HẠNG THÀNH VIÊN
                </label>
                <input
                  type="number"
                  className="form-control bg-light border-0 py-2.5 rounded-3 text-dark fw-bold"
                  value={loyaltyConfig.tierReviewDayOfMonth}
                  onChange={(e) =>
                    setLoyaltyConfig({
                      ...loyaltyConfig,
                      tierReviewDayOfMonth: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted">
                  VÒNG REVIEW (NĂM)
                </label>
                <input
                  type="number"
                  className="form-control bg-light border-0 py-2.5 rounded-3 text-dark fw-bold"
                  value={loyaltyConfig.rankingWindowYears}
                  onChange={(e) =>
                    setLoyaltyConfig({
                      ...loyaltyConfig,
                      rankingWindowYears: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              className="app-btn-primary py-2.5 px-5 mt-2 text-dark fw-bold border-0"
              style={{
                borderRadius: "12px",
                background: "var(--cyan-electric)",
              }}
            >
              LƯU CẤU HÌNH QUY CHẾ LOYALTY
            </button>
          </form>
        </div>
      )}

      {/* ── Tier Management ───────────────────────────────────── */}
      {activeTab === "tiers" && (
        <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
          <h5
            className="fw-bold mb-4 border-bottom pb-2.5"
            style={{ color: "var(--navy-dark)" }}
          >
            <i className="fas fa-layer-group text-cyan me-2"></i>QUẢN LÝ ĐẶC
            QUYỀN VIP CHO TỪNG PHÂN HẠNG LOYALTY
          </h5>
          <form onSubmit={handleSaveLoyaltyConfig}>
            {/* Visual Tier Cards instead of flat table */}
            <div className="row g-3">
              {loyaltyConfig.tiers.map((t, i) => (
                <div key={t.tierId} className="col-md-3">
                  <div
                    className="p-3 rounded-4 border text-white shadow-sm h-100 d-flex flex-column justify-content-between"
                    style={{ background: tierCardColors[t.tierName] || "#0f172a" }}
                  >
                    <div>
                      <div
                        className="fw-bold text-uppercase"
                        style={{ fontSize: "0.9rem", letterSpacing: "0.5px" }}
                      >
                        {t.tierName} Loyalty
                      </div>
                      <small className="opacity-75 d-block mt-1">
                        Ngưỡng điểm tối thiểu:{" "}
                        <strong>
                          {t.minRankingBalance.toLocaleString()} pts
                        </strong>
                      </small>
                    </div>

                    <div
                      className="mt-3 d-flex flex-column gap-2 bg-white bg-opacity-10 p-2.5 rounded-3 text-start"
                      style={{ fontSize: "0.72rem" }}
                    >
                      <div>
                        <label className="opacity-75 d-block">HỆ SỐ ĐIỂM</label>
                        <input
                          type="number"
                          step="0.1"
                          className="form-control form-control-sm bg-transparent border-0 text-white fw-bold p-0"
                          style={{ outline: "none" }}
                          value={t.pointMultiplier}
                          onChange={(e) =>
                            handleUpdateTierConfig(
                              i,
                              "pointMultiplier",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="opacity-75 d-block">
                          CHIẾT KHẤU (%)
                        </label>
                        <input
                          type="number"
                          className="form-control form-control-sm bg-transparent border-0 text-white fw-bold p-0"
                          value={t.discountPercent}
                          onChange={(e) =>
                            handleUpdateTierConfig(
                              i,
                              "discountPercent",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="opacity-75 d-block">
                          ĐẶT LỊCH TRƯỚC (NGÀY)
                        </label>
                        <input
                          type="number"
                          className="form-control form-control-sm bg-transparent border-0 text-white fw-bold p-0"
                          value={t.bookingWindowDays}
                          onChange={(e) =>
                            handleUpdateTierConfig(
                              i,
                              "bookingWindowDays",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="app-btn-primary py-2.5 px-5 mt-4 text-dark fw-bold border-0"
              style={{
                borderRadius: "12px",
                background: "var(--cyan-electric)",
              }}
            >
              LƯU CẤU HÌNH PHÂN HẠNG
            </button>
          </form>
        </div>
      )}

      {/* ── Tier Review ───────────────────────────────────────── */}
      {activeTab === "review" && (
        <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 border-bottom pb-2.5">
            <div>
              <h5
                className="fw-bold mb-1"
                style={{ color: "var(--navy-dark)" }}
              >
                <i className="fas fa-users-cog text-cyan me-2"></i>CHẠY XẾP HẠNG
                THÀNH VIÊN ĐỊNH KỲ
              </h5>
              <p className="text-secondary small mb-0">
                Hệ thống phân tích mức tích lũy trượt chi tiêu của khách hàng để
                tự động cập nhật VIP Tier
              </p>
            </div>
            <button
              className="app-btn-primary py-2 px-4 shadow-none border-0 text-dark fw-bold"
              style={{
                borderRadius: "10px",
                background: "var(--cyan-electric)",
              }}
              onClick={handleRunTierReview}
            >
              <i className="fas fa-play me-2"></i>ÁP DỤNG XẾP HẠNG NGAY
            </button>
          </div>

          <h6 className="fw-bold mb-3" style={{ color: "var(--navy-dark)" }}>
            BẢNG DỰ ĐOÁN THAY ĐỔI HẠNG KHÁCH HÀNG
          </h6>
          <div className="table-responsive">
            <table className="table align-middle tier-review-table">
              <thead>
                <tr className="bg-light">
                  <th>Tên khách hàng</th>
                  <th>Hạng hiện tại</th>
                  <th className="text-end">Tích lũy chi tiêu</th>
                  <th>Dự báo hạng mới</th>
                  <th>Trạng thái</th>
                  <th>Lý do điều chỉnh</th>
                </tr>
              </thead>
              <tbody>
                {reviewList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      Không có dữ liệu thay đổi hạng nào cần xem xét
                    </td>
                  </tr>
                ) : (
                  reviewList.map((item, idx) => {
                    const dirClass =
                      item.direction === "up"
                        ? "badge bg-success bg-opacity-10 text-success"
                        : item.direction === "down"
                          ? "badge bg-danger bg-opacity-10 text-danger"
                          : "badge bg-secondary bg-opacity-10 text-secondary";
                    const dirLabel =
                      item.direction === "up"
                        ? "NÂNG HẠNG"
                        : item.direction === "down"
                          ? "HẠ HẠNG"
                          : "GIỮ NGUYÊN";
                    return (
                      <tr
                        key={idx}
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                      >
                        <td className="fw-bold text-dark">{item.name}</td>
                        <td className="text-secondary">{item.currentTier}</td>
                        <td className="fw-bold text-cyan text-end">
                          {item.rankingBalance.toLocaleString()}
                        </td>
                        <td className="fw-bold text-warning">
                          {item.predictedTier}
                        </td>
                        <td>
                          <span
                            className={`${dirClass} px-3 py-1.5 rounded-pill fw-bold`}
                            style={{ fontSize: "0.62rem" }}
                          >
                            {dirLabel}
                          </span>
                        </td>
                        <td className="text-muted small">{item.reason}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Loyalty Statistics ────────────────────────────────── */}
      {activeTab === "stats" && (
        <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
          <h5
            className="fw-bold mb-4 border-bottom pb-2.5"
            style={{ color: "var(--navy-dark)" }}
          >
            <i className="fas fa-chart-pie text-cyan me-2"></i>PHÂN BỐ THÀNH VIÊN
            LOYALTY
          </h5>
          <div className="d-flex flex-column gap-3.5 mt-3">
            {Object.entries(tierDistribution).map(([tier, count]) => {
              const total =
                Object.values(tierDistribution).reduce((s, i) => s + i, 0) || 1;
              const pct = Math.round((count / total) * 100);

              const colors = {
                Platinum: "bg-primary",
                Gold: "bg-warning",
                Silver: "bg-secondary",
                Member: "bg-dark",
              };

              return (
                <div key={tier} className="text-start">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-bold small text-dark">
                      {tier} Loyalty
                    </span>
                    <span className="text-muted small fw-bold">
                      {count} thành viên ({pct}%)
                    </span>
                  </div>
                  <div
                    className="progress"
                    style={{ height: "6px", borderRadius: "10px" }}
                  >
                    <div
                      className={`progress-bar ${colors[tier] || "bg-cyan"}`}
                      style={{ width: `${pct}%`, borderRadius: "10px" }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoyalty;
