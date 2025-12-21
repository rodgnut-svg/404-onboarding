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

interface Step2PageProps {
  params: Promise<{ projectId: string }>;
}

export default function Step2Page({ params }: Step2PageProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    logo_uploaded: false,
    brand_guide_uploaded: false,
    preferred_colors: "",
    choose_for_me: false,
    tone: "",
    dislikes: "",
  });

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId);
      loadData(p.projectId);
    });
  }, [params]);

  const loadData = async (pid: string) => {
    const result = await getOnboardingStep(pid, 2);
    if (result.data?.data) {
      setFormData(result.data.data);
    }
    setLoading(false);
  };

  const debouncedSave = useDebouncedCallback(async (data: typeof formData) => {
    if (!projectId) return;
    setSaving(true);
    await saveOnboardingStep(projectId, 2, data);
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
    await saveOnboardingStep(projectId, 2, formData);
    setSaving(false);
  };

  const handleNext = async () => {
    if (!projectId) return;
    setSaving(true);
    await saveOnboardingStep(projectId, 2, formData);
    await markStepComplete(projectId, 2);
    setSaving(false);
    router.push(`/portal/${projectId}/onboarding/step-3`);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Step 2: Brand & Style" description="Share your brand identity" />

      <Card>
        <CardHeader>
          <CardTitle>Brand Assets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Logo</Label>
            <p className="text-sm text-muted mb-2">
              Upload your logo (you'll be able to upload files in the Uploads section)
            </p>
            <Button variant="secondary" onClick={() => router.push(`/portal/${projectId}/uploads`)}>
              Go to Uploads
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Brand Guide</Label>
            <p className="text-sm text-muted mb-2">
              Upload brand guidelines if available
            </p>
            <Button variant="secondary" onClick={() => router.push(`/portal/${projectId}/uploads`)}>
              Go to Uploads
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Color Preferences</Label>
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.choose_for_me}
                  onChange={(e) => handleChange("choose_for_me", e.target.checked)}
                />
                <span className="text-sm">Choose colors for me</span>
              </label>
            </div>
            {!formData.choose_for_me && (
              <Input
                value={formData.preferred_colors}
                onChange={(e) => handleChange("preferred_colors", e.target.value)}
                placeholder="e.g., Blue and white, or #1A73E8"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">Brand Tone</Label>
            <select
              id="tone"
              value={formData.tone}
              onChange={(e) => handleChange("tone", e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm"
            >
              <option value="">Select tone</option>
              <option value="luxury">Luxury</option>
              <option value="clinical">Clinical</option>
              <option value="playful">Playful</option>
              <option value="corporate">Corporate</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dislikes">Design Dislikes</Label>
            <Textarea
              id="dislikes"
              value={formData.dislikes}
              onChange={(e) => handleChange("dislikes", e.target.value)}
              placeholder="Tell us what you don't like in design..."
              rows={4}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="secondary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button onClick={handleNext} disabled={saving}>
              Next Step
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

