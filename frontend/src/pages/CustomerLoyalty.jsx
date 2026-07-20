import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/shared.css";
import "../styles/customer/loyalty.css";
import { customerService } from "../services/customerService";

const TIER_DATA = {
  "Standard Member": {
    color: "#64748b",
    cardClass: "tier-member",
    dbName: "Member",
    multiplier: "x1.0",
    benefits: [
      "Tích điểm cơ bản cho mỗi lần rửa xe.",
      "Phục vụ theo thứ tự thông thường."
    ],
    nextTier: "Silver",
    neededPts: 500,
  },
  "Silver Member": {
    color: "#94a3b8",
    cardClass: "tier-silver",
    dbName: "Silver",
    multiplier: "x1.2",
    benefits: [
      "Cộng thêm 20% điểm mỗi lần thanh toán.",
      "Được ưu tiên rửa xe trước khách thường.",
      "Voucher giảm 5% khi lên hạng Bạc."
    ],
    nextTier: "Gold",
    neededPts: 1000,
  },
  "Gold Member": {
    color: "#ffcf33",
    cardClass: "tier-gold",
    dbName: "Gold",
    multiplier: "x1.5",
    benefits: [
      "Cộng thêm 50% điểm mỗi lần thanh toán.",
      "Vào thẳng khu rửa ưu tiên, không xếp hàng.",
      "Voucher giảm 10% khi lên hạng Vàng."
    ],
    nextTier: "Platinum",
    neededPts: 2000,
  },
  "Platinum Member": {
    color: "#0ea5e9",
    cardClass: "tier-platinum",
    dbName: "Platinum",
    multiplier: "x2.0",
    benefits: [
      "Nhân đôi điểm cho mỗi lần rửa xe.",
      "Được phục vụ ngay, không phải chờ.",
      "Voucher giảm 50% khi lên hạng Bạch Kim."
    ],
    nextTier: "Diamond Ultimate",
    neededPts: null,
  },
};

export const CustomerLoyalty = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Primary Navigation State: 'loyalty' (Default) | 'rewards'
  const [mainTab, setMainTab] = useState("loyalty");

  // Secondary Sub-tab inside Voucher & Rewards: 'catalog' | 'my-rewards' | 'history'
  const [rewardsSubTab, setRewardsSubTab] = useState("catalog");

  // Simulated Tier state for tier preview buttons
  const [simulatedTier, setSimulatedTier] = useState(null);

  // Catalog Filters & State
  const [catalogCategory, setCatalogCategory] = useState("All");
  const [rewardsCatalog, setRewardsCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // My Rewards Filters & State
  const [myRewards, setMyRewards] = useState([]);
  const [myRewardsStatusFilter, setMyRewardsStatusFilter] = useState("Available"); // Available, Used, Expired, All
  const [myRewardsTypeFilter, setMyRewardsTypeFilter] = useState("All");
  const [loadingMyRewards, setLoadingMyRewards] = useState(true);

  // Reward History State & Pagination
  const [rewardHistory, setRewardHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PER_PAGE = 5;

  // Inline Copy Feedback State
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  // Redeem Confirmation Modal State
  const [pendingRedeem, setPendingRedeem] = useState(null);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  // Success Modal State (Post-Redemption Flow)
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Loyalty Tier Status from DB
  const [loyalty, setLoyalty] = useState(null);

  useEffect(() => {
    loadLoyaltyStatus();
    loadCatalog();
    loadMyRewards();
    loadRewardHistory();

    const query = new URLSearchParams(location.search);
    const tab = query.get("tab");
    if (tab === "vouchers" || tab === "my-rewards" || tab === "rewards") {
      setMainTab("rewards");
      if (tab === "vouchers" || tab === "my-rewards") {
        setRewardsSubTab("my-rewards");
      }
    }
  }, [location.search]);

  const loadLoyaltyStatus = async () => {
    try {
      const res = await customerService.getLoyaltyStatus();
      if (res && res.success && res.status) {
        setLoyalty(res.status);
      }
    } catch (e) {
      console.error("Lỗi tải thông tin loyalty:", e);
    }
  };

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const res = await customerService.getRewardsCatalog(catalogCategory);
      if (res && res.success) {
        setRewardsCatalog(res.rewards || []);
      }
    } catch (e) {
      console.error("Lỗi tải catalog phần thưởng:", e);
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [catalogCategory]);

  const loadMyRewards = async () => {
    setLoadingMyRewards(true);
    try {
      const res = await customerService.getMyRewards(myRewardsStatusFilter, myRewardsTypeFilter);
      if (res && res.success) {
        setMyRewards(res.rewards || []);
      }
    } catch (e) {
      console.error("Lỗi tải quà của tôi:", e);
    } finally {
      setLoadingMyRewards(false);
    }
  };

  useEffect(() => {
    loadMyRewards();
  }, [myRewardsStatusFilter, myRewardsTypeFilter]);

  const loadRewardHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await customerService.getRewardHistory();
      if (res && res.success) {
        setRewardHistory(res.history || []);
      }
    } catch (e) {
      console.error("Lỗi tải lịch sử đổi thưởng:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSimulateTier = (tierName) => {
    setSimulatedTier(tierName);
    if (updateUser) {
      updateUser({ tier: tierName });
    }
  };

  const handleOpenRedeemModal = (reward) => {
    setPendingRedeem(reward);
    setRedeemModalOpen(true);
  };

  const handleConfirmRedeem = async () => {
    if (!pendingRedeem) return;
    setRedeeming(true);
    try {
      const res = await customerService.redeemReward(pendingRedeem.rewardId);
      if (res && res.success) {
        const code = res.voucherCode || res.code || `AW-RED-${res.redemptionId || 'NEW'}`;
        const isGift = pendingRedeem.rewardType === "PhysicalGift";

        setSuccessData({
          rewardName: pendingRedeem.rewardName,
          rewardType: pendingRedeem.rewardType,
          code: code,
          isGift: isGift,
          pointCost: pendingRedeem.pointCost,
          claimInstruction: isGift
            ? "Vui lòng xuất trình mã này tại trung tâm AutoWash Pro hoặc liên hệ Hotline: 1900-AUTOWASH để nhận quà."
            : "Mã giảm giá đã được lưu vào ví. Bạn có thể chọn áp dụng mã khi đặt lịch rửa xe trực tuyến."
        });

        setRedeemModalOpen(false);
        setSuccessModalOpen(true);

        if (user && updateUser) {
          updateUser({ points: Math.max(0, (user.points || 0) - pendingRedeem.pointCost) });
        }
        loadLoyaltyStatus();
        loadCatalog();
        loadMyRewards();
        loadRewardHistory();
      } else {
        if (window.showToast) {
          window.showToast(res.message || "Đổi phần thưởng thất bại!", "error");
        }
      }
    } catch (e) {
      console.error("Failed to redeem reward", e);
      const errMsg = e.response?.data?.message || "Lỗi kết nối máy chủ";
      if (window.showToast) window.showToast(errMsg, "error");
    } finally {
      setRedeeming(false);
    }
  };

  const handleCopyCode = (code, redemptionId) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    if (redemptionId != null) {
      setCopiedCodeId(redemptionId);
      setTimeout(() => {
        setCopiedCodeId(null);
      }, 2000);
    }
    if (window.showToast) {
      window.showToast(`Đã sao chép mã '${code}' vào bộ nhớ tạm!`, "success");
    }
  };

  const defaultLadder = [
    { name: "Member", minRankingBalance: 0 },
    { name: "Silver", minRankingBalance: 500000 },
    { name: "Gold", minRankingBalance: 1000000 },
    { name: "Platinum", minRankingBalance: 2000000 }
  ];
  const tierLadder = (loyalty?.tiers && loyalty.tiers.length > 0) ? loyalty.tiers : defaultLadder;

  const rawUserTier = simulatedTier || user?.tier || "Standard Member";
  let currentTier = "Standard Member";
  if (rawUserTier.includes("Silver")) currentTier = "Silver Member";
  else if (rawUserTier.includes("Gold")) currentTier = "Gold Member";
  else if (rawUserTier.includes("Platinum")) currentTier = "Platinum Member";

  const pts = loyalty?.points ?? user?.points ?? 0;
  const nextTierDetails = TIER_DATA[currentTier] || TIER_DATA["Standard Member"];

  const windowMonths = loyalty?.windowMonths ?? 6;
  const windowedSpend = loyalty?.periodSpend ?? 0;

  const realTierName = loyalty?.tierName || user?.tier || "Member";
  let realDbName = "Member";
  if (realTierName.includes("Silver")) realDbName = "Silver";
  else if (realTierName.includes("Gold")) realDbName = "Gold";
  else if (realTierName.includes("Platinum")) realDbName = "Platinum";

  const realLadderIdx = Math.max(0, tierLadder.findIndex((t) => t.name === realDbName));
  const currentLadderIdx = Math.max(0, tierLadder.findIndex((t) => t.name === nextTierDetails.dbName));

  const currentMin = tierLadder[currentLadderIdx]?.minRankingBalance ?? 0;
  const nextTierObj = currentLadderIdx + 1 < tierLadder.length ? tierLadder[currentLadderIdx + 1] : null;
  const nextMin = nextTierObj ? nextTierObj.minRankingBalance : null;

  const spendGap = nextMin != null ? Math.max(0, nextMin - currentMin) : 0;
  const spendEarnedInTier = Math.max(0, windowedSpend - currentMin);
  const spendProgressPct = nextMin != null && spendGap > 0 ? Math.min(100, Math.round((spendEarnedInTier / spendGap) * 100)) : 100;

  const previewLadderIdx = currentLadderIdx;
  const isLockedPreview = previewLadderIdx > realLadderIdx;
  const isPreviousPreview = previewLadderIdx < realLadderIdx;
  const previewTierLabel = currentTier.replace(" Member", "");
  const previewTierMin = tierLadder[previewLadderIdx]?.minRankingBalance ?? 0;
  const spendToUnlock = Math.max(0, previewTierMin - windowedSpend);
  const unlockProgressPct = previewTierMin > 0 ? Math.min(100, Math.round((windowedSpend / previewTierMin) * 100)) : 100;
  const barProgressPct = isLockedPreview ? unlockProgressPct : isPreviousPreview ? 100 : spendProgressPct;

  const isStandardTier = currentTier === "Standard Member";
  const isCurrentAchievedView = !isLockedPreview && !isPreviousPreview;
  const useHighlightBar = isStandardTier && isCurrentAchievedView;

  const getRewardTypeBadge = (type) => {
    switch (type) {
      case "DiscountPercent":
        return <span className="badge bg-info-subtle text-info fw-bold px-2.5 py-1 rounded-pill"><i className="fas fa-percent me-1"></i> Voucher %</span>;
      case "DiscountFixed":
        return <span className="badge bg-primary-subtle text-primary fw-bold px-2.5 py-1 rounded-pill"><i className="fas fa-tag me-1"></i> Voucher tiền</span>;
      case "FreeService":
      case "Free_Wash":
        return <span className="badge bg-cyan-subtle text-cyan fw-bold px-2.5 py-1 rounded-pill" style={{ color: "#0891b2" }}><i className="fas fa-soap me-1"></i> Dịch vụ miễn phí</span>;
      case "PhysicalGift":
        return <span className="badge bg-warning-subtle text-warning-emphasis fw-bold px-2.5 py-1 rounded-pill"><i className="fas fa-gift me-1"></i> Quà tặng</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary px-2.5 py-1 rounded-pill">{type}</span>;
    }
  };

  const getMyRewardStatusBadge = (status, type) => {
    const isGift = type === "PhysicalGift";
    if (status === "Active") {
      return isGift
        ? <span className="badge bg-warning-subtle text-warning-emphasis fw-bold px-2.5 py-1 rounded-pill"><i className="fas fa-store me-1"></i> Chờ nhận tại quầy</span>
        : <span className="badge bg-success-subtle text-success fw-bold px-2.5 py-1 rounded-pill"><i className="fas fa-check-circle me-1"></i> Còn dùng được</span>;
    } else if (status === "Claimed" || status === "Used") {
      return isGift
        ? <span className="badge bg-info-subtle text-info fw-bold px-2.5 py-1 rounded-pill"><i className="fas fa-gift me-1"></i> Đã nhận</span>
        : <span className="badge bg-secondary-subtle text-secondary fw-bold px-2.5 py-1 rounded-pill"><i className="fas fa-receipt me-1"></i> Đã dùng</span>;
    } else if (status === "Expired") {
      return <span className="badge bg-danger-subtle text-danger fw-bold px-2.5 py-1 rounded-pill"><i className="fas fa-times-circle me-1"></i> Hết hạn</span>;
    }
    return <span className="badge bg-light text-dark px-2.5 py-1 rounded-pill">{status}</span>;
  };

  // History Pagination
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PER_PAGE;
    return rewardHistory.slice(start, start + HISTORY_PER_PAGE);
  }, [rewardHistory, historyPage]);

  const totalHistoryPages = Math.ceil(rewardHistory.length / HISTORY_PER_PAGE) || 1;

  return (
    <div className="container-fluid py-4 text-start">
      {/* Page Header & Primary Navigation (Segmented Controls) */}
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 pb-3 border-bottom gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1" style={{ letterSpacing: "-0.5px" }}>
            {mainTab === "loyalty" ? "Điểm thưởng & hạng thành viên" : "Voucher & quà của bạn"}
          </h3>
          <p className="text-muted small mb-0">
            {mainTab === "loyalty"
              ? "Xem hạng thành viên, cách tích điểm và các đặc quyền bạn đang có."
              : "Dùng điểm để đổi voucher, quà tặng và xem lại những phần quà đã đổi."}
          </p>
        </div>

        {/* Primary Segmented Navigation Pills */}
        <div className="bg-light p-1.5 rounded-4 d-inline-flex border shadow-sm">
          <button
            className={`btn btn-sm fw-bold border-0 rounded-3 px-4 py-2 transition-all ${
              mainTab === "loyalty" ? "btn-cyan text-white shadow" : "text-dark bg-transparent"
            }`}
            onClick={() => setMainTab("loyalty")}
          >
            <i className="fas fa-trophy me-2 text-warning"></i> Hạng thành viên
          </button>
          <button
            className={`btn btn-sm fw-bold border-0 rounded-3 px-4 py-2 transition-all ${
              mainTab === "rewards" ? "btn-cyan text-white shadow" : "text-dark bg-transparent"
            }`}
            onClick={() => setMainTab("rewards")}
          >
            <i className="fas fa-gift me-2 text-warning"></i> Voucher & quà ({myRewards.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRIMARY TAB 1: LOYALTY PROGRAM (FULL-WIDTH PAGE)                          */}
      {/* ========================================================================= */}
      {mainTab === "loyalty" && (
        <div>
          {/* Top Row: Hero Section - Current Tier Member Card & Progress */}
          <div className="row g-4 mb-4">
            {/* Column 1: Redesigned Loyalty Membership Card Banner with 3 Visual States */}
            <div className="col-12 col-lg-5">
              {(() => {
                const getTierCardStyle = (tier) => {
                  switch (tier) {
                    case "Standard Member":
                      return {
                        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)",
                        textColor: "#0f172a",
                        subTextColor: "#475569",
                        badgeBg: "#cbd5e1",
                        badgeText: "#1e293b",
                        multBg: "#0ea5e9",
                        multText: "#ffffff",
                        icon: "fa-id-card",
                        watermark: "fa-circle",
                        border: "1px solid #cbd5e1",
                        statBg: "#f8fafc",
                        statBorder: "1px solid #cbd5e1",
                        currentNote: "Đây là hạng mặc định của bạn, tích điểm cơ bản khi rửa xe."
                      };
                    case "Silver Member":
                      return {
                        background: "linear-gradient(135deg, #94a3b8 0%, #64748b 50%, #334155 100%)",
                        textColor: "#ffffff",
                        subTextColor: "#f1f5f9",
                        badgeBg: "rgba(255, 255, 255, 0.2)",
                        badgeText: "#ffffff",
                        multBg: "#ffffff",
                        multText: "#1e293b",
                        icon: "fa-shield-alt",
                        watermark: "fa-shield-alt",
                        border: "1px solid #94a3b8",
                        statBg: "rgba(255, 255, 255, 0.15)",
                        statBorder: "1px solid rgba(255, 255, 255, 0.25)",
                        currentNote: "Bạn đang ở hạng Bạc, được cộng thêm 20% điểm mỗi lần rửa xe."
                      };
                    case "Gold Member":
                      return {
                        background: "linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #92400e 100%)",
                        textColor: "#ffffff",
                        subTextColor: "#fef3c7",
                        badgeBg: "rgba(255, 255, 255, 0.25)",
                        badgeText: "#ffffff",
                        multBg: "#451a03",
                        multText: "#fbbf24",
                        icon: "fa-crown",
                        watermark: "fa-crown",
                        border: "1px solid #f59e0b",
                        statBg: "rgba(0, 0, 0, 0.18)",
                        statBorder: "1px solid rgba(255, 255, 255, 0.25)",
                        currentNote: "Bạn đang ở hạng Vàng, được cộng thêm 50% điểm và vào khu rửa ưu tiên."
                      };
                    case "Platinum Member":
                    default:
                      return {
                        background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0f172a 100%)",
                        textColor: "#ffffff",
                        subTextColor: "#e0f2fe",
                        badgeBg: "rgba(255, 255, 255, 0.25)",
                        badgeText: "#ffffff",
                        multBg: "#38bdf8",
                        multText: "#0f172a",
                        icon: "fa-gem",
                        watermark: "fa-gem",
                        border: "1px solid #38bdf8",
                        statBg: "rgba(255, 255, 255, 0.12)",
                        statBorder: "1px solid rgba(255, 255, 255, 0.2)",
                        currentNote: "Bạn đang ở hạng cao nhất, được nhân đôi điểm cho mỗi lần rửa xe."
                      };
                  }
                };

                const cardStyle = getTierCardStyle(currentTier);

                // Determine Card Visual State
                const isCurrentTierState = isCurrentAchievedView && !isLockedPreview && !isPreviousPreview;
                const isCompletedTierState = isPreviousPreview;
                const isLockedTierState = isLockedPreview;

                // Select Watermark & Opacity (Lock Icon 7% for Locked, Tier Icon 5% for Current/Completed)
                const watermarkIcon = isLockedTierState ? "fa-lock" : cardStyle.watermark;
                const watermarkOpacity = isLockedTierState ? 0.07 : 0.05;

                return (
                  <div
                    className="shadow-lg rounded-4 p-4 h-100 d-flex flex-column justify-content-between position-relative overflow-hidden transition-all"
                    style={{
                      background: cardStyle.background,
                      color: cardStyle.textColor,
                      border: isCurrentTierState ? "2px solid #0ea5e9" : cardStyle.border,
                      boxShadow: isCurrentTierState ? "0 0 25px rgba(14, 165, 233, 0.35)" : "0 10px 30px rgba(0, 0, 0, 0.12)",
                      filter: isCompletedTierState ? "saturate(0.85)" : isLockedTierState ? "contrast(0.95)" : "none"
                    }}
                  >
                    {/* Background Watermark */}
                    <div
                      className="position-absolute top-50 end-0 translate-middle-y me-n3 pointer-events-none select-none"
                      style={{
                        opacity: watermarkOpacity,
                        fontSize: "13rem",
                        color: cardStyle.textColor,
                        lineHeight: 1
                      }}
                    >
                      <i className={`fas ${watermarkIcon}`}></i>
                    </div>

                    {/* Card Header: State Badge & Multiplier */}
                    <div className="position-relative z-1">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        {isCurrentTierState ? (
                          <span className="badge bg-warning text-dark fw-bold px-3 py-1.5 rounded-pill shadow-sm" style={{ fontSize: "0.78rem" }}>
                            <i className="fas fa-crown me-1.5"></i> Hạng hiện tại
                          </span>
                        ) : isCompletedTierState ? (
                          <span className="badge bg-success text-white fw-bold px-3 py-1.5 rounded-pill shadow-sm" style={{ fontSize: "0.78rem" }}>
                            <i className="fas fa-check-circle me-1.5"></i> Đã đạt
                          </span>
                        ) : (
                          <span className="badge bg-dark text-white fw-bold px-3 py-1.5 rounded-pill shadow-sm border border-white-20" style={{ fontSize: "0.78rem" }}>
                            <i className="fas fa-lock me-1.5 text-warning"></i> Chưa mở khóa
                          </span>
                        )}

                        <span
                          className="badge px-3 py-1.5 rounded-pill fw-bold shadow-sm"
                          style={{
                            background: cardStyle.multBg,
                            color: cardStyle.multText,
                            fontSize: "0.82rem"
                          }}
                        >
                          <i className="fas fa-bolt me-1"></i> {nextTierDetails.multiplier} điểm
                        </span>
                      </div>

                      {/* Tier Name Title */}
                      <h2 className="fw-bold mb-1" style={{ fontSize: "2.1rem", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                        {currentTier}
                      </h2>

                      {/* State Note Message */}
                      <p className="small mb-3 font-semibold" style={{ color: cardStyle.subTextColor, fontSize: "0.85rem", maxWidth: 380 }}>
                        {isCurrentTierState
                          ? cardStyle.currentNote
                          : isCompletedTierState
                          ? "Bạn đã đạt mốc chi tiêu của hạng này."
                          : `Cần chi tiêu ${previewTierMin.toLocaleString("vi-VN")}đ để lên hạng này.`}
                      </p>
                    </div>

                    {/* Card Footer: Highlighted Statistics with Icons */}
                    <div className="pt-3 position-relative z-1 border-top" style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}>
                      <div className="row g-2">
                        <div className="col-6">
                          <div
                            className="p-2.5 rounded-3 text-center"
                            style={{
                              background: cardStyle.statBg,
                              border: cardStyle.statBorder,
                              backdropFilter: "blur(4px)"
                            }}
                          >
                            <small className="d-block text-uppercase fw-bold opacity-80" style={{ fontSize: "0.68rem", letterSpacing: "0.5px" }}>
                              <i className="fas fa-coins text-warning me-1"></i> ĐIỂM KHẢ DỤNG
                            </small>
                            <span className="fw-bold d-block mt-0.5" style={{ fontSize: "1.3rem" }}>
                              {pts.toLocaleString("vi-VN")} <small style={{ fontSize: "0.75rem" }}>pts</small>
                            </span>
                          </div>
                        </div>

                        <div className="col-6">
                          <div
                            className="p-2.5 rounded-3 text-center"
                            style={{
                              background: cardStyle.statBg,
                              border: cardStyle.statBorder,
                              backdropFilter: "blur(4px)"
                            }}
                          >
                            <small className="d-block text-uppercase fw-bold opacity-80" style={{ fontSize: "0.68rem", letterSpacing: "0.5px" }}>
                              <i className="fas fa-credit-card me-1"></i> TỔNG CHI TIÊU
                            </small>
                            <span className="fw-bold d-block mt-0.5" style={{ fontSize: "1.3rem" }}>
                              {windowedSpend.toLocaleString("vi-VN")} <small style={{ fontSize: "0.75rem" }}>đ</small>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Column 2: Spend Progress & Rank-up Status Card */}
            <div className="col-12 col-lg-7">
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold text-dark mb-0">
                      Tiến trình lên hạng tiếp theo
                    </h5>
                    <small className="text-muted fw-semibold">
                      Tính theo chi tiêu {windowMonths} tháng gần nhất
                    </small>
                  </div>

                  {/* Simulator Buttons */}
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1.5 fw-semibold" style={{ fontSize: "0.75rem" }}>
                      Xem thử các hạng:
                    </small>
                    <div className="d-flex flex-wrap gap-2">
                      {["Standard Member", "Silver Member", "Gold Member", "Platinum Member"].map((tName) => {
                        const tIdx = tierLadder.findIndex((t) => t.name === (TIER_DATA[tName]?.dbName || "Member"));
                        const isRealCurrent = tIdx === realLadderIdx;
                        const isDone = tIdx >= 0 && realLadderIdx >= 0 && tIdx < realLadderIdx;

                        return (
                          <button
                            key={tName}
                            className={`btn btn-sm fw-bold rounded-pill px-3 py-1 transition-all ${
                              currentTier === tName
                                ? "btn-cyan text-white shadow-sm"
                                : isRealCurrent
                                ? "btn-warning text-dark border"
                                : isDone
                                ? "btn-success-subtle text-success border"
                                : "btn-light text-muted border"
                            }`}
                            onClick={() => handleSimulateTier(tName)}
                          >
                            {isRealCurrent && <i className="fas fa-crown me-1 text-dark"></i>}
                            {isDone && !isRealCurrent && <i className="fas fa-check me-1"></i>}
                            {tName.replace(" Member", "")}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Progress Bar Container */}
                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2 small">
                      <span className="fw-bold text-dark">
                        Chi tiêu: <span className="text-cyan">{windowedSpend.toLocaleString("vi-VN")}đ</span>
                      </span>
                      <span className="fw-bold text-dark">
                        Mốc {previewTierLabel}: <span className="text-primary">{previewTierMin.toLocaleString("vi-VN")}đ</span>
                      </span>
                    </div>

                    <div style={{ height: 10, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${barProgressPct}%`,
                          height: "100%",
                          borderRadius: 999,
                          background: useHighlightBar
                            ? "linear-gradient(90deg, #22d3ee 0%, #38bdf8 55%, #0ea5e9 100%)"
                            : "var(--cyan-electric, #0ea5e9)",
                          boxShadow: "0 0 10px rgba(14,165,233,0.5)",
                          transition: "width .4s ease",
                        }}
                      />
                    </div>

                    <div className="mt-2.5 small text-muted">
                      {isLockedPreview ? (
                        <span>
                          <i className="fas fa-lock text-warning me-1"></i> Cần chi tiêu thêm <strong>{spendToUnlock.toLocaleString("vi-VN")}đ</strong> để đạt hạng <strong>{previewTierLabel}</strong>.
                        </span>
                      ) : isPreviousPreview ? (
                        <span className="text-success fw-bold">
                          <i className="fas fa-check-circle me-1"></i> Bạn đã vượt qua mốc chi tiêu của hạng {previewTierLabel}.
                        </span>
                      ) : nextTierObj ? (
                        <span>
                          <i className="fas fa-arrow-up text-cyan me-1"></i> Còn thiếu <strong>{spendGap - spendEarnedInTier > 0 ? (spendGap - spendEarnedInTier).toLocaleString("vi-VN") : 0}đ</strong> để thăng hạng <strong>{nextTierObj.name}</strong>.
                        </span>
                      ) : (
                        <span className="text-cyan fw-bold">
                          <i className="fas fa-crown text-warning me-1"></i> Bạn đang ở hạng cao nhất – Bạch Kim.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Benefit summary */}
                <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                  <div className="small text-muted">
                    <i className="fas fa-award text-warning me-1.5"></i>
                    Đặc quyền hiện tại: <strong>cộng điểm theo hệ số {nextTierDetails.multiplier} mỗi lần thanh toán</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Tier Benefits Ladder (4 Columns Grid with 3 States) */}
          <div className="mb-4">
            <h5 className="fw-bold text-dark mb-3">
              <i className="fas fa-star text-warning me-2"></i> Đặc quyền theo từng hạng
            </h5>

            <div className="row g-3">
              {Object.entries(TIER_DATA).map(([tKey, tData]) => {
                const tIndex = tierLadder.findIndex((t) => t.name === tData.dbName);
                const isRealCurrent = tIndex >= 0 && realLadderIdx >= 0 && tIndex === realLadderIdx;
                const isCompleted = tIndex >= 0 && realLadderIdx >= 0 && tIndex < realLadderIdx;
                const isLocked = tIndex >= 0 && realLadderIdx >= 0 && tIndex > realLadderIdx;
                const isSelected = currentTier === tKey;

                return (
                  <div key={tKey} className="col-12 col-md-6 col-lg-3">
                    <div
                      className={`card border-0 shadow-sm rounded-4 p-3.5 h-100 transition-all ${
                        isRealCurrent ? "border-2 border-cyan shadow-md bg-cyan-subtle-light" : isLocked ? "bg-light opacity-90" : "bg-white"
                      }`}
                      style={{
                        borderTop: `4px solid ${tData.color}`,
                        boxShadow: isSelected ? "0 8px 25px rgba(14,165,233,0.15)" : "none"
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "1.1rem" }}>
                          {tKey.replace(" Member", "")}
                        </h6>
                        <span className="badge bg-light text-dark border fw-bold">
                          {tData.multiplier} pts
                        </span>
                      </div>

                      <div className="d-flex flex-column gap-2 mb-3 flex-grow-1">
                        {tData.benefits.map((b, bIdx) => (
                          <div key={bIdx} className="d-flex align-items-start gap-2 small">
                            <i className={`fas ${isLocked ? 'fa-lock text-muted' : 'fa-check-circle text-cyan'} mt-1`}></i>
                            <span className={isLocked ? "text-muted" : "text-dark"}>{b}</span>
                          </div>
                        ))}
                      </div>

                      {/* State Footer Badge */}
                      {isRealCurrent ? (
                        <div className="badge bg-warning text-dark fw-bold w-100 py-2 rounded-3 text-center shadow-sm">
                          <i className="fas fa-crown me-1"></i> Hạng hiện tại
                        </div>
                      ) : isCompleted ? (
                        <div className="badge bg-success text-white fw-bold w-100 py-2 rounded-3 text-center">
                          <i className="fas fa-check-circle me-1"></i> Đã đạt
                        </div>
                      ) : (
                        <div className="badge bg-secondary-subtle text-muted border fw-bold w-100 py-2 rounded-3 text-center">
                          <i className="fas fa-lock me-1"></i> Chưa mở khóa
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 3: Point Rules & Upgrade Ladder (2 Columns Grid) */}
          <div className="row g-4 mb-4">
            {/* Left Column: Point Earning Rules */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                <h5 className="fw-bold text-dark mb-3">
                  <i className="fas fa-coins text-warning me-2"></i> Cách tích và dùng điểm
                </h5>

                <div className="d-flex flex-column gap-3 small text-muted">
                  <div className="d-flex align-items-start gap-3 p-3 bg-light rounded-3 border">
                    <div className="rounded-circle bg-cyan text-white p-2.5 d-flex align-items-center justify-content-center" style={{ width: 38, height: 38 }}>
                      <i className="fas fa-car fa-lg"></i>
                    </div>
                    <div>
                      <strong className="text-dark d-block mb-1">Tích điểm khi rửa xe</strong>
                      Mỗi <strong>1.000 VNĐ</strong> chi tiêu thực tế được tính làm 1 điểm cơ bản. Hệ số hạng thành viên sẽ nhân thêm điểm thưởng (Bạc x1.2, Vàng x1.5, Bạch Kim x2.0).
                    </div>
                  </div>

                  <div className="d-flex align-items-start gap-3 p-3 bg-light rounded-3 border">
                    <div className="rounded-circle bg-warning text-dark p-2.5 d-flex align-items-center justify-content-center" style={{ width: 38, height: 38 }}>
                      <i className="fas fa-exchange-alt fa-lg"></i>
                    </div>
                    <div>
                      <strong className="text-dark d-block mb-1">Đổi điểm lấy quà và voucher</strong>
                      Điểm tích lũy dùng để đổi voucher giảm giá rửa xe hoặc quà tặng (áo mưa, nước hoa, nón bảo hiểm...) trong mục Voucher & quà.
                    </div>
                  </div>

                  <div className="d-flex align-items-start gap-3 p-3 bg-light rounded-3 border">
                    <div className="rounded-circle bg-info text-white p-2.5 d-flex align-items-center justify-content-center" style={{ width: 38, height: 38 }}>
                      <i className="fas fa-hourglass-half fa-lg"></i>
                    </div>
                    <div>
                      <strong className="text-dark d-block mb-1">Thời hạn điểm thưởng</strong>
                      Điểm tích lũy có thời hạn sử dụng trong vòng 12 tháng kể từ ngày giao dịch phát sinh. Hệ thống sẽ tự động gửi thông báo khi điểm sắp hết hạn.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Tier Upgrade Ladder */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                <h5 className="fw-bold text-dark mb-3">
                  <i className="fas fa-layer-group text-cyan me-2"></i> Lộ trình thăng hạng
                </h5>

                <div className="d-flex flex-column gap-3">
                  {[
                    { name: "Standard Member", minSpend: "0đ", desc: "Mặc định cho mọi khách hàng mới đăng ký." },
                    { name: "Silver Member", minSpend: "500.000đ", desc: "Ưu tiên rửa xe và cộng thêm 20% điểm mỗi hóa đơn." },
                    { name: "Gold Member", minSpend: "1.000.000đ", desc: "Vào thẳng khu rửa ưu tiên và cộng thêm 50% điểm." },
                    { name: "Platinum Member", minSpend: "2.000.000đ", desc: "Được phục vụ ngay và nhân đôi điểm thưởng." }
                  ].map((tierItem, idx) => {
                    const isReached = currentTier === tierItem.name;
                    return (
                      <div key={idx} className={`p-3 rounded-3 border d-flex align-items-center justify-content-between ${isReached ? 'bg-cyan-subtle border-cyan' : 'bg-light'}`}>
                        <div className="d-flex align-items-center gap-3">
                          <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${isReached ? 'bg-cyan text-white' : 'bg-secondary-subtle text-secondary'}`} style={{ width: 34, height: 34 }}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{tierItem.name.replace(" Member", "")}</div>
                            <small className="text-muted d-block">{tierItem.desc}</small>
                          </div>
                        </div>
                        <div className="text-end">
                          <span className="badge bg-white text-dark border fw-bold">{tierItem.minSpend}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Frequently Asked Questions (FAQ) Section */}
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
            <h5 className="fw-bold text-dark mb-3">
              <i className="far fa-question-circle text-cyan me-2"></i> Câu hỏi thường gặp
            </h5>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <h6 className="fw-bold text-dark mb-1">1. Khi nào điểm thưởng được cộng vào tài khoản?</h6>
                  <p className="small text-muted mb-0">Điểm thưởng được hệ thống tự động cộng ngay sau khi đơn đặt lịch rửa xe hoàn tất thanh toán thành công tại trung tâm.</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <h6 className="fw-bold text-dark mb-1">2. Làm thế nào để áp dụng Voucher khi đặt lịch?</h6>
                  <p className="small text-muted mb-0">Trong màn hình Đặt Lịch Rửa Xe, bạn nhấn nút "Chọn Voucher", hệ thống sẽ hiển thị các voucher khả dụng trong ví của bạn để chọn áp dụng.</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <h6 className="fw-bold text-dark mb-1">3. Quà tặng vật lý nhận như thế nào?</h6>
                  <p className="small text-muted mb-0">Sau khi bấm đổi quà vật lý, bạn mang Mã Nhận Quà trong Ví tới bất kỳ chi nhánh AutoWash Pro nào để nhân viên xác nhận và trao quà trực tiếp.</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <h6 className="fw-bold text-dark mb-1">4. Hạn xét duyệt thăng hạng được tính như thế nào?</h6>
                  <p className="small text-muted mb-0">Hệ thống xét duyệt tổng chi tiêu trong 6 tháng gần nhất để xác định hạng thành viên của bạn một cách công bằng và liên tục.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRIMARY TAB 2: VOUCHER & REWARDS MANAGEMENT (FULL-WIDTH PAGE)             */}
      {/* ========================================================================= */}
      {mainTab === "rewards" && (
        <div>
          {/* Sub-tab Navigation Header Bar */}
          <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 pb-2 border-bottom gap-2">
            <div className="d-flex gap-2">
              <button
                className={`ui-tab-button ${rewardsSubTab === 'catalog' ? 'active' : ''}`}
                onClick={() => setRewardsSubTab('catalog')}
              >
                <i className="fas fa-store"></i> Đổi thưởng
              </button>
              <button
                className={`ui-tab-button ${rewardsSubTab === 'my-rewards' ? 'active' : ''}`}
                onClick={() => setRewardsSubTab('my-rewards')}
              >
                <i className="fas fa-wallet"></i> Quà của tôi ({myRewards.length})
              </button>
              <button
                className={`ui-tab-button ${rewardsSubTab === 'history' ? 'active' : ''}`}
                onClick={() => setRewardsSubTab('history')}
              >
                <i className="fas fa-history"></i> Lịch sử đổi điểm
              </button>
            </div>

            {/* Quick Points Info Badge */}
            <div className="badge bg-light text-dark border px-3.5 py-2.5 rounded-pill fw-bold" style={{ fontSize: "0.9rem" }}>
              Điểm khả dụng: <span className="text-cyan fw-bold ms-1"><i className="fas fa-coins me-1 text-warning"></i>{pts.toLocaleString("vi-VN")} pts</span>
            </div>
          </div>

          {/* SUBTAB 1: REDEEM REWARDS (CATALOG) */}
          {rewardsSubTab === "catalog" && (
            <div>
              {/* Category Filter Pills */}
              <div className="d-flex flex-wrap gap-2 mb-4">
                {[
                  { label: "Tất cả", val: "All" },
                  { label: "Voucher", val: "Voucher" },
                  { label: "Dịch vụ miễn phí", val: "FreeService" },
                  { label: "Quà tặng", val: "PhysicalGift" }
                ].map((c) => (
                  <button
                    key={c.val}
                    className={`ui-filter-pill ${catalogCategory === c.val ? "active" : ""}`}
                    onClick={() => setCatalogCategory(c.val)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {loadingCatalog ? (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border text-cyan me-2"></div>
                  Đang tải kho phần thưởng...
                </div>
              ) : rewardsCatalog.length === 0 ? (
                <div className="empty-state-card">
                  <i className="fas fa-box-open fa-3x text-muted mb-3 opacity-50"></i>
                  <h6 className="fw-bold text-dark mb-1">Chưa có phần thưởng nào</h6>
                  <p className="text-muted small mb-3">Chưa có phần thưởng thuộc loại này. Bạn thử chọn loại khác xem sao.</p>
                  <button className="btn btn-outline-cyan btn-sm fw-bold px-3 rounded-pill" onClick={() => setCatalogCategory("All")}>
                    <i className="fas fa-undo me-1.5"></i> Xem tất cả
                  </button>
                </div>
              ) : (
                /* Full-width 3-Column Responsive Grid */
                <div className="row g-4">
                  {rewardsCatalog.map((r) => {
                    const canAfford = pts >= r.pointCost;
                    const isAlreadyRedeemed = r.hasAlreadyRedeemed || r.statusReason === "AlreadyRedeemed";
                    const isAvailable = r.isAvailable && !isAlreadyRedeemed;
                    let reasonText = "";
                    if (isAlreadyRedeemed) reasonText = "Đã đổi";
                    else if (r.statusReason === "OutOfStock") reasonText = "Hết hàng";
                    else if (r.statusReason === "Expired") reasonText = "Hết hạn";
                    else if (r.statusReason === "Upcoming") reasonText = "Sắp ra mắt";
                    else if (r.statusReason === "Disabled") reasonText = "Tạm ngưng";
                    else if (!canAfford) reasonText = `Thiếu ${(r.pointCost - pts).toLocaleString("vi-VN")} pts`;

                    return (
                      <div key={r.rewardId} className="col-12 col-md-6 col-lg-4">
                        <div className={`reward-card-pro ${!isAvailable ? 'opacity-75' : ''}`}>
                          {/* Card Media Header */}
                          <div className="position-relative bg-light d-flex align-items-center justify-content-center overflow-hidden" style={{ height: 160 }}>
                            {r.imageUrl ? (
                              <img
                                src={r.imageUrl}
                                alt={r.rewardName}
                                className="w-100 h-100 object-fit-cover"
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                              />
                            ) : null}

                            <div
                              className="w-100 h-100 align-items-center justify-content-center p-3 text-center"
                              style={{
                                display: r.imageUrl ? 'none' : 'flex',
                                background: r.rewardType === 'PhysicalGift'
                                  ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                                  : r.rewardType === 'FreeService'
                                    ? 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)'
                                    : 'linear-gradient(135deg, #cff4fc 0%, #a5f3fc 100%)'
                              }}
                            >
                              <i className={`fas ${r.rewardType === 'PhysicalGift' ? 'fa-gift fa-3x text-warning' : r.rewardType === 'FreeService' ? 'fa-soap fa-3x text-cyan' : 'fa-ticket-alt fa-3x text-cyan'} opacity-80`}></i>
                            </div>

                            <div className="position-absolute top-0 end-0 p-2">
                              {getRewardTypeBadge(r.rewardType)}
                            </div>

                            {!isAvailable && (
                              <div className="position-absolute bottom-0 start-0 w-100 bg-dark text-white text-center py-1 small fw-bold" style={{ opacity: 0.85 }}>
                                {reasonText}
                              </div>
                            )}
                          </div>

                          {/* Card Content Body */}
                          <div className="p-3.5 d-flex flex-column flex-grow-1 justify-content-between">
                            <div>
                              <h6 className="fw-bold text-dark mb-1.5 clamp-1" title={r.rewardName} style={{ fontSize: "1rem" }}>{r.rewardName}</h6>
                              <p className="small text-muted mb-2 clamp-2" style={{ fontSize: "0.8rem", minHeight: 36 }}>
                                {r.description || "Ưu đãi từ AutoWash Pro."}
                              </p>
                              {r.rewardType === "PhysicalGift" && (
                                <div className="small text-warning-emphasis bg-warning-subtle px-2 py-1 rounded-2 mb-2" style={{ fontSize: "0.7rem" }}>
                                  <i className="fas fa-info-circle me-1"></i> Mỗi tài khoản chỉ đổi quà này 1 lần.
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="fw-bold text-cyan" style={{ fontSize: "1.05rem" }}>
                                  <i className="fas fa-coins me-1 text-warning"></i>{r.pointCost.toLocaleString("vi-VN")} pts
                                </span>
                                {r.stockLimit != null && r.remainingStock > 0 && r.remainingStock <= 5 ? (
                                  <small className="fw-bold px-2 py-0.5 rounded-pill bg-danger-subtle text-danger" style={{ fontSize: "0.72rem" }}>
                                    <i className="fas fa-exclamation-triangle me-1"></i>Chỉ còn {r.remainingStock} phần
                                  </small>
                                ) : r.stockLimit != null && r.remainingStock === 0 ? (
                                  <small className="fw-bold px-2 py-0.5 rounded-pill bg-secondary-subtle text-secondary" style={{ fontSize: "0.72rem" }}>
                                    Hết hàng
                                  </small>
                                ) : null}
                              </div>

                              <button
                                className={`btn w-100 fw-bold py-2 rounded-3 shadow-sm ${isAvailable && canAfford ? 'btn-cyan text-white' : 'btn-light text-muted border'}`}
                                disabled={!isAvailable || !canAfford}
                                title={isAlreadyRedeemed ? "Mỗi tài khoản chỉ đổi quà này 1 lần" : !isAvailable || !canAfford ? reasonText : "Nhấn để đổi quà"}
                                onClick={() => handleOpenRedeemModal(r)}
                              >
                                {isAvailable && canAfford ? (
                                  <>
                                    <i className="fas fa-exchange-alt me-1.5"></i>Đổi ngay
                                  </>
                                ) : (
                                  reasonText
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 2: MY REWARDS (WALLET) */}
          {rewardsSubTab === "my-rewards" && (
            <div>
              {/* Chip Filters Bar for My Rewards */}
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 bg-light p-3 rounded-4 border">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <small className="fw-bold text-muted me-1" style={{ fontSize: "0.75rem" }}>Loại:</small>
                  {[
                    { label: "Tất cả", val: "All" },
                    { label: "Voucher", val: "Voucher" },
                    { label: "Quà tặng", val: "Gift" }
                  ].map((t) => (
                    <button
                      key={t.val}
                      className={`ui-filter-pill ${myRewardsTypeFilter === t.val ? "active" : ""}`}
                      onClick={() => setMyRewardsTypeFilter(t.val)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2">
                  <small className="fw-bold text-muted me-1" style={{ fontSize: "0.75rem" }}>Trạng thái:</small>
                  {[
                    { label: "Còn dùng / chờ nhận", val: "Available" },
                    { label: "Đã dùng / đã nhận", val: "Used" },
                    { label: "Hết hạn", val: "Expired" },
                    { label: "Tất cả", val: "All" }
                  ].map((s) => (
                    <button
                      key={s.val}
                      className={`ui-filter-pill ${myRewardsStatusFilter === s.val ? "active" : ""}`}
                      onClick={() => setMyRewardsStatusFilter(s.val)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingMyRewards ? (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm text-cyan me-2"></div>
                  Đang tải ví phần thưởng...
                </div>
              ) : myRewards.length === 0 ? (
                <div className="empty-state-card">
                  <i className="fas fa-wallet fa-3x text-muted mb-3 opacity-50"></i>
                  <h6 className="fw-bold text-dark mb-1">Chưa có phần quà nào</h6>
                  <p className="text-muted small mb-0">Bạn chưa có phần quà nào thuộc mục này.</p>
                </div>
              ) : (
                <div className="row g-3">
                  {myRewards.map((v) => {
                    const isGift = v.rewardType === "PhysicalGift";
                    const isCopied = copiedCodeId === v.redemptionId;
                    const isActive = v.status === "Active";

                    return (
                      <div key={v.redemptionId} className="col-12">
                        <div
                          className={`card border-0 shadow-sm rounded-4 p-3.5 transition-all ${v.status === 'Expired' ? 'bg-light opacity-75' : 'bg-white'}`}
                          style={{
                            borderLeft: isGift ? '5px solid #f59e0b' : '5px solid #06b6d4',
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)"
                          }}
                        >
                          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2.5">
                            <div>
                              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                <h5 className="fw-bold text-dark mb-0" style={{ fontSize: "1.05rem", letterSpacing: "-0.3px" }}>
                                  {v.rewardName}
                                </h5>
                                {getRewardTypeBadge(v.rewardType)}
                              </div>
                              {v.description && (
                                <p className="small text-muted mb-0 clamp-2" style={{ fontSize: "0.8rem", maxWidth: 600 }}>
                                  {v.description}
                                </p>
                              )}
                            </div>
                            <div>
                              {getMyRewardStatusBadge(v.status, v.rewardType)}
                            </div>
                          </div>

                          {isGift ? (
                            <div className="p-3 bg-warning-subtle border border-warning-subtle rounded-3 d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                              <div className="d-flex align-items-center gap-2.5">
                                <div className="rounded-circle bg-warning text-dark d-flex align-items-center justify-content-center shadow-sm" style={{ width: 42, height: 42 }}>
                                  <i className="fas fa-gift fa-lg"></i>
                                </div>
                                <div>
                                  <small className="text-warning-emphasis fw-bold d-block text-uppercase" style={{ fontSize: "0.68rem", letterSpacing: "0.5px" }}>
                                    MÃ NHẬN QUÀ TẠI CỬA HÀNG
                                  </small>
                                  <span className="fw-bold font-monospace text-dark" style={{ fontSize: "1.2rem", letterSpacing: "1px" }}>
                                    {v.code}
                                  </span>
                                </div>
                              </div>

                              <button
                                className={`btn btn-sm fw-bold rounded-2 px-3 py-1.5 transition-all ${isCopied ? 'btn-success text-white' : 'btn-outline-warning text-dark border-warning'}`}
                                onClick={() => handleCopyCode(v.code, v.redemptionId)}
                                title="Sao chép mã nhận quà"
                              >
                                {isCopied ? (
                                  <><i className="fas fa-check me-1.5"></i>Đã chép!</>
                                ) : (
                                  <><i className="far fa-copy me-1.5"></i>Copy</>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 bg-cyan-subtle border border-cyan-subtle rounded-3 d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                              <div className="d-flex align-items-center gap-2.5">
                                <div className="rounded-circle bg-cyan text-white d-flex align-items-center justify-content-center shadow-sm" style={{ width: 42, height: 42 }}>
                                  <i className="fas fa-ticket-alt fa-lg"></i>
                                </div>
                                <div>
                                  <small className="text-cyan fw-bold d-block text-uppercase" style={{ fontSize: "0.68rem", letterSpacing: "0.5px" }}>
                                    Mã voucher
                                  </small>
                                  <span className="fw-bold font-monospace text-dark" style={{ fontSize: "1.2rem", letterSpacing: "1px" }}>
                                    {v.code}
                                  </span>
                                </div>
                              </div>

                              <div className="d-flex align-items-center gap-2">
                                <button
                                  className={`btn btn-sm fw-bold rounded-2 px-3 py-1.5 transition-all ${isCopied ? 'btn-success text-white' : 'btn-outline-cyan text-cyan border-cyan'}`}
                                  onClick={() => handleCopyCode(v.code, v.redemptionId)}
                                  title="Sao chép mã voucher"
                                >
                                  {isCopied ? (
                                    <><i className="fas fa-check me-1.5"></i>Đã chép!</>
                                  ) : (
                                    <><i className="far fa-copy me-1.5"></i>Copy</>
                                  )}
                                </button>

                                {isActive && (
                                  <button
                                    className="btn btn-cyan btn-sm fw-bold text-white px-3 py-1.5 rounded-2 shadow-sm hover-lift"
                                    onClick={() => navigate("/booking")}
                                    title="Đặt lịch rửa xe để áp dụng voucher này"
                                  >
                                    <i className="fas fa-calendar-check me-1.5"></i>Đặt lịch ngay
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2 border-top">
                            <div className="d-flex flex-wrap gap-3 small text-muted" style={{ fontSize: "0.78rem" }}>
                              <span>
                                <i className="far fa-calendar-check text-cyan me-1"></i> Ngày đổi: <strong>{new Date(v.redeemedAt).toLocaleDateString("vi-VN")}</strong>
                              </span>
                              <span>
                                <i className="far fa-clock text-danger me-1"></i> Hạn dùng: <strong>{new Date(v.expiresAt).toLocaleDateString("vi-VN")}</strong>
                              </span>
                            </div>

                            <div
                              className={`small px-3 py-1.5 rounded-pill fw-semibold ${isGift ? 'bg-warning-subtle text-warning-emphasis' : 'bg-light text-muted border'}`}
                              style={{ fontSize: "0.74rem" }}
                            >
                              <i className={`fas ${isGift ? 'fa-store me-1.5' : 'fa-info-circle me-1.5'}`}></i>
                              {isGift
                                ? "Đưa mã này tại cửa hàng để nhận quà"
                                : "Nhập mã này khi đặt lịch rửa xe để được giảm giá"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 3: REDEMPTION HISTORY */}
          {rewardsSubTab === "history" && (
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white p-4">
              <h5 className="fw-bold text-dark mb-3">Lịch sử đổi điểm</h5>
              {loadingHistory ? (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm text-cyan me-2"></div>
                  Đang tải lịch sử...
                </div>
              ) : rewardHistory.length === 0 ? (
                <div className="empty-state-card">
                  <i className="fas fa-history fa-3x text-muted mb-3 opacity-50"></i>
                  <h6 className="fw-bold text-dark mb-1">Chưa có giao dịch nào</h6>
                  <p className="text-muted small mb-0">Bạn chưa đổi phần thưởng nào.</p>
                </div>
              ) : (
                <div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="bg-light">
                        <tr className="text-muted small text-uppercase" style={{ fontSize: "0.72rem" }}>
                          <th className="ps-3">Thời gian</th>
                          <th>Phần thưởng</th>
                          <th>Loại</th>
                          <th>Mã</th>
                          <th>Điểm</th>
                          <th className="text-end pe-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedHistory.map((item, idx) => (
                          <tr key={idx}>
                            <td className="ps-3 small text-muted">{item.redeemTime}</td>
                            <td className="fw-bold text-dark">{item.rewardName}</td>
                            <td>{getRewardTypeBadge(item.rewardType)}</td>
                            <td><span className="font-monospace fw-bold text-cyan">{item.code}</span></td>
                            <td className="fw-bold text-danger">-{item.pointsSpent} pts</td>
                            <td className="text-end pe-3">{getMyRewardStatusBadge(item.status, item.rewardType)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* History Pagination */}
                  {rewardHistory.length > HISTORY_PER_PAGE && (
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                      <small className="text-muted fw-semibold">
                        Trang {historyPage} / {totalHistoryPages}
                      </small>
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-light btn-sm border"
                          disabled={historyPage === 1}
                          onClick={() => setHistoryPage(historyPage - 1)}
                        >
                          <i className="fas fa-chevron-left me-1"></i> Trước
                        </button>
                        <button
                          className="btn btn-light btn-sm border"
                          disabled={historyPage === totalHistoryPages}
                          onClick={() => setHistoryPage(historyPage + 1)}
                        >
                          Sau <i className="fas fa-chevron-right ms-1"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Redeeming */}
      {redeemModalOpen && pendingRedeem && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header bg-light border-bottom p-3">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="fas fa-exchange-alt text-cyan me-2"></i> Xác nhận đổi thưởng
                </h5>
                <button type="button" className="btn-close" onClick={() => setRedeemModalOpen(false)}></button>
              </div>

              <div className="modal-body p-4 text-center">
                <div className="mb-3">
                  <span className="badge bg-cyan-subtle text-cyan fs-6 px-3 py-1.5 rounded-pill fw-bold">
                    <i className="fas fa-coins me-1 text-warning"></i> -{pendingRedeem.pointCost.toLocaleString("vi-VN")} pts
                  </span>
                </div>

                <h5 className="fw-bold text-dark mb-2">{pendingRedeem.rewardName}</h5>
                <p className="text-muted small mb-3">{pendingRedeem.description || "Đổi điểm lấy ưu đãi."}</p>

                <div className="p-3 bg-light rounded-3 border text-start small mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Điểm hiện tại của bạn:</span>
                    <span className="fw-bold text-dark">{pts.toLocaleString("vi-VN")} pts</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Điểm tiêu tốn:</span>
                    <span className="fw-bold text-danger">-{pendingRedeem.pointCost.toLocaleString("vi-VN")} pts</span>
                  </div>
                  <div className="d-flex justify-content-between pt-2 border-top fw-bold">
                    <span className="text-dark">Điểm còn lại sau đổi:</span>
                    <span className="text-cyan">{(pts - pendingRedeem.pointCost).toLocaleString("vi-VN")} pts</span>
                  </div>
                </div>

                <div className="alert alert-info py-2 px-3 small rounded-3 mb-0 text-start">
                  <i className="fas fa-info-circle me-1"></i> Sau khi đổi, phần thưởng sẽ được lưu vào mục <strong>Quà của tôi</strong>.
                </div>
              </div>

              <div className="modal-footer bg-light border-top p-3 justify-content-end gap-2">
                <button type="button" className="btn btn-light border" onClick={() => setRedeemModalOpen(false)}>Hủy</button>
                <button type="button" className="btn btn-cyan text-white px-4 fw-bold shadow-sm" disabled={redeeming} onClick={handleConfirmRedeem}>
                  {redeeming ? <span className="spinner-border spinner-border-sm me-1.5"></span> : null}
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal (Post-Redemption Flow) */}
      {successModalOpen && successData && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden text-center">
              <div className="modal-body p-4">
                <div className="rounded-circle bg-success-subtle text-success d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 70, height: 70 }}>
                  <i className="fas fa-check-circle fa-3x"></i>
                </div>

                <h4 className="fw-bold text-dark mb-1">Đổi thưởng thành công!</h4>
                <p className="text-muted small mb-3">Bạn đã đổi phần thưởng <strong>{successData.rewardName}</strong>.</p>

                <div className="p-3 bg-light rounded-3 border mb-3">
                  <small className="text-muted d-block text-uppercase fw-bold mb-1" style={{ fontSize: "0.68rem" }}>Mã quà của bạn</small>
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <span className="fw-bold font-monospace text-cyan" style={{ fontSize: "1.4rem" }}>{successData.code}</span>
                    <button
                      className="btn btn-sm btn-outline-cyan rounded-2 px-2.5 py-1 fw-bold"
                      onClick={() => handleCopyCode(successData.code)}
                      title="Sao chép mã"
                    >
                      <i className="far fa-copy me-1"></i>Copy
                    </button>
                  </div>
                </div>

                <div className="alert alert-warning py-2.5 px-3 small rounded-3 mb-3 text-start">
                  <i className={`fas ${successData.isGift ? 'fa-store me-1.5' : 'fa-info-circle me-1.5'}`}></i>
                  {successData.claimInstruction}
                </div>

                <div className="d-flex gap-2 justify-content-center">
                  {!successData.isGift && (
                    <button
                      className="btn btn-cyan text-white fw-bold px-4 py-2 rounded-3 shadow-sm hover-lift"
                      onClick={() => { setSuccessModalOpen(false); navigate("/booking"); }}
                    >
                      <i className="fas fa-calendar-check me-1.5"></i> Đặt lịch ngay
                    </button>
                  )}
                  <button
                    className="btn btn-light border fw-bold px-4 py-2 rounded-3"
                    onClick={() => setSuccessModalOpen(false)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerLoyalty;
