"use client";

import Link from "next/link";
import {
  Card,
  CardDescription,
} from "@/components/ui/card";
import { Logo } from "@/components/logo";
import dynamic from "next/dynamic";
import { Suspense } from "react";

export default function LoginPage() {
  const AuthLoginForm = dynamic(
    () => import("@/components/auth-login-form").then((mod) => ({ default: mod.AuthLoginForm })),
    { ssr: false }
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <Card className="mx-auto w-full max-w-sm">
        <div className="text-center">
          <div className="mb-4 mt-5 flex justify-center">
            <Link href="/" className="flex items-center gap-2 text-foreground">
              <Logo />
              <span className="text-xl font-bold">Aether Connect</span>
            </Link>
          </div>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </div>
        <Suspense fallback={<div>Loading form...</div>}>
          <AuthLoginForm />
        </Suspense>
      </Card>
    </div>
  );
}
