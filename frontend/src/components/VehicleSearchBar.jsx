import React from 'react';

const VehicleSearchBar = ({ searchQuery, setSearchQuery }) => {
  return (
    <div className="vc-search-wrapper">
      <i className="fas fa-search"></i>
      <input
        type="text"
        className="vc-search-input"
        placeholder="Tìm theo biển số, hãng xe hoặc dòng xe..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
};

export default VehicleSearchBar;
