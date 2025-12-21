import { redirect } from "next/navigation";
import { createClientSupabase } from "@/lib/supabase/server";
import { validateClientCode } from "@/app/actions/auth";
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

export default async function OnboardingPage() {
  const user = await checkAuth();
  if (user) {
    redirect("/portal");
  }

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
              Your agency should have provided you with a unique client code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={async (formData: FormData) => {
              "use server";
              const result = await validateClientCode(formData);
              if (result.success) {
                redirect("/login");
              }
            }}>
              <div className="space-y-4">
                <div>
                  <Input
                    name="clientCode"
                    placeholder="Enter your client code"
                    className="w-full"
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full">
                  Continue
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

