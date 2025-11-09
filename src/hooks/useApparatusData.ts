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

  // Fetch special code elements from technical elements table (with symbols)
  const { data: specialCodeElements = [] } = useQuery({
    queryKey: ["specialCodeElements", apparatus],
    queryFn: async () => {
      if (!apparatus) return [];

      let data, error;

      switch (apparatus) {
        case 'hoop':
          ({ data, error } = await supabase
            .from('hoop_technical_elements')
            .select('code, symbol_image')
            .eq('special_code', true));
          break;
        case 'ball':
          ({ data, error } = await supabase
            .from('ball_technical_elements')
            .select('code, symbol_image')
            .eq('special_code', true));
          break;
        case 'clubs':
          ({ data, error } = await supabase
            .from('clubs_technical_elements')
            .select('code, symbol_image')
            .eq('special_code', true));
          break;
        case 'ribbon':
          ({ data, error } = await supabase
            .from('ribbon_technical_elements')
            .select('code, symbol_image')
            .eq('special_code', true));
          break;
        default:
          return [];
      }

      if (error) throw error;
      return data || [];
    },
    enabled: !!apparatus,
  });

  // Extract just the codes for backwards compatibility
  const specialCodes = specialCodeElements.map(item => item.code);

  // Fetch all technical elements to get symbols for DA codes
  const { data: technicalElements = [] } = useQuery({
    queryKey: ["technicalElements", apparatus],
    queryFn: async () => {
      if (!apparatus) return [];

      let data, error;

      switch (apparatus) {
        case 'hoop':
          ({ data, error } = await supabase
            .from('hoop_technical_elements')
            .select('code, symbol_image'));
          break;
        case 'ball':
          ({ data, error } = await supabase
            .from('ball_technical_elements')
            .select('code, symbol_image'));
          break;
        case 'clubs':
          ({ data, error } = await supabase
            .from('clubs_technical_elements')
            .select('code, symbol_image'));
          break;
        case 'ribbon':
          ({ data, error } = await supabase
            .from('ribbon_technical_elements')
            .select('code, symbol_image'));
          break;
        default:
          return [];
      }

      if (error) throw error;
      return data || [];
    },
    enabled: !!apparatus,
  });

  // Fetch apparatus-specific data from separate DA tables
  const { data: apparatusData, isLoading, error } = useQuery({
    queryKey: ["apparatus", apparatus, technicalElements],
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

      // Create a map of code -> symbol_image from technical elements
      const symbolMap = new Map<string, string | null>(
        technicalElements.map((te: any) => [te.code, te.symbol_image || null])
      );

      // Transform to CombinedApparatusData format
      const combined: CombinedApparatusData[] = elements.map((element) => {
        // Try exact match first
        let symbolImage = symbolMap.get(element.code) || null;
        
        // If no exact match, try to find a technical element with a code starting with this code followed by a dot
        if (!symbolImage) {
          const fallbackTe = technicalElements.find((te: any) => 
            te.code.startsWith(`${element.code}.`) && te.symbol_image
          );
          if (fallbackTe) {
            symbolImage = fallbackTe.symbol_image;
          }
        }

        return {
          id: element.id,
          code: element.code,
          description: element.description,
          symbol_image: symbolImage,
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
        };
      });

      return combined;
    },
    enabled: !!apparatus && technicalElements.length > 0,
  });

  // Fetch DA comments for this apparatus
  const { data: daComments = [] } = useQuery({
    queryKey: ['da-comments', apparatus],
    queryFn: async () => {
      if (!apparatus) return [];
      
      const { data, error } = await supabase
        .from('da_comments')
        .select('*')
        .eq('apparatus', apparatus);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!apparatus,
  });

  return {
    apparatusData: apparatusData || [],
    criteria,
    specialCodes,
    specialCodeElements,
    daComments,
    isLoading,
    error,
  };
};
