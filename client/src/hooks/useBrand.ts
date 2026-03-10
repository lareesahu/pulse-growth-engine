import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";

const BRAND_KEY = "pulse_active_brand_id";

export function useBrand() {
  const { isAuthenticated } = useAuth();
  const { data: brands = [], isLoading } = trpc.brand.list.useQuery(undefined, { enabled: isAuthenticated });

  const [activeBrandId, setActiveBrandIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(BRAND_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  // Validate stored brand ID against available brands — fall back to default if stale
  useEffect(() => {
    if (!isLoading && brands.length > 0) {
      const storedId = activeBrandId;
      const isValid = storedId !== null && brands.some(b => b.id === storedId);
      if (!isValid) {
        // Stored ID is stale or missing — pick the default brand
        const defaultBrand = brands.find(b => b.isDefault) || brands[0];
        setActiveBrandIdState(defaultBrand.id);
        localStorage.setItem(BRAND_KEY, String(defaultBrand.id));
      }
    }
  }, [brands, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveBrandId = (id: number) => {
    setActiveBrandIdState(id);
    localStorage.setItem(BRAND_KEY, String(id));
  };

  // Resolve to the actual brand object — if stored ID not in list, use first brand
  const activeBrand = brands.find(b => b.id === activeBrandId) || brands[0];

  return { activeBrand, activeBrandId: activeBrand?.id, setActiveBrandId, brands, isLoading };
}
