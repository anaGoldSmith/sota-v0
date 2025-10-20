import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ApparatusBase, ApparatusControl, Criterion, CombinedApparatusData, ApparatusType } from "@/types/apparatus";

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

  // Fetch apparatus-specific data
  const { data: apparatusData, isLoading, error } = useQuery({
    queryKey: ["apparatus", apparatus],
    queryFn: async () => {
      if (!apparatus) return null;

      let bases: ApparatusBase[] = [];
      let controls: ApparatusControl[] = [];

      // Fetch bases based on apparatus type
      if (apparatus === 'hoop') {
        const { data, error } = await supabase.from('hoop_bases').select('*').order('code');
        if (error) throw error;
        bases = data as ApparatusBase[];
      } else if (apparatus === 'ball') {
        const { data, error } = await supabase.from('ball_bases').select('*').order('code');
        if (error) throw error;
        bases = data as ApparatusBase[];
      } else if (apparatus === 'clubs') {
        const { data, error } = await supabase.from('clubs_bases').select('*').order('code');
        if (error) throw error;
        bases = data as ApparatusBase[];
      } else if (apparatus === 'ribbon') {
        const { data, error } = await supabase.from('ribbon_bases').select('*').order('code');
        if (error) throw error;
        bases = data as ApparatusBase[];
      }

      // Fetch control data based on apparatus type
      if (apparatus === 'hoop') {
        const { data, error } = await supabase.from('hoop_control').select('*').order('code');
        if (error) throw error;
        controls = data as ApparatusControl[];
      } else if (apparatus === 'ball') {
        const { data, error } = await supabase.from('ball_control').select('*').order('code');
        if (error) throw error;
        controls = data as ApparatusControl[];
      } else if (apparatus === 'clubs') {
        const { data, error } = await supabase.from('clubs_control').select('*').order('code');
        if (error) throw error;
        controls = data as ApparatusControl[];
      } else if (apparatus === 'ribbon') {
        const { data, error } = await supabase.from('ribbon_control').select('*').order('code');
        if (error) throw error;
        controls = data as ApparatusControl[];
      }

      // Combine the data
      const combined: CombinedApparatusData[] = bases.map((base) => {
        const control = controls.find((c) => c.code === base.code);
        
        return {
          id: base.id,
          code: base.code,
          description: base.description,
          symbol_image: base.symbol_image,
          value: base.value,
          criteria: {
            Cr1V: control?.Cr1V || null,
            Cr2H: control?.Cr2H || null,
            Cr3L: control?.Cr3L || null,
            Cr7R: control?.Cr7R || null,
            Cr4F: control?.Cr4F || null,
            Cr5W: control?.Cr5W || null,
            Cr6DB: control?.Cr6DB || null,
          },
        };
      });

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
