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

  // Auto-select first brand if none stored
  useEffect(() => {
    if (!isLoading && brands.length > 0 && !activeBrandId) {
      const defaultBrand = brands.find(b => b.isDefault) || brands[0];
      setActiveBrandIdState(defaultBrand.id);
      localStorage.setItem(BRAND_KEY, String(defaultBrand.id));
    }
  }, [brands, isLoading, activeBrandId]);

  const setActiveBrandId = (id: number) => {
    setActiveBrandIdState(id);
    localStorage.setItem(BRAND_KEY, String(id));
  };

  const activeBrand = brands.find(b => b.id === activeBrandId) || brands[0];

  return { activeBrand, activeBrandId: activeBrand?.id, setActiveBrandId, brands, isLoading };
}
