"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { validateClientCodePreAuth } from "@/app/actions/client-codes";

export default function OnboardingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await validateClientCodePreAuth(code);
      
      if (result.success) {
        // Redirect to login page
        router.push("/login?code_validated=true");
      } else {
        setError(result.error || "Invalid client code");
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate code");
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-uppercase and trim spaces
    const value = e.target.value.toUpperCase().replace(/\s/g, "");
    setCode(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-24 max-w-2xl">
        <PageHeader
          title="Client Onboarding"
          description="Enter your client code to get started"
        />
        <Card>
          <CardHeader>
            <CardTitle>Enter Client Code</CardTitle>
            <CardDescription>
              Your agency should have provided you with a unique client code.
              You'll be asked to sign in after entering the code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="Enter client code"
                  className="w-full font-mono text-lg tracking-wider"
                  maxLength={12}
                  autoFocus
                  required
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
                {loading ? "Validating..." : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

