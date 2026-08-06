import { useState, useEffect } from 'react';
import { customerService } from '../services/customerService';

export const getBrandName = (b) => (typeof b === 'string' ? b : (b?.name || b?.Name || b?.brand || ''));
export const getModelName = (m) => (typeof m === 'string' ? m : (m?.name || m?.Name || ''));

export const useVehicleMasterData = (selectedBrand = '') => {
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch all brands once on mount
  useEffect(() => {
    let isMounted = true;
    const fetchBrands = async () => {
      setLoadingBrands(true);
      try {
        const data = await customerService.getVehicleBrands();
        if (isMounted && Array.isArray(data)) {
          setBrands(data);
        }
      } catch (err) {
        console.error('Failed to fetch vehicle brands:', err);
      } finally {
        if (isMounted) setLoadingBrands(false);
      }
    };
    fetchBrands();
    return () => { isMounted = false; };
  }, []);

  // Fetch models whenever selectedBrand changes
  useEffect(() => {
    if (!selectedBrand) {
      setModels([]);
      return;
    }

    let isMounted = true;
    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const data = await customerService.getVehicleModels(selectedBrand);
        if (isMounted && Array.isArray(data)) {
          setModels(data);
        } else if (isMounted) {
          setModels([]);
        }
      } catch (err) {
        console.error('Failed to fetch vehicle models:', err);
        if (isMounted) setModels([]);
      } finally {
        if (isMounted) setLoadingModels(false);
      }
    };

    fetchModels();
    return () => { isMounted = false; };
  }, [selectedBrand]);

  return {
    brands,
    models,
    loadingBrands,
    loadingModels,
    getBrandName,
    getModelName
  };
};
