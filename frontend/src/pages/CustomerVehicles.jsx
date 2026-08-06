import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import { useAuth } from '../hooks/useAuth';
import VehicleSummary from '../components/VehicleSummary';
import VehicleSearchBar from '../components/VehicleSearchBar';
import VehicleFilters from '../components/VehicleFilters';
import VehicleCard from '../components/VehicleCard';
import AddVehicleForm from '../components/AddVehicleForm';
import OtpVerificationModal from '../components/OtpVerificationModal';
import EditVehicleModal from '../components/EditVehicleModal';

import '../styles/shared.css';
import '../styles/customer/profile.css';
import '../styles/customer/vehicle-cards.css';

const normalizePlate = (plate) => (plate || '').trim().toUpperCase().replace(/[\s\-.]/g, '');

export const CustomerVehicles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Vehicle Management Center state
  const [vehicleSummaries, setVehicleSummaries] = useState([]);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'upcoming' | 'no-booking' | 'recent'

  // Add Vehicle form state
  const [regLicensePlate, setRegLicensePlate] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [vehicleClass, setVehicleClass] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [conflictError, setConflictError] = useState(null);

  // OTP Modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState(null);

  // Editing vehicle state
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchVehicles = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const response = await customerService.getVehicles(background ? { skipGlobalLoader: true } : {});
      if (response.success) setVehicles(response.vehicles);
    } catch (err) {
      console.error(err);
      setVehicles([]);
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  const fetchSummaries = useCallback(async (background = false) => {
    if (!background) setSummariesLoading(true);
    try {
      const response = await customerService.getVehicleSummaries(background ? { skipGlobalLoader: true } : {});
      if (response.success) setVehicleSummaries(response.vehicles);
    } catch (err) {
      console.error(err);
    } finally {
      if (!background) setSummariesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchSummaries();
    const interval = setInterval(() => {
      fetchVehicles(true);
      fetchSummaries(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchVehicles, fetchSummaries]);

  // Search + Filter logic (client-side)
  const filteredVehicles = useMemo(() => {
    let list = vehicleSummaries;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(v =>
        v.licensePlate?.toLowerCase().includes(q) ||
        v.brand?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q)
      );
    }

    switch (activeFilter) {
      case 'upcoming':
        list = list.filter(v => v.upcomingBooking != null);
        break;
      case 'no-booking':
        list = list.filter(v => v.upcomingBooking == null);
        break;
      case 'recent': {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        list = list.filter(v => new Date(v.registeredAt) >= thirtyDaysAgo);
        break;
      }
      default:
        break;
    }

    return list;
  }, [vehicleSummaries, searchQuery, activeFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = vehicleSummaries.length;
    const upcoming = vehicleSummaries.filter(v => v.upcomingBooking != null).length;
    const today = new Date().toDateString();
    const bookingToday = vehicleSummaries.filter(v =>
      v.upcomingBooking && new Date(v.upcomingBooking.scheduledAt).toDateString() === today
    ).length;
    return { total, upcoming, bookingToday };
  }, [vehicleSummaries]);

  // Navigation handlers
  const handleBookNow = (vehicle) => {
    navigate('/customer/booking', { state: { vehicleId: vehicle.vehicleId } });
  };

  const handleViewHistory = (vehicle) => {
    navigate('/customer/history', { state: { vehicleLicensePlate: vehicle.licensePlate } });
  };

  // Submit Send OTP from form
  const handleSendRegOtp = async () => {
    const cleanPlate = normalizePlate(regLicensePlate);
    if (!cleanPlate || !selectedBrand || !selectedModel || !vehicleClass) {
      return;
    }

    setIsSendingOtp(true);
    setConflictError(null);
    try {
      const res = await customerService.sendVehicleOtp(cleanPlate, selectedBrand, selectedModel, vehicleClass);
      if (res.success) {
        setShowOtpModal(true);
        if (window.showToast) {
          window.showToast('Mã OTP đã được gửi tới email của bạn!', 'success');
        }
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictError('Biển số xe này đã được đăng ký trên hệ thống.');
      } else {
        const msg = err.response?.data?.message || 'Gửi OTP thất bại!';
        if (window.showToast) {
          window.showToast(msg, 'error');
        }
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP and save vehicle
  const handleVerifyOtpAndSave = async (otpCode) => {
    const cleanPlate = normalizePlate(regLicensePlate);
    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      const response = await customerService.verifyVehicleOtpAndSave(
        cleanPlate,
        selectedBrand,
        selectedModel,
        vehicleClass,
        otpCode
      );
      if (response.success) {
        if (window.showToast) {
          window.showToast('Đăng ký phương tiện thành công!', 'success');
        }
        setShowOtpModal(false);
        resetRegistrationForm();
        fetchVehicles();
        fetchSummaries();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.';
      setOtpError(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const resetRegistrationForm = () => {
    setRegLicensePlate('');
    setSelectedBrand('');
    setSelectedModel('');
    setVehicleClass('');
    setConflictError(null);
    setOtpError(null);
  };

  // Edit vehicle
  const handleStartEdit = (vehicle) => {
    setEditingVehicle(vehicle);
  };

  const handleSaveEdit = async (vehicleId, brand, model, vehicleClass) => {
    setIsSavingEdit(true);
    try {
      const res = await customerService.editVehicle(vehicleId, brand, model, vehicleClass);
      if (res.success) {
        if (window.showToast) {
          window.showToast('Cập nhật thông tin phương tiện thành công!', 'success');
        }
        setEditingVehicle(null);
        fetchVehicles();
        fetchSummaries();
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật!', 'error');
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete vehicle
  const handleDeleteVehicle = (vehicleId) => {
    const performDelete = async () => {
      try {
        const res = await customerService.deleteVehicle(vehicleId);
        if (res.success) {
          if (window.showToast) {
            window.showToast('Đã xóa phương tiện thành công!', 'success');
          }
          fetchVehicles();
          fetchSummaries();
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast(err.response?.data?.message || 'Không thể xóa!', 'error');
        }
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Bạn có chắc chắn muốn xóa phương tiện này?', performDelete);
    } else {
      if (window.confirm('Bạn có chắc chắn muốn xóa phương tiện này?')) {
        performDelete();
      }
    }
  };

  return (
    <div className="container py-4">
      {/* Header section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0 text-slate-800" style={{ fontFamily: 'Be Vietnam Pro, sans-serif' }}>
          Quản lý phương tiện
        </h4>
      </div>

      <div className="row justify-content-center">
        <div className="col-12">

          {/* 1. Statistics Summary Bar */}
          <VehicleSummary stats={stats} />

          {/* 2. Search & Filter Toolbar */}
          <div className="vc-toolbar">
            <VehicleSearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            <VehicleFilters activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
          </div>

          {/* 3. Vehicle Cards Grid / Empty States */}
          <div className="mb-4">
            {summariesLoading && vehicleSummaries.length === 0 ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                <p className="text-muted mt-2 small">Đang tải danh sách xe...</p>
              </div>
            ) : vehicleSummaries.length === 0 ? (
              <div className="vc-empty-state">
                <div className="vc-empty-icon">🚗</div>
                <div className="vc-empty-text">
                  <strong>Chưa có phương tiện nào</strong><br />
                  Đăng ký xe đầu tiên để bắt đầu đặt lịch rửa xe.
                </div>
                <button
                  className="vc-btn-book"
                  style={{ padding: '10px 24px', fontSize: '15px', borderRadius: '8px', border: 'none' }}
                  onClick={() => {
                    const regSection = document.getElementById('vehicle-registration-section');
                    if (regSection) regSection.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <i className="fas fa-plus"></i> Đăng ký phương tiện
                </button>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="vc-empty-state">
                <div className="vc-empty-icon" style={{ fontSize: '36px' }}>🔍</div>
                <div className="vc-empty-text">
                  <strong>Không tìm thấy phương tiện</strong><br />
                  Thử từ khóa tìm kiếm khác.
                </div>
              </div>
            ) : (
              <div className="vc-grid">
                {filteredVehicles.map((v, i) => (
                  <VehicleCard
                    key={v.vehicleId}
                    vehicle={v}
                    index={i}
                    onEdit={handleStartEdit}
                    onDelete={handleDeleteVehicle}
                    onBookNow={handleBookNow}
                    onViewHistory={handleViewHistory}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 4. Add Vehicle Form */}
          <AddVehicleForm
            licensePlate={regLicensePlate}
            setLicensePlate={setRegLicensePlate}
            selectedBrand={selectedBrand}
            setSelectedBrand={setSelectedBrand}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            vehicleClass={vehicleClass}
            setVehicleClass={setVehicleClass}
            onSubmitSendOtp={handleSendRegOtp}
            isSendingOtp={isSendingOtp}
            conflictError={conflictError}
            setConflictError={setConflictError}
          />
        </div>
      </div>

      {/* 5. OTP Verification Centered Modal */}
      <OtpVerificationModal
        show={showOtpModal}
        userEmail={user?.email}
        onClose={() => setShowOtpModal(false)}
        onVerifyOtp={handleVerifyOtpAndSave}
        onResendOtp={handleSendRegOtp}
        isVerifying={isVerifyingOtp}
        otpError={otpError}
      />

      {/* 6. Edit Vehicle Master Data Modal */}
      {editingVehicle && (
        <EditVehicleModal
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSaveEdit={handleSaveEdit}
          isSaving={isSavingEdit}
        />
      )}
    </div>
  );
};

export default CustomerVehicles;
