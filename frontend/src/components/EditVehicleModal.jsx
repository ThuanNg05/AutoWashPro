import React, { useState, useEffect } from 'react';
import { useVehicleMasterData, getBrandName, getModelName } from '../hooks/useVehicleMasterData';

const EditVehicleModal = ({
  vehicle,
  onClose,
  onSaveEdit,
  isSaving
}) => {
  if (!vehicle) return null;

  const initialBrand = vehicle.brand || '';
  const initialModel = vehicle.model || '';
  const initialClass = vehicle.vehicleClass || '';

  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [selectedModel, setSelectedModel] = useState(initialModel);
  const [vehicleClass, setVehicleClass] = useState(initialClass);

  const {
    brands,
    models,
    loadingBrands,
    loadingModels
  } = useVehicleMasterData(selectedBrand);

  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  // Sync vehicleClass if selectedModel matches a model in loaded models
  useEffect(() => {
    if (selectedModel && models.length > 0) {
      const matched = models.find(m => getModelName(m).toLowerCase() === selectedModel.toLowerCase());
      if (matched) {
        setVehicleClass(matched.vehicleClass || matched.VehicleClass || '');
      }
    }
  }, [models, selectedModel]);

  // Check if form has unsaved modifications
  const isDirty =
    selectedBrand.trim().toLowerCase() !== initialBrand.trim().toLowerCase() ||
    selectedModel.trim().toLowerCase() !== initialModel.trim().toLowerCase();

  const isFormValid = selectedBrand && selectedModel && vehicleClass && isDirty;

  const handleSelectBrand = (bName) => {
    setSelectedBrand(bName);
    setSelectedModel('');
    setVehicleClass('');
    setShowBrandDropdown(false);
    setBrandSearch('');
  };

  const handleSelectModel = (modelObj) => {
    const mName = getModelName(modelObj);
    setSelectedModel(mName);
    setVehicleClass(modelObj.vehicleClass || modelObj.VehicleClass || '');
    setShowModelDropdown(false);
    setModelSearch('');
  };

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowUnsavedPrompt(false);
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid || isSaving) return;
    onSaveEdit(vehicle.vehicleId, selectedBrand, selectedModel, vehicleClass);
  };

  const filteredBrands = brands.filter(b =>
    getBrandName(b).toLowerCase().includes(brandSearch.toLowerCase())
  );

  const filteredModels = models.filter(m =>
    getModelName(m).toLowerCase().includes(modelSearch.toLowerCase())
  );

  return (
    <>
      <div
        className="modal show d-block"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
            
            {/* Modal Header */}
            <div className="modal-header border-0 bg-light p-3 px-4 d-flex justify-content-between align-items-center">
              <h6 className="modal-title fw-bold m-0" style={{ color: 'var(--navy-dark)', fontSize: '17px' }}>
                CHỈNH SỬA PHƯƠNG TIỆN
              </h6>
              <button
                type="button"
                className="btn-close shadow-none"
                onClick={handleAttemptClose}
              ></button>
            </div>

            {/* Modal Body */}
            <div className="modal-body p-4 text-start">
              <form onSubmit={handleSubmit}>

                {/* ROW 1: License Plate (Full Width - Readonly with Lock Icon) */}
                <div className="mb-4">
                  <label className="form-label input-label-v2 mb-1 d-flex align-items-center gap-1.5">
                    <i className="fas fa-lock text-muted" style={{ fontSize: '13px' }}></i>
                    Biển số xe (Không thể thay đổi)
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-custom bg-light font-monospace uppercase fw-bold text-slate-700"
                    value={vehicle.licensePlate}
                    disabled
                    readOnly
                    style={{ height: '46px', cursor: 'not-allowed' }}
                  />
                  <small className="helper-text-v2 mt-1.5 d-block text-muted">
                    Biển số xe không được phép thay đổi sau khi đăng ký.
                  </small>
                </div>

                {/* ROW 2: Brand, Model, Vehicle Class (3 Equal Columns) */}
                <div className="row g-3 text-start mb-4">

                  {/* Brand Searchable Dropdown */}
                  <div className="col-md-4 position-relative">
                    <label className="form-label input-label-v2 mb-1">Hãng xe *</label>
                    <div
                      className="form-select form-select-custom d-flex align-items-center justify-content-between"
                      style={{ height: '46px', cursor: 'pointer' }}
                      onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                    >
                      <span className={selectedBrand ? 'text-dark fw-medium' : 'text-muted'}>
                        {selectedBrand || (loadingBrands ? 'Đang tải hãng xe...' : '-- Chọn hãng xe --')}
                      </span>
                      <i className="fas fa-chevron-down text-muted small"></i>
                    </div>

                    {showBrandDropdown && (
                      <div
                        className="position-absolute start-0 end-0 bg-white border border-slate-200 rounded-3 shadow-lg p-2 mt-1"
                        style={{ zIndex: 1060, maxHeight: '240px', overflowY: 'auto' }}
                      >
                        <input
                          type="text"
                          className="form-control form-control-sm mb-2"
                          placeholder="Tìm hãng xe..."
                          value={brandSearch}
                          onChange={(e) => setBrandSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        {filteredBrands.length === 0 ? (
                          <div className="text-muted p-2 small text-center">Không tìm thấy hãng xe</div>
                        ) : (
                          filteredBrands.map((b, idx) => {
                            const bName = getBrandName(b);
                            return (
                              <div
                                key={b?.id || b?.Id || idx}
                                className={`p-2 rounded-2 cursor-pointer small ${selectedBrand === bName ? 'bg-primary text-white font-medium' : 'hover-bg-light text-slate-700'}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSelectBrand(bName)}
                              >
                                {bName}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Model Searchable Dropdown */}
                  <div className="col-md-4 position-relative">
                    <label className="form-label input-label-v2 mb-1">Dòng xe *</label>
                    <div
                      className={`form-select form-select-custom d-flex align-items-center justify-content-between ${!selectedBrand ? 'bg-light text-muted opacity-75' : ''}`}
                      style={{ height: '46px', cursor: selectedBrand ? 'pointer' : 'not-allowed' }}
                      onClick={() => selectedBrand && setShowModelDropdown(!showModelDropdown)}
                    >
                      <span className={selectedModel ? 'text-dark fw-medium' : 'text-muted'}>
                        {selectedModel || (!selectedBrand ? '-- Chọn hãng xe trước --' : loadingModels ? 'Đang tải dòng xe...' : '-- Chọn dòng xe --')}
                      </span>
                      <i className="fas fa-chevron-down text-muted small"></i>
                    </div>

                    {showModelDropdown && selectedBrand && (
                      <div
                        className="position-absolute start-0 end-0 bg-white border border-slate-200 rounded-3 shadow-lg p-2 mt-1"
                        style={{ zIndex: 1060, maxHeight: '240px', overflowY: 'auto' }}
                      >
                        <input
                          type="text"
                          className="form-control form-control-sm mb-2"
                          placeholder="Tìm dòng xe..."
                          value={modelSearch}
                          onChange={(e) => setModelSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        {filteredModels.length === 0 ? (
                          <div className="text-muted p-2 small text-center">Không tìm thấy dòng xe</div>
                        ) : (
                          filteredModels.map((m, idx) => {
                            const mName = getModelName(m);
                            const vClass = m.vehicleClass || m.VehicleClass || '';
                            return (
                              <div
                                key={m?.id || m?.Id || idx}
                                className={`p-2 rounded-2 cursor-pointer small d-flex justify-content-between align-items-center ${selectedModel === mName ? 'bg-primary text-white font-medium' : 'hover-bg-light text-slate-700'}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSelectModel(m)}
                              >
                                <span>{mName}</span>
                                {vClass && (
                                  <span className={`badge ${selectedModel === mName ? 'bg-light text-primary' : 'bg-secondary bg-opacity-10 text-secondary'} ms-2`}>
                                    {vClass}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vehicle Class (Read-only / Auto determined) */}
                  <div className="col-md-4">
                    <label className="form-label input-label-v2 mb-1">Phân khúc (Tự động)</label>
                    <input
                      type="text"
                      className="form-control form-control-custom bg-light text-slate-700 fw-semibold"
                      value={vehicleClass}
                      placeholder="Tự động xác định"
                      readOnly
                      disabled
                      style={{ height: '46px', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="modal-footer border-0 p-0 pt-3 bg-white d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary py-2.5 px-4 rounded-3 text-sm fw-bold border-0"
                    style={{ backgroundColor: '#e2e8f0', color: '#475569' }}
                    onClick={handleAttemptClose}
                    disabled={isSaving}
                  >
                    HỦY BỎ
                  </button>

                  <button
                    type="submit"
                    className="app-btn-primary py-2.5 px-4 text-white fw-bold m-0"
                    style={{ backgroundColor: isFormValid ? '#008ecf' : '#cbd5e1', cursor: isFormValid ? 'pointer' : 'not-allowed' }}
                    disabled={!isFormValid || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1.5" role="status"></span>
                        ĐANG LƯU...
                      </>
                    ) : (
                      'CẬP NHẬT'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedPrompt && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1070 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg rounded-4 p-3 text-center bg-white">
              <div className="text-warning mb-2" style={{ fontSize: '32px' }}>⚠️</div>
              <h6 className="fw-bold mb-2 text-slate-800">Hủy thay đổi?</h6>
              <p className="text-muted small mb-4">
                Bạn có các thay đổi chưa được lưu. Bạn có chắc chắn muốn hủy bỏ?
              </p>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary w-50 py-2 small fw-bold"
                  onClick={() => setShowUnsavedPrompt(false)}
                >
                  Giữ lại
                </button>
                <button
                  type="button"
                  className="btn btn-danger w-50 py-2 small fw-bold"
                  onClick={handleConfirmDiscard}
                >
                  Hủy thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditVehicleModal;
