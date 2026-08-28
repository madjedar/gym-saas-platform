import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      gymId: string;
      gymName?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    gymId: string;
    gymName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    gymId?: string;
    gymName?: string;
  }
}
