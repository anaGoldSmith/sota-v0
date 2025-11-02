import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DAElement, Criterion, CombinedApparatusData, ApparatusType } from "@/types/apparatus";

// Natural sort comparator for alphanumeric codes (H1, H2, H10, H11, etc.)
const naturalSort = (a: string, b: string): number => {
  const extractNumber = (str: string): number => {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };
  return extractNumber(a) - extractNumber(b);
};

export const useApparatusData = (apparatus: ApparatusType | null) => {
  // Fetch criteria (static across all apparatus types)
  const { data: criteria = [] } = useQuery({
    queryKey: ["criteria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("criteria")
        .select("*")
        .order("code");

      if (error) throw error;
      return data as Criterion[];
    },
  });

  // Fetch apparatus-specific data from unified da_elements table
  const { data: apparatusData, isLoading, error } = useQuery({
    queryKey: ["apparatus", apparatus],
    queryFn: async () => {
      if (!apparatus) return null;

      // Fetch DA elements for specific apparatus type
      const { data, error } = await supabase
        .from('da_elements')
        .select('*')
        .eq('apparatus_type', apparatus);

      if (error) throw error;
      
      const elements = data as DAElement[];
      
      // Apply natural sort
      elements.sort((a, b) => naturalSort(a.code, b.code));

      // Transform to CombinedApparatusData format
      const combined: CombinedApparatusData[] = elements.map((element) => ({
        id: element.id,
        code: element.code,
        description: element.description,
        symbol_image: element.symbol_image,
        value: element.value,
        criteria: {
          Cr1V: element.Cr1V,
          Cr2H: element.Cr2H,
          Cr3L: element.Cr3L,
          Cr7R: element.Cr7R,
          Cr4F: element.Cr4F,
          Cr5W: element.Cr5W,
          Cr6DB: element.Cr6DB,
        },
      }));

      return combined;
    },
    enabled: !!apparatus,
  });

  return {
    apparatusData: apparatusData || [],
    criteria,
    isLoading,
    error,
  };
};
