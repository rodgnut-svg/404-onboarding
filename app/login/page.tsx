import { redirect } from "next/navigation";
import { createClientSupabase } from "@/lib/supabase/server";
import { sendMagicLink } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

async function checkAuth() {
  const supabase = await createClientSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export default async function LoginPage() {
  const user = await checkAuth();
  if (user) {
    redirect("/portal");
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
            <form action={async (formData: FormData) => {
              "use server";
              const result = await sendMagicLink(formData);
              if (result.success) {
                redirect("/login?sent=true");
              }
            }}>
              <div className="space-y-4">
                <div>
                  <Input
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    className="w-full"
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full">
                  Send Magic Link
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

