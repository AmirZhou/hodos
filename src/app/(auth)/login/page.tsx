"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Flow = "email" | "verify";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flow, setFlow] = useState<Flow>("email");
  const [isSignUp, setIsSignUp] = useState(false);

  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const router = useRouter();

  const isLoaded = signInLoaded && signUpLoaded;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn || !signUp) return;

    setError("");
    setIsSubmitting(true);

    try {
      // Try sign-in first
      const result = await signIn.create({
        identifier: email,
        strategy: "email_code",
      });

      if (result.status === "needs_first_factor") {
        setIsSignUp(false);
        setFlow("verify");
      } else if (result.status === "complete" && result.createdSessionId) {
        await setSignInActive({ session: result.createdSessionId });
        router.push("/");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { code: string; message: string }[] };
      const errorCode = clerkError.errors?.[0]?.code;

      // User doesn't exist — fall back to sign-up
      if (errorCode === "form_identifier_not_found") {
        try {
          await signUp.create({ emailAddress: email });
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setIsSignUp(true);
          setFlow("verify");
        } catch (signUpErr: unknown) {
          const signUpError = signUpErr as { errors?: { message: string }[] };
          setError(
            signUpError.errors?.[0]?.message ?? "An error occurred during sign up"
          );
        }
      } else {
        setError(
          clerkError.errors?.[0]?.message ?? "An error occurred during sign in"
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setError("");
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        // Verify sign-up
        if (!signUp) return;
        const result = await signUp.attemptEmailAddressVerification({ code });
        if (result.status === "complete" && result.createdSessionId) {
          await setSignUpActive({ session: result.createdSessionId });
          router.push("/");
        } else {
          setError("Verification failed. Please try again.");
        }
      } else {
        // Verify sign-in
        if (!signIn) return;
        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code,
        });
        if (result.status === "complete" && result.createdSessionId) {
          await setSignInActive({ session: result.createdSessionId });
          router.push("/");
        } else {
          setError("Verification failed. Please try again.");
        }
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(
        clerkError.errors?.[0]?.message ?? "Verification failed"
      );
    } finally {
      setIsSubmitting(false);
    }
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
            {flow === "verify"
              ? "Check your email for a verification code"
              : "Enter your email to start your adventure"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {flow === "email" ? (
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

              <Button type="submit" className="w-full" disabled={isSubmitting || !isLoaded}>
                {isSubmitting ? "Sending code..." : "Continue"}
              </Button>

              <p className="text-xs text-center text-[var(--foreground-secondary)]">
                By continuing, you confirm you are 18+ and agree to our terms.
                This game contains explicit adult content.
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter verification code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-[var(--accent-red)]">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Verifying..." : "Verify"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setFlow("email");
                  setCode("");
                  setError("");
                }}
                className="w-full text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                Use a different email
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
