import React, { useState } from 'react';
import { useVehicleMasterData, getBrandName, getModelName } from '../hooks/useVehicleMasterData';

const VN_PROVINCE_CODES = new Set([
  '11', '12', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27',
  '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '40', '41', '43', '47', '48',
  '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64',
  '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80',
  '81', '82', '83', '84', '85', '86', '88', '89', '90', '92', '93', '94', '95', '97', '98', '99',
]);

const normalizeVnPlate = (plate) => (plate || '').trim().toUpperCase().replace(/[\s\-.]/g, '');

const isValidVnPlate = (plate) => {
  const raw = (plate || '').trim().toUpperCase();
  if (!raw) return false;
  const match = raw.match(/^(\d{2})(?:[A-HK-NPS-VX-Z]|LD)-?(?:\d{4,5}|\d{2,3}\.\d{2})$/);
  if (!match) return false;
  return VN_PROVINCE_CODES.has(match[1]);
};

const AddVehicleForm = ({
  licensePlate,
  setLicensePlate,
  selectedBrand,
  setSelectedBrand,
  selectedModel,
  setSelectedModel,
  vehicleClass,
  setVehicleClass,
  onSubmitSendOtp,
  isSendingOtp,
  conflictError,
  setConflictError
}) => {
  const [formatError, setFormatError] = useState(null);
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const {
    brands,
    models,
    loadingBrands,
    loadingModels
  } = useVehicleMasterData(selectedBrand, selectedModel);

  // Handle License Plate input change
  const handlePlateChange = (e) => {
    const val = e.target.value;
    setLicensePlate(val);
    setConflictError(null);

    const clean = normalizeVnPlate(val);
    if (!clean) {
      setFormatError(null);
      return;
    }

    if (clean.length >= 7 && !isValidVnPlate(val)) {
      setFormatError('Biển số ô tô không đúng định dạng (VD: 51H-888.88).');
    } else {
      setFormatError(null);
    }
  };

  // Filtered brands
  const filteredBrands = brands.filter(b =>
    getBrandName(b).toLowerCase().includes(brandSearch.toLowerCase())
  );

  // Filtered models
  const filteredModels = models.filter(m =>
    getModelName(m).toLowerCase().includes(modelSearch.toLowerCase())
  );

  const handleSelectBrand = (brandName) => {
    setSelectedBrand(brandName);
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

  const isFormValid =
    licensePlate.trim() &&
    !formatError &&
    !conflictError &&
    selectedBrand &&
    selectedModel &&
    vehicleClass;

  return (
    <div id="vehicle-registration-section" className="custom-card-v2">
      <h5
        className="fw-bold mb-4 text-start text-dark d-flex align-items-center"
        style={{ fontSize: '18px', fontFamily: 'Be Vietnam Pro, sans-serif' }}
      >
        Đăng ký phương tiện mới
      </h5>

      <form onSubmit={(e) => { e.preventDefault(); if (isFormValid && !isSendingOtp) onSubmitSendOtp(); }}>
        {/* ROW 1: License Plate (Full Width) */}
        <div className="mb-4 text-start">
          <label className="form-label input-label-v2 mb-1">Biển số xe *</label>
          <input
            type="text"
            className={`form-control form-control-custom ${formatError || conflictError ? 'is-invalid border-danger' : ''}`}
            placeholder="Ví dụ: 51H-888.88"
            value={licensePlate}
            onChange={handlePlateChange}
            style={{ height: '46px', fontSize: '15px' }}
          />

          {/* Inline Format Error */}
          {formatError && (
            <div className="invalid-feedback d-block mt-1.5 fw-semibold" style={{ fontSize: '13px' }}>
              {formatError}
            </div>
          )}

          {/* Inline HTTP 409 Conflict Error */}
          {conflictError && (
            <div className="invalid-feedback d-block mt-1.5 fw-bold text-danger" style={{ fontSize: '13px' }}>
              Biển số xe này đã được đăng ký trên hệ thống.
            </div>
          )}

          {!formatError && !conflictError && (
            <small className="helper-text-v2 mt-1.5 d-block">
              Nhập biển số theo đúng định dạng ô tô Việt Nam (VD: 51H-888.88).
            </small>
          )}
        </div>

        {/* ROW 2: Brand, Model, Vehicle Class (3 Equal Columns) */}
        <div className="row g-3 text-start mb-4">

          {/* Brand Searchable Select */}
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
                style={{ zIndex: 1050, maxHeight: '240px', overflowY: 'auto' }}
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

          {/* Model Searchable Select */}
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
                style={{ zIndex: 1050, maxHeight: '240px', overflowY: 'auto' }}
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
              placeholder="Tự động xác định từ Dòng xe"
              readOnly
              disabled
              style={{ height: '46px', cursor: 'not-allowed' }}
            />
          </div>
        </div>

        {/* ROW 3: Primary Action Button */}
        <div>
          <button
            type="submit"
            className="app-btn-blue-v2 w-100"
            disabled={!isFormValid || isSendingOtp}
            style={{ height: '46px', fontSize: '15px' }}
          >
            {isSendingOtp ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                ĐANG GỬI MÃ XÁC THỰC...
              </>
            ) : (
              'Xác thực qua Email'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddVehicleForm;
