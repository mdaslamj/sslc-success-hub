import { useCallback } from "react";
import {
  trackProductEvent,
  type ProductEvent,
} from "@/lib/production/product-analytics";

export function useProductAnalytics() {
  const track = useCallback((evt: ProductEvent) => trackProductEvent(evt), []);
  return { track };
}