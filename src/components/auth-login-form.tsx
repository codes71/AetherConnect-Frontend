"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react"; // Import useEffect
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context"; // Import useAuth hook

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

export function AuthLoginForm() {
  const { login, isLoading } = useAuth(); // Removed isAuthenticated
  const { toast } = useToast();
  const router = useRouter();
  // Removed local error state as we will use toast for feedback

  // Removed useEffect for isAuthenticated redirect, as middleware handles this.

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    const result = await login(data); // Call login from context
    console.log('Login result:', result);

    if (result.success) {
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      // No manual redirect here, the middleware will handle redirecting authenticated users from /login
      // to /chat if they try to access /login after successful login.
      // However, for a smoother UX, we can still push to /chat here.
      router.push("/chat");
    } else {
      toast({
        title: "Login Failed",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  // Removed the conditional rendering based on isLoading or isAuthenticated.
  // The middleware will handle preventing access to /login if already authenticated.
  // Components that use useAuth will handle their own loading states.

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Login</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 p-6 pt-0">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            {...register("email")}
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              href="#"
              className="ml-auto inline-block text-sm underline"
            >
              Forgot your password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            {...register("password")}
            autoComplete="current-password"
          />
          {errors.password && (
            <p className="text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>
        {/* Removed local error display, relying on toast */}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || isLoading} // Use isLoading from useAuth
        >
          {isSubmitting || isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
        <div className="p-6 pt-0 text-center text-sm">
          Do not have an account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </div>
    </>
  );
}
