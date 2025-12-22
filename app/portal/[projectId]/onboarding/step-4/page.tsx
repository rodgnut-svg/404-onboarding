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

interface Step4PageProps {
  params: Promise<{ projectId: string }>;
}

export default function Step4Page({ params }: Step4PageProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    domain_registrar: "",
    dns_controller: "",
    hosting_provider: "",
    analytics_access_status: "",
    booking_system: "",
    booking_system_url: "",
    crm_email_tool: "",
  });

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId);
      loadData(p.projectId);
    });
  }, [params]);

  const loadData = async (pid: string) => {
    const result = await getOnboardingStep(pid, 4);
    if (result.data?.data) {
      setFormData(result.data.data);
    }
    setLoading(false);
  };

  const debouncedSave = useDebouncedCallback(async (data: typeof formData) => {
    if (!projectId) return;
    setSaving(true);
    await saveOnboardingStep(projectId, 4, data);
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
    await saveOnboardingStep(projectId, 4, formData);
    setSaving(false);
  };

  const handleNext = async () => {
    if (!projectId) return;
    setSaving(true);
    await saveOnboardingStep(projectId, 4, formData);
    await markStepComplete(projectId, 4);
    setSaving(false);
    router.push(`/portal/${projectId}/onboarding/step-5`);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Step 4: Access & Integrations" description="Help us access your accounts" />

      <Card>
        <CardHeader>
          <CardTitle>Access Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/20 p-4 rounded-lg text-sm">
            <strong>Note:</strong> We'll send you access instructions. Please do not share passwords here.
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain_registrar">Domain Registrar</Label>
            <Input
              id="domain_registrar"
              value={formData.domain_registrar}
              onChange={(e) => handleChange("domain_registrar", e.target.value)}
              placeholder="e.g., Namecheap, GoDaddy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dns_controller">Who Manages DNS?</Label>
            <Input
              id="dns_controller"
              value={formData.dns_controller}
              onChange={(e) => handleChange("dns_controller", e.target.value)}
              placeholder="e.g., Cloudflare, Namecheap"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hosting_provider">Hosting Provider</Label>
            <Input
              id="hosting_provider"
              value={formData.hosting_provider}
              onChange={(e) => handleChange("hosting_provider", e.target.value)}
              placeholder="e.g., Vercel, Netlify, WP Engine"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="analytics_access_status">Analytics Access</Label>
            <select
              id="analytics_access_status"
              value={formData.analytics_access_status}
              onChange={(e) => handleChange("analytics_access_status", e.target.value)}
              className="flex h-12 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm"
            >
              <option value="">Select status</option>
              <option value="we_set_up">We'll set it up</option>
              <option value="client_has">Client has access</option>
              <option value="not_sure">Not sure</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking_system">Booking System</Label>
            <select
              id="booking_system"
              value={formData.booking_system}
              onChange={(e) => handleChange("booking_system", e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm mb-2"
            >
              <option value="">Select system</option>
              <option value="ghl">GoHighLevel</option>
              <option value="calendly">Calendly</option>
              <option value="other">Other</option>
            </select>
            {formData.booking_system && (
              <Input
                id="booking_system_url"
                value={formData.booking_system_url}
                onChange={(e) => handleChange("booking_system_url", e.target.value)}
                placeholder="Booking URL"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="crm_email_tool">CRM / Email Tool (Optional)</Label>
            <Input
              id="crm_email_tool"
              value={formData.crm_email_tool}
              onChange={(e) => handleChange("crm_email_tool", e.target.value)}
              placeholder="e.g., HubSpot, Mailchimp"
            />
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

