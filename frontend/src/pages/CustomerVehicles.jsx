import { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/shared.css';
import '../styles/customer/profile.css';

const BRANDS = [
  'Toyota', 'Honda', 'Mazda', 'Hyundai', 'Kia',
  'Ford', 'VinFast', 'Mercedes-Benz', 'BMW', 'Audi',
  'Lexus', 'Mitsubishi', 'Nissan', 'Isuzu', 'Peugeot',
  'Subaru', 'Suzuki', 'Volkswagen', 'Volvo', 'Porsche',
  'Khác'
];

const VEHICLE_CLASSES = [
  'Sedan', 'SUV', 'MPV', 'Pickup', 'Coupe',
  'Convertible', 'Hatchback', 'Wagon', 'Khác'
];

const TRANSFER_STEPS = [
  { key: 'ocr', label: 'OCR Verified', icon: 'fa-file-alt' },
  { key: 'otp', label: 'OTP Sent', icon: 'fa-envelope' },
  { key: 'created', label: 'Transfer Request Created', icon: 'fa-paper-plane' },
  { key: 'owner', label: 'Waiting Owner Confirmation', icon: 'fa-user-check' },
  { key: 'admin', label: 'Waiting Admin Approval', icon: 'fa-shield-alt' },
  { key: 'done', label: 'Ownership Transferred', icon: 'fa-check-double' },
];

// Transfer Progress Stepper Component
const TransferStepper = ({ currentStep }) => {
  const stepIndex = TRANSFER_STEPS.findIndex(s => s.key === currentStep);
  return (
    <div className="d-flex flex-column gap-0 my-3" style={{ paddingLeft: '4px' }}>
      {TRANSFER_STEPS.map((step, i) => {
        const isActive = i === stepIndex;
        const isCompleted = i < stepIndex;
        const isPending = i > stepIndex;
        return (
          <div key={step.key} className="d-flex align-items-start gap-3" style={{ minHeight: '44px' }}>
            <div className="d-flex flex-column align-items-center" style={{ width: '28px', flexShrink: 0 }}>
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center border-2 ${
                  isCompleted ? 'bg-success text-white border-success' :
                  isActive ? 'bg-primary text-white border-primary' :
                  'bg-light text-muted border-secondary border-opacity-25'
                }`}
                style={{ width: '28px', height: '28px', fontSize: '12px', borderStyle: 'solid', borderWidth: '2px', transition: 'all 0.3s ease' }}
              >
                {isCompleted ? <i className="fas fa-check" style={{ fontSize: '11px' }}></i> : <span className="fw-bold">{i + 1}</span>}
              </div>
              {i < TRANSFER_STEPS.length - 1 && (
                <div
                  style={{
                    width: '2px', height: '16px',
                    backgroundColor: isCompleted ? '#198754' : '#dee2e6',
                    transition: 'background-color 0.3s ease'
                  }}
                ></div>
              )}
            </div>
            <div className={`small pt-1 ${isActive ? 'fw-bold text-primary' : isCompleted ? 'fw-semibold text-success' : 'text-muted'}`}
              style={{ lineHeight: '1.3', transition: 'all 0.3s ease' }}>
              <i className={`fas ${step.icon} me-1`} style={{ fontSize: '11px', opacity: isPending ? 0.4 : 1 }}></i>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const CustomerVehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('garage'); // garage, transfers

  // Lists of requests
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [transfersLoading, setTransfersLoading] = useState(false);

  // Flow Controller
  const [transferMode, setTransferMode] = useState(false); // true if in transfer flow

  // Details Modal State
  const [selectedRequestDetail, setSelectedRequestDetail] = useState(null);

  // --- STATE FOR REGISTRATION FLOW (Flow A) ---
  const [regLicensePlate, setRegLicensePlate] = useState('');
  const [regBrand, setRegBrand] = useState('');
  const [regCustomBrand, setRegCustomBrand] = useState('');
  const [regModel, setRegModel] = useState('');
  const [regVehicleClass, setRegVehicleClass] = useState('');
  const [regFile, setRegFile] = useState(null);
  const [regImagePreviewUrl, setRegImagePreviewUrl] = useState(null);
  const [regUploadedImageUrl, setRegUploadedImageUrl] = useState(null);
  const [regOcrStatus, setRegOcrStatus] = useState(null); // 'checking', 'success', 'failed'
  const [regDetectedPlate, setRegDetectedPlate] = useState('');
  const [regOcrErrorMessage, setRegOcrErrorMessage] = useState(null);
  const [regShowOtp, setRegShowOtp] = useState(false);
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regOtpStatus, setRegOtpStatus] = useState(null); // 'sending', 'sent', 'failed'
  const [regOtpErrorMessage, setRegOtpErrorMessage] = useState(null);
  const [regOtpVerifying, setRegOtpVerifying] = useState(false);
  const [regStatusMessage, setRegStatusMessage] = useState(null);

  // --- STATE FOR TRANSFER FLOW (Flow B) ---
  const [transferLicensePlate, setTransferLicensePlate] = useState('');
  const [transferFile, setTransferFile] = useState(null);
  const [transferImagePreviewUrl, setTransferImagePreviewUrl] = useState(null);
  const [transferUploadedImageUrl, setTransferUploadedImageUrl] = useState(null);
  const [transferOcrStatus, setTransferOcrStatus] = useState(null); // 'checking', 'success', 'failed'
  const [transferDetectedPlate, setTransferDetectedPlate] = useState('');
  const [transferOcrErrorMessage, setTransferOcrErrorMessage] = useState(null);
  const [transferShowOtp, setTransferShowOtp] = useState(false);
  const [transferOtpCode, setTransferOtpCode] = useState('');
  const [transferOtpStatus, setTransferOtpStatus] = useState(null); // 'sending', 'sent', 'failed'
  const [transferOtpErrorMessage, setTransferOtpErrorMessage] = useState(null);
  const [transferOtpVerifying, setTransferOtpVerifying] = useState(false);
  const [transferVehicleInfo, setTransferVehicleInfo] = useState(null); // { brand, model, vehicleClass }
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [transferActiveRequestExists, setTransferActiveRequestExists] = useState(false);
  const [transferStatusMessage, setTransferStatusMessage] = useState(null);

  // Editing State
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editBrand, setEditBrand] = useState('');
  const [editCustomBrand, setEditCustomBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editVehicleClass, setEditVehicleClass] = useState('');

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/Customer/GetVehicles');
      if (response.data.success) {
        setVehicles(response.data.vehicles);
      }
    } catch (err) {
      console.error(err);
      setVehicles([]);
    }
  };

  const fetchTransfers = async () => {
    setTransfersLoading(true);
    try {
      const resSent = await api.get('/api/ownership-transfer/customer/sent');
      const resRecv = await api.get('/api/ownership-transfer/customer/received');
      
      if (resSent.data.success) setSentRequests(resSent.data.requests);
      if (resRecv.data.success) setReceivedRequests(resRecv.data.requests);
    } catch (err) {
      console.error(err);
    } finally {
      setTransfersLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchTransfers();

    // Auto-refresh every 5 seconds to keep lists in sync without manual refresh
    const interval = setInterval(() => {
      fetchVehicles();
      fetchTransfers();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'garage') {
      fetchVehicles();
    } else {
      fetchTransfers();
    }
  };

  const normalizePlate = (plate) =>
    plate.trim().toUpperCase().replace(/[\s\-.]/g, '');

  const checkPlateStatus = async (plate, source) => {
    if (!plate) return;
    try {
      const res = await api.get(`/api/ownership-transfer/check-plate?licensePlate=${plate}`);
      if (res.data.success) {
        if (res.data.exists && !res.data.isOwn) {
          // Duplicated plate belonging to someone else!
          setTransferLicensePlate(plate);
          setTransferVehicleInfo({
            brand: res.data.brand || '',
            model: res.data.model || '',
            vehicleClass: res.data.vehicleClass || ''
          });
          setTransferStatusMessage('This vehicle is already linked to another customer account.');
          setTransferMode(true);
        } else {
          // Non-duplicated or already owned plate
          if (source === 'transfer') {
            // Customer changed license plate to something not duplicated
            setRegLicensePlate(plate);
            setTransferMode(false);
            setTransferVehicleInfo(null);
            setTransferStatusMessage(null);
            if (res.data.exists && res.data.isOwn) {
              setRegStatusMessage('Bạn đã sở hữu phương tiện này rồi!');
            } else {
              setRegStatusMessage(null);
            }
          } else {
            if (res.data.exists && res.data.isOwn) {
              setRegStatusMessage('Bạn đã sở hữu phương tiện này rồi!');
            } else {
              setRegStatusMessage(null);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegPlateChange = (e) => {
    const val = e.target.value;
    setRegLicensePlate(val);
    if (val.length >= 7) {
      checkPlateStatus(val, 'reg');
    } else {
      setRegStatusMessage(null);
    }
  };

  const handleTransferPlateChange = (e) => {
    const val = e.target.value;
    setTransferLicensePlate(val);
    setTransferSuccess(false);
    if (val.length >= 7) {
      checkPlateStatus(val, 'transfer');
    } else {
      // Changed to too short -> switch back to registration flow
      setRegLicensePlate(val);
      setTransferMode(false);
      setTransferVehicleInfo(null);
      setTransferStatusMessage(null);
    }
  };

  const handleRegFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRegFile(file);
      setRegImagePreviewUrl(URL.createObjectURL(file));
      await runRegOcrVerification(file);
    }
  };

  const handleTransferFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTransferFile(file);
      setTransferImagePreviewUrl(URL.createObjectURL(file));
      await runTransferOcrVerification(file);
    }
  };

  const runRegOcrVerification = async (fileToUpload) => {
    const plateVal = regLicensePlate.trim();
    if (!plateVal) {
      if (window.showToast) {
        window.showToast('Vui lòng nhập biển số xe trước khi tải ảnh để đối chiếu OCR!', 'warning');
      }
      setRegFile(null);
      setRegImagePreviewUrl(null);
      const fileInput = document.getElementById('regCertificate');
      if (fileInput) fileInput.value = '';
      return;
    }

    setRegOcrStatus('checking');
    setRegOcrErrorMessage(null);
    setRegDetectedPlate('');
    setRegOtpStatus(null);
    setRegOtpErrorMessage(null);
    setRegShowOtp(false);
    setRegOtpCode('');

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const uploadResponse = await api.post('/api/ownership-transfer/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.message || 'Lỗi tải ảnh đăng ký xe!');
      }

      const imageUrl = uploadResponse.data.url;
      setRegUploadedImageUrl(imageUrl);

      const cleanPlate = normalizePlate(plateVal);
      const response = await api.post('/api/ownership-transfer/verify-image-ocr', {
        LicensePlate: cleanPlate,
        RegistrationImageUrl: imageUrl
      });

      const data = response.data;
      if (data.ocrVerified) {
        setRegOcrStatus('success');
        setRegDetectedPlate(data.detectedPlate || cleanPlate);

        if (data.otpSent) {
          setRegOtpStatus('sent');
          setRegStatusMessage(data.message || 'OCR Verification Passed. OTP sent to your email.');
          setRegShowOtp(true);
        } else {
          setRegOtpStatus('failed');
          setRegOtpErrorMessage(data.message || 'Unable to send OTP email. Please contact administrator.');
          setRegShowOtp(false);
        }
      } else {
        setRegOcrStatus('failed');
        setRegOcrErrorMessage(data.message || 'The license plate detected from the image does not match the entered plate.');
      }
    } catch (err) {
      setRegOcrStatus('failed');
      const errMsg = err.response?.data?.message || err.message || 'Lỗi xác minh OCR!';
      setRegOcrErrorMessage(errMsg);
      if (window.showToast) {
        window.showToast(errMsg, 'error');
      }
    }
  };

  const runTransferOcrVerification = async (fileToUpload) => {
    const plateVal = transferLicensePlate.trim();
    if (!plateVal) {
      if (window.showToast) {
        window.showToast('Vui lòng nhập biển số xe trước khi tải ảnh để đối chiếu OCR!', 'warning');
      }
      setTransferFile(null);
      setTransferImagePreviewUrl(null);
      const fileInput = document.getElementById('transferCertificate');
      if (fileInput) fileInput.value = '';
      return;
    }

    setTransferOcrStatus('checking');
    setTransferOcrErrorMessage(null);
    setTransferDetectedPlate('');
    setTransferOtpStatus(null);
    setTransferOtpErrorMessage(null);
    setTransferShowOtp(false);
    setTransferOtpCode('');
    setTransferSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const uploadResponse = await api.post('/api/ownership-transfer/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.message || 'Lỗi tải ảnh đăng ký xe!');
      }

      const imageUrl = uploadResponse.data.url;
      setTransferUploadedImageUrl(imageUrl);

      const cleanPlate = normalizePlate(plateVal);
      const response = await api.post('/api/ownership-transfer/verify-image-ocr', {
        LicensePlate: cleanPlate,
        RegistrationImageUrl: imageUrl
      });

      const data = response.data;
      if (data.ocrVerified) {
        setTransferOcrStatus('success');
        setTransferDetectedPlate(data.detectedPlate || cleanPlate);
        setTransferActiveRequestExists(data.activeRequestExists);

        // Keep transfer mode active and preserve vehicle details
        if (data.brand || data.model || data.vehicleClass) {
          setTransferVehicleInfo({
            brand: data.brand || '',
            model: data.model || '',
            vehicleClass: data.vehicleClass || ''
          });
        }
      } else {
        setTransferOcrStatus('failed');
        setTransferOcrErrorMessage(data.message || 'The license plate detected from the image does not match the entered plate.');
      }
    } catch (err) {
      setTransferOcrStatus('failed');
      const errMsg = err.response?.data?.message || err.message || 'Lỗi xác minh OCR!';
      setTransferOcrErrorMessage(errMsg);
      if (window.showToast) {
        window.showToast(errMsg, 'error');
      }
    }
  };

  const handleRequestTransferOtp = async () => {
    const cleanPlate = normalizePlate(transferLicensePlate);
    setTransferOtpStatus('sending');
    setTransferOtpErrorMessage(null);
    try {
      const response = await api.post('/api/ownership-transfer/request-otp', {
        LicensePlate: cleanPlate
      });

      if (response.data.success) {
        setTransferOtpStatus('sent');
        setTransferStatusMessage(response.data.message || 'Mã OTP đã được gửi đến email của bạn.');
        setTransferShowOtp(true);
      }
    } catch (err) {
      setTransferOtpStatus('failed');
      const errMsg = err.response?.data?.message || err.message || 'Lỗi gửi mã OTP chuyển nhượng!';
      setTransferOtpErrorMessage(errMsg);
      if (window.showToast) {
        window.showToast(errMsg, 'error');
      }
    }
  };

  const handleRetryRegOcr = async () => {
    if (regFile) {
      await runRegOcrVerification(regFile);
    } else {
      if (window.showToast) {
        window.showToast('Vui lòng chọn ảnh đăng ký xe trước!', 'warning');
      }
    }
  };

  const handleRetryTransferOcr = async () => {
    if (transferFile) {
      await runTransferOcrVerification(transferFile);
    } else {
      if (window.showToast) {
        window.showToast('Vui lòng chọn ảnh đăng ký xe trước!', 'warning');
      }
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!regFile) {
      if (window.showToast) {
        window.showToast('Vui lòng chọn ảnh đăng ký xe để xác minh OCR!', 'warning');
      }
      return;
    }

    if (regOcrStatus !== 'success') {
      await runRegOcrVerification(regFile);
      return;
    }

    setRegShowOtp(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();

    if (!transferFile) {
      if (window.showToast) {
        window.showToast('Vui lòng chọn ảnh đăng ký xe để xác minh OCR!', 'warning');
      }
      return;
    }

    if (transferOcrStatus !== 'success') {
      await runTransferOcrVerification(transferFile);
      return;
    }

    if (!transferActiveRequestExists) {
      await handleRequestTransferOtp();
    }
  };

  const handleOtpVerifyAndRegister = async (e) => {
    if (e) e.preventDefault();

    if (!regOtpCode) {
      if (window.showToast) {
        window.showToast('Vui lòng nhập mã OTP!', 'warning');
      }
      return;
    }

    const cleanPlate = normalizePlate(regLicensePlate);
    const finalBrand = regBrand === 'Khác' ? regCustomBrand : regBrand;

    setRegOtpVerifying(true);
    try {
      const response = await api.post('/api/ownership-transfer/register', {
        LicensePlate: cleanPlate,
        Brand: finalBrand,
        Model: regModel.trim(),
        VehicleClass: regVehicleClass,
        RegistrationImageUrl: regUploadedImageUrl,
        OtpCode: regOtpCode
      });

      if (response.data.success) {
        if (window.showToast) {
          window.showToast('Đăng ký phương tiện mới thành công!', 'success');
        }
        resetForm();
        fetchVehicles();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Xác thực OTP thất bại!';
      if (window.showToast) {
        window.showToast(errMsg, 'error');
      }
    } finally {
      setRegOtpVerifying(false);
    }
  };

  const handleTransferOtpVerifyAndSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!transferOtpCode) {
      if (window.showToast) {
        window.showToast('Vui lòng nhập mã OTP!', 'warning');
      }
      return;
    }

    const cleanPlate = normalizePlate(transferLicensePlate);

    setTransferOtpVerifying(true);
    try {
      const response = await api.post('/api/ownership-transfer/request', {
        LicensePlate: cleanPlate,
        RegistrationImageUrl: transferUploadedImageUrl,
        Reason: `Yêu cầu chuyển nhượng xe ${cleanPlate}`,
        OtpCode: transferOtpCode
      });

      if (response.data.success) {
        setTransferSuccess(true);
        setTransferShowOtp(false);
        if (window.showToast) {
          window.showToast('Gửi yêu cầu chuyển nhượng thành công!', 'success');
        }
        fetchTransfers();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Xác thực OTP thất bại!';
      if (window.showToast) {
        window.showToast(errMsg, 'error');
      }
    } finally {
      setTransferOtpVerifying(false);
    }
  };

  const handleCancelTransfer = () => {
    resetForm();
  };

  const resetForm = () => {
    // Reset Registration States
    setRegLicensePlate('');
    setRegBrand('');
    setRegCustomBrand('');
    setRegModel('');
    setRegVehicleClass('');
    setRegFile(null);
    setRegImagePreviewUrl(null);
    setRegUploadedImageUrl(null);
    setRegOcrStatus(null);
    setRegDetectedPlate('');
    setRegOcrErrorMessage(null);
    setRegShowOtp(false);
    setRegOtpCode('');
    setRegOtpStatus(null);
    setRegOtpErrorMessage(null);
    setRegOtpVerifying(false);
    setRegStatusMessage(null);

    // Reset Transfer States
    setTransferLicensePlate('');
    setTransferFile(null);
    setTransferImagePreviewUrl(null);
    setTransferUploadedImageUrl(null);
    setTransferOcrStatus(null);
    setTransferDetectedPlate('');
    setTransferOcrErrorMessage(null);
    setTransferShowOtp(false);
    setTransferOtpCode('');
    setTransferOtpStatus(null);
    setTransferOtpErrorMessage(null);
    setTransferOtpVerifying(false);
    setTransferVehicleInfo(null);
    setTransferSuccess(false);
    setTransferActiveRequestExists(false);
    setTransferStatusMessage(null);

    // Reset flow controller
    setTransferMode(false);
    
    // Reset file input elements
    const regFileInput = document.getElementById('regCertificate');
    if (regFileInput) regFileInput.value = '';
    const transferFileInput = document.getElementById('transferCertificate');
    if (transferFileInput) transferFileInput.value = '';
  };

  const handleEditClick = (vehicle) => {
    setEditingVehicle(vehicle);
    const isPredefined = BRANDS.includes(vehicle.brand);
    if (isPredefined && vehicle.brand !== 'Khác') {
      setEditBrand(vehicle.brand);
      setEditCustomBrand('');
    } else {
      setEditBrand('Khác');
      setEditCustomBrand(vehicle.brand || '');
    }
    setEditModel(vehicle.model || '');
    setEditVehicleClass(vehicle.vehicleClass || '');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingVehicle) return;

    if (!editBrand || !editModel.trim() || !editVehicleClass) {
      if (window.showToast) {
        window.showToast('Vui lòng nhập đầy đủ thông tin phương tiện.', 'warning');
      }
      return;
    }

    const finalBrand = editBrand === 'Khác' ? editCustomBrand.trim() : editBrand;

    setLoading(true);
    try {
      const response = await api.put(`/api/vehicle/${editingVehicle.vehicleId}`, {
        Brand: finalBrand,
        Model: editModel.trim(),
        VehicleClass: editVehicleClass
      });
      if (response.data.success) {
        if (window.showToast) {
          window.showToast('Cập nhật phương tiện thành công!', 'success');
        }
        setEditingVehicle(null);
        fetchVehicles();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra!';
      if (window.showToast) {
        window.showToast(errMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = (vehicleId) => {
    const performDelete = async () => {
      try {
        const response = await api.delete(`/api/vehicle/${vehicleId}`);
        if (response.data.success) {
          if (window.showToast) {
            window.showToast('Xoá phương tiện thành công!', 'success');
          }
          fetchVehicles();
        }
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Không thể xóa phương tiện!';
        if (window.showToast) {
          window.showToast(errMsg, 'error');
        }
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Xóa phương tiện', 'Bạn có chắc muốn xóa phương tiện này?', performDelete);
    } else if (window.confirm('Bạn có chắc muốn xóa phương tiện này?')) {
      performDelete();
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      const response = await api.post(`/api/ownership-transfer/${requestId}/cancel`);
      if (response.data.success) {
        if (window.showToast) {
          window.showToast('Đã hủy yêu cầu chuyển nhượng thành công!', 'success');
        }
        fetchTransfers();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Không thể hủy yêu cầu này!';
      if (window.showToast) {
        window.showToast(errMsg, 'error');
      }
    }
  };

  const handleOwnerDecision = async (requestId, decision) => {
    const actionText = decision === 'Approve' ? 'đồng ý chuyển quyền sở hữu' : 'từ chối bàn giao xe';
    const performDecision = async () => {
      try {
        const response = await api.post(`/api/ownership-transfer/${requestId}/owner-decision`, {
          Decision: decision
        });
        if (response.data.success) {
          if (window.showToast) {
            window.showToast('Phản hồi yêu cầu thành công!', 'success');
          }
          setSelectedRequestDetail(null); // Close modal if open
          fetchTransfers();
        }
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Có lỗi xảy ra!';
        if (window.showToast) {
          window.showToast(errMsg, 'error');
        }
      }
    };

    const explanation = "\n\n⚠️ Sau khi bạn đồng ý bàn giao, Ban quản trị Admin sẽ tiến hành kiểm tra giấy đăng ký xe mới được tải lên để hoàn tất chuyển nhượng quyền sở hữu.";

    if (window.showConfirm) {
      window.showConfirm(
        'Xác nhận quyết định chuyển quyền sở hữu',
        `Bạn có chắc chắn muốn ${actionText} xe này không?${decision === 'Approve' ? explanation : ''}`,
        performDecision
      );
    } else if (window.confirm(`Bạn có chắc chắn muốn ${actionText} xe này không?${decision === 'Approve' ? explanation : ''}`)) {
      performDecision();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
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

  const getRequestStatusBadgeClass = (status) => {
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

  const getRequestStatusText = (status) => {
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

  // Helper to render inline timeline inside sent/received card
  const renderRequestTimeline = (r) => {
    const steps = [];
    
    // Step 1: Created
    steps.push({
      title: 'Yêu cầu được tạo',
      done: true,
      active: r.status === 'PendingOwnerConfirmation',
      icon: 'fa-file-invoice'
    });

    // Step 2: Owner Confirmation
    let ownerDone = ['PendingAdminApproval', 'PendingAdminReview', 'Approved', 'Rejected'].includes(r.status);
    let ownerActive = r.status === 'PendingOwnerConfirmation';
    
    steps.push({
      title: r.ownerDecision === 'Rejected' ? 'Chủ xe từ chối' : 'Chủ xe xác nhận',
      done: ownerDone,
      active: ownerActive,
      icon: r.ownerDecision === 'Rejected' ? 'fa-user-times text-danger' : 'fa-user-check'
    });

    // Step 3: Admin Approval
    let adminDone = ['Approved', 'Rejected'].includes(r.status);
    let adminActive = ['PendingAdminApproval', 'PendingAdminReview'].includes(r.status);

    steps.push({
      title: r.status === 'Rejected' && r.ownerDecision === 'Approved' ? 'Admin từ chối' : 'Admin duyệt',
      done: adminDone,
      active: adminActive,
      icon: r.status === 'Rejected' && r.ownerDecision === 'Approved' ? 'fa-shield-alt text-danger' : 'fa-shield-alt'
    });

    // Step 4: Completed
    let compDone = r.status === 'Approved';

    steps.push({
      title: 'Hoàn tất',
      done: compDone,
      active: false,
      icon: 'fa-check-double'
    });

    return (
      <div className="request-card-timeline mt-3 pt-3 border-top">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          {steps.map((s, idx) => (
            <div key={idx} className="d-flex align-items-center gap-1.5 flex-grow-1" style={{ minWidth: '130px' }}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center ${
                s.done ? 'bg-success text-white' :
                s.active ? 'bg-warning text-dark font-bold' :
                'bg-light text-muted'
              }`} style={{ width: '22px', height: '22px', fontSize: '10px' }}>
                <i className={`fas ${s.icon}`}></i>
              </div>
              <div className="text-start">
                <span className="text-dark fw-semibold" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>{s.title}</span>
              </div>
              {idx < 3 && <div className="flex-grow-1 d-none d-md-block border-top" style={{ borderTopStyle: 'dashed', opacity: 0.3 }}></div>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // =============================================
  // RENDER: Transfer Mode Form
  // =============================================
  const renderTransferForm = () => {
    if (transferSuccess) {
      return (
        <div className="border-top pt-4">
          <div className="p-4 rounded-4 border border-success border-opacity-20 bg-success bg-opacity-5 text-start animate-up shadow-sm">
            <div className="text-center mb-4">
              <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-15 mb-3"
                style={{ width: '56px', height: '56px' }}>
                <i className="fas fa-check-circle text-success" style={{ fontSize: '28px' }}></i>
              </div>
              <h5 className="fw-bold text-success mb-1">Transfer Request Submitted</h5>
              <p className="text-muted small mb-0">
                Trạng thái: <strong className="text-warning">Chờ chủ xe hiện tại xác nhận</strong>
              </p>
              <p className="text-secondary mt-1" style={{ fontSize: '12px' }}>
                Chủ sở hữu hiện tại đã được gửi email thông báo.
              </p>
            </div>

            {/* Compact Success Card Timeline */}
            <div className="p-3 bg-white rounded-3 border mb-4 shadow-xs">
              <div className="text-xs fw-bold text-secondary mb-3"><i className="fas fa-route me-1"></i> TIẾN TRÌNH YÊU CẦU:</div>
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '11px' }}>✔</div>
                  <div className="small fw-semibold text-success">Xác minh OCR đăng ký xe</div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '11px' }}>✔</div>
                  <div className="small fw-semibold text-success">Xác minh Email OTP</div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '11px' }}>✔</div>
                  <div className="small fw-semibold text-success">Tạo yêu cầu chuyển nhượng thành công</div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle bg-warning text-dark fw-bold d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '11px' }}>●</div>
                  <div className="small fw-bold text-dark">Đang chờ chủ xe duyệt bàn giao</div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle bg-light text-muted d-flex align-items-center justify-content-center border" style={{ width: '24px', height: '24px', fontSize: '11px' }}>○</div>
                  <div className="small text-muted">Chờ Admin phê duyệt hồ sơ</div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle bg-light text-muted d-flex align-items-center justify-content-center border" style={{ width: '24px', height: '24px', fontSize: '11px' }}>○</div>
                  <div className="small text-muted">Hoàn tất bàn giao sở hữu</div>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 justify-content-center">
              <button
                type="button"
                className="btn btn-outline-secondary px-3 py-2 rounded-3 fw-bold border-1 font-sans text-sm"
                onClick={() => { resetForm(); }}
              >
                Đăng ký xe khác
              </button>
              <button
                type="button"
                className="app-btn-primary px-4 py-2 text-dark fw-bold shadow-none text-sm"
                style={{ borderRadius: '12px' }}
                onClick={() => handleTabChange('transfers')}
              >
                <i className="fas fa-list me-1"></i> Xem danh sách yêu cầu
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="border-top pt-4">
        <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: 'var(--navy-dark)' }}>
          <i className="fas fa-exchange-alt text-warning"></i>
          Yêu cầu chuyển quyền sở hữu xe
        </h6>

        {/* Transfer Progress Timeline Info Card */}
        <div className="p-4 rounded-4 border border-warning border-opacity-10 bg-warning bg-opacity-5 mb-3 text-start shadow-xs">
          <h6 className="fw-bold text-dark mb-3" style={{ fontSize: '0.9rem' }}><i className="fas fa-exclamation-triangle text-warning me-1.5"></i> QUY TRÌNH CHUYỂN QUYỀN SỞ HỮU (TRANSFER PROCESS)</h6>
          <div className="row g-3">
            <div className="col-sm-6 col-md-4">
              <div className="d-flex align-items-center gap-2">
                <span className="text-success fw-bold">✔</span>
                <span className="small text-secondary">OCR Verification</span>
              </div>
            </div>
            <div className="col-sm-6 col-md-4">
              <div className="d-flex align-items-center gap-2">
                <span className="text-success fw-bold">✔</span>
                <span className="small text-secondary">OTP Verification</span>
              </div>
            </div>
            <div className="col-sm-6 col-md-4">
              <div className="d-flex align-items-center gap-2">
                <span className="text-success fw-bold">✔</span>
                <span className="small text-secondary">Create Request</span>
              </div>
            </div>
            <div className="col-sm-6 col-md-4">
              <div className="d-flex align-items-center gap-2">
                <span className="text-success fw-bold">✔</span>
                <span className="small text-secondary">Owner Confirmation</span>
              </div>
            </div>
            <div className="col-sm-6 col-md-4">
              <div className="d-flex align-items-center gap-2">
                <span className="text-success fw-bold">✔</span>
                <span className="small text-secondary">Admin Approval</span>
              </div>
            </div>
            <div className="col-sm-6 col-md-4">
              <div className="d-flex align-items-center gap-2">
                <span className="text-success fw-bold">✔</span>
                <span className="small text-secondary">Ownership Completed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Stepper */}
        <TransferStepper currentStep={getTransferStep()} />

        {/* Existing Vehicle Info Card (Readonly) */}
        {transferVehicleInfo && (
          <div className="p-3.5 rounded-4 border bg-light bg-opacity-40 mb-3 text-start animate-up shadow-xs">
            <div className="small fw-bold text-secondary mb-2.5">
              <i className="fas fa-car me-1"></i> THÔNG TIN PHƯƠNG TIỆN HIỆN TẠI (READONLY CARD)
            </div>
            <div className="row g-2">
              <div className="col-6 col-sm-4">
                <small className="text-muted d-block">Hãng xe</small>
                <strong className="text-dark text-sm">{transferVehicleInfo.brand || 'N/A'}</strong>
              </div>
              <div className="col-6 col-sm-4">
                <small className="text-muted d-block">Model</small>
                <strong className="text-dark text-sm">{transferVehicleInfo.model || 'N/A'}</strong>
              </div>
              <div className="col-6 col-sm-4">
                <small className="text-muted d-block">Phân khúc xe</small>
                <strong className="text-dark text-sm">{transferVehicleInfo.vehicleClass || 'N/A'}</strong>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleTransferSubmit}>
          {/* License Plate - full width in transfer mode */}
          <div className="mb-3 text-start">
            <label className="form-label small fw-bold text-muted">BIỂN SỐ XE *</label>
            <input
              type="text"
              className="form-control py-2.5 font-monospace uppercase fw-bold"
              placeholder="Ví dụ: 51H-888.88"
              value={transferLicensePlate}
              onChange={handleTransferPlateChange}
              required
            />
          </div>

          {/* Registration Certificate Upload */}
          <div className="mb-3 text-start">
            <label className="form-label small fw-bold text-muted">GIẤY ĐĂNG KÝ XE (OCR XÁC MINH) *</label>
            <input
              type="file"
              className="form-control py-2.5"
              id="transferCertificate"
              accept="image/*"
              onChange={handleTransferFileChange}
              required
            />
            <small className="text-secondary mt-1 d-block text-xs">
              Tải lên hình ảnh giấy tờ xe để OCR tự động kiểm tra biển số. (Hỗ trợ định dạng ảnh JPG, PNG).
            </small>
          </div>

          {/* Image Preview */}
          {transferImagePreviewUrl && (
            <div className="mb-3 text-start animate-up">
              <label className="form-label small fw-bold text-muted d-block font-sans">ẢNH ĐĂNG KÝ XE ĐÃ TẢI LÊN</label>
              <div className="position-relative d-inline-block rounded-4 overflow-hidden border shadow-sm" style={{ maxWidth: '240px' }}>
                <img src={transferImagePreviewUrl} alt="Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            </div>
          )}

          {/* OCR Status */}
          {transferOcrStatus && (
            <div className="mb-3 text-start animate-up">
              <div className={`p-3 rounded-4 d-flex align-items-center justify-content-between ${
                transferOcrStatus === 'checking' ? 'bg-light text-secondary border' :
                transferOcrStatus === 'success' ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-20' :
                'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20'
              }`}>
                <div className="d-flex align-items-center gap-2">
                  {transferOcrStatus === 'checking' && (
                    <>
                      <span className="spinner-border spinner-border-sm text-secondary" role="status"></span>
                      <span className="fw-semibold">Checking...</span>
                    </>
                  )}
                  {transferOcrStatus === 'success' && (
                    <span className="fw-bold">✔ Registration document verified</span>
                  )}
                  {transferOcrStatus === 'failed' && (
                    <span className="fw-bold">❌ OCR Verification Failed</span>
                  )}
                </div>
                {transferDetectedPlate && transferOcrStatus === 'success' && (
                  <div className="small">
                    <strong>Detected Plate:</strong> <span className="font-monospace fw-bold bg-white px-2 py-1 rounded border shadow-sm">{transferDetectedPlate}</span>
                  </div>
                )}
              </div>
              {transferOcrStatus === 'failed' && transferOcrErrorMessage && (
                <div className="text-danger small mt-2 ps-1 d-flex justify-content-between align-items-center">
                  <div>
                    <i className="fas fa-exclamation-circle me-1"></i>{transferOcrErrorMessage}
                  </div>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-danger py-1 px-2.5 rounded-3 fw-bold border-1 ms-2"
                    onClick={handleRetryTransferOcr}
                  >
                    <i className="fas fa-redo me-1"></i>Thử lại OCR
                  </button>
                </div>
              )}
            </div>
          )}

          {/* OTP Failed Status */}
          {transferOtpStatus === 'failed' && (
            <div className="mb-3 text-start animate-up">
              <div className="p-3 rounded-4 bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20 d-flex justify-content-between align-items-center small">
                <div>
                  <div className="fw-bold">❌ Failed to send OTP email.</div>
                  <div className="mt-1 font-sans" style={{ fontSize: '0.85rem' }}>Please check email configuration.</div>
                  {transferOtpErrorMessage && (
                    <div className="mt-2 font-monospace text-xs text-muted" style={{ opacity: 0.8 }}>
                      {transferOtpErrorMessage}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-xs btn-outline-danger py-1 px-2.5 rounded-3 fw-bold border-1 ms-2"
                  onClick={handleRetryTransferOcr}
                  title="Thử lại gửi OTP"
                >
                  <i className="fas fa-redo me-1"></i>Thử lại
                </button>
              </div>
            </div>
          )}

          {/* OTP Verification Section for Transfer */}
          {transferShowOtp && (
            <div className="mb-4 p-4 border border-info border-opacity-20 bg-info bg-opacity-5 rounded-4 animate-up text-start">
              <h6 className="fw-bold text-info mb-2">
                <i className="fas fa-envelope-open-text me-2"></i>MÃ XÁC THỰC OTP
              </h6>
              <p className="small text-muted mb-3 font-sans">
                Chúng tôi đã gửi mã OTP gồm 6 chữ số đến email đăng ký của bạn. Vui lòng nhập mã dưới đây để gửi yêu cầu chuyển quyền sở hữu.
              </p>
              <div className="row g-2 align-items-end">
                <div className="col-md-8">
                  <label className="form-label small fw-bold text-muted">NHẬP MÃ OTP *</label>
                  <input
                    type="text"
                    className="form-control py-2.5 font-monospace text-center fw-bold"
                    maxLength={6}
                    placeholder="XXXXXX"
                    value={transferOtpCode}
                    onChange={(e) => setTransferOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <button
                    type="button"
                    disabled={transferOtpVerifying}
                    className="btn btn-warning py-2.5 w-100 shadow-none text-dark fw-bold text-sm"
                    style={{ borderRadius: '12px' }}
                    onClick={handleTransferOtpVerifyAndSubmit}
                  >
                    {transferOtpVerifying ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        ĐANG XÁC THỰC...
                      </>
                    ) : (
                      'XÁC NHẬN OTP'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Request Warning */}
          {transferOcrStatus === 'success' && transferActiveRequestExists && (
            <div className="mb-3 p-3 rounded-4 bg-secondary bg-opacity-10 border border-secondary border-opacity-20 text-start animate-up">
              <div className="small text-muted">
                <i className="fas fa-info-circle me-1"></i>
                An ownership transfer request for this vehicle is already being processed.
              </div>
            </div>
          )}

          {/* Transfer Mode Primary Buttons */}
          {transferOcrStatus === 'success' && !transferShowOtp && !transferActiveRequestExists && (
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-secondary py-2 px-3 rounded-3 text-sm fw-bold border-0 font-sans"
                style={{ backgroundColor: '#e2e8f0', color: '#475569' }}
                onClick={handleCancelTransfer}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={transferOtpStatus === 'sending'}
                className="btn btn-warning text-dark fw-bold border-0 font-sans flex-grow-1 text-sm"
                style={{ borderRadius: '12px', padding: '10px 20px' }}
                onClick={handleRequestTransferOtp}
              >
                {transferOtpStatus === 'sending' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Đang gửi OTP...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane me-2"></i>
                    GỬI YÊU CẦU CHUYỂN QUYỀN
                  </>
                )}
              </button>
            </div>
          )}

          {/* Pre-OCR submit button */}
          {transferOcrStatus !== 'success' && (
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-secondary py-2 px-3 rounded-3 text-sm fw-bold border-0 font-sans"
                style={{ backgroundColor: '#e2e8f0', color: '#475569' }}
                onClick={handleCancelTransfer}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={transferOcrStatus === 'checking'}
                className="btn btn-warning py-2.5 shadow-none text-dark fw-bold flex-grow-1 text-sm"
                style={{ borderRadius: '12px' }}
              >
                {transferOcrStatus === 'checking' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ĐANG XÁC MINH OCR...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane me-2"></i>
                    GỬI YÊU CẦU CHUYỂN QUYỀN
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    );
  };

  // =============================================
  // RENDER: Registration Mode Form
  // =============================================
  const renderRegistrationForm = () => (
    <div className="border-top pt-4">
      <h6 className="fw-bold mb-3" style={{ color: 'var(--navy-dark)' }}>
        Đăng ký phương tiện mới
      </h6>

      {regStatusMessage && (
        <div className="alert py-2.5 small mb-3 alert-info">
          <i className="fas fa-info-circle me-2"></i>
          {regStatusMessage}
        </div>
      )}

      <form onSubmit={handleRegisterSubmit}>
        <div className="row g-2 mb-3">
          <div className="col-md-6 text-start">
            <label className="form-label small fw-bold text-muted">BIỂN SỐ XE *</label>
            <input
              type="text"
              className="form-control py-2.5 font-monospace uppercase fw-bold"
              placeholder="Ví dụ: 51H-888.88"
              value={regLicensePlate}
              onChange={handleRegPlateChange}
              required
            />
          </div>
          
          <div className="col-md-6 text-start">
            <label className="form-label small fw-bold text-muted">HÃNG XE *</label>
            <select
              className="form-select py-2.5"
              value={regBrand}
              onChange={(e) => {
                setRegBrand(e.target.value);
                if (e.target.value !== 'Khác') setRegCustomBrand('');
              }}
              required
            >
              <option value="">-- Chọn hãng xe --</option>
              {BRANDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {regBrand === 'Khác' && (
          <div className="mb-3 text-start animate-up">
            <label className="form-label small fw-bold text-muted">NHẬP HÃNG XE *</label>
            <input
              type="text"
              className="form-control py-2.5"
              placeholder="Ví dụ: Rolls-Royce"
              value={regCustomBrand}
              onChange={(e) => setRegCustomBrand(e.target.value)}
              required
            />
          </div>
        )}

        <div className="row g-2 mb-3">
          <div className="col-md-6 text-start">
            <label className="form-label small fw-bold text-muted">MODEL XE *</label>
            <input
              type="text"
              className="form-control py-2.5"
              placeholder="Ví dụ: Vios, CX5"
              value={regModel}
              onChange={(e) => setRegModel(e.target.value)}
              required
            />
          </div>
          <div className="col-md-6 text-start">
            <label className="form-label small fw-bold text-muted">LOẠI XE *</label>
            <select
              className="form-select py-2.5"
              value={regVehicleClass}
              onChange={(e) => setRegVehicleClass(e.target.value)}
              required
            >
              <option value="">-- Chọn loại xe --</option>
              {VEHICLE_CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3 text-start">
          <label className="form-label small fw-bold text-muted">GIẤY ĐĂNG KÝ XE (OCR XÁC MINH) *</label>
          <input
            type="file"
            className="form-control py-2.5"
            id="regCertificate"
            accept="image/*"
            onChange={handleRegFileChange}
            required
          />
          <small className="text-secondary mt-1 d-block text-xs">
            Tải lên hình ảnh giấy tờ xe để OCR tự động kiểm tra biển số. (Hỗ trợ định dạng ảnh JPG, PNG).
          </small>
        </div>

        {/* Uploaded Image Preview */}
        {regImagePreviewUrl && (
          <div className="mb-3 text-start animate-up">
            <label className="form-label small fw-bold text-muted d-block font-sans">ẢNH ĐĂNG KÝ XE ĐÃ TẢI LÊN</label>
            <div className="position-relative d-inline-block rounded-4 overflow-hidden border shadow-sm" style={{ maxWidth: '240px' }}>
              <img src={regImagePreviewUrl} alt="Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          </div>
        )}

        {/* OCR Status Badge */}
        {regOcrStatus && (
          <div className="mb-3 text-start animate-up">
            <div className={`p-3 rounded-4 d-flex align-items-center justify-content-between ${
              regOcrStatus === 'checking' ? 'bg-light text-secondary border' :
              regOcrStatus === 'success' ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-20' :
              'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20'
            }`}>
              <div className="d-flex align-items-center gap-2">
                {regOcrStatus === 'checking' && (
                  <>
                    <span className="spinner-border spinner-border-sm text-secondary" role="status"></span>
                    <span className="fw-semibold">Checking...</span>
                  </>
                )}
                {regOcrStatus === 'success' && (
                  <span className="fw-bold">✔ Registration document verified</span>
                )}
                {regOcrStatus === 'failed' && (
                  <span className="fw-bold">❌ OCR Verification Failed</span>
                )}
              </div>
              {regDetectedPlate && (
                <div className="small">
                  <strong>Detected Plate:</strong> <span className="font-monospace fw-bold bg-white px-2 py-1 rounded border shadow-sm">{regDetectedPlate}</span>
                </div>
              )}
            </div>
            {regOcrStatus === 'failed' && regOcrErrorMessage && (
              <div className="text-danger small mt-2 ps-1 d-flex justify-content-between align-items-center">
                <div>
                  <i className="fas fa-exclamation-circle me-1"></i>{regOcrErrorMessage}
                </div>
                <button
                  type="button"
                  className="btn btn-xs btn-outline-danger py-1 px-2.5 rounded-3 fw-bold border-1 ms-2"
                  onClick={handleRetryRegOcr}
                >
                  <i className="fas fa-redo me-1"></i>Thử lại OCR
                </button>
              </div>
            )}
          </div>
        )}

        {/* OTP Sending / Status Display */}
        {regOtpStatus === 'failed' && (
          <div className="mb-3 text-start animate-up">
            <div className="p-3 rounded-4 bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20 d-flex justify-content-between align-items-center small">
              <div>
                <div className="fw-bold">❌ Failed to send OTP email.</div>
                <div className="mt-1 font-sans" style={{ fontSize: '0.85rem' }}>Please check email configuration.</div>
                {regOtpErrorMessage && (
                  <div className="mt-2 font-monospace text-xs text-muted" style={{ opacity: 0.8 }}>
                    {regOtpErrorMessage}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-xs btn-outline-danger py-1 px-2.5 rounded-3 fw-bold border-1 ms-2"
                onClick={handleRetryRegOcr}
                title="Thử lại gửi OTP"
              >
                <i className="fas fa-redo me-1"></i>Thử lại
              </button>
            </div>
          </div>
        )}

        {/* OTP Verification Section */}
        {regShowOtp && (
          <div className="mb-4 p-4 border border-info border-opacity-20 bg-info bg-opacity-5 rounded-4 animate-up text-start">
            <h6 className="fw-bold text-info mb-2">
              <i className="fas fa-envelope-open-text me-2"></i>MÃ XÁC THỰC OTP
            </h6>
            <p className="small text-muted mb-3 font-sans">
              Chúng tôi đã gửi mã OTP gồm 6 chữ số đến email đăng ký của bạn. Vui lòng nhập mã dưới đây để hoàn tất đăng ký phương tiện.
            </p>
            <div className="row g-2 align-items-end">
              <div className="col-md-8">
                <label className="form-label small fw-bold text-muted">NHẬP MÃ OTP *</label>
                <input
                  type="text"
                  className="form-control py-2.5 font-monospace text-center fw-bold"
                  maxLength={6}
                  placeholder="XXXXXX"
                  value={regOtpCode}
                  onChange={(e) => setRegOtpCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <div className="col-md-4">
                <button
                  type="button"
                  disabled={regOtpVerifying}
                  className="app-btn-primary py-2.5 w-100 shadow-none text-dark fw-bold text-sm"
                  style={{ borderRadius: '12px' }}
                  onClick={handleOtpVerifyAndRegister}
                >
                  {regOtpVerifying ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      ĐANG XÁC THỰC...
                    </>
                  ) : (
                    'XÁC NHẬN OTP'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Button */}
        {(regOcrStatus !== 'success' || regOtpStatus === 'failed') && (
          <div className="d-flex gap-2">
            <button
              type="submit"
              disabled={regOcrStatus === 'checking'}
              className="app-btn-primary py-2.5 shadow-none text-dark fw-bold w-100 text-sm"
              style={{ borderRadius: '12px' }}
            >
              {regOcrStatus === 'checking' ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  ĐANG XÁC MINH OCR...
                </>
              ) : (
                'GỬI XÁC MINH & ĐĂNG KÝ XE'
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );

  return (
    <div className="container-fluid py-4 text-start">
      {/* Title */}
      <div className="row justify-content-center mb-4">
        <div className="col-lg-8">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="fw-bold mb-0 text-dark" style={{ fontFamily: 'Outfit, sans-serif' }}>Garage Phương Tiện</h4>
            <div className="d-flex gap-2">
              <button
                className={`btn btn-sm px-3 rounded-3 fw-bold border-0 ${activeTab === 'garage' ? 'app-btn-primary text-dark' : 'btn-light text-muted'}`}
                onClick={() => handleTabChange('garage')}
              >
                Phương tiện của tôi
              </button>
              <button
                className={`btn btn-sm px-3 rounded-3 fw-bold border-0 ${activeTab === 'transfers' ? 'app-btn-primary text-dark' : 'btn-light text-muted'}`}
                onClick={() => handleTabChange('transfers')}
              >
                Yêu cầu chuyển quyền
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'garage' ? (
        <div className="row justify-content-center">
          <div className="col-lg-8">
            {/* Garage Card */}
            <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
              <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
                <i className="fas fa-car-side text-cyan me-2"></i>GARAGE XE ĐÃ ĐĂNG KÝ
              </h5>

              <div className="d-flex flex-column gap-3 mb-4">
                {vehicles.length === 0 ? (
                  <div className="text-center py-5 text-muted small bg-light rounded-4 border border-dashed animate-fade">
                    <i className="fas fa-car-side fa-2x mb-3 text-secondary" style={{ opacity: 0.5 }}></i>
                    <div>Bạn chưa đăng ký phương tiện nào.</div>
                  </div>
                ) : (
                  vehicles.map((v, i) => (
                    <div key={v.vehicleId || i} className="d-flex justify-content-between align-items-center p-3 border border-light rounded-4 bg-light bg-opacity-30 position-relative hover-scale shadow-xs">
                      <div className="d-flex align-items-center gap-3">
                        <div className="rounded-3 d-flex align-items-center justify-content-center bg-white border shadow-xs" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
                          <i className="fas fa-car text-muted" style={{ fontSize: '1.2rem' }}></i>
                        </div>
                        <div className="text-start">
                          <div className="fw-bold d-flex align-items-center gap-2" style={{ color: 'var(--navy-dark)', fontSize: '0.98rem' }}>
                            🚗 {v.brand} {v.model}
                            {v.hasActiveBooking && (
                              <span className="badge bg-success bg-opacity-10 text-success text-xs fw-normal border border-success border-opacity-20 py-0.5 px-2 rounded-pill">Đang có lịch hẹn</span>
                            )}
                          </div>
                          <div className="small text-muted mt-0.5">
                            <strong>Biển số:</strong> <span className="font-monospace fw-bold text-dark">{v.licensePlate}</span>
                          </div>
                          <div className="small text-muted" style={{ fontSize: '11px' }}>
                            <strong>Phân khúc:</strong> {v.vehicleClass} | <strong>Ngày đăng ký:</strong> {formatDate(v.registeredAt)}
                          </div>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        {v.hasActiveBooking ? (
                          <span className="badge bg-warning bg-opacity-10 text-warning text-xs fw-semibold border border-warning border-opacity-20 d-flex align-items-center px-3 rounded-pill">
                            <i className="fas fa-lock me-1"></i>Đang khóa đặt lịch
                          </span>
                        ) : (
                          <>
                            <button
                              className="btn btn-sm btn-outline-primary border-0 p-2 text-primary hover-bg-primary bg-opacity-10 rounded-circle"
                              style={{ width: '36px', height: '36px' }}
                              onClick={() => handleEditClick(v)}
                              title="Chỉnh sửa"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger border-0 p-2 text-danger hover-bg-danger bg-opacity-10 rounded-circle"
                              style={{ width: '36px', height: '36px' }}
                              onClick={() => handleDeleteVehicle(v.vehicleId)}
                              title="Xóa"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Conditionally render Transfer or Registration form */}
              {transferMode ? renderTransferForm() : renderRegistrationForm()}
            </div>
          </div>
        </div>
      ) : (
        /* Transfers Tab */
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4 text-start">
              <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
                <i className="fas fa-exchange-alt text-cyan me-2"></i>DANH SÁCH YÊU CẦU CHUYỂN NHƯỢNG
              </h5>

              {transfersLoading && sentRequests.length === 0 && receivedRequests.length === 0 ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-info" role="status"></div>
                  <div className="text-muted small mt-2">Đang tải dữ liệu...</div>
                </div>
              ) : (
                <div className="d-flex flex-column gap-4 animate-up">
                  {/* Sent Requests List */}
                  <div>
                    <h6 className="fw-bold text-dark border-bottom pb-2 mb-3 d-flex justify-content-between align-items-center">
                      <span><i className="fas fa-paper-plane text-secondary me-2"></i>Yêu cầu đã gửi (Sent)</span>
                      <span className="badge bg-light text-secondary border">{sentRequests.length}</span>
                    </h6>
                    {sentRequests.length === 0 ? (
                      <div className="text-center py-4 text-muted bg-light bg-opacity-30 rounded-3 small border border-dashed">
                        Không có yêu cầu chuyển quyền sở hữu gửi đi nào.
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {sentRequests.map((r) => (
                          <div key={r.requestId} className="p-3 border border-light rounded-4 bg-white shadow-xs hover-scale">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <div className="fw-bold text-dark">
                                  Xe biển số: <span className="font-monospace text-dark fw-bold bg-light py-0.5 px-2 rounded border ms-1">{r.vehiclePlate}</span>
                                </div>
                                <small className="text-muted d-block mt-1">Hãng & Model: <strong>{r.brand} {r.model}</strong></small>
                                <small className="text-muted d-block">Chủ xe cũ: <strong>{r.currentOwnerName}</strong> ({r.currentOwnerEmail})</small>
                                <small className="text-secondary d-block mt-0.5" style={{ fontSize: '11px' }}><i className="far fa-clock me-1"></i>Gửi lúc: {formatDate(r.createdAt)}</small>
                              </div>
                              <div className="d-flex flex-column align-items-end gap-2">
                                <span className={`badge px-2.5 py-1.5 rounded-pill text-xs fw-semibold ${getRequestStatusBadgeClass(r.status)}`}>
                                  {getRequestStatusText(r.status)}
                                </span>
                                <div className="d-flex gap-1.5 mt-1">
                                  <button
                                    className="btn btn-xs btn-outline-secondary py-1 px-2.5 rounded-3 fw-semibold text-xs"
                                    onClick={() => setSelectedRequestDetail(r)}
                                  >
                                    Chi tiết
                                  </button>
                                  {r.status === 'PendingOwnerConfirmation' && (
                                    <button
                                      className="btn btn-xs btn-danger text-white py-1 px-2.5 rounded-3 fw-semibold text-xs border-0"
                                      style={{ backgroundColor: '#ef4444' }}
                                      onClick={() => handleCancelRequest(r.requestId)}
                                    >
                                      Hủy yêu cầu
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Inline Timeline */}
                            {renderRequestTimeline(r)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Received Requests List */}
                  <div>
                    <h6 className="fw-bold text-dark border-bottom pb-2 mb-3 d-flex justify-content-between align-items-center">
                      <span><i className="fas fa-inbox text-secondary me-2"></i>Yêu cầu đã nhận (Received)</span>
                      <span className="badge bg-light text-secondary border">{receivedRequests.length}</span>
                    </h6>
                    {receivedRequests.length === 0 ? (
                      <div className="text-center py-4 text-muted bg-light bg-opacity-30 rounded-3 small border border-dashed">
                        Không có yêu cầu bàn giao xe gửi tới phương tiện của bạn.
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {receivedRequests.map((r) => (
                          <div key={r.requestId} className="p-3 border border-light rounded-4 bg-white shadow-xs hover-scale">
                            <div className="d-flex justify-content-between align-items-start mb-2.5">
                              <div>
                                <div className="fw-bold text-dark">
                                  Xe biển số: <span className="font-monospace text-dark fw-bold bg-light py-0.5 px-2 rounded border ms-1">{r.vehiclePlate}</span>
                                </div>
                                <small className="text-muted d-block mt-1">Khách hàng yêu cầu nhận xe: <strong>{r.requestedOwnerName}</strong> ({r.requestedOwnerEmail})</small>
                                <small className="text-secondary d-block mt-0.5" style={{ fontSize: '11px' }}><i className="far fa-clock me-1"></i>Nhận lúc: {formatDate(r.createdAt)}</small>
                              </div>
                              <div className="d-flex flex-column align-items-end gap-2">
                                <span className={`badge px-2.5 py-1.5 rounded-pill text-xs fw-semibold ${getRequestStatusBadgeClass(r.status)}`}>
                                  {getRequestStatusText(r.status)}
                                </span>
                                <div>
                                  <button
                                    className="btn btn-xs btn-outline-secondary py-1 px-2.5 rounded-3 fw-semibold text-xs"
                                    onClick={() => setSelectedRequestDetail(r)}
                                  >
                                    Chi tiết / Bàn giao
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Inline Timeline */}
                            {renderRequestTimeline(r)}

                            {/* Owner Action Buttons inside card for quick access */}
                            {r.status === 'PendingOwnerConfirmation' && (
                              <div className="d-flex gap-2 justify-content-end border-top pt-2.5 mt-2.5">
                                <button
                                  className="btn btn-sm btn-outline-danger px-3 rounded-3 fw-semibold text-xs"
                                  onClick={() => handleOwnerDecision(r.requestId, 'Reject')}
                                >
                                  Từ chối bàn giao
                                </button>
                                <button
                                  className="btn btn-sm btn-success px-3 rounded-3 text-white fw-bold border-0 text-xs"
                                  style={{ backgroundColor: '#22c55e' }}
                                  onClick={() => handleOwnerDecision(r.requestId, 'Approve')}
                                >
                                  Đồng ý bàn giao xe
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Request Details Modal (Part 3 & Part 4) */}
      {selectedRequestDetail && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
              <div className="modal-header border-0 bg-light p-3 px-4 d-flex justify-content-between align-items-center">
                <h6 className="modal-title fw-bold m-0 text-dark">
                  <i className="fas fa-file-invoice me-2 text-cyan"></i>Chi tiết Yêu cầu Chuyển nhượng #{selectedRequestDetail.requestId}
                </h6>
                <button type="button" className="btn-close shadow-none" onClick={() => setSelectedRequestDetail(null)}></button>
              </div>
              <div className="modal-body p-4 text-start">
                <div className="row g-4">
                  {/* Left Details */}
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3 text-secondary border-bottom pb-1"><i className="fas fa-car me-1"></i> Hồ sơ phương tiện</h6>
                    <div className="mb-2.5">
                      <span className="text-muted small">Biển số:</span>{' '}
                      <span className="badge bg-dark text-white font-monospace ms-1">{selectedRequestDetail.vehiclePlate}</span>
                    </div>
                    <div className="mb-2.5">
                      <span className="text-muted small">OCR Biển số:</span>{' '}
                      <span className={`badge font-monospace ms-1 ${selectedRequestDetail.ocrPlate === selectedRequestDetail.vehiclePlate ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-20' : 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20'}`}>{selectedRequestDetail.ocrPlate || 'N/A'}</span>
                    </div>
                    <div className="mb-2.5">
                      <span className="text-muted small">Hãng & Model:</span>{' '}
                      <strong className="text-dark">{selectedRequestDetail.brand} {selectedRequestDetail.model}</strong>
                    </div>
                    {selectedRequestDetail.vehicleClass && (
                      <div className="mb-4">
                        <span className="text-muted small">Phân khúc:</span>{' '}
                        <strong className="text-dark">{selectedRequestDetail.vehicleClass}</strong>
                      </div>
                    )}

                    <h6 className="fw-bold mb-3 text-secondary border-bottom pb-1"><i className="fas fa-user-friends me-1"></i> Bên liên quan</h6>
                    <div className="mb-2.5">
                      <span className="text-muted small">Chủ hiện tại:</span>{' '}
                      <strong className="text-dark">{selectedRequestDetail.currentOwnerName}</strong> <span className="text-muted small">({selectedRequestDetail.currentOwnerEmail})</span>
                    </div>
                    <div className="mb-4">
                      <span className="text-muted small">Khách hàng yêu cầu:</span>{' '}
                      <strong className="text-dark">{selectedRequestDetail.requestedOwnerName}</strong> <span className="text-muted small">({selectedRequestDetail.requestedOwnerEmail})</span>
                    </div>

                    <h6 className="fw-bold mb-3 text-secondary border-bottom pb-1"><i className="fas fa-calendar-alt me-1"></i> Mốc thời gian</h6>
                    <div className="mb-2.5">
                      <span className="text-muted small">Khởi tạo yêu cầu:</span>{' '}
                      <span className="text-dark small">{formatDate(selectedRequestDetail.createdAt)}</span>
                    </div>
                    <div className="mb-2.5">
                      <span className="text-muted small">Chủ sở hữu xác nhận:</span>{' '}
                      <span className="text-dark small">{formatDate(selectedRequestDetail.ownerConfirmedAt)}</span>
                    </div>
                    <div className="mb-2.5">
                      <span className="text-muted small">Admin phê duyệt:</span>{' '}
                      <span className="text-dark small">{formatDate(selectedRequestDetail.approvedAt)}</span>
                    </div>
                  </div>

                  {/* Right Image */}
                  <div className="col-md-6 text-center">
                    <h6 className="fw-bold mb-3 text-secondary border-bottom pb-1 text-start"><i className="fas fa-file-image me-1"></i> Chứng từ đăng ký xe đã tải lên</h6>
                    <div className="p-2 border rounded-3 bg-light d-flex align-items-center justify-content-center" style={{ height: '240px' }}>
                      <img
                        src={selectedRequestDetail.registrationImageUrl}
                        alt="Reg Cert"
                        className="img-fluid rounded"
                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    {selectedRequestDetail.status === 'PendingOwnerConfirmation' && selectedRequestDetail.currentOwnerEmail === selectedRequestDetail.currentOwnerEmail && (
                      <div className="alert alert-warning py-2 small mt-3 text-start">
                        <i className="fas fa-info-circle me-1"></i> Góp ý: Bằng việc nhấn <strong>Đồng ý bàn giao</strong>, bạn xác nhận đồng ý bàn giao quyền sở hữu xe này và chờ Admin kiểm duyệt.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 p-3 px-4 bg-light d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-secondary py-2 px-4 rounded-3 text-sm fw-bold border-0" style={{ backgroundColor: '#cbd5e1', color: '#334155' }} onClick={() => setSelectedRequestDetail(null)}>Đóng</button>
                
                {selectedRequestDetail.status === 'PendingOwnerConfirmation' && selectedRequestDetail.requestedOwnerName !== undefined && (
                  <>
                    <button
                      type="button"
                      className="btn btn-danger py-2 px-3 rounded-3 text-sm fw-bold border-0 text-white"
                      style={{ backgroundColor: '#ef4444' }}
                      onClick={() => handleOwnerDecision(selectedRequestDetail.requestId, 'Reject')}
                    >
                      Từ chối bàn giao
                    </button>
                    <button
                      type="button"
                      className="btn btn-success py-2 px-4 rounded-3 text-sm fw-bold border-0 text-white"
                      style={{ backgroundColor: '#22c55e' }}
                      onClick={() => handleOwnerDecision(selectedRequestDetail.requestId, 'Approve')}
                    >
                      Đồng ý bàn giao
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editing Vehicle Modal */}
      {editingVehicle && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
              <div className="modal-header border-0 bg-light p-3 px-4 d-flex justify-content-between align-items-center">
                <h6 className="modal-title fw-bold m-0" style={{ color: 'var(--navy-dark)' }}>
                  <i className="fas fa-edit text-cyan me-2"></i>CHỈNH SỬA PHƯƠNG TIỆN
                </h6>
                <button type="button" className="btn-close shadow-none" onClick={() => setEditingVehicle(null)}></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body p-4 text-start">
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">BIỂN SỐ XE</label>
                    <input
                      type="text"
                      className="form-control py-2.5 font-monospace uppercase fw-bold bg-light"
                      value={editingVehicle.licensePlate}
                      disabled
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">HÃNG XE *</label>
                    <select
                      className="form-select py-2.5"
                      value={editBrand}
                      onChange={(e) => {
                        setEditBrand(e.target.value);
                        if (e.target.value !== 'Khác') setEditCustomBrand('');
                      }}
                      required
                    >
                      <option value="">-- Chọn hãng xe --</option>
                      {BRANDS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {editBrand === 'Khác' && (
                    <div className="mb-3 animate-up">
                      <label className="form-label small fw-bold text-muted">NHẬP HÃNG XE *</label>
                      <input
                        type="text"
                        className="form-control py-2.5"
                        placeholder="Ví dụ: Rolls-Royce"
                        value={editCustomBrand}
                        onChange={(e) => setEditCustomBrand(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">MODEL XE *</label>
                    <input
                      type="text"
                      className="form-control py-2.5"
                      placeholder="Ví dụ: Vios, CX5, Ghost"
                      value={editModel}
                      onChange={(e) => setEditModel(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">LOẠI XE *</label>
                    <select
                      className="form-select py-2.5"
                      value={editVehicleClass}
                      onChange={(e) => setEditVehicleClass(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn loại xe --</option>
                      {VEHICLE_CLASSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-0 p-3 px-4 bg-light d-flex gap-2">
                  <button type="button" className="btn btn-secondary py-2 px-4 rounded-3 text-sm fw-bold border-0" style={{ backgroundColor: '#e2e8f0', color: '#475569' }} onClick={() => setEditingVehicle(null)}>HỦY BỎ</button>
                  <button type="submit" className="app-btn-primary py-2 px-4 text-dark fw-bold m-0" disabled={loading}>
                    {loading ? 'ĐANG LƯU...' : 'CẬP NHẬT'}
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

export default CustomerVehicles;
