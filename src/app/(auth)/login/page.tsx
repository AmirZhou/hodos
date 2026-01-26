"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await login(email);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Login failed");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-[var(--accent-gold)] flex items-center justify-center text-[var(--background)] text-2xl font-bold">
              H
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to Hodos</CardTitle>
          <CardDescription>
            Enter your email to start your adventure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-[var(--accent-red)]">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Continue"}
            </Button>

            <p className="text-xs text-center text-[var(--foreground-secondary)]">
              By continuing, you confirm you are 18+ and agree to our terms.
              This game contains explicit adult content.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
