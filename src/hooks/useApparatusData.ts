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

  // Fetch special codes from technical elements table
  const { data: specialCodes = [] } = useQuery({
    queryKey: ["specialCodes", apparatus],
    queryFn: async () => {
      if (!apparatus) return [];

      let data, error;

      switch (apparatus) {
        case 'hoop':
          ({ data, error } = await supabase
            .from('hoop_technical_elements')
            .select('code')
            .eq('special_code', true));
          break;
        case 'ball':
          ({ data, error } = await supabase
            .from('ball_technical_elements')
            .select('code')
            .eq('special_code', true));
          break;
        case 'clubs':
          ({ data, error } = await supabase
            .from('clubs_technical_elements')
            .select('code')
            .eq('special_code', true));
          break;
        case 'ribbon':
          ({ data, error } = await supabase
            .from('ribbon_technical_elements')
            .select('code')
            .eq('special_code', true));
          break;
        default:
          return [];
      }

      if (error) throw error;
      return (data || []).map(item => item.code);
    },
    enabled: !!apparatus,
  });

  // Fetch apparatus-specific data from separate DA tables
  const { data: apparatusData, isLoading, error } = useQuery({
    queryKey: ["apparatus", apparatus],
    queryFn: async () => {
      if (!apparatus) return null;

      const tableMap: Record<ApparatusType, 'hoop_da' | 'ball_da' | 'clubs_da' | 'ribbon_da'> = {
        hoop: 'hoop_da',
        ball: 'ball_da',
        clubs: 'clubs_da',
        ribbon: 'ribbon_da'
      };

      const tableName = tableMap[apparatus] as 'hoop_da' | 'ball_da' | 'clubs_da' | 'ribbon_da';

      // Fetch DA elements from the appropriate table
      const { data, error } = await supabase
        .from(tableName)
        .select('*');

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
    specialCodes,
    isLoading,
    error,
  };
};
