import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parse } from "https://deno.land/std@0.224.0/csv/parse.ts";

interface DAElementRow {
  code: string;
  name: string;
  description: string;
  value: number;
  symbol_image?: string;
  Cr1V: boolean;
  Cr2H: boolean;
  Cr3L: boolean;
  Cr7R: boolean;
  Cr4F: boolean;
  Cr5W: boolean;
  Cr6DB: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc(
      "has_role",
      {
        _user_id: user.id,
        _role: "admin",
      }
    );

    if (roleError || !isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { csvContent, apparatusType } = await req.json();

    if (!csvContent) {
      throw new Error("Missing CSV content");
    }

    if (!apparatusType || !['hoop', 'ball', 'clubs', 'ribbon'].includes(apparatusType)) {
      throw new Error("Invalid or missing apparatus type");
    }

    // Map apparatus type to table name
    const tableMap: Record<string, string> = {
      hoop: 'hoop_da',
      ball: 'ball_da',
      clubs: 'clubs_da',
      ribbon: 'ribbon_da'
    };

    const tableName = tableMap[apparatusType];

    const records = parse(csvContent, {
      skipFirstRow: true,
      strip: true,
    });

    if (records.length === 0) {
      throw new Error("No data found in CSV");
    }

    // Get headers from first row
    const headerRow = csvContent.split('\n')[0].split(',').map((h: string) => h.trim().toLowerCase());
    
    const requiredHeaders = ["code", "name", "description", "value"];
    const missingHeaders = requiredHeaders.filter((h) => !headerRow.includes(h));

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(", ")}`);
    }

    const getColumnIndex = (name: string) => headerRow.indexOf(name);

    const codeIdx = getColumnIndex("code");
    const nameIdx = getColumnIndex("name");
    const descIdx = getColumnIndex("description");
    const valueIdx = getColumnIndex("value");
    const symbolIdx = getColumnIndex("symbol_image");
    const cr1vIdx = getColumnIndex("cr1v");
    const cr2hIdx = getColumnIndex("cr2h");
    const cr3lIdx = getColumnIndex("cr3l");
    const cr7rIdx = getColumnIndex("cr7r");
    const cr4fIdx = getColumnIndex("cr4f");
    const cr5wIdx = getColumnIndex("cr5w");
    const cr6dbIdx = getColumnIndex("cr6db");

    const daElements: DAElementRow[] = records
      .map((row: string[]) => {
        const code = row[codeIdx]?.trim();
        const name = row[nameIdx]?.trim();
        const description = row[descIdx]?.trim();
        const valueStr = row[valueIdx]?.trim();

        if (!code || !name || !description || !valueStr) {
          return null;
        }

        const value = parseFloat(valueStr);
        if (isNaN(value)) {
          throw new Error(`Invalid value for code ${code}: ${valueStr}`);
        }

        return {
          code,
          name,
          description,
          value,
          symbol_image: symbolIdx >= 0 ? (row[symbolIdx]?.trim() || null) : null,
          Cr1V: cr1vIdx >= 0 ? (row[cr1vIdx]?.trim() === 'Y') : false,
          Cr2H: cr2hIdx >= 0 ? (row[cr2hIdx]?.trim() === 'Y') : false,
          Cr3L: cr3lIdx >= 0 ? (row[cr3lIdx]?.trim() === 'Y') : false,
          Cr7R: cr7rIdx >= 0 ? (row[cr7rIdx]?.trim() === 'Y') : false,
          Cr4F: cr4fIdx >= 0 ? (row[cr4fIdx]?.trim() === 'Y') : false,
          Cr5W: cr5wIdx >= 0 ? (row[cr5wIdx]?.trim() === 'Y') : false,
          Cr6DB: cr6dbIdx >= 0 ? (row[cr6dbIdx]?.trim() === 'Y') : false,
        };
      })
      .filter((row): row is DAElementRow => row !== null);

    if (daElements.length === 0) {
      throw new Error("No valid DA elements found in CSV");
    }

    // Delete existing elements from the specific table
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (deleteError) {
      throw new Error(`Failed to delete existing elements: ${deleteError.message}`);
    }

    // Insert new DA elements
    const { error: insertError } = await supabase
      .from(tableName)
      .insert(daElements);

    if (insertError) {
      throw new Error(`Failed to insert DA elements: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${daElements.length} DA elements for ${apparatusType}`,
        count: daElements.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in import-da-elements-csv:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
