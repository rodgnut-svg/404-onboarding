import { createClientSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClientSupabase();
    
    // Try to query a table
    const { error } = await supabase.from("profiles").select("id").limit(1);
    
    if (error && error.code === "42P01") {
      // Table doesn't exist
      return NextResponse.json({ connected: false, error: "Tables not created yet. Run migration." });
    }
    
    return NextResponse.json({ connected: true });
  } catch (error: any) {
    return NextResponse.json({ connected: false, error: error.message });
  }
}

