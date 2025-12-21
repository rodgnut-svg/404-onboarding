"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { bootstrapAgency } from "@/app/actions/admin";

export default function SetupPage() {
  const [envCheck, setEnvCheck] = useState<any>(null);
  const [dbCheck, setDbCheck] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    // Check env vars (client-side can only check public vars)
    const publicVars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };

    setEnvCheck(publicVars);

    // Check database (try a simple query)
    try {
      const response = await fetch("/api/setup/health");
      const data = await response.json();
      setDbCheck(data);
    } catch (error) {
      setDbCheck({ error: "Failed to check database" });
    }

    setLoading(false);
  };

  const handleBootstrap = async () => {
    if (!bootstrapSecret || !agencyName || !email) {
      alert("Please fill all fields");
      return;
    }

    setBootstrapLoading(true);
    const result = await bootstrapAgency(bootstrapSecret, agencyName, email);
    setBootstrapLoading(false);

    if (result.success) {
      alert("Agency bootstrapped successfully! You can now log in.");
    } else {
      alert(result.error || "Bootstrap failed");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-24 max-w-3xl">
        <PageHeader
          title="Setup & Bootstrap"
          description="Check your setup and bootstrap the first agency admin"
        />

        <div className="space-y-6">
          {/* Environment Variables Check */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>NEXT_PUBLIC_SUPABASE_URL</span>
                  {envCheck?.NEXT_PUBLIC_SUPABASE_URL ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                  {envCheck?.NEXT_PUBLIC_SUPABASE_ANON_KEY ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="text-sm text-muted mt-4">
                  <p>Also required (server-side only):</p>
                  <ul className="list-disc list-inside">
                    <li>SUPABASE_SERVICE_ROLE_KEY</li>
                    <li>BOOTSTRAP_SECRET</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Check */}
          <Card>
            <CardHeader>
              <CardTitle>Database Status</CardTitle>
            </CardHeader>
            <CardContent>
              {dbCheck?.error ? (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span>{dbCheck.error}</span>
                </div>
              ) : dbCheck?.connected ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Database connected</span>
                </div>
              ) : (
                <div className="text-muted">
                  <p>Run the migration file in your Supabase dashboard:</p>
                  <code className="block mt-2 p-2 bg-muted/20 rounded text-sm">
                    supabase/migrations/001_init.sql
                  </code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bootstrap */}
          <Card>
            <CardHeader>
              <CardTitle>Bootstrap Agency Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bootstrap_secret">Bootstrap Secret</Label>
                  <Input
                    id="bootstrap_secret"
                    type="password"
                    value={bootstrapSecret}
                    onChange={(e) => setBootstrapSecret(e.target.value)}
                    placeholder="From BOOTSTRAP_SECRET env var"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agency_name">Agency Name</Label>
                  <Input
                    id="agency_name"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Your agency name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Your Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                  <p className="text-sm text-muted">
                    You must sign up first, then run bootstrap with this email
                  </p>
                </div>
                <Button
                  onClick={handleBootstrap}
                  disabled={bootstrapLoading}
                  className="w-full"
                >
                  {bootstrapLoading ? "Bootstrapping..." : "Bootstrap Agency"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

