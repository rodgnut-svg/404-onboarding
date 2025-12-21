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

interface Step1PageProps {
  params: Promise<{ projectId: string }>;
}

export default function Step1Page({ params }: Step1PageProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    business_name: "",
    website_url: "",
    industry: "",
    location_service_area: "",
    primary_goal: "",
    deadline_date: "",
    competitors: [] as string[],
    inspiration_sites: [] as string[],
    must_keep: "",
  });

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId);
      loadData(p.projectId);
    });
  }, [params]);

  const loadData = async (pid: string) => {
    const result = await getOnboardingStep(pid, 1);
    if (result.data?.data) {
      setFormData(result.data.data);
    }
    setLoading(false);
  };

  const debouncedSave = useDebouncedCallback(async (data: typeof formData) => {
    if (!projectId) return;
    setSaving(true);
    await saveOnboardingStep(projectId, 1, data);
    setSaving(false);
  }, 800);

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    debouncedSave(newData);
  };

  const handleArrayChange = (field: "competitors" | "inspiration_sites", index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    handleChange(field, newArray);
  };

  const addArrayItem = (field: "competitors" | "inspiration_sites") => {
    handleChange(field, [...formData[field], ""]);
  };

  const removeArrayItem = (field: "competitors" | "inspiration_sites", index: number) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    handleChange(field, newArray);
  };

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    await saveOnboardingStep(projectId, 1, formData);
    setSaving(false);
  };

  const handleNext = async () => {
    if (!projectId) return;
    setSaving(true);
    await saveOnboardingStep(projectId, 1, formData);
    await markStepComplete(projectId, 1);
    setSaving(false);
    router.push(`/portal/${projectId}/onboarding/step-2`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Step 1: Project Basics" description="Tell us about your business" />

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name *</Label>
            <Input
              id="business_name"
              value={formData.business_name}
              onChange={(e) => handleChange("business_name", e.target.value)}
              placeholder="Your business name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website_url">Current Website URL</Label>
            <Input
              id="website_url"
              type="url"
              value={formData.website_url}
              onChange={(e) => handleChange("website_url", e.target.value)}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={formData.industry}
              onChange={(e) => handleChange("industry", e.target.value)}
              placeholder="e.g., Healthcare, E-commerce, SaaS"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location_service_area">Location / Service Area</Label>
            <Input
              id="location_service_area"
              value={formData.location_service_area}
              onChange={(e) => handleChange("location_service_area", e.target.value)}
              placeholder="City, State or Service area"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary_goal">Primary Goal *</Label>
            <select
              id="primary_goal"
              value={formData.primary_goal}
              onChange={(e) => handleChange("primary_goal", e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm"
            >
              <option value="">Select a goal</option>
              <option value="leads">Generate Leads</option>
              <option value="bookings">Bookings / Appointments</option>
              <option value="brand">Brand Awareness</option>
              <option value="ecom">E-commerce Sales</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline_date">Target Launch Date</Label>
            <Input
              id="deadline_date"
              type="date"
              value={formData.deadline_date}
              onChange={(e) => handleChange("deadline_date", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Competitor Websites</Label>
            {formData.competitors.map((competitor, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={competitor}
                  onChange={(e) => handleArrayChange("competitors", index, e.target.value)}
                  placeholder="https://competitor.com"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeArrayItem("competitors", index)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => addArrayItem("competitors")}
            >
              + Add Competitor
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Inspiration Sites</Label>
            {formData.inspiration_sites.map((site, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={site}
                  onChange={(e) => handleArrayChange("inspiration_sites", index, e.target.value)}
                  placeholder="https://inspiration.com"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeArrayItem("inspiration_sites", index)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => addArrayItem("inspiration_sites")}
            >
              + Add Inspiration Site
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="must_keep">Must Keep (existing elements to preserve)</Label>
            <Textarea
              id="must_keep"
              value={formData.must_keep}
              onChange={(e) => handleChange("must_keep", e.target.value)}
              placeholder="List any existing elements, content, or features that must be preserved..."
              rows={4}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={saving || !formData.business_name || !formData.primary_goal}
            >
              Next Step
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

