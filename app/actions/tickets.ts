"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

/**
 * Create a new ticket
 */
export async function createTicket(
  projectId: string,
  title: string,
  description: string
): Promise<{ success: true; ticketId: string } | { error: string }> {
  const { user, supabase } = await requireUser();

  // Verify user is project member
  const { data: member } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return { error: "Unauthorized: You must be a project member" };
  }

  if (!title.trim() || !description.trim()) {
    return { error: "Title and description are required" };
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      project_id: projectId,
      created_by: user.id,
      title: title.trim(),
      description: description.trim(),
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createTicket] Error:", error);
    return { error: error.message || "Failed to create ticket" };
  }

  if (!ticket) {
    return { error: "Failed to create ticket" };
  }

  return { success: true, ticketId: ticket.id };
}

/**
 * Get tickets for a project with optional filters
 */
export async function getTickets(
  projectId: string,
  filters?: {
    status?: "open" | "in_progress" | "resolved";
    created_by?: string;
  }
) {
  const supabase = await createServerSupabase();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Verify user is project member
  const { data: member } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    throw new Error("Unauthorized: You must be a project member");
  }

  let query = supabase
    .from("tickets")
    .select("id, title, description, status, created_at, updated_at, resolved_at, resolved_by, created_by")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.created_by) {
    query = query.eq("created_by", filters.created_by);
  }

  const { data: tickets, error } = await query;

  if (error) {
    console.error("[getTickets] Error:", JSON.stringify(error, null, 2));
    console.error("[getTickets] Error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    
    // Provide more helpful error messages
    const errorMsg = error.message || error.details || JSON.stringify(error);
    if (errorMsg.includes("relation") || errorMsg.includes("does not exist") || errorMsg.includes("schema cache")) {
      throw new Error("Tickets table not found. Please run the database migration first. Error: " + errorMsg);
    }
    throw new Error(errorMsg || "Failed to fetch tickets");
  }

  // Fetch profiles for all ticket creators
  const userIds = [...new Set((tickets || []).map((t: any) => t.created_by))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  // Create a map of user ID to profile for easy lookup
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  // Transform tickets to include profile information
  const transformedTickets = (tickets || []).map((ticket: any) => ({
    ...ticket,
    profiles: profileMap.get(ticket.created_by) || null,
  }));

  return transformedTickets;
}

/**
 * Update ticket status (agency members only)
 */
export async function updateTicketStatus(
  ticketId: string,
  status: "open" | "in_progress" | "resolved"
): Promise<{ success: true } | { error: string }> {
  const supabase = await createServerSupabase();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // Get ticket to check project membership
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("project_id, resolved_at")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    return { error: "Ticket not found" };
  }

  // Verify user is agency member
  const { data: member } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", ticket.project_id)
    .eq("user_id", user.id)
    .single();

  if (!member || !["agency_admin", "agency_member"].includes(member.role)) {
    return { error: "Unauthorized: Only agency members can update ticket status" };
  }

  const updateData: any = { status, updated_at: new Date().toISOString() };

  // If resolving, set resolved_at and resolved_by
  if (status === "resolved") {
    updateData.resolved_at = new Date().toISOString();
    updateData.resolved_by = user.id;
  } else if (ticket.resolved_at) {
    // If reopening, clear resolved fields
    updateData.resolved_at = null;
    updateData.resolved_by = null;
  }

  const { error } = await supabase
    .from("tickets")
    .update(updateData)
    .eq("id", ticketId);

  if (error) {
    console.error("[updateTicketStatus] Error:", error);
    return { error: error.message || "Failed to update ticket status" };
  }

  return { success: true };
}

/**
 * Add a reply to a ticket
 */
export async function addTicketReply(
  ticketId: string,
  body: string
): Promise<{ success: true; replyId: string } | { error: string }> {
  const { user, supabase } = await requireUser();

  if (!body.trim()) {
    return { error: "Reply body is required" };
  }

  // Get ticket to check project membership
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("project_id")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    return { error: "Ticket not found" };
  }

  // Verify user is project member
  const { data: member } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", ticket.project_id)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return { error: "Unauthorized: You must be a project member" };
  }

  const { data: reply, error } = await supabase
    .from("ticket_replies")
    .insert({
      ticket_id: ticketId,
      author_id: user.id,
      body: body.trim(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[addTicketReply] Error:", error);
    return { error: error.message || "Failed to add reply" };
  }

  if (!reply) {
    return { error: "Failed to add reply" };
  }

  // Update ticket's updated_at timestamp
  await supabase
    .from("tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  return { success: true, replyId: reply.id };
}

/**
 * Get all replies for a ticket
 */
export async function getTicketReplies(ticketId: string) {
  const supabase = await createServerSupabase();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Get ticket to check project membership
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("project_id")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    throw new Error("Ticket not found");
  }

  // Verify user is project member
  const { data: member } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", ticket.project_id)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    throw new Error("Unauthorized: You must be a project member");
  }

  const { data: replies, error } = await supabase
    .from("ticket_replies")
    .select("id, body, created_at, author_id")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getTicketReplies] Error:", error);
    throw new Error(error.message || "Failed to fetch replies");
  }

  // Fetch profiles for all reply authors
  const authorIds = [...new Set((replies || []).map((r: any) => r.author_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", authorIds);

  // Create a map of user ID to profile for easy lookup
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  // Transform replies to include profile information
  const transformedReplies = (replies || []).map((reply: any) => ({
    ...reply,
    profiles: profileMap.get(reply.author_id) || null,
  }));

  return transformedReplies;
}

/**
 * Get a single ticket with all details
 */
export async function getTicket(ticketId: string) {
  const supabase = await createServerSupabase();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id, project_id, title, description, status, created_at, updated_at, resolved_at, resolved_by, created_by")
    .eq("id", ticketId)
    .maybeSingle();

  if (error || !ticket) {
    throw new Error("Ticket not found");
  }

  // Verify user is project member
  const { data: member } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", ticket.project_id)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    throw new Error("Unauthorized: You must be a project member");
  }

  // Fetch profile for ticket creator
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", ticket.created_by)
    .single();

  // Transform ticket to include profile information
  const transformedTicket = {
    ...ticket,
    profiles: profile || null,
  };

  return transformedTicket;
}
