"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboardingStep, markStepComplete, getOnboardingStep } from "@/app/actions/onboarding";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useDebouncedCallback } from "use-debounce";

interface Step3PageProps {
  params: Promise<{ projectId: string }>;
}

export default function Step3Page({ params }: Step3PageProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contentTrack, setContentTrack] = useState<"prompts" | "upload">("prompts");
  const [formData, setFormData] = useState({
    content_track: "prompts",
    offer_summary: "",
    target_customer: "",
    key_objections: "",
    brand_story_notes: "",
    services: [] as Array<{ name: string; desc: string; price_from?: string }>,
    pricing_notes: "",
    about: "",
    faqs: "",
    testimonials: "",
    contact_info: "",
    socials: "",
  });

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId);
      loadData(p.projectId);
    });
  }, [params]);

  const loadData = async (pid: string) => {
    const result = await getOnboardingStep(pid, 3);
    if (result.data?.data) {
      setFormData(result.data.data);
      setContentTrack(result.data.data.content_track || "prompts");
    }
    setLoading(false);
  };

  const debouncedSave = useDebouncedCallback(async (data: typeof formData) => {
    if (!projectId) return;
    setSaving(true);
    await saveOnboardingStep(projectId, 3, { ...data, content_track: contentTrack });
    setSaving(false);
  }, 800);

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    debouncedSave({ ...newData, content_track: contentTrack });
  };

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    await saveOnboardingStep(projectId, 3, { ...formData, content_track: contentTrack });
    setSaving(false);
  };

  const handleNext = async () => {
    if (!projectId) return;
    setSaving(true);
    await saveOnboardingStep(projectId, 3, { ...formData, content_track: contentTrack });
    await markStepComplete(projectId, 3);
    setSaving(false);
    router.push(`/portal/${projectId}/onboarding/step-4`);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Step 3: Content" description="Provide your content or let us write it" />

      <Card>
        <CardHeader>
          <CardTitle>Content Approach</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <Button
              variant={contentTrack === "prompts" ? "default" : "secondary"}
              onClick={() => setContentTrack("prompts")}
            >
              Done-for-you Copy Prompts
            </Button>
            <Button
              variant={contentTrack === "upload" ? "default" : "secondary"}
              onClick={() => setContentTrack("upload")}
            >
              Upload Existing Content
            </Button>
          </div>

          {contentTrack === "prompts" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="offer_summary">Offer Summary</Label>
                <Textarea
                  id="offer_summary"
                  value={formData.offer_summary}
                  onChange={(e) => handleChange("offer_summary", e.target.value)}
                  placeholder="Describe what you offer..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_customer">Target Customer</Label>
                <Textarea
                  id="target_customer"
                  value={formData.target_customer}
                  onChange={(e) => handleChange("target_customer", e.target.value)}
                  placeholder="Describe your ideal customer..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="key_objections">Key Objections</Label>
                <Textarea
                  id="key_objections"
                  value={formData.key_objections}
                  onChange={(e) => handleChange("key_objections", e.target.value)}
                  placeholder="What objections do customers typically have?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand_story_notes">Brand Story Notes</Label>
                <Textarea
                  id="brand_story_notes"
                  value={formData.brand_story_notes}
                  onChange={(e) => handleChange("brand_story_notes", e.target.value)}
                  placeholder="Tell us your brand story..."
                  rows={4}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Upload Content Documents</Label>
              <p className="text-sm text-muted mb-2">
                Go to the Uploads section to upload your existing content
              </p>
              <Button variant="secondary" onClick={() => router.push(`/portal/${projectId}/uploads`)}>
                Go to Uploads
              </Button>
            </div>
          )}

          <div className="border-t pt-6 space-y-4">
            <h3 className="font-sans font-semibold" style={{ fontSize: "1.5rem" }}>Additional Information</h3>

            <div className="space-y-2">
              <Label htmlFor="about">About</Label>
              <Textarea
                id="about"
                value={formData.about}
                onChange={(e) => handleChange("about", e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_info">Contact Information</Label>
              <Textarea
                id="contact_info"
                value={formData.contact_info}
                onChange={(e) => handleChange("contact_info", e.target.value)}
                placeholder="Phone, email, address..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="socials">Social Media Links</Label>
              <Input
                id="socials"
                value={formData.socials}
                onChange={(e) => handleChange("socials", e.target.value)}
                placeholder="Comma-separated URLs"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="secondary" onClick={handleSave} disabled={saving} className="h-12">
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button onClick={handleNext} disabled={saving} className="h-12">
              Next Step
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

