import React from 'react';

const FILTER_OPTIONS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'upcoming', label: 'Có lịch hẹn' },
  { key: 'no-booking', label: 'Chưa có lịch' },
  { key: 'recent', label: 'Mới đăng ký' }
];

const VehicleFilters = ({ activeFilter, setActiveFilter }) => {
  return (
    <div className="vc-filters">
      {FILTER_OPTIONS.map(f => (
        <button
          key={f.key}
          className={`vc-filter-pill ${activeFilter === f.key ? 'active' : ''}`}
          onClick={() => setActiveFilter(f.key)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
};

export default VehicleFilters;
