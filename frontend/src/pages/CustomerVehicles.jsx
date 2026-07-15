import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { customerService } from '../services/customerService';
import { useAuth } from '../hooks/useAuth';
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

const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const CustomerVehicles = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('garage'); // 'garage' or 'transfers'

  // Transfer requests
  const [transferRequests, setTransferRequests] = useState([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [highlightRequestId, setHighlightRequestId] = useState(null);

  // Detail Modal & Preview
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewBlobLoading, setPreviewBlobLoading] = useState(false);

  // Additional uploads for Pending requests
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [additionalSubmitting, setAdditionalSubmitting] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [additionalProgress, setAdditionalProgress] = useState(0);
  const additionalFileInputRef = useRef(null);

  // Registration form state
  const [regLicensePlate, setRegLicensePlate] = useState('');
  const [regBrand, setRegBrand] = useState('');
  const [regCustomBrand, setRegCustomBrand] = useState('');
  const [regModel, setRegModel] = useState('');
  const [regVehicleClass, setRegVehicleClass] = useState('');
  const [regShowOtp, setRegShowOtp] = useState(false);
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regOtpStatus, setRegOtpStatus] = useState(null);
  const [regOtpVerifying, setRegOtpVerifying] = useState(false);
  const [regStatusMessage, setRegStatusMessage] = useState(null);
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [regOtpError, setRegOtpError] = useState(null);

  // Plate checking state
  const [regPlateChecked, setRegPlateChecked] = useState(false);
  const [regPlateDuplicated, setRegPlateDuplicated] = useState(false);
  const [regPlateIsOwn, setRegPlateIsOwn] = useState(false);
  const [regPlateWarning, setRegPlateWarning] = useState(null);
  const [plateCheckLoading, setPlateCheckLoading] = useState(false);

  // Transfer request form state (when plate is duplicated)
  const [transferFiles, setTransferFiles] = useState([]);
  const [transferDescription, setTransferDescription] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');

  // Editing vehicle state
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editBrand, setEditBrand] = useState('');
  const [editCustomBrand, setEditCustomBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editVehicleClass, setEditVehicleClass] = useState('');

  // Drag and drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  // Resend timer
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Sync OTP array to code
  useEffect(() => {
    setRegOtpCode(otpArray.join(''));
  }, [otpArray]);

  useEffect(() => {
    if (!previewDoc) {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
      setPreviewBlobUrl(null);
      return;
    }

    let active = true;
    setPreviewBlobLoading(true);
    (async () => {
      try {
        const response = await api.get(`/api/admin/ownership-transfers/document/${previewDoc.documentId}`, {
          responseType: 'blob'
        });
        if (active) {
          const blobUrl = URL.createObjectURL(response.data);
          setPreviewBlobUrl(blobUrl);
        }
      } catch (err) {
        console.error('Lỗi khi tải tệp xem trước:', err);
      } finally {
        if (active) {
          setPreviewBlobLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [previewDoc]);

  const handleDownloadDocument = async (doc) => {
    try {
      const response = await api.get(`/api/admin/ownership-transfers/document/${doc.documentId}/download`, {
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Lỗi tải xuống:', err);
      if (window.showToast) {
        window.showToast('Không thể tải xuống tài liệu này!', 'error');
      }
    }
  };

  // Mask email helper
  const maskEmail = (email) => {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart}***@${domain}`;
    }
    return `${localPart.substring(0, 2)}***@${domain}`;
  };

  // Get file extension in uppercase
  const getFileExt = (filename) => {
    if (!filename) return '';
    return filename.split('.').pop().toUpperCase();
  };

  // Format File Size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const isImage = (contentType) => contentType && contentType.startsWith('image/');

  // Check plate handler
  const handleCheckPlate = async (plateToCheck) => {
    const cleanPlate = (plateToCheck || regLicensePlate).trim().toUpperCase().replace(/[\s\-.]/g, '');
    if (cleanPlate.length < 5) {
      return;
    }
    setPlateCheckLoading(true);
    try {
      const res = await customerService.checkLicensePlate(cleanPlate);
      if (res.success) {
        if (res.exists) {
          if (res.isOwn) {
            setRegStatusMessage('Bạn đã sở hữu phương tiện này rồi!');
            setRegPlateWarning('Bạn đã sở hữu phương tiện này rồi!');
            setRegPlateDuplicated(false);
            setRegPlateIsOwn(true);
          } else {
            setRegPlateWarning('Biển số đã được đăng ký. Nếu bạn là chủ sở hữu mới, vui lòng gửi yêu cầu chuyển quyền.');
            setRegPlateDuplicated(true);
            setRegPlateIsOwn(false);
            setRegStatusMessage(null);
          }
        } else {
          setRegPlateWarning(null);
          setRegPlateDuplicated(false);
          setRegPlateIsOwn(false);
          setRegStatusMessage(null);
        }
        setRegPlateChecked(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPlateCheckLoading(false);
    }
  };

  // Debounced check plate
  useEffect(() => {
    const cleanPlate = regLicensePlate.trim().toUpperCase().replace(/[\s\-.]/g, '');
    if (cleanPlate.length < 5) {
      setRegPlateWarning(null);
      setRegPlateDuplicated(false);
      setRegPlateIsOwn(false);
      setRegPlateChecked(false);
      setRegStatusMessage(null);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      handleCheckPlate(cleanPlate);
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [regLicensePlate]);

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

  const fetchTransfers = useCallback(async (background = false) => {
    if (!background) setTransfersLoading(true);
    try {
      const res = await customerService.getMyTransferRequests(background ? { skipGlobalLoader: true } : {});
      if (res.success) setTransferRequests(res.requests);
    } catch (err) {
      console.error(err);
    } finally {
      if (!background) setTransfersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchTransfers();
    const interval = setInterval(() => {
      fetchVehicles(true);
      fetchTransfers(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchVehicles, fetchTransfers]);

  const normalizePlate = (plate) => plate.trim().toUpperCase().replace(/[\s\-.]/g, '');

  // OTP handlers
  const handleOtpChange = (element, index) => {
    const val = element.value.replace(/\D/g, '');
    if (!val) {
      const newOtp = [...otpArray];
      newOtp[index] = '';
      setOtpArray(newOtp);
      return;
    }
    const char = val[val.length - 1];
    const newOtp = [...otpArray];
    newOtp[index] = char;
    setOtpArray(newOtp);
    if (char && element.nextElementSibling) element.nextElementSibling.focus();
    if (regOtpError) setRegOtpError(null);
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otpArray[index] && e.target.previousElementSibling) {
        e.target.previousElementSibling.focus();
        const newOtp = [...otpArray];
        newOtp[index - 1] = '';
        setOtpArray(newOtp);
      } else {
        const newOtp = [...otpArray];
        newOtp[index] = '';
        setOtpArray(newOtp);
      }
      if (regOtpError) setRegOtpError(null);
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      setOtpArray(pastedData.split(''));
      const inputs = e.target.parentNode.querySelectorAll('.otp-box');
      if (inputs && inputs.length > 0) inputs[inputs.length - 1].focus();
      if (regOtpError) setRegOtpError(null);
    }
  };

  // Send OTP for registration
  const handleSendRegOtp = async () => {
    const cleanPlate = normalizePlate(regLicensePlate);
    const finalBrand = regBrand === 'Khác' ? regCustomBrand.trim() : regBrand;
    if (!cleanPlate) {
      if (window.showToast) window.showToast('Biển số không hợp lệ.', 'warning');
      return;
    }
    if (!finalBrand) {
      if (window.showToast) window.showToast('Vui lòng chọn hãng xe.', 'warning');
      return;
    }
    if (!regModel.trim()) {
      if (window.showToast) window.showToast('Vui lòng nhập dòng xe.', 'warning');
      return;
    }
    if (!regVehicleClass) {
      if (window.showToast) window.showToast('Vui lòng chọn phân khúc.', 'warning');
      return;
    }
    setRegOtpStatus('sending');
    setRegOtpError(null);
    try {
      const res = await customerService.sendVehicleOtp(cleanPlate, finalBrand, regModel.trim(), regVehicleClass);
      if (res.success) {
        setRegOtpStatus('sent');
        setRegShowOtp(true);
        setResendTimer(45);
        setOtpArray(['', '', '', '', '', '']);
        if (window.showToast) {
          window.showToast(`Mã OTP đã được gửi tới ${maskEmail(user?.email)}`, 'success');
        }
      }
    } catch (err) {
      setRegOtpStatus('failed');
      const msg = err.response?.data?.message || 'Gửi OTP thất bại!';
      if (err.response?.status === 409) {
        setRegPlateDuplicated(true);
        setRegPlateWarning('Biển số đã tồn tại.');
      }
      if (window.showToast) {
        window.showToast(msg, 'error');
      }
    }
  };

  // Verify OTP and register
  const handleOtpVerifyAndRegister = async () => {
    if (regOtpCode.length < 6) {
      setRegOtpError('Vui lòng nhập mã OTP.');
      return;
    }
    const cleanPlate = normalizePlate(regLicensePlate);
    const finalBrand = regBrand === 'Khác' ? regCustomBrand.trim() : regBrand;
    setRegOtpVerifying(true);
    setRegOtpError(null);
    try {
      const response = await customerService.verifyVehicleOtpAndSave(cleanPlate, finalBrand, regModel.trim(), regVehicleClass, regOtpCode);
      if (response.success) {
        if (window.showToast) {
          window.showToast('Đăng ký phương tiện thành công.', 'success');
        }
        resetForm();
        fetchVehicles();
      }
    } catch (err) {
      setRegOtpError('Mã OTP không chính xác.');
    } finally {
      setRegOtpVerifying(false);
    }
  };

  // File validation
  const validateTransferFiles = (files, existingCount = 0) => {
    if (files.length + existingCount > MAX_FILES) return `Tổng số lượng tài liệu tối đa là ${MAX_FILES} tệp.`;
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) return `Tệp '${file.name}' vượt quá 10MB.`;
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) return `Chỉ chấp nhận PDF, JPG, JPEG, PNG. Tệp '${file.name}' không hợp lệ.`;
      if (!ALLOWED_FILE_TYPES.includes(file.type)) return `MIME type của tệp '${file.name}' không hợp lệ.`;
    }
    return null;
  };

  const handleTransferFileChange = (e) => {
    const files = Array.from(e.target.files);
    const error = validateTransferFiles(files, 0);
    if (error) {
      if (window.showToast) {
        window.showToast(error, 'error');
      }
      e.target.value = '';
      return;
    }
    setTransferFiles((prev) => [...prev, ...files]);
    setUploadSuccessMessage('');
  };

  // Drag & drop event handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      const error = validateTransferFiles(files, 0);
      if (error) {
        if (window.showToast) {
          window.showToast(error, 'error');
        }
        return;
      }
      setTransferFiles((prev) => [...prev, ...files]);
      setUploadSuccessMessage('');
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const removeTransferFile = (index) => {
    setTransferFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadSuccessMessage('');
  };

  // Submit transfer request
  const handleSubmitTransfer = async () => {
    if (transferFiles.length === 0) {
      if (window.showToast) {
        window.showToast('Vui lòng tải lên ít nhất một tài liệu chứng minh quyền sở hữu.', 'warning');
      }
      return;
    }
    if (!transferDescription.trim()) {
      if (window.showToast) {
        window.showToast('Vui lòng nhập lý do chuyển quyền sở hữu.', 'warning');
      }
      return;
    }
    const cleanPlate = normalizePlate(regLicensePlate);
    setTransferSubmitting(true);
    setUploadProgress(0);
    setUploadSuccessMessage('');
    try {
      const formData = new FormData();
      formData.append('licensePlate', cleanPlate);
      if (transferDescription.trim()) formData.append('description', transferDescription.trim());
      transferFiles.forEach((f) => formData.append('files', f));

      const res = await customerService.submitTransferRequest(formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      if (res.success) {
        setUploadSuccessMessage('Tải tệp thành công.');
        if (window.showToast) {
          window.showToast('Đã gửi yêu cầu chuyển quyền thành công.', 'success');
        }
        resetForm();
        
        // Fetch fresh transfers and signal the newly created request to highlight
        setTransfersLoading(true);
        try {
          const freshRes = await customerService.getMyTransferRequests();
          if (freshRes.success) {
            setTransferRequests(freshRes.requests);
            if (freshRes.requests && freshRes.requests.length > 0) {
              setHighlightRequestId(freshRes.requests[0].requestId);
              setTimeout(() => {
                setHighlightRequestId(null);
              }, 5000);
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          setTransfersLoading(false);
        }
        
        setActiveTab('transfers');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra!';
      if (window.showToast) {
        window.showToast(msg, 'error');
      }
    } finally {
      setTransferSubmitting(false);
    }
  };

  // View detail handler
  const handleViewDetail = async (requestId) => {
    setDetailLoading(true);
    try {
      const response = await customerService.getOwnershipTransferDetail(requestId);
      if (response.success) {
        setSelectedDetail(response.request);
        setAdditionalFiles([]);
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) {
        window.showToast('Không thể tải chi tiết yêu cầu chuyển quyền!', 'error');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // Cancel transfer
  const handleCancelTransferRequest = (requestId) => {
    if (cancelSubmitting) return;
    const cancelAction = async () => {
      setCancelSubmitting(true);
      try {
        const res = await customerService.cancelTransferRequest(requestId);
        if (res.success) {
          if (window.showToast) {
            window.showToast('✔ Đã hủy', 'success');
          }
          setSelectedDetail(null);
          fetchTransfers();
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast(err.response?.data?.message || 'Không thể xử lý yêu cầu.', 'error');
        }
      } finally {
        setCancelSubmitting(false);
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Bạn có chắc chắn muốn hủy yêu cầu chuyển nhượng này?', cancelAction);
    } else {
      const confirmCancel = window.confirm('Bạn có chắc chắn muốn hủy yêu cầu chuyển nhượng này?');
      if (confirmCancel) {
        cancelAction();
      }
    }
  };

  // Additional file handlers
  const handleAdditionalFileChange = (e) => {
    const files = Array.from(e.target.files);
    const existingCount = selectedDetail?.documents?.length || 0;
    const error = validateTransferFiles(files, existingCount);
    if (error) {
      if (window.showToast) {
        window.showToast(error, 'error');
      }
      e.target.value = '';
      return;
    }
    setAdditionalFiles((prev) => [...prev, ...files]);
  };

  const removeAdditionalFile = (index) => {
    setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAdditional = async () => {
    if (additionalFiles.length === 0) {
      if (window.showToast) {
        window.showToast('Vui lòng chọn tài liệu để bổ sung!', 'warning');
      }
      return;
    }

    setAdditionalSubmitting(true);
    setAdditionalProgress(0);
    try {
      const formData = new FormData();
      additionalFiles.forEach((file) => formData.append('files', file));

      const res = await customerService.uploadAdditionalDocuments(selectedDetail.requestId, formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setAdditionalProgress(percent);
        }
      });

      if (res.success) {
        if (window.showToast) {
          window.showToast('Bổ sung tài liệu thành công.', 'success');
        }
        setAdditionalFiles([]);
        // Refresh details
        await handleViewDetail(selectedDetail.requestId);
        fetchTransfers(true);
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) {
        window.showToast(err.response?.data?.message || 'Có lỗi xảy ra khi tải tài liệu lên!', 'error');
      }
    } finally {
      setAdditionalSubmitting(false);
    }
  };

  // Edit vehicle
  const handleStartEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    const brandInList = BRANDS.includes(vehicle.brand);
    setEditBrand(brandInList ? vehicle.brand : 'Khác');
    setEditCustomBrand(brandInList ? '' : vehicle.brand);
    setEditModel(vehicle.model);
    setEditVehicleClass(vehicle.vehicleClass);
  };

  const handleSaveEdit = async () => {
    const finalBrand = editBrand === 'Khác' ? editCustomBrand.trim() : editBrand;
    if (!finalBrand) {
      if (window.showToast) window.showToast('Vui lòng chọn hãng xe.', 'warning');
      return;
    }
    if (!editModel.trim()) {
      if (window.showToast) window.showToast('Vui lòng nhập dòng xe.', 'warning');
      return;
    }
    if (!editVehicleClass) {
      if (window.showToast) window.showToast('Vui lòng chọn phân khúc.', 'warning');
      return;
    }
    try {
      const res = await customerService.editVehicle(editingVehicle.vehicleId, finalBrand, editModel.trim(), editVehicleClass);
      if (res.success) {
        if (window.showToast) {
          window.showToast('Đăng ký thành công.', 'success');
        }
        setEditingVehicle(null);
        fetchVehicles();
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast(err.response?.data?.message || 'Có lỗi xảy ra!', 'error');
      }
    }
  };

  // Delete vehicle
  const handleDeleteVehicle = (vehicleId) => {
    if (window.showConfirm) {
      window.showConfirm('Bạn có chắc chắn muốn xóa phương tiện này?', async () => {
        try {
          const res = await customerService.deleteVehicle(vehicleId);
          if (res.success) {
            if (window.showToast) {
              window.showToast('Đã xóa!', 'success');
            }
            fetchVehicles();
          }
        } catch (err) {
          if (window.showToast) {
            window.showToast(err.response?.data?.message || 'Không thể xóa!', 'error');
          }
        }
      });
    } else {
      const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa phương tiện này?');
      if (confirmDelete) {
        (async () => {
          try {
            const res = await customerService.deleteVehicle(vehicleId);
            if (res.success) {
              alert('Đã xóa!');
              fetchVehicles();
            }
          } catch (err) {
            alert(err.response?.data?.message || 'Không thể xóa!');
          }
        })();
      }
    }
  };

  const resetForm = () => {
    setRegLicensePlate('');
    setRegBrand('');
    setRegCustomBrand('');
    setRegModel('');
    setRegVehicleClass('');
    setRegShowOtp(false);
    setRegOtpCode('');
    setOtpArray(['', '', '', '', '', '']);
    setResendTimer(0);
    setRegOtpStatus(null);
    setRegStatusMessage(null);
    setRegPlateDuplicated(false);
    setRegPlateIsOwn(false);
    setRegPlateWarning(null);
    setRegPlateChecked(false);
    setTransferFiles([]);
    setTransferDescription('');
    setPlateCheckLoading(false);
    setRegOtpError(null);
    setUploadProgress(0);
    setUploadSuccessMessage('');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending': return <span className="badge bg-warning text-dark">Chờ duyệt</span>;
      case 'Approved': return <span className="badge bg-success">Đã duyệt</span>;
      case 'Rejected': return <span className="badge bg-danger">Từ chối</span>;
      case 'Cancelled': return <span className="badge bg-secondary">Đã hủy</span>;
      default: return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Submit button disabled condition
  const isSubmitDisabled = transferSubmitting || transferFiles.length === 0 || !transferDescription.trim();

  // Timeline render utility
  const renderTimeline = (status, submittedAt, reviewedAt, rejectReason, reviewedByName) => {
    const isPending = status === 'Pending';
    const isApproved = status === 'Approved';
    const isRejected = status === 'Rejected';
    const isCancelled = status === 'Cancelled';

    return (
      <div className="timeline-container-v2 text-start mt-3">
        <style>{`
          .timeline-v2 {
            position: relative;
            padding-left: 30px;
            margin-bottom: 0;
          }
          .timeline-v2::before {
            content: '';
            position: absolute;
            left: 11px;
            top: 5px;
            bottom: 5px;
            width: 2px;
            background-color: #cbd5e1;
            z-index: 1;
          }
          .timeline-item-v2 {
            position: relative;
            margin-bottom: 20px;
          }
          .timeline-item-v2:last-child {
            margin-bottom: 0;
          }
          .timeline-dot-v2 {
            position: absolute;
            left: -30px;
            top: 3px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background-color: #ffffff;
            border: 2px solid #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
          }
          .timeline-dot-v2.completed {
            border-color: #22c55e;
            background-color: #22c55e;
            color: #ffffff;
          }
          .timeline-dot-v2.active {
            border-color: #0ea5e9;
            background-color: #f0f9ff;
            color: #0ea5e9;
          }
          .timeline-dot-v2.cancelled {
            border-color: #64748b;
            background-color: #64748b;
            color: #ffffff;
          }
          .timeline-dot-v2.rejected {
            border-color: #ef4444;
            background-color: #ef4444;
            color: #ffffff;
          }
          .timeline-title-v2 {
            font-size: 0.88rem;
            font-weight: 700;
            color: #1e293b;
          }
          .timeline-desc-v2 {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 2px;
          }
          .timeline-time-v2 {
            font-size: 0.72rem;
            color: #94a3b8;
            margin-top: 2px;
          }
        `}</style>

        <div className="timeline-v2">
          {/* Bước 1: Khởi tạo yêu cầu */}
          <div className="timeline-item-v2">
            <div className="timeline-dot-v2 completed">
              <i className="fas fa-paper-plane" style={{ fontSize: '0.65rem' }}></i>
            </div>
            <div>
              <div className="timeline-title-v2">📝 Đã gửi yêu cầu (Submitted)</div>
              <div className="timeline-desc-v2">Yêu cầu chuyển quyền sở hữu xe đã được khởi tạo thành công và gửi lên hệ thống.</div>
              <div className="timeline-time-v2">{formatDate(submittedAt)}</div>
            </div>
          </div>

          {/* Bước 2: Xem xét và đánh giá */}
          <div className="timeline-item-v2">
            <div className={`timeline-dot-v2 ${isPending ? 'active' : 'completed'}`}>
              {isPending ? (
                <span className="spinner-border spinner-border-sm text-info" style={{ width: '10px', height: '10px', borderWidth: '1.5px' }}></span>
              ) : (
                <i className="fas fa-search" style={{ fontSize: '0.65rem' }}></i>
              )}
            </div>
            <div>
              <div className="timeline-title-v2">🔍 Đang kiểm tra (Under Review)</div>
              <div className="timeline-desc-v2">
                {isPending 
                  ? 'Ban quản trị đang xem xét tài liệu, đối chiếu biển số và xác thực thông tin đăng ký xe.' 
                  : 'Review completed. Quá trình kiểm tra hồ sơ và giấy tờ đăng ký xe đã hoàn tất.'}
              </div>
              <div className="timeline-time-v2">{isPending ? 'Đang xử lý...' : formatDate(reviewedAt)}</div>
            </div>
          </div>

          {/* Bước 3: Kết quả duyệt/từ chối/hủy */}
          {!isPending && (
            <div className="timeline-item-v2">
              <div className={`timeline-dot-v2 ${isApproved ? 'completed' : isRejected ? 'rejected' : 'cancelled'}`}>
                {isApproved ? (
                  <i className="fas fa-check" style={{ fontSize: '0.65rem' }}></i>
                ) : isRejected ? (
                  <i className="fas fa-times" style={{ fontSize: '0.65rem' }}></i>
                ) : (
                  <i className="fas fa-ban" style={{ fontSize: '0.65rem' }}></i>
                )}
              </div>
              <div>
                <div className="timeline-title-v2">
                  {isApproved ? '🎉 Đã duyệt (Approved)' : isRejected ? '❌ Đã từ chối (Rejected)' : '🚫 Đã hủy (Cancelled)'}
                </div>
                <div className="timeline-desc-v2">
                  {isApproved && (reviewedByName ? `Yêu cầu chuyển quyền được phê duyệt bởi ${reviewedByName}. Xe đã được chuyển sang chủ mới.` : 'Yêu cầu chuyển nhượng đã được phê duyệt. Xe đã được chuyển sang chủ sở hữu mới.')}
                  {isRejected && `Ban quản trị đã từ chối yêu cầu chuyển quyền này. Lý do: ${rejectReason || 'Không có lý do cụ thể.'}`}
                  {isCancelled && 'Yêu cầu chuyển quyền đã được hủy bỏ bởi khách hàng.'}
                </div>
                <div className="timeline-time-v2">{formatDate(reviewedAt)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container py-4">
      {/* Styles defined specifically to mimic reference image styling v2.0 */}
      <style>{`
        .custom-card-v2 {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02);
          padding: 24px;
          margin-bottom: 24px;
        }
        .vehicle-item-row-v2 {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          background-color: #ffffff;
          transition: all 0.2s;
          margin-bottom: 12px;
        }
        .vehicle-item-row-v2:hover {
          background-color: #f8fafc;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
        }
        .vehicle-icon-box-v2 {
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
        }
        .app-btn-blue-v2 {
          background-color: #008ecf;
          border-color: #008ecf;
          color: #ffffff;
          font-weight: 700;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: all 0.2s;
          border-style: solid;
        }
        .app-btn-blue-v2:hover {
          background-color: #0077b0;
          border-color: #0077b0;
          color: #ffffff;
        }
        .app-btn-orange-v2 {
          background-color: #f97316;
          border-color: #f97316;
          color: #ffffff;
          font-weight: 700;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: all 0.2s;
          border-style: solid;
        }
        .app-btn-orange-v2:hover {
          background-color: #ea580c;
          border-color: #ea580c;
          color: #ffffff;
        }
        .tab-btn-v2 {
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 8px 20px;
          border: none;
          transition: all 0.2s;
        }
        .tab-btn-v2.active {
          background-color: #2563eb !important;
          color: #ffffff !important;
        }
        .tab-btn-v2.inactive {
          background-color: #e2e8f0;
          color: #475569;
        }
        .tab-btn-v2.inactive:hover {
          background-color: #cbd5e1;
        }
        .action-icon-box {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          transition: all 0.15s;
        }
        .action-icon-box.edit:hover {
          border-color: #2563eb;
          color: #2563eb;
          background: #eff6ff;
        }
        .action-icon-box.delete:hover {
          border-color: #dc2626;
          color: #dc2626;
          background: #fef2f2;
        }
        .status-panel-v2 {
          border-radius: 8px;
          padding: 12px 16px;
          border-left: 4px solid transparent;
        }
        .status-panel-v2.warning {
          background-color: #fffbeb;
          border-left-color: #d97706;
        }
        .dashed-upload-box {
          border: 2px dashed #cbd5e1;
          border-radius: 10px;
          padding: 24px 20px;
          text-align: center;
          background-color: #f8fafc;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dashed-upload-box:hover, .dashed-upload-box.drag-active {
          border-color: #2563eb;
          background-color: #f0f5ff;
        }
        .divider-v2 {
          border-top: 1px solid #e2e8f0;
          margin: 20px 0;
        }
        .input-label-v2 {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }
        .helper-text-v2 {
          font-size: 12px;
          color: #64748b;
        }
        .validation-text-v2 {
          font-size: 12px;
          color: #dc2626;
        }
        .status-text-v2 {
          font-size: 13px;
        }
        .otp-box-container {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 14px;
          margin-bottom: 14px;
        }
        .otp-box {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 22px;
          font-weight: bold;
          text-align: center;
          background-color: #ffffff;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .otp-box:focus {
          border-color: #008ecf;
          box-shadow: 0 0 0 3px rgba(0, 142, 207, 0.15);
          outline: none;
        }
        .clickable-documents-badge {
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .clickable-documents-badge:hover {
          opacity: 0.8;
        }
      `}</style>

      {/* Header section with top-right tab placement */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0 text-slate-800" style={{ fontFamily: 'Be Vietnam Pro, sans-serif' }}>
          Phương tiện của tôi
        </h4>
        <div className="d-flex gap-2">
          <button
            className={`tab-btn-v2 ${activeTab === 'garage' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('garage')}
          >
            Garage phương tiện
          </button>
          <button
            className={`tab-btn-v2 ${activeTab === 'transfers' ? 'active' : 'inactive'}`}
            onClick={() => { setActiveTab('transfers'); fetchTransfers(); }}
          >
            Yêu cầu chuyển quyền
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: GARAGE ==================== */}
      {activeTab === 'garage' && (
        <div className="row justify-content-center">
          <div className="col-12">
            
            {/* Section 1 Card: Garage List */}
            <div className="custom-card-v2">
              <h5 className="fw-bold mb-4 text-start text-dark d-flex align-items-center" style={{ fontSize: '18px', fontFamily: 'Be Vietnam Pro, sans-serif' }}>
                GARAGE PHƯƠNG TIỆN ĐÃ ĐĂNG KÝ
              </h5>

              <div className="mb-2">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                    <p className="text-muted mt-2 small">Đang tải danh sách xe...</p>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-5 text-muted small bg-light rounded-4 border border-dashed">
                    <i className="fas fa-car-side fa-2x mb-3 text-secondary" style={{ opacity: 0.5 }}></i>
                    <div>Chưa có phương tiện nào được đăng ký. Hãy đăng ký xe đầu tiên để bắt đầu đặt lịch!</div>
                  </div>
                ) : (
                  vehicles.map((v, i) => (
                    <div key={v.vehicleId || i} className="vehicle-item-row-v2">
                      <div className="d-flex align-items-center gap-3">
                        <div className="vehicle-icon-box-v2">
                          <i className="fas fa-car text-muted" style={{ fontSize: '1.1rem' }}></i>
                        </div>
                        <div className="text-start">
                          <div className="fw-bold" style={{ color: 'var(--navy-dark)', fontSize: '0.98rem' }}>
                            🚗 {v.brand} {v.model}
                          </div>
                          <div className="text-muted small mt-1">
                            <span className="me-3">Biển số: <strong>{v.licensePlate}</strong></span>
                            <span className="me-3">Loại xe: {v.vehicleClass}</span>
                            {v.registeredAt && <span>Ngày đăng ký: {new Date(v.registeredAt).toLocaleDateString('vi-VN')}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn p-0 action-icon-box edit" onClick={() => handleStartEdit(v)} title="Sửa">
                          <i className="fas fa-pencil-alt" style={{ fontSize: '0.9rem' }}></i>
                        </button>
                        <button className="btn p-0 action-icon-box delete" onClick={() => handleDeleteVehicle(v.vehicleId)} title="Xóa" disabled={v.hasActiveBooking}>
                          <i className="fas fa-trash-alt" style={{ fontSize: '0.9rem' }}></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 2 Card: Registration progressive form */}
            <div className="custom-card-v2">
              <h5 className="fw-bold mb-4 text-start text-dark d-flex align-items-center" style={{ fontSize: '18px', fontFamily: 'Be Vietnam Pro, sans-serif' }}>
                {regPlateChecked && regPlateDuplicated ? 'Yêu cầu chuyển quyền sở hữu' : 'Đăng ký phương tiện mới'}
              </h5>

              {/* Progressive Form Layout */}
              <div className="mb-3 text-start">
                <label className="form-label input-label-v2 mb-1">Biển số xe *</label>
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control form-control-custom"
                    placeholder="Ví dụ: 51H-888.88"
                    value={regLicensePlate}
                    onChange={(e) => { setRegLicensePlate(e.target.value); setRegPlateChecked(false); }}
                    disabled={regShowOtp}
                    style={{ height: '44px' }}
                  />
                  {plateCheckLoading && (
                    <div className="position-absolute end-0 top-50 translate-middle-y me-3">
                      <span className="spinner-border spinner-border-sm text-info" role="status"></span>
                    </div>
                  )}
                </div>
                
                {/* Available inline message (small green text, no icon, no background) */}
                {regPlateChecked && !regPlateDuplicated && !regPlateIsOwn && (
                  <div className="status-text-v2 mt-2 text-start text-success" style={{ fontWeight: '500', fontSize: '13px' }}>
                    ✓ Biển số khả dụng.
                  </div>
                )}

                {/* Loading state indicator */}
                {plateCheckLoading && !regPlateChecked && (
                  <div className="status-text-v2 mt-2 text-start text-muted" style={{ fontSize: '12px' }}>
                    Đang kiểm tra biển số...
                  </div>
                )}

                {/* Helper text shown initially when not checked */}
                {!regPlateChecked && !plateCheckLoading && (
                  <small className="helper-text-v2 mt-1.5 d-block">
                    Nhập biển số để kiểm tra xem xe đã được đăng ký hay chưa.
                  </small>
                )}
              </div>

              {/* Dynamic Action & Form expansion below input */}
              {regPlateChecked && (
                <div className="animate-fade">
                  <div className="divider-v2"></div>

                  {/* CASE A: License Plate NOT registered */}
                  {!regPlateDuplicated && !regPlateIsOwn && (
                    <div>
                      {/* Edit information button when OTP screen is shown */}
                      {regShowOtp && (
                        <div className="text-end mb-3">
                          <button
                            type="button"
                            className="btn btn-link p-0 text-decoration-none small"
                            style={{ fontSize: '13px', color: '#008ecf', fontWeight: '600' }}
                            onClick={() => {
                              setRegShowOtp(false);
                              setOtpArray(['', '', '', '', '', '']);
                              setRegOtpError(null);
                            }}
                          >
                            Chỉnh sửa thông tin
                          </button>
                        </div>
                      )}

                      <div className="row g-3 text-start">
                        <div className="col-md-4">
                          <label className="form-label input-label-v2 mb-1">Hãng xe *</label>
                          <select
                            className="form-select form-select-custom"
                            value={regBrand}
                            onChange={(e) => setRegBrand(e.target.value)}
                            disabled={regShowOtp}
                          >
                            <option value="">-- Chọn hãng xe --</option>
                            {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                          </select>
                          {regBrand === 'Khác' && (
                            <input
                              type="text"
                              className="form-control form-control-custom mt-2"
                              placeholder="Nhập hãng xe"
                              value={regCustomBrand}
                              onChange={(e) => setRegCustomBrand(e.target.value)}
                              disabled={regShowOtp}
                            />
                          )}
                        </div>
                        <div className="col-md-4">
                          <label className="form-label input-label-v2 mb-1">Dòng xe *</label>
                          <input
                            type="text"
                            className="form-control form-control-custom"
                            placeholder="Ví dụ: Vios, CX5..."
                            value={regModel}
                            onChange={(e) => setRegModel(e.target.value)}
                            disabled={regShowOtp}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label input-label-v2 mb-1">Phân khúc *</label>
                          <select
                            className="form-select form-select-custom"
                            value={regVehicleClass}
                            onChange={(e) => setRegVehicleClass(e.target.value)}
                            disabled={regShowOtp}
                          >
                            <option value="">-- Chọn phân khúc --</option>
                            {VEHICLE_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Send OTP button or OTP verification */}
                      <div className="mt-4">
                        {!regShowOtp ? (
                          <button
                            className="app-btn-blue-v2 w-100"
                            onClick={handleSendRegOtp}
                            disabled={regOtpStatus === 'sending' || !regBrand || !regModel.trim() || !regVehicleClass}
                            style={{ height: '44px' }}
                          >
                            {regOtpStatus === 'sending' ? 'ĐANG GỬI MÃ...' : 'GỬI MÃ XÁC THỰC (OTP)'}
                          </button>
                        ) : (
                          <div className="card border-0 bg-white p-4 rounded-3 text-center shadow-sm" style={{ maxWidth: '420px', margin: '0 auto' }}>
                            <h6 className="fw-bold mb-2 text-dark" style={{ fontSize: '16px' }}>
                              Xác thực email
                            </h6>
                            <p className="text-muted small mb-3">Mã OTP đã được gửi đến <strong>{maskEmail(user?.email)}</strong></p>
                            
                            {/* Centered OTP digit inputs */}
                            <div className="otp-box-container">
                              {otpArray.map((digit, i) => (
                                <input
                                  key={i}
                                  type="text"
                                  className="otp-box"
                                  value={digit}
                                  maxLength={1}
                                  onChange={(e) => handleOtpChange(e.target, i)}
                                  onKeyDown={(e) => handleOtpKeyDown(e, i)}
                                  onPaste={handleOtpPaste}
                                />
                              ))}
                            </div>

                            {/* Wrong OTP red validation text */}
                            {regOtpError && (
                              <div className="validation-text-v2 text-danger text-center mt-1 mb-3" style={{ fontWeight: '500' }}>
                                {regOtpError}
                              </div>
                            )}

                            <div className="d-flex flex-column gap-2 w-100">
                              <button
                                className="app-btn-blue-v2 w-100 py-2.5"
                                onClick={handleOtpVerifyAndRegister}
                                disabled={regOtpVerifying || regOtpCode.length < 6}
                              >
                                {regOtpVerifying ? 'ĐANG XÁC THỰC...' : 'XÁC THỰC & ĐĂNG KÝ'}
                              </button>

                              {/* Styled countdown text in Vietnamese */}
                              <div className="text-center mt-3" style={{ fontSize: '13px' }}>
                                <span className="text-muted">Không nhận được mã? </span>
                                {resendTimer > 0 ? (
                                  <span className="text-muted fw-bold">Gửi lại sau {resendTimer} giây</span>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-link p-0 text-decoration-none fw-bold"
                                    style={{ color: '#008ecf', fontSize: '13px' }}
                                    onClick={handleSendRegOtp}
                                  >
                                    Gửi lại mã OTP
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CASE B: License Plate already registered (Transfer Flow) */}
                  {regPlateDuplicated && (
                    <div className="text-start animate-fade">
                      {/* Lighter Yellow warning card with no prefix icons */}
                      <div className="status-panel-v2 warning mb-3" style={{ backgroundColor: '#fffbeb', borderLeft: '4px solid #d97706', padding: '12px 16px', borderRadius: '8px' }}>
                        <div className="fw-bold mb-1" style={{ fontSize: '13px', color: '#d97706' }}>
                          Biển số đã được đăng ký.
                        </div>
                        <div className="text-muted small" style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                          Nếu bạn là chủ sở hữu mới, vui lòng gửi yêu cầu chuyển quyền.
                        </div>
                      </div>

                      {/* Inline Ownership Transfer Forms */}
                      <div className="row g-3">
                        {/* Left Side: Upload Documents */}
                        <div className="col-md-6">
                          <label className="form-label input-label-v2 mb-1">Giấy tờ chuyển quyền *</label>
                          <div
                            className="dashed-upload-box mb-2"
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={transferSubmitting ? undefined : triggerFileSelect}
                            style={{ border: '2px dashed #cbd5e1', borderRadius: '10px', padding: '20px', backgroundColor: '#f8fafc', cursor: transferSubmitting ? 'not-allowed' : 'pointer', opacity: transferSubmitting ? 0.6 : 1 }}
                          >
                            {/* Empty Upload Illustration (shown only if no files are uploaded) */}
                            {transferFiles.length === 0 ? (
                              <div className="text-center">
                                <div className="fs-3 mb-2">📄</div>
                                <div className="fw-bold small text-slate-700">Kéo và thả tệp vào đây</div>
                                <div className="text-muted small">hoặc <span className="text-primary text-decoration-underline">Chọn tệp</span></div>
                                <div className="text-muted mt-2" style={{ fontSize: '11px' }}>
                                  Định dạng hỗ trợ: PDF • JPG • JPEG • PNG<br/>
                                  Tối đa: 5 tệp (10 MB mỗi tệp)
                                </div>
                              </div>
                            ) : (
                              /* Filled Upload State Box */
                              <div>
                                <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                                  <span className="fw-bold small text-slate-700" style={{ fontSize: '13px' }}>Đã tải lên {transferFiles.length} tệp</span>
                                  {!transferSubmitting && (
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 text-decoration-underline small fw-semibold text-primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerFileSelect();
                                      }}
                                    >
                                      Chọn thêm tệp
                                    </button>
                                  )}
                                </div>

                                {/* List of uploaded files inside the container with separators */}
                                <div className="text-start">
                                  {transferFiles.map((file, idx) => (
                                    <div key={idx}>
                                      <hr className="my-2" style={{ borderColor: '#cbd5e1' }} />
                                      <div className="d-flex justify-content-between align-items-center py-1">
                                        <div className="text-truncate me-2">
                                          <div className="fw-semibold text-slate-800 text-truncate" style={{ fontSize: '13px' }}>
                                            📄 {file.name}
                                          </div>
                                          <div className="text-muted" style={{ fontSize: '11px' }}>
                                            {getFileExt(file.name)} • {(file.size / 1024 / 1024).toFixed(2)} MB
                                          </div>
                                        </div>
                                        {!transferSubmitting && (
                                          <button
                                            type="button"
                                            className="btn btn-link text-danger p-0 text-decoration-none small fw-bold"
                                            onClick={(e) => { e.stopPropagation(); removeTransferFile(idx); }}
                                          >
                                            Xóa
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  <hr className="my-2" style={{ borderColor: '#cbd5e1' }} />
                                </div>
                              </div>
                            )}
                            
                            {/* Upload Progress inside box */}
                            {transferSubmitting && uploadProgress > 0 && (
                              <div className="mt-2 text-start">
                                <div className="d-flex justify-content-between mb-1 small text-muted" style={{ fontSize: '11px' }}>
                                  <span>Đang tải lên tài liệu...</span>
                                  <span>{uploadProgress}%</span>
                                </div>
                                <div className="progress" style={{ height: '5px' }}>
                                  <div
                                    className="progress-bar progress-bar-striped progress-bar-animated bg-success"
                                    role="progressbar"
                                    style={{ width: `${uploadProgress}%` }}
                                    aria-valuenow={uploadProgress}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                  ></div>
                                </div>
                              </div>
                            )}

                            <input
                              type="file"
                              ref={fileInputRef}
                              className="d-none"
                              multiple
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={handleTransferFileChange}
                              disabled={transferSubmitting}
                            />
                          </div>

                          {/* Placeholder when there are no uploaded files */}
                          {transferFiles.length === 0 && (
                            <div className="text-muted small mb-3 text-start" style={{ fontSize: '12px' }}>
                              Chưa có tài liệu nào được tải lên.
                            </div>
                          )}

                          {/* Small success upload label */}
                          {uploadSuccessMessage && (
                            <div className="text-success small mt-1 text-start" style={{ fontWeight: '500', fontSize: '12px' }}>
                              {uploadSuccessMessage}
                            </div>
                          )}
                        </div>

                        {/* Right Side: Description */}
                        <div className="col-md-6">
                          <label className="form-label input-label-v2 mb-1">Lý do chuyển quyền *</label>
                          <textarea
                            className="form-control form-control-custom"
                            rows={4}
                            placeholder="Ví dụ: Tôi đã mua lại chiếc xe này và đính kèm hợp đồng mua bán để xác minh quyền sở hữu."
                            value={transferDescription}
                            onChange={(e) => setTransferDescription(e.target.value)}
                            disabled={transferSubmitting}
                            style={{ resize: 'none', height: '170px' }}
                          ></textarea>
                        </div>
                      </div>

                      {/* Orange Transfer submit button */}
                      <div className="mt-3">
                        <button
                          className="btn app-btn-orange-v2 w-100"
                          onClick={handleSubmitTransfer}
                          disabled={isSubmitDisabled}
                          style={{ height: '44px' }}
                        >
                          {transferSubmitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Đang gửi...
                            </>
                          ) : 'Gửi yêu cầu chuyển quyền'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CASE C: Plate is owned by current customer */}
                  {regPlateIsOwn && regPlateWarning && (
                    <div className="alert alert-info py-2.5 px-3 border-0 rounded-3 mb-0 text-start">
                      <span className="small">{regPlateWarning}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: OWNERSHIP TRANSFER REQUESTS ==================== */}
      {activeTab === 'transfers' && (
        <div className="custom-card-v2">
          <h5 className="fw-bold mb-4 text-start text-dark d-flex align-items-center" style={{ fontSize: '18px', fontFamily: 'Be Vietnam Pro, sans-serif' }}>
            YÊU CẦU CHUYỂN QUYỀN SỞ HỮU
          </h5>

          {transfersLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
              <p className="text-muted mt-2 small">Đang tải lịch sử...</p>
            </div>
          ) : transferRequests.length === 0 ? (
            <div className="text-center py-5 text-muted small bg-light rounded-4 border border-dashed">
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📄</div>
              <div>Bạn chưa có yêu cầu chuyển quyền nào.</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle text-start mb-0">
                <thead className="table-light">
                  <tr className="small text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    <th className="py-3 px-3">Biển số</th>
                    <th className="py-3">Ngày gửi</th>
                    <th className="py-3">Trạng thái</th>
                    <th className="py-3">Tài liệu</th>
                    <th className="py-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {transferRequests.map((r) => (
                    <tr
                      key={r.requestId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: highlightRequestId === r.requestId ? '#eff6ff' : 'transparent',
                        transition: 'background-color 1s ease'
                      }}
                    >
                      <td className="py-3 px-3">
                        <span className="badge bg-dark font-monospace px-2.5 py-1.5" style={{ fontSize: '0.85rem' }}>{r.vehiclePlate}</span>
                      </td>
                      <td className="py-3 small text-slate-600">{formatDate(r.submittedAt)}</td>
                      <td className="py-3">{getStatusBadge(r.status)}</td>
                      <td className="py-3">
                        <span 
                          className="badge bg-info text-white clickable-documents-badge px-2 py-1.5"
                          onClick={() => handleViewDetail(r.requestId)}
                          title="Click để xem chi tiết tài liệu"
                        >
                          {r.documentCount || 0} tài liệu
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <div className="d-flex gap-2 justify-content-center">
                          <button
                            className="btn btn-sm btn-outline-primary px-3 rounded-2 fw-semibold"
                            onClick={() => handleViewDetail(r.requestId)}
                          >
                            Chi tiết
                          </button>
                          {r.status === 'Pending' && (
                            <button
                              className="btn btn-sm btn-outline-danger px-3 rounded-2 fw-semibold"
                              onClick={() => handleCancelTransferRequest(r.requestId)}
                              disabled={cancelSubmitting}
                            >
                              Hủy
                            </button>
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
      )}

      {/* Customer Request Detail Modal */}
      {selectedDetail && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }} onClick={() => setSelectedDetail(null)}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
              <div className="modal-header border-0 bg-light p-3 px-4 d-flex justify-content-between align-items-center">
                <h6 className="modal-title fw-bold m-0" style={{ color: 'var(--navy-dark)' }}>
                  CHI TIẾT YÊU CẦU CHUYỂN QUYỀN
                </h6>
                <button type="button" className="btn-close shadow-none" onClick={() => setSelectedDetail(null)}></button>
              </div>
              <div className="modal-body p-4 text-start">
                {detailLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                ) : (
                  <div className="row g-4">
                    {/* Left: Info */}
                    <div className="col-md-7">
                      {/* Vehicle card */}
                      <div className="card border border-slate-100 rounded-3 p-3 mb-3 bg-light">
                        <h6 className="fw-bold mb-2 text-slate-700" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>
                          🚗 Phương tiện
                        </h6>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-dark font-monospace px-2.5 py-1.5" style={{ fontSize: '0.9rem' }}>{selectedDetail.vehiclePlate}</span>
                          <span className="text-slate-700 fw-bold">{selectedDetail.brand} {selectedDetail.model}</span>
                        </div>
                        <div className="text-muted small mt-2">Phân khúc: {selectedDetail.vehicleClass}</div>
                      </div>

                      {/* Request info card */}
                      <div className="card border border-slate-100 rounded-3 p-3 mb-3">
                        <h6 className="fw-bold mb-3 text-slate-700" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>
                          📝 Thông tin yêu cầu
                        </h6>
                        <div className="mb-2">
                          <strong>Trạng thái: </strong> {getStatusBadge(selectedDetail.status)}
                        </div>
                        <div className="mb-2 small text-muted">
                          <strong>Ngày gửi: </strong> {formatDate(selectedDetail.submittedAt)}
                        </div>
                        {selectedDetail.description && (
                          <div className="mb-2 text-slate-700" style={{ fontSize: '0.9rem' }}>
                            <strong>Lý do: </strong> {selectedDetail.description}
                          </div>
                        )}
                        
                        {/* Status notification messages */}
                        {selectedDetail.status === 'Approved' && (
                          <div className="alert alert-success py-2.5 mt-3 mb-0" style={{ fontSize: '13px' }}>
                            <div><strong>✓ Trạng thái:</strong> Đã phê duyệt</div>
                            {selectedDetail.reviewedAt && <div><strong>✓ Ngày phê duyệt:</strong> {formatDate(selectedDetail.reviewedAt)}</div>}
                            {selectedDetail.reviewedByName && <div><strong>✓ Người phê duyệt:</strong> {selectedDetail.reviewedByName}</div>}
                            <div className="mt-1 text-success fw-bold">✓ Xe đã được chuyển sang chủ mới.</div>
                          </div>
                        )}
                        {selectedDetail.status === 'Rejected' && (
                          <div className="alert alert-danger py-2.5 mt-3 mb-0" style={{ fontSize: '13px' }}>
                            <div><strong>Trạng thái:</strong> Bị từ chối</div>
                            {selectedDetail.rejectReason && <div><strong>Lý do từ chối:</strong> {selectedDetail.rejectReason}</div>}
                            {selectedDetail.reviewedAt && <div><strong>Ngày xử lý:</strong> {formatDate(selectedDetail.reviewedAt)}</div>}
                          </div>
                        )}
                        {selectedDetail.status === 'Cancelled' && (
                          <div className="alert alert-secondary py-2.5 mt-3 mb-0" style={{ fontSize: '13px' }}>
                            <div><strong>Trạng thái:</strong> Đã hủy</div>
                            <div className="text-secondary fw-bold">Đã hủy bởi khách hàng.</div>
                            {selectedDetail.reviewedAt && <div><strong>Ngày hủy:</strong> {formatDate(selectedDetail.reviewedAt)}</div>}
                          </div>
                        )}
                      </div>

                      {/* Timeline */}
                      <div className="card border border-slate-100 rounded-3 p-3">
                        <h6 className="fw-bold mb-3 text-slate-700" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>
                          🕒 Tiến độ yêu cầu
                        </h6>
                        {renderTimeline(selectedDetail.status, selectedDetail.submittedAt, selectedDetail.reviewedAt, selectedDetail.rejectReason, selectedDetail.reviewedByName)}
                      </div>
                    </div>

                    {/* Right: Documents */}
                    <div className="col-md-5">
                      <div className="card border border-slate-100 rounded-3 p-3 h-100 d-flex flex-column">
                        <h6 className="fw-bold mb-3 text-slate-700" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>
                          📄 Tài liệu đính kèm ({selectedDetail.documents?.length || 0})
                        </h6>

                        {/* Document items */}
                        <div className="flex-grow-1 overflow-auto mb-3" style={{ maxHeight: '280px' }}>
                          {selectedDetail.documents && selectedDetail.documents.length > 0 ? (
                            <div className="list-group list-group-flush border-bottom">
                              {selectedDetail.documents.map((doc) => (
                                <div key={doc.documentId} className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                                  <div className="text-truncate me-2" style={{ maxWidth: '70%' }}>
                                    <div className="fw-semibold text-slate-800 text-truncate" style={{ fontSize: '12px' }}>
                                      <i className={`fas ${isImage(doc.contentType) ? 'fa-image text-success' : 'fa-file-pdf text-danger'} me-1.5`}></i>
                                      {doc.fileName}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '10px' }}>
                                      {getFileExt(doc.fileName)} • {formatFileSize(doc.fileSize)}
                                    </div>
                                  </div>
                                  <div className="d-flex gap-1">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light p-1 px-2 text-slate-600 rounded"
                                      title="Xem trước"
                                      onClick={() => setPreviewDoc(doc)}
                                    >
                                      <i className="fas fa-eye" style={{ fontSize: '0.8rem' }}></i>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light p-1 px-2 text-slate-600 rounded"
                                      title="Tải xuống"
                                      onClick={() => handleDownloadDocument(doc)}
                                    >
                                      <i className="fas fa-download" style={{ fontSize: '0.8rem' }}></i>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-muted py-4 small">Chưa có tài liệu đính kèm.</div>
                          )}
                        </div>

                        {/* Upload Additional Documents */}
                        {selectedDetail.status === 'Pending' && (
                          <div className="border-top pt-3 mt-auto">
                            <h6 className="fw-bold mb-2 text-slate-600" style={{ fontSize: '0.8rem' }}>
                              Bổ sung tài liệu
                            </h6>

                            <div className="mb-2">
                              <input
                                type="file"
                                ref={additionalFileInputRef}
                                className="form-control form-control-sm"
                                accept=".pdf,.jpg,.jpeg,.png"
                                multiple
                                onChange={handleAdditionalFileChange}
                                disabled={additionalSubmitting}
                                style={{ fontSize: '12px' }}
                              />
                            </div>

                            {/* List of files staging to be uploaded */}
                            {additionalFiles.length > 0 && (
                              <div className="border rounded p-2 bg-light mb-2" style={{ maxHeight: '110px', overflowY: 'auto' }}>
                                {additionalFiles.map((f, idx) => (
                                  <div key={idx} className="d-flex justify-content-between align-items-center py-1 border-bottom last-border-0" style={{ fontSize: '11px' }}>
                                    <span className="text-truncate text-slate-700 me-2" style={{ maxWidth: '80%' }}>📄 {f.name}</span>
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 text-danger text-decoration-none font-weight-bold"
                                      onClick={() => removeAdditionalFile(idx)}
                                      disabled={additionalSubmitting}
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Upload progress indicator */}
                            {additionalSubmitting && (
                              <div className="mb-2">
                                <div className="d-flex justify-content-between mb-1 small text-muted" style={{ fontSize: '10px' }}>
                                  <span>Đang tải lên...</span>
                                  <span>{additionalProgress}%</span>
                                </div>
                                <div className="progress" style={{ height: '4px' }}>
                                  <div
                                    className="progress-bar bg-info progress-bar-striped progress-bar-animated"
                                    role="progressbar"
                                    style={{ width: `${additionalProgress}%` }}
                                    aria-valuenow={additionalProgress}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                  ></div>
                                </div>
                              </div>
                            )}

                            <button
                              type="button"
                              className="btn btn-sm app-btn-blue-v2 w-100"
                              onClick={handleUploadAdditional}
                              disabled={additionalSubmitting || additionalFiles.length === 0}
                              style={{ padding: '6px 12px', fontSize: '12px', height: 'auto' }}
                            >
                              {additionalSubmitting ? 'ĐANG TẢI LÊN...' : 'LƯU BỔ SUNG'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 p-3 px-4 bg-light d-flex justify-content-end gap-2">
                {selectedDetail && selectedDetail.status === 'Pending' && !detailLoading && (
                  <button
                    type="button"
                    className="btn btn-outline-danger py-2 px-4 rounded-3 text-sm fw-bold border-1"
                    onClick={() => handleCancelTransferRequest(selectedDetail.requestId)}
                    disabled={cancelSubmitting}
                  >
                    {cancelSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        ĐANG HỦY...
                      </>
                    ) : (
                      'HỦY YÊU CẦU'
                    )}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary py-2 px-4 rounded-3 text-sm fw-bold border-0"
                  style={{ backgroundColor: '#e2e8f0', color: '#475569' }}
                  onClick={() => setSelectedDetail(null)}
                >
                  ĐÓNG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', zIndex: 1060 }} onClick={() => setPreviewDoc(null)}>
          <div className="modal-dialog modal-xl modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4 bg-white overflow-hidden">
              <div className="modal-header bg-light border-0 p-3 px-4 d-flex justify-content-between align-items-center">
                <h6 className="modal-title fw-bold m-0 text-slate-800"><i className="fas fa-file me-2 text-info"></i>{previewDoc.fileName}</h6>
                <button type="button" className="btn-close" onClick={() => setPreviewDoc(null)}></button>
              </div>
              <div className="modal-body text-center p-4" style={{ minHeight: '400px', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {previewBlobLoading ? (
                  <div className="spinner-border text-info" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                  </div>
                ) : previewBlobUrl ? (
                  isImage(previewDoc.contentType) ? (
                    <img
                      src={previewBlobUrl}
                      alt={previewDoc.fileName}
                      style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }}
                    />
                  ) : (
                    <iframe
                      src={previewBlobUrl}
                      title={previewDoc.fileName}
                      style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px' }}
                    ></iframe>
                  )
                ) : (
                  <div className="text-white small">Không thể hiển thị tài liệu này.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal (Preserved modal editing popup layout) */}
      {editingVehicle && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
              <div className="modal-header border-0 bg-light p-3 px-4 d-flex justify-content-between align-items-center">
                <h6 className="modal-title fw-bold m-0" style={{ color: 'var(--navy-dark)' }}>
                  CHỈNH SỬA PHƯƠNG TIỆN
                </h6>
                <button type="button" className="btn-close shadow-none" onClick={() => setEditingVehicle(null)}></button>
              </div>
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
                  <small className="text-muted mt-1 d-block text-secondary" style={{ fontSize: '0.75rem' }}>Biển số xe không được phép thay đổi.</small>
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
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">LOẠI XE *</label>
                  <select
                    className="form-select py-2.5"
                    value={editVehicleClass}
                    onChange={(e) => setEditVehicleClass(e.target.value)}
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
                <button type="button" className="app-btn-primary py-2 px-4 text-dark fw-bold m-0" style={{ backgroundColor: '#008ecf', color: '#ffffff' }} onClick={handleSaveEdit} disabled={loading}>
                  {loading ? 'ĐANG LƯU...' : 'CẬP NHẬT'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerVehicles;
