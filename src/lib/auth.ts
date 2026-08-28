import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { verifyPassword, needsRehash, hashPassword } from "@/lib/password";
import { sanitizeEmail } from "@/lib/security";
import { env } from "@/lib/env";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = sanitizeEmail(credentials.email);

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { gym: true }
        });

        if (!user) {
          return null;
        }

        // 1. Verify password using hardened password engine
        const isValid = await verifyPassword(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        // 2. Transparent Automatic Password Upgrade / Rehashing
        if (needsRehash(user.passwordHash)) {
          try {
            const upgradedHash = await hashPassword(credentials.password);
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: upgradedHash }
            });
            console.log(`[PASSWORD SECURITY] Automatically upgraded password hash to bcrypt (cost 12) for user: ${user.email}`);
          } catch (rehashErr) {
            console.error('[PASSWORD SECURITY] Failed to rehash legacy password:', rehashErr);
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          gymId: user.gymId,
          gymName: user.gym?.name,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.gymId = user.gymId;
        token.gymName = user.gymName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.gymId = token.gymId as string;
        session.user.gymName = token.gymName as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  secret: env.NEXTAUTH_SECRET,
};
