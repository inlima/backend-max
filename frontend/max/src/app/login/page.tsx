"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Scale } from "lucide-react";
import { useForm } from "react-hook-form";
import { TLoginSchema, ZLoginSchema } from "./login.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TLoginSchema>({
    criteriaMode: "all",
    mode: "onChange",
    resolver: zodResolver(ZLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [showPassword, setShowPassword] = useState(false);

  const { SignIn, isAuthenticated } = useContext(AuthContext);
  const router = useRouter();

  // Don't render login form if authenticated
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Redirecionando...</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (data: TLoginSchema) => {
    try {
      await SignIn(data);
      router.push("/dashboard");
    } catch (error) {
      toast.error("Email ou senha de usuário inválidas.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Scale className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Max Advocacia</CardTitle>
          <CardDescription>Faça login para acessar o dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                aria-invalid={errors.email && true}
                {...register("email")}
                disabled={isSubmitting}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  aria-invalid={errors.password && true}
                  {...register("password")}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Credenciais de teste:</p>
            <p className="font-mono text-xs mt-1">
              admin@advocacia.com / admin123
              <br />
              recepcionista@advocacia.com / recep123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
