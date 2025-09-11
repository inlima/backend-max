/* eslint-disable @typescript-eslint/no-unsafe-argument */
"use client";
import React, { createContext, useState } from "react";
import { type TLoginSchema } from "@/app/login/login.schema";
import { setCookie, deleteCookie } from "cookies-next";
import instance from "@/services/axios";
import { statusCode } from "@/enums/magicNumbers";
import { useRouter } from "next/navigation";
import axios from "axios";

export type AuthContextProps = {
  isAuthenticated: boolean;
  user: string | null;
  SignIn: (data: TLoginSchema) => Promise<statusCode>;
  SignOut: () => void;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const AuthContext = createContext({} as AuthContextProps);

export default function AuthProvider({
  children,
}: {
  children: React.ReactElement;
}) {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const isAuthenticated = !!user;

  async function SignIn({ email, password }: TLoginSchema) {
    try {
      const response = await instance.post(
        "api/login/",
        {
          email,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": true,
          },
        }
      );

      setUser(response.data.username);
      setCookie("auth_token", response.data.access, {
        expires: new Date(Date.now() + response.data.access_expires_in * 1000),
      });
      return statusCode.OK;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.log(error);
        throw new Error(`Erro ${error.status}`);
      }
      throw new Error("Erro desconhecido");
    }
  }

  function SignOut() {
    deleteCookie("auth_token");
    setUser(null);
    router.refresh();
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, SignIn, SignOut }}>
      {children}
    </AuthContext.Provider>
  );
}
