import { useQuery } from "@tanstack/react-query";
import {
  fetchLibraryCategories,
  fetchLibraryResources,
  type LibraryFilter,
} from "@/integrations/firebase/services/library-resources";

export function useLibraryResources(filter: LibraryFilter = {}) {
  return useQuery({
    queryKey: ["library-resources", filter],
    queryFn: () => fetchLibraryResources(filter),
    staleTime: 5 * 60_000,
  });
}

export function useLibraryCategories() {
  return useQuery({
    queryKey: ["library-categories"],
    queryFn: fetchLibraryCategories,
    staleTime: 10 * 60_000,
  });
}
