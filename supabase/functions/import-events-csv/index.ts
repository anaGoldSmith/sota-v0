import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Papa from "https://esm.sh/papaparse@5.4.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      return new Response(
        JSON.stringify({ error: "CSV parsing errors", details: parsed.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rows = parsed.data as Record<string, string>[];

    // Map CSV columns to DB columns
    const events = rows
      .filter((row) => row["Title"] || row["title"])
      .map((row) => ({
        event_id: row["ID"] || row["id"] || "",
        dates: row["Dates"] || row["dates"] || null,
        title: row["Title"] || row["title"] || "",
        city: row["City"] || row["city"] || null,
        disciplines: row["Disciplines"] || row["disciplines"] || null,
        status: row["Status"] || row["status"] || null,
        link: row["Link"] || row["link"] || null,
      }));

    if (events.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid events found in file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear existing events
    const { error: deleteError } = await supabase.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteError) {
      return new Response(JSON.stringify({ error: `Delete error: ${deleteError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch insert
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from("events").insert(batch);
      if (insertError) {
        return new Response(
          JSON.stringify({ error: `Insert error: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, count: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
