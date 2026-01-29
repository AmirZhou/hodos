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

  const handleGoogleSignIn = async () => {
    if (!isLoaded || !signIn) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(clerkError.errors?.[0]?.message ?? "Google sign-in failed");
    }
  };

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
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={!isLoaded}
                onClick={handleGoogleSignIn}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[var(--card)] px-2 text-[var(--foreground-secondary)]">
                    or
                  </span>
                </div>
              </div>

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
                  {isSubmitting ? "Sending code..." : "Continue with email"}
                </Button>

                <p className="text-xs text-center text-[var(--foreground-secondary)]">
                  By continuing, you confirm you are 18+ and agree to our terms.
                  This game contains explicit adult content.
                </p>
              </form>

              {/* Clerk CAPTCHA widget for bot protection during sign-up */}
              <div id="clerk-captcha" />
            </div>
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
