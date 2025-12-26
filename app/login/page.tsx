"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (user) {
        router.push("/portal");
      } else {
        setCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const errorParam = searchParams.get("error");
  const sentParam = searchParams.get("sent");

  // Show error from URL params
  const displayError = error || errorParam;
  const displaySent = sent || sentParam === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-24 max-w-2xl">
        <PageHeader
          title="Sign In"
          description="We'll send you a magic link to sign in securely"
        />
        <Card>
          <CardHeader>
            <CardTitle>Enter Your Email</CardTitle>
            <CardDescription>
              Check your inbox for a sign-in link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {displayError && (
              <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                {displayError === "auth_failed" && "Authentication failed. Please try again."}
                {displayError === "no_code" && "No authentication code received. Please request a new magic link."}
                {displayError === "no_user" && "Unable to create session. Please try again."}
                {!["auth_failed", "no_code", "no_user"].includes(displayError) && `Error: ${displayError}`}
              </div>
            )}
            {displaySent && (
              <div className="mb-4 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded">
                Magic link sent! Check your email and click the link to sign in.
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="your@email.com"
                    className="w-full"
                    required
                    autoFocus
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Magic Link"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

