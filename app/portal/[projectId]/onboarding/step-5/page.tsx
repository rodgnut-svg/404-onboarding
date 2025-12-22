"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboardingStep, markStepComplete, getOnboardingStep } from "@/app/actions/onboarding";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useDebouncedCallback } from "use-debounce";

interface Step5PageProps {
  params: Promise<{ projectId: string }>;
}

export default function Step5Page({ params }: Step5PageProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    decision_maker_name: "",
    decision_maker_email: "",
    comms_preference: "",
    revision_policy_ack: false,
  });

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId);
      loadData(p.projectId);
    });
  }, [params]);

  const loadData = async (pid: string) => {
    const result = await getOnboardingStep(pid, 5);
    if (result.data?.data) {
      setFormData(result.data.data);
    }
    setLoading(false);
  };

  const debouncedSave = useDebouncedCallback(async (data: typeof formData) => {
    if (!projectId) return;
    setSaving(true);
    await saveOnboardingStep(projectId, 5, data);
    setSaving(false);
  }, 800);

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    debouncedSave(newData);
  };

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    await saveOnboardingStep(projectId, 5, formData);
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (!projectId) return;
    if (!formData.revision_policy_ack) {
      alert("Please acknowledge the revision policy");
      return;
    }

    setSubmitting(true);
    await saveOnboardingStep(projectId, 5, formData);
    await markStepComplete(projectId, 5);
    setSubmitting(false);
    router.push(`/portal/${projectId}/onboarding/complete`);
  };

  if (loading) return <div>Loading...</div>;

  const bookingUrl = process.env.NEXT_PUBLIC_GHL_BOOKING_WIDGET_URL || "";

  return (
    <div className="max-w-3xl">
      <PageHeader title="Step 5: Approvals & Kickoff" description="Finalize and book your kickoff" />

      <Card>
        <CardHeader>
          <CardTitle>Decision Maker Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="decision_maker_name">Decision Maker Name *</Label>
            <Input
              id="decision_maker_name"
              value={formData.decision_maker_name}
              onChange={(e) => handleChange("decision_maker_name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="decision_maker_email">Decision Maker Email *</Label>
            <Input
              id="decision_maker_email"
              type="email"
              value={formData.decision_maker_email}
              onChange={(e) => handleChange("decision_maker_email", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comms_preference">Communication Preference</Label>
            <select
              id="comms_preference"
              value={formData.comms_preference}
              onChange={(e) => handleChange("comms_preference", e.target.value)}
              className="flex h-12 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm"
            >
              <option value="">Select preference</option>
              <option value="portal_only">Portal only</option>
              <option value="whatsapp_ok">WhatsApp OK, but approvals in portal</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.revision_policy_ack}
                onChange={(e) => handleChange("revision_policy_ack", e.target.checked)}
                required
              />
              <span className="text-sm">
                I acknowledge the revision policy *
              </span>
            </label>
          </div>

          {bookingUrl && (
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-sans font-semibold" style={{ fontSize: "1.5rem" }}>Book Your Kickoff Call</h3>
              <div className="bg-muted/20 p-4 rounded-lg">
                <iframe
                  src={bookingUrl}
                  width="100%"
                  height="600"
                  frameBorder="0"
                  title="Booking Widget"
                />
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button variant="secondary" onClick={handleSave} disabled={saving || submitting} className="h-12">
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !formData.decision_maker_name || !formData.decision_maker_email || !formData.revision_policy_ack}
              className="h-12"
            >
              {submitting ? "Submitting..." : "Submit Onboarding"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

