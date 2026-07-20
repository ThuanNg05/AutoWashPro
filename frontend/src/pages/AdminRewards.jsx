import { useState, useEffect, useMemo } from "react";
import { adminService } from "../services/adminService";
import "../styles/shared.css";
import "../styles/admin/dashboard.css";
import "../styles/customer/loyalty.css";

export const AdminRewards = () => {
  const [activeTab, setActiveTab] = useState("rewards"); // 'rewards' | 'redemptions'
  const [stats, setStats] = useState({
    totalRewards: 0,
    activeRewards: 0,
    expiredRewards: 0,
    voucherCount: 0,
    giftCount: 0,
    totalRedeemed: 0,
    totalClaimed: 0
  });

  // Rewards Tab State
  const [rewards, setRewards] = useState([]);
  const [services, setServices] = useState([]);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [rewardsPage, setRewardsPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal State for Create/Edit Reward
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [modalForm, setModalForm] = useState({
    rewardName: "",
    description: "",
    pointCost: 100,
    rewardType: "DiscountPercent",
    discountValue: 10,
    serviceId: "",
    validDays: 30,
    stockLimit: "",
    imageUrl: "",
    startDate: "",
    endDate: "",
    isActive: true
  });
  const [saving, setSaving] = useState(false);

  // Redemptions Tab State (Completely Separate Filter State)
  const [redemptions, setRedemptions] = useState([]);
  const [redemptionSearchInput, setRedemptionSearchInput] = useState("");
  const [debouncedRedemptionSearch, setDebouncedRedemptionSearch] = useState("");
  const [redemptionStatusFilter, setRedemptionStatusFilter] = useState("All");
  const [redemptionTypeFilter, setRedemptionTypeFilter] = useState("All");
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const [redemptionsPage, setRedemptionsPage] = useState(1);

  // Confirm Gift Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRedemption, setSelectedRedemption] = useState(null);
  const [confirmStaffNotes, setConfirmStaffNotes] = useState("");
  const [confirming, setConfirming] = useState(false);

  // 300ms Debounce Effect for Reward Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchInputValue);
      setRewardsPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInputValue]);

  // 300ms Debounce Effect for Redemption Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedRedemptionSearch(redemptionSearchInput);
      setRedemptionsPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [redemptionSearchInput]);

  useEffect(() => {
    fetchStats();
    fetchServices();
  }, []);

  useEffect(() => {
    if (activeTab === "rewards") {
      fetchRewards();
    } else {
      fetchRedemptions();
    }
  }, [activeTab, debouncedSearchQuery, typeFilter, statusFilter, debouncedRedemptionSearch, redemptionStatusFilter, redemptionTypeFilter]);

  const fetchStats = async () => {
    try {
      const res = await adminService.getRewardStats();
      if (res && res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error("Lỗi tải thống kê phần thưởng:", err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await adminService.getServices();
      if (res && res.success && res.services) {
        setServices(res.services);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách dịch vụ:", err);
    }
  };

  const fetchRewards = async () => {
    setLoadingRewards(true);
    try {
      const res = await adminService.getAdminRewards({
        search: debouncedSearchQuery,
        type: typeFilter,
        status: statusFilter
      });
      if (res && res.success) {
        setRewards(res.rewards || []);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách phần thưởng:", err);
    } finally {
      setLoadingRewards(false);
    }
  };

  const fetchRedemptions = async () => {
    setLoadingRedemptions(true);
    try {
      const res = await adminService.getRewardRedemptions({
        search: debouncedRedemptionSearch,
        status: redemptionStatusFilter,
        type: redemptionTypeFilter
      });
      if (res && res.success) {
        setRedemptions(res.redemptions || []);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách đổi quà:", err);
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingReward(null);
    setModalForm({
      rewardName: "",
      description: "",
      pointCost: 100,
      rewardType: "DiscountPercent",
      discountValue: 10,
      serviceId: services.length > 0 ? services[0].serviceId : "",
      validDays: 30,
      stockLimit: "",
      imageUrl: "",
      startDate: "",
      endDate: "",
      isActive: true
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (reward) => {
    setEditingReward(reward);
    setModalForm({
      rewardName: reward.rewardName || "",
      description: reward.description || "",
      pointCost: reward.pointCost || 0,
      rewardType: reward.rewardType || "DiscountPercent",
      discountValue: reward.discountValue || 0,
      serviceId: reward.serviceId || "",
      validDays: reward.validDays || 30,
      stockLimit: reward.stockLimit != null ? reward.stockLimit : "",
      imageUrl: reward.imageUrl || "",
      startDate: reward.startDate ? reward.startDate.substring(0, 10) : "",
      endDate: reward.endDate ? reward.endDate.substring(0, 10) : "",
      isActive: reward.isActive
    });
    setShowModal(true);
  };

  const handleSaveReward = async (e) => {
    e.preventDefault();
    if (!modalForm.rewardName.trim()) {
      if (window.showToast) window.showToast("Tên phần thưởng không được để trống!", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        RewardName: modalForm.rewardName.trim(),
        Description: modalForm.description.trim(),
        PointCost: Number(modalForm.pointCost),
        RewardType: modalForm.rewardType,
        DiscountValue: modalForm.rewardType === "PhysicalGift" ? null : Number(modalForm.discountValue),
        ServiceId: modalForm.rewardType === "FreeService" && modalForm.serviceId ? Number(modalForm.serviceId) : null,
        ValidDays: Number(modalForm.validDays) || 30,
        StockLimit: modalForm.stockLimit !== "" ? Number(modalForm.stockLimit) : null,
        ImageUrl: modalForm.imageUrl.trim() || null,
        StartDate: modalForm.startDate ? new Date(modalForm.startDate).toISOString() : null,
        EndDate: modalForm.endDate ? new Date(modalForm.endDate).toISOString() : null,
        IsActive: modalForm.isActive
      };

      let res;
      if (editingReward) {
        res = await adminService.updateReward(editingReward.rewardId, payload);
      } else {
        res = await adminService.createReward(payload);
      }

      if (res && res.success) {
        if (window.showToast) window.showToast(res.message || "Lưu phần thưởng thành công!", "success");
        setShowModal(false);
        fetchRewards();
        fetchStats();
      } else {
        if (window.showToast) window.showToast(res.message || "Lưu phần thưởng thất bại!", "error");
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast("Lỗi khi kết nối máy chủ!", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (reward) => {
    const actionText = reward.isActive ? "vô hiệu hóa" : "kích hoạt";
    const run = async () => {
      try {
        const res = await adminService.toggleRewardStatus(reward.rewardId);
        if (res && res.success) {
          if (window.showToast) window.showToast(`Đã ${actionText} phần thưởng thành công!`, "success");
          fetchRewards();
          fetchStats();
        } else {
          if (window.showToast) window.showToast(res.message || "Thao tác thất bại!", "error");
        }
      } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast("Lỗi kết nối máy chủ!", "error");
      }
    };

    if (window.showConfirm) {
      window.showConfirm(`Xác nhận ${actionText}`, `Bạn có chắc chắn muốn ${actionText} phần thưởng '${reward.rewardName}'?`, run);
    } else if (window.confirm(`Xác nhận ${actionText}?`)) {
      run();
    }
  };

  const handleOpenConfirmGift = (redemption) => {
    setSelectedRedemption(redemption);
    setConfirmStaffNotes("");
    setShowConfirmModal(true);
  };

  const handleConfirmGiftSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRedemption) return;

    setConfirming(true);
    try {
      const res = await adminService.confirmGift(selectedRedemption.redemptionCode, confirmStaffNotes);
      if (res && res.success) {
        if (window.showToast) window.showToast(res.message || "Xác nhận nhận quà thành công!", "success");
        setShowConfirmModal(false);
        fetchRedemptions();
        fetchStats();
      } else {
        if (window.showToast) window.showToast(res.message || "Xác nhận thất bại!", "error");
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setConfirming(false);
    }
  };

  const getRewardTypeBadge = (type) => {
    switch (type) {
      case "DiscountPercent":
        return <span className="badge bg-info-subtle text-info fw-bold px-2.5 py-1.5 rounded-pill"><i className="fas fa-percent me-1"></i> Giảm %</span>;
      case "DiscountFixed":
        return <span className="badge bg-primary-subtle text-primary fw-bold px-2.5 py-1.5 rounded-pill"><i className="fas fa-tag me-1"></i> Giảm Tiền</span>;
      case "FreeService":
      case "Free_Wash":
        return <span className="badge bg-cyan-subtle text-cyan fw-bold px-2.5 py-1.5 rounded-pill" style={{ color: "#0891b2" }}><i className="fas fa-soap me-1"></i> Dịch Vụ Miễn Phí</span>;
      case "PhysicalGift":
        return <span className="badge bg-warning-subtle text-warning-emphasis fw-bold px-2.5 py-1.5 rounded-pill"><i className="fas fa-gift me-1"></i> Quà Tặng Vật Lý</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary px-2.5 py-1.5 rounded-pill">{type}</span>;
    }
  };

  // Distinct Status Badges for Redemptions (Voucher vs Physical Gift)
  const getRedemptionStatusBadge = (status, rewardType) => {
    if (rewardType === "PhysicalGift") {
      switch (status) {
        case "Active":
          return <span className="badge bg-warning-subtle text-warning-emphasis fw-bold px-2.5 py-1.5 rounded-pill"><i className="fas fa-store me-1"></i> Chờ Nhận</span>;
        case "Claimed":
        case "Used":
          return <span className="badge bg-info-subtle text-info fw-bold px-2.5 py-1.5 rounded-pill"><i className="fas fa-check-circle me-1"></i> Đã Nhận</span>;
        case "Expired":
          return <span className="badge bg-danger-subtle text-danger fw-bold px-2.5 py-1.5 rounded-pill"><i className="fas fa-times-circle me-1"></i> Hết Hạn</span>;
        default:
          return <span className="badge bg-light text-dark px-2.5 py-1.5 rounded-pill">{status}</span>;
      }
    } else {
      switch (status) {
        case "Active":
          return <span className="badge bg-success-subtle text-success fw-bold px-2.5 py-1.5 rounded-pill"><i className="fas fa-check-circle me-1"></i> Khả Dụng</span>;
        case "Used":
        case "Claimed":
          return <span className="badge bg-secondary-subtle text-secondary fw-bold px-2.5 py-1.5 rounded-pill"><i className="fas fa-receipt me-1"></i> Đã Sử Dụng</span>;
        case "Expired":
          return <span className="badge bg-danger-subtle text-danger fw-bold px-2.5 py-1.5 rounded-pill"><i className="fas fa-times-circle me-1"></i> Hết Hạn</span>;
        default:
          return <span className="badge bg-light text-dark px-2.5 py-1.5 rounded-pill">{status}</span>;
      }
    }
  };

  // Dynamic Stock Badge Color Rules (Green >=70%, Orange 30-69%, Red <30%)
  const renderStockBadge = (stockLimit, redeemedCount) => {
    if (stockLimit == null) {
      return <span className="badge bg-light text-secondary border px-2 py-1"><i className="fas fa-infinity me-1"></i> Vô hạn</span>;
    }
    const remaining = Math.max(0, stockLimit - redeemedCount);
    const pct = stockLimit > 0 ? (remaining / stockLimit) * 100 : 0;

    let badgeClass = "bg-success-subtle text-success";
    if (pct < 30) {
      badgeClass = "bg-danger-subtle text-danger";
    } else if (pct < 70) {
      badgeClass = "bg-warning-subtle text-warning-emphasis";
    }

    return (
      <span className={`badge ${badgeClass} fw-bold px-2 py-1`}>
        Còn {remaining} / {stockLimit}
      </span>
    );
  };

  // Pagination for Rewards
  const paginatedRewards = useMemo(() => {
    const start = (rewardsPage - 1) * ITEMS_PER_PAGE;
    return rewards.slice(start, start + ITEMS_PER_PAGE);
  }, [rewards, rewardsPage]);

  const totalRewardsPages = Math.ceil(rewards.length / ITEMS_PER_PAGE) || 1;

  // Pagination for Redemptions
  const paginatedRedemptions = useMemo(() => {
    const start = (redemptionsPage - 1) * ITEMS_PER_PAGE;
    return redemptions.slice(start, start + ITEMS_PER_PAGE);
  }, [redemptions, redemptionsPage]);

  const totalRedemptionsPages = Math.ceil(redemptions.length / ITEMS_PER_PAGE) || 1;

  return (
    <div className="container-fluid py-4 text-start">
      {/* ITEM 5: Admin Header Row 1 - Title Left & Action Button Right */}
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-3 gap-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ letterSpacing: "-0.5px" }}>
            QUẢN LÝ VOUCHER & REWARDS
          </h4>
          <p className="text-muted small mb-0">
            Quản lý kho phần thưởng, quy tắc đổi điểm, quà tặng vật lý & xác nhận giao quà
          </p>
        </div>

        {/* '+ Tạo Reward' Action Button - Only visible when in Rewards Tab */}
        <div style={{ visibility: activeTab === "rewards" ? "visible" : "hidden", minWidth: 140 }}>
          <button className="btn btn-cyan btn-sm px-3.5 py-2 fw-bold rounded-3 shadow-sm text-white hover-lift w-100" onClick={handleOpenCreateModal} title="Tạo phần thưởng mới">
            <i className="fas fa-plus me-1.5"></i> Tạo Reward
          </button>
        </div>
      </div>

      {/* ITEM 5: Admin Header Row 2 - Segmented Control Tabs */}
      <div className="mb-4 border-bottom pb-3">
        <div className="bg-light p-1 rounded-3 d-inline-flex border shadow-sm">
          <button
            className={`btn btn-sm fw-bold border-0 rounded-2 px-3 py-1.5 transition-all ${activeTab === "rewards" ? "btn-cyan text-white shadow-sm" : "text-dark bg-transparent"}`}
            onClick={() => setActiveTab("rewards")}
          >
            <i className="fas fa-boxes me-1.5"></i> Danh sách phần thưởng
          </button>
          <button
            className={`btn btn-sm fw-bold border-0 rounded-2 px-3 py-1.5 transition-all ${activeTab === "redemptions" ? "btn-cyan text-white shadow-sm" : "text-dark bg-transparent"}`}
            onClick={() => setActiveTab("redemptions")}
          >
            <i className="fas fa-history me-1.5"></i> Lịch sử đổi ({stats.totalRedeemed})
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white hover-lift">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted fw-bold d-block text-uppercase" style={{ fontSize: "0.68rem" }}>Tổng Phần Thưởng</small>
                <h3 className="fw-bold mb-0 text-dark">{stats.totalRewards}</h3>
              </div>
              <div className="rounded-circle bg-cyan-subtle p-3 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                <i className="fas fa-boxes fa-lg text-cyan"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white hover-lift">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted fw-bold d-block text-uppercase" style={{ fontSize: "0.68rem" }}>Voucher / Dịch Vụ</small>
                <h3 className="fw-bold mb-0 text-cyan">{stats.voucherCount}</h3>
              </div>
              <div className="rounded-circle bg-info-subtle p-3 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                <i className="fas fa-ticket-alt fa-lg text-info"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white hover-lift">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted fw-bold d-block text-uppercase" style={{ fontSize: "0.68rem" }}>Quà Tặng Vật Lý</small>
                <h3 className="fw-bold mb-0 text-warning">{stats.giftCount}</h3>
              </div>
              <div className="rounded-circle bg-warning-subtle p-3 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                <i className="fas fa-gift fa-lg text-warning"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white hover-lift">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted fw-bold d-block text-uppercase" style={{ fontSize: "0.68rem" }}>Đã Trao / Xác Nhận</small>
                <h3 className="fw-bold mb-0 text-success">{stats.totalClaimed}</h3>
              </div>
              <div className="rounded-circle bg-success-subtle p-3 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                <i className="fas fa-check-circle fa-lg text-success"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: REWARDS LIST TABLE */}
      {activeTab === "rewards" && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
          {/* ITEM 2 & 6: Dedicated Controls for Rewards Tab */}
          <div className="card-header bg-white p-3 border-bottom d-flex flex-wrap gap-3 align-items-center justify-content-between">
            <div className="d-flex gap-2 flex-grow-1" style={{ maxWidth: 440 }}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0 text-muted"><i className="fas fa-search"></i></span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0 ps-0"
                  placeholder="Tìm theo tên hoặc mô tả phần thưởng..."
                  value={searchInputValue}
                  onChange={(e) => setSearchInputValue(e.target.value)}
                />
                {searchInputValue && (
                  <button className="btn btn-light border border-start-0 text-muted" type="button" onClick={() => setSearchInputValue("")}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Rewards Filter Pills */}
            <div className="d-flex flex-wrap gap-2 align-items-center">
              {[
                { label: "Tất Cả Loại", val: "All" },
                { label: "Voucher", val: "Voucher" },
                { label: "Dịch Vụ Miễn Phí", val: "FreeService" },
                { label: "Quà Vật Lý", val: "PhysicalGift" }
              ].map((f) => (
                <button
                  key={f.val}
                  className={`ui-filter-pill ${typeFilter === f.val ? "active" : ""}`}
                  onClick={() => { setTypeFilter(f.val); setRewardsPage(1); }}
                >
                  {f.label}
                </button>
              ))}

              <div className="vr mx-1 d-none d-md-block"></div>

              {/* Status Select */}
              <select
                className="form-select form-select-sm fw-bold border-secondary-subtle"
                style={{ width: 140 }}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setRewardsPage(1); }}
              >
                <option value="All">Tất cả trạng thái</option>
                <option value="Active">Đang mở</option>
                <option value="Disabled">Đã vô hiệu</option>
                <option value="Expired">Đã hết hạn</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive" style={{ maxHeight: 600 }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light sticky-top z-1" style={{ borderBottom: "2px solid #e2e8f0" }}>
                <tr className="text-muted small text-uppercase" style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}>
                  <th style={{ width: 50 }} className="ps-3">Ảnh</th>
                  <th>Tên Phần Thưởng</th>
                  <th>Loại Quà</th>
                  <th>Điểm Đổi</th>
                  <th>Kho / Còn Lại</th>
                  <th>Đã Đổi</th>
                  <th>Hạn Sử Dụng</th>
                  <th>Trạng Thái</th>
                  <th className="text-end pe-3">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingRewards ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="ps-3"><div className="skeleton-box" style={{ width: 36, height: 36, borderRadius: 8 }}></div></td>
                      <td>
                        <div className="skeleton-box mb-1" style={{ width: 160, height: 16 }}></div>
                        <div className="skeleton-box" style={{ width: 220, height: 12 }}></div>
                      </td>
                      <td><div className="skeleton-box" style={{ width: 90, height: 22, borderRadius: 20 }}></div></td>
                      <td><div className="skeleton-box" style={{ width: 70, height: 16 }}></div></td>
                      <td><div className="skeleton-box" style={{ width: 80, height: 20, borderRadius: 20 }}></div></td>
                      <td><div className="skeleton-box" style={{ width: 40, height: 16 }}></div></td>
                      <td><div className="skeleton-box" style={{ width: 100, height: 14 }}></div></td>
                      <td><div className="skeleton-box" style={{ width: 80, height: 22, borderRadius: 20 }}></div></td>
                      <td className="text-end pe-3"><div className="skeleton-box ms-auto" style={{ width: 70, height: 28, borderRadius: 8 }}></div></td>
                    </tr>
                  ))
                ) : rewards.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-0">
                      <div className="empty-state-card border-0 rounded-0 bg-white">
                        <i className="fas fa-box-open fa-3x text-muted mb-3 opacity-50"></i>
                        <h6 className="fw-bold text-dark mb-1">Chưa có phần thưởng</h6>
                        <p className="text-muted small mb-3">Hệ thống chưa tạo phần thưởng nào phù hợp với bộ lọc này.</p>
                        <button className="btn btn-cyan btn-sm fw-bold px-3.5 py-2 text-white rounded-3 shadow-sm" onClick={handleOpenCreateModal}>
                          <i className="fas fa-plus me-1.5"></i> Tạo phần thưởng đầu tiên
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRewards.map((r) => (
                    <tr key={r.rewardId} className="hover-row">
                      <td className="ps-3 py-2">
                        {r.imageUrl ? (
                          <img
                            src={r.imageUrl}
                            alt={r.rewardName}
                            className="rounded-2 object-fit-cover shadow-sm"
                            style={{ width: 36, height: 36 }}
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div
                          className="rounded-2 bg-light align-items-center justify-content-center text-muted border shadow-sm"
                          style={{ width: 36, height: 36, display: r.imageUrl ? 'none' : 'flex' }}
                        >
                          <i className={`fas ${r.rewardType === 'PhysicalGift' ? 'fa-gift text-warning' : r.rewardType === 'FreeService' ? 'fa-soap text-cyan' : 'fa-ticket-alt text-cyan'}`}></i>
                        </div>
                      </td>
                      <td className="py-2">
                        {/* ITEM 8: Reward Name clamp-2 */}
                        <div className="fw-bold text-dark clamp-2" style={{ fontSize: "0.9rem" }} title={r.rewardName}>{r.rewardName}</div>
                        {/* ITEM 8: Description clamp-1 */}
                        {r.description && <div className="small text-muted clamp-1" style={{ maxWidth: 260 }} title={r.description}>{r.description}</div>}
                      </td>
                      <td className="py-2">{getRewardTypeBadge(r.rewardType)}</td>
                      <td className="py-2">
                        <span className="fw-bold text-cyan" style={{ fontSize: "0.92rem" }}>
                          <i className="fas fa-coins me-1 text-warning"></i>{r.pointCost.toLocaleString("vi-VN")} pts
                        </span>
                      </td>
                      <td className="py-2">
                        {/* ITEM 9: Dynamic Stock Colors */}
                        {renderStockBadge(r.stockLimit, r.redeemedCount)}
                      </td>
                      <td className="py-2 fw-bold text-dark">{r.redeemedCount}</td>
                      <td className="py-2 small text-muted">
                        {r.startDate || r.endDate ? (
                          <div>
                            <div><i className="far fa-calendar-alt me-1"></i>Từ: {r.startDate ? new Date(r.startDate).toLocaleDateString("vi-VN") : "Bắt đầu"}</div>
                            <div><i className="far fa-calendar-times me-1"></i>Đến: {r.endDate ? new Date(r.endDate).toLocaleDateString("vi-VN") : "Vô hạn"}</div>
                          </div>
                        ) : (
                          <span>{r.validDays} ngày sử dụng</span>
                        )}
                      </td>
                      <td className="py-2">
                        {r.isActive ? (
                          <span className="badge bg-success-subtle text-success fw-bold px-2.5 py-1 rounded-pill"><i className="fas fa-check me-1"></i> Đang mở</span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary fw-bold px-2.5 py-1 rounded-pill"><i className="fas fa-eye-slash me-1"></i> Đã vô hiệu</span>
                        )}
                      </td>
                      <td className="py-2 text-end pe-3">
                        {/* ITEM 10: Action Icons with Tooltips */}
                        <button
                          className="btn btn-light btn-sm me-1.5 rounded-3 border"
                          title="Chỉnh sửa thông tin phần thưởng"
                          aria-label="Sửa phần thưởng"
                          onClick={() => handleOpenEditModal(r)}
                        >
                          <i className="fas fa-edit text-primary"></i>
                        </button>
                        <button
                          className={`btn btn-sm rounded-3 ${r.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          title={r.isActive ? "Vô hiệu hóa phần thưởng này" : "Kích hoạt lại phần thưởng"}
                          aria-label={r.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                          onClick={() => handleToggleStatus(r)}
                        >
                          <i className={`fas ${r.isActive ? 'fa-ban' : 'fa-check'}`}></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          {rewards.length > ITEMS_PER_PAGE && (
            <div className="card-footer bg-white p-3 border-top d-flex justify-content-between align-items-center">
              <small className="text-muted fw-semibold">
                Hiển thị {((rewardsPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(rewardsPage * ITEMS_PER_PAGE, rewards.length)} trong {rewards.length} phần thưởng
              </small>
              <div className="d-flex gap-1">
                <button
                  className="btn btn-light btn-sm border"
                  disabled={rewardsPage === 1}
                  onClick={() => setRewardsPage(rewardsPage - 1)}
                >
                  <i className="fas fa-chevron-left me-1"></i> Trước
                </button>
                {Array.from({ length: totalRewardsPages }).map((_, idx) => (
                  <button
                    key={idx}
                    className={`btn btn-sm ${rewardsPage === idx + 1 ? 'btn-cyan text-white fw-bold' : 'btn-light border text-muted'}`}
                    onClick={() => setRewardsPage(idx + 1)}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  className="btn btn-light btn-sm border"
                  disabled={rewardsPage === totalRewardsPages}
                  onClick={() => setRewardsPage(rewardsPage + 1)}
                >
                  Sau <i className="fas fa-chevron-right ms-1"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REDEMPTION HISTORY LOG */}
      {activeTab === "redemptions" && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
          {/* ITEM 2 & 6: Dedicated Controls for Redemptions Tab */}
          <div className="card-header bg-white p-3 border-bottom d-flex flex-wrap gap-3 align-items-center justify-content-between">
            <div className="d-flex gap-2 flex-grow-1" style={{ maxWidth: 440 }}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0 text-muted"><i className="fas fa-search"></i></span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0 ps-0"
                  placeholder="Tìm theo mã đổi, tên khách hàng hoặc số điện thoại..."
                  value={redemptionSearchInput}
                  onChange={(e) => setRedemptionSearchInput(e.target.value)}
                />
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 align-items-center">
              {[
                { label: "Tất Cả Loại", val: "All" },
                { label: "Voucher", val: "Voucher" },
                { label: "Dịch Vụ Miễn Phí", val: "FreeService" },
                { label: "Quà Vật Lý", val: "PhysicalGift" }
              ].map((f) => (
                <button
                  key={f.val}
                  className={`ui-filter-pill ${redemptionTypeFilter === f.val ? "active" : ""}`}
                  onClick={() => { setRedemptionTypeFilter(f.val); setRedemptionsPage(1); }}
                >
                  {f.label}
                </button>
              ))}

              <div className="vr mx-1 d-none d-md-block"></div>

              <select
                className="form-select form-select-sm fw-bold border-secondary-subtle"
                style={{ width: 160 }}
                value={redemptionStatusFilter}
                onChange={(e) => { setRedemptionStatusFilter(e.target.value); setRedemptionsPage(1); }}
              >
                <option value="All">Tất cả trạng thái</option>
                <option value="Active">Chờ nhận / Khả dụng</option>
                <option value="Claimed">Đã nhận / Đã dùng</option>
                <option value="Expired">Hết hạn</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive" style={{ maxHeight: 600 }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light sticky-top z-1" style={{ borderBottom: "2px solid #e2e8f0" }}>
                <tr className="text-muted small text-uppercase" style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}>
                  <th className="ps-3">Mã Đổi Quà</th>
                  <th>Khách Hàng</th>
                  <th>Phần Thưởng</th>
                  <th>Loại Quà</th>
                  <th>Thời Gian Đổi</th>
                  <th>Hạn Sử Dụng</th>
                  <th>Trạng Thái</th>
                  {/* ITEM 3: Column Header specifically for Physical Gift handler */}
                  <th>Xác Nhận Trao Quà (Vật Lý)</th>
                  <th className="text-end pe-3">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingRedemptions ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="ps-3"><div className="skeleton-box" style={{ width: 100, height: 20, borderRadius: 8 }}></div></td>
                      <td>
                        <div className="skeleton-box mb-1" style={{ width: 120, height: 16 }}></div>
                        <div className="skeleton-box" style={{ width: 90, height: 12 }}></div>
                      </td>
                      <td><div className="skeleton-box" style={{ width: 140, height: 16 }}></div></td>
                      <td><div className="skeleton-box" style={{ width: 80, height: 20, borderRadius: 20 }}></div></td>
                      <td><div className="skeleton-box" style={{ width: 110, height: 14 }}></div></td>
                      <td><div className="skeleton-box" style={{ width: 90, height: 14 }}></div></td>
                      <td><div className="skeleton-box" style={{ width: 90, height: 22, borderRadius: 20 }}></div></td>
                      <td><div className="skeleton-box" style={{ width: 100, height: 14 }}></div></td>
                      <td className="text-end pe-3"><div className="skeleton-box ms-auto" style={{ width: 80, height: 28, borderRadius: 8 }}></div></td>
                    </tr>
                  ))
                ) : redemptions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-0">
                      <div className="empty-state-card border-0 rounded-0 bg-white">
                        <i className="fas fa-receipt fa-3x text-muted mb-3 opacity-50"></i>
                        <h6 className="fw-bold text-dark mb-1">Chưa Có Lịch Sử Đổi Quà Khớp Bộ Lọc</h6>
                        <p className="text-muted small mb-0">Hệ thống chưa ghi nhận lượt đổi quà nào phù hợp với bộ lọc tìm kiếm này.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRedemptions.map((item) => (
                    <tr key={item.redemptionId} className="hover-row">
                      <td className="ps-3 py-2">
                        <span className="fw-bold font-monospace text-cyan px-2.5 py-1 bg-cyan-subtle rounded-2 border border-cyan-subtle">
                          {item.redemptionCode}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="fw-bold text-dark">{item.customerName}</div>
                        <small className="text-muted"><i className="fas fa-phone me-1"></i>{item.customerPhone}</small>
                      </td>
                      <td className="py-2 fw-semibold text-dark">{item.rewardName}</td>
                      <td className="py-2">{getRewardTypeBadge(item.rewardType)}</td>
                      <td className="py-2 small text-muted">{new Date(item.redeemedAt).toLocaleString("vi-VN")}</td>
                      <td className="py-2 small text-muted">{new Date(item.expiresAt).toLocaleDateString("vi-VN")}</td>
                      {/* ITEM 4: Distinct Status Badges */}
                      <td className="py-2">{getRedemptionStatusBadge(item.status, item.rewardType)}</td>
                      {/* ITEM 3: Hide Handler Info for Vouchers, Show only for Physical Gifts */}
                      <td className="py-2 small">
                        {item.rewardType === "PhysicalGift" ? (
                          item.handledByName ? (
                            <div>
                              <div className="fw-bold text-dark"><i className="fas fa-user-check me-1 text-success"></i>{item.handledByName}</div>
                              {item.usedAt && <div className="text-muted" style={{ fontSize: "0.7rem" }}>Ngày: {new Date(item.usedAt).toLocaleDateString("vi-VN")}</div>}
                              {item.staffNotes && <div className="text-muted fst-italic clamp-1" style={{ fontSize: "0.75rem", maxWidth: 160 }} title={item.staffNotes}>"{item.staffNotes}"</div>}
                            </div>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning-emphasis fw-bold"><i className="fas fa-clock me-1"></i> Chờ nhận tại quầy</span>
                          )
                        ) : (
                          <span className="text-muted fst-italic">N/A (Tự động)</span>
                        )}
                      </td>
                      <td className="py-2 text-end pe-3">
                        {/* ITEM 10: Tooltip on Confirm Button */}
                        {item.rewardType === "PhysicalGift" && item.status === "Active" ? (
                          <button
                            className="btn btn-success btn-sm px-3 fw-bold rounded-3 shadow-sm"
                            title="Xác nhận khách hàng đã nhận quà tặng vật lý tại cửa hàng"
                            aria-label="Xác nhận trao quà"
                            onClick={() => handleOpenConfirmGift(item)}
                          >
                            <i className="fas fa-check-circle me-1"></i> Xác Nhận Trao Quà
                          </button>
                        ) : (
                          <span className="text-muted small">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination */}
          {redemptions.length > ITEMS_PER_PAGE && (
            <div className="card-footer bg-white p-3 border-top d-flex justify-content-between align-items-center">
              <small className="text-muted fw-semibold">
                Hiển thị {((redemptionsPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(redemptionsPage * ITEMS_PER_PAGE, redemptions.length)} trong {redemptions.length} lượt đổi
              </small>
              <div className="d-flex gap-1">
                <button
                  className="btn btn-light btn-sm border"
                  disabled={redemptionsPage === 1}
                  onClick={() => setRedemptionsPage(redemptionsPage - 1)}
                >
                  <i className="fas fa-chevron-left me-1"></i> Trước
                </button>
                {Array.from({ length: totalRedemptionsPages }).map((_, idx) => (
                  <button
                    key={idx}
                    className={`btn btn-sm ${redemptionsPage === idx + 1 ? 'btn-cyan text-white fw-bold' : 'btn-light border text-muted'}`}
                    onClick={() => setRedemptionsPage(idx + 1)}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  className="btn btn-light btn-sm border"
                  disabled={redemptionsPage === totalRedemptionsPages}
                  onClick={() => setRedemptionsPage(totalRedemptionsPages)}
                >
                  Sau <i className="fas fa-chevron-right ms-1"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Create / Edit Reward Form */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header bg-light border-bottom p-3">
                <h5 className="modal-title fw-bold text-dark">
                  <i className={`fas ${editingReward ? 'fa-edit text-primary' : 'fa-plus-circle text-cyan'} me-2`}></i>
                  {editingReward ? "Chỉnh Sửa Phần Thưởng" : "Tạo Phần Thưởng Mới"}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleSaveReward}>
                <div className="modal-body p-4" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                  {/* Section 1: Basic Info */}
                  <div className="mb-4">
                    <h6 className="fw-bold text-cyan border-bottom pb-2 mb-3">
                      <i className="fas fa-info-circle me-1.5"></i> 1. Thông Tin Cơ Bản
                    </h6>
                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-bold small text-muted">URL Hình Ảnh Phần Thưởng</label>
                        <input
                          type="url"
                          className="form-control mb-2"
                          placeholder="https://example.com/image.jpg"
                          value={modalForm.imageUrl}
                          onChange={(e) => setModalForm({ ...modalForm, imageUrl: e.target.value })}
                        />
                        <div className="rounded-3 border bg-light d-flex align-items-center justify-content-center overflow-hidden shadow-inner" style={{ height: 130 }}>
                          {modalForm.imageUrl ? (
                            <img
                              src={modalForm.imageUrl}
                              alt="Preview"
                              className="w-100 h-100 object-fit-cover"
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                            />
                          ) : null}
                          <div className="text-center text-muted p-2" style={{ display: modalForm.imageUrl ? 'none' : 'block' }}>
                            <i className="fas fa-image fa-2x mb-1 d-block opacity-40"></i>
                            <span className="small text-muted">Xem trước ảnh</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-md-8">
                        <div className="row g-3">
                          <div className="col-12">
                            <label className="form-label fw-bold small text-muted">Tên Phần Thưởng <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className={`form-control ${!modalForm.rewardName.trim() ? 'border-warning' : ''}`}
                              placeholder="Ví dụ: Voucher Rửa Xe Bọt Tuyết 50k / Áo Mưa Cao Cấp AutoWash"
                              required
                              value={modalForm.rewardName}
                              onChange={(e) => setModalForm({ ...modalForm, rewardName: e.target.value })}
                            />
                            {!modalForm.rewardName.trim() && (
                              <small className="text-danger mt-1 d-block" style={{ fontSize: "0.72rem" }}>
                                * Tên phần thưởng bắt buộc nhập.
                              </small>
                            )}
                          </div>

                          <div className="col-12 col-md-6">
                            <label className="form-label fw-bold small text-muted">Loại Phần Thưởng <span className="text-danger">*</span></label>
                            <select
                              className="form-select fw-semibold"
                              value={modalForm.rewardType}
                              onChange={(e) => setModalForm({ ...modalForm, rewardType: e.target.value })}
                            >
                              <option value="DiscountPercent">Voucher Giảm Giá %</option>
                              <option value="DiscountFixed">Voucher Giảm Tiền Cố Định</option>
                              <option value="FreeService">Dịch Vụ Miễn Phí</option>
                              <option value="PhysicalGift">Quà Tặng Vật Lý (Áo mưa, Nước hoa...)</option>
                            </select>
                          </div>

                          <div className="col-12 col-md-6">
                            <label className="form-label fw-bold small text-muted">Điểm Quy Đổi <span className="text-danger">*</span></label>
                            <div className="input-group">
                              <span className="input-group-text bg-light text-warning fw-bold"><i className="fas fa-coins"></i></span>
                              <input
                                type="number"
                                min="0"
                                className="form-control fw-bold"
                                required
                                value={modalForm.pointCost}
                                onChange={(e) => setModalForm({ ...modalForm, pointCost: e.target.value })}
                              />
                              <span className="input-group-text bg-light text-muted">pts</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Reward Configuration */}
                  <div className="mb-4">
                    <h6 className="fw-bold text-cyan border-bottom pb-2 mb-3">
                      <i className="fas fa-cog me-1.5"></i> 2. Cấu Hình Giá Trị Phần Thưởng
                    </h6>

                    {modalForm.rewardType === "DiscountPercent" && (
                      <div className="row">
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-bold small text-muted">Phần Trăm Giảm Giá (%)</label>
                          <div className="input-group">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              className="form-control"
                              placeholder="Ví dụ: 10"
                              value={modalForm.discountValue}
                              onChange={(e) => setModalForm({ ...modalForm, discountValue: e.target.value })}
                            />
                            <span className="input-group-text fw-bold">%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {modalForm.rewardType === "DiscountFixed" && (
                      <div className="row">
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-bold small text-muted">Số Tiền Giảm (VNĐ)</label>
                          <div className="input-group">
                            <input
                              type="number"
                              min="1000"
                              step="1000"
                              className="form-control"
                              placeholder="Ví dụ: 50000"
                              value={modalForm.discountValue}
                              onChange={(e) => setModalForm({ ...modalForm, discountValue: e.target.value })}
                            />
                            <span className="input-group-text fw-bold">VNĐ</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {modalForm.rewardType === "FreeService" && (
                      <div className="row">
                        <div className="col-12 col-md-8">
                          <label className="form-label fw-bold small text-muted">Chọn Dịch Vụ Áp Dụng Miễn Phí</label>
                          <select
                            className="form-select"
                            value={modalForm.serviceId}
                            onChange={(e) => setModalForm({ ...modalForm, serviceId: e.target.value })}
                          >
                            <option value="">-- Chọn dịch vụ --</option>
                            {services.map((s) => (
                              <option key={s.serviceId} value={s.serviceId}>{s.serviceName} ({s.basePrice?.toLocaleString("vi-VN")}đ)</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {modalForm.rewardType === "PhysicalGift" && (
                      <div className="alert alert-warning py-2.5 px-3 mb-0 small rounded-3 border-warning-subtle">
                        <i className="fas fa-exclamation-triangle me-1.5 text-warning"></i>
                        Quà tặng vật lý không áp dụng trừ giá trực tiếp khi thanh toán dịch vụ rửa xe. Nhân viên sẽ trao trực tiếp cho khách hàng tại trung tâm.
                      </div>
                    )}
                  </div>

                  {/* Section 3: Availability & Rules */}
                  <div>
                    <h6 className="fw-bold text-cyan border-bottom pb-2 mb-3">
                      <i className="fas fa-sliders-h me-1.5"></i> 3. Quy Tắc Giới Hạn & Thời Gian
                    </h6>

                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-bold small text-muted">Số Lượng Kho (Stock)</label>
                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder="Để trống = Không giới hạn"
                          value={modalForm.stockLimit}
                          onChange={(e) => setModalForm({ ...modalForm, stockLimit: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label fw-bold small text-muted">Hạn Dùng Sau Khi Đổi (Ngày)</label>
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          placeholder="Mặc định: 30 ngày"
                          value={modalForm.validDays}
                          onChange={(e) => setModalForm({ ...modalForm, validDays: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label fw-bold small text-muted">Trạng Thái Hiệu Lực</label>
                        <div className="form-check form-switch pt-2">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="isActiveSwitch"
                            checked={modalForm.isActive}
                            onChange={(e) => setModalForm({ ...modalForm, isActive: e.target.checked })}
                          />
                          <label className="form-check-label fw-bold ms-1" htmlFor="isActiveSwitch">
                            {modalForm.isActive ? "Cho phép đổi quà" : "Vô hiệu hóa (Ẩn)"}
                          </label>
                        </div>
                      </div>

                      {/* ITEM 7: Date Pickers with Vietnamese dd/MM/yyyy Hints */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-muted">
                          Ngày Bắt Đầu Áp Dụng <small className="fw-normal text-muted">(dd/MM/yyyy)</small>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={modalForm.startDate}
                          onChange={(e) => setModalForm({ ...modalForm, startDate: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-muted">
                          Ngày Kết Thúc Áp Dụng <small className="fw-normal text-muted">(dd/MM/yyyy)</small>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={modalForm.endDate}
                          onChange={(e) => setModalForm({ ...modalForm, endDate: e.target.value })}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-bold small text-muted">Mô Tả Chi Tiết / Điều Kiện Sử Dụng</label>
                        <textarea
                          rows="2"
                          className="form-control"
                          placeholder="Mô tả quà tặng hoặc điều kiện nhận quà..."
                          value={modalForm.description}
                          onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer bg-light border-top p-3 justify-content-end gap-2">
                  <button type="button" className="btn btn-light border px-3" onClick={() => setShowModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-cyan px-4 fw-bold text-white shadow-sm" disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1.5"></span> : null}
                    {editingReward ? "Cập Nhật" : "Tạo Reward"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Confirm Gift Pickup */}
      {showConfirmModal && selectedRedemption && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header bg-light border-bottom p-3">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="fas fa-gift text-warning me-2"></i> Xác Nhận Trao Quà Tặng
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowConfirmModal(false)}></button>
              </div>

              <form onSubmit={handleConfirmGiftSubmit}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3 border">
                    <div className="row g-2 small">
                      <div className="col-4 text-muted">Mã Đổi Quà:</div>
                      <div className="col-8 fw-bold text-cyan font-monospace">{selectedRedemption.redemptionCode}</div>
                      <div className="col-4 text-muted">Khách Hàng:</div>
                      <div className="col-8 fw-bold text-dark">{selectedRedemption.customerName} ({selectedRedemption.customerPhone})</div>
                      <div className="col-4 text-muted">Quà Tặng:</div>
                      <div className="col-8 fw-bold text-warning">{selectedRedemption.rewardName}</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">Ghi Chú Nhân Viên (Tùy chọn)</label>
                    <textarea
                      rows="3"
                      className="form-control"
                      placeholder="Ví dụ: Đã giao trực tiếp áo mưa cho khách tại quầy thu ngân..."
                      value={confirmStaffNotes}
                      onChange={(e) => setConfirmStaffNotes(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="alert alert-warning py-2.5 px-3 small rounded-3 mb-0">
                    <i className="fas fa-exclamation-triangle me-1"></i> Trạng thái mã quà sẽ chuyển sang <strong>Claimed (Đã Trao Quà)</strong>.
                  </div>
                </div>

                <div className="modal-footer bg-light border-top p-3 justify-content-end gap-2">
                  <button type="button" className="btn btn-light border" onClick={() => setShowConfirmModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-success px-4 fw-bold shadow-sm" disabled={confirming}>
                    {confirming ? <span className="spinner-border spinner-border-sm me-1.5"></span> : null}
                    Xác Nhận Trao Quà
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRewards;
