import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Get project and onboarding data
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: submissions } = await supabase
      .from("onboarding_submissions")
      .select("*")
      .eq("project_id", projectId)
      .order("step", { ascending: true });

    // Send to GHL webhook if configured
    const webhookUrl = process.env.GHL_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project,
            onboarding_data: submissions,
          }),
        });

        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.statusText}`);
        }
      } catch (webhookError: any) {
        // Log to audit log but don't fail the request
        await supabase.from("audit_log").insert({
          project_id: projectId,
          action: "ghl_webhook_error",
          meta: { error: webhookError.message },
        });
      }
    }

    // Log to audit log
    await supabase.from("audit_log").insert({
      project_id: projectId,
      action: "onboarding_synced_to_ghl",
      meta: { webhook_sent: !!webhookUrl },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

