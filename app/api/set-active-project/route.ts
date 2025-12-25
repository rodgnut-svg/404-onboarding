import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const projectId = requestUrl.searchParams.get("projectId");
    const redirectTo = requestUrl.searchParams.get("redirectTo");

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // Verify user is authenticated and a member of this project
    const { user, supabase } = await requireUser();
    const { data: member } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Not a member of this project" }, { status: 403 });
    }

    // Set active project cookie
    const cookieStore = await cookies();
    cookieStore.set("active_project_id", projectId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Redirect to the specified path or the project dashboard
    const redirectPath = redirectTo || `/portal/${projectId}`;
    return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
  } catch (error) {
    console.error("[set-active-project] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { projectId, redirectTo } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // Verify user is authenticated and a member of this project
    const { user, supabase } = await requireUser();
    const { data: member } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Not a member of this project" }, { status: 403 });
    }

    // Set active project cookie
    const cookieStore = await cookies();
    cookieStore.set("active_project_id", projectId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Redirect to the specified path or the project dashboard
    const redirectPath = redirectTo || `/portal/${projectId}`;
    const requestUrl = new URL(request.url);
    return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
  } catch (error) {
    console.error("[set-active-project] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

