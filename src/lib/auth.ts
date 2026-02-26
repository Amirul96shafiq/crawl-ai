import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { GUEST_COOKIE_NAME } from "@/lib/constants";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, email: true },
        });
        if (dbUser) {
          session.user.name = dbUser.name;
          session.user.email = dbUser.email;
        }
      }
      return session;
    },
    async signIn({ user }) {
      if (!user?.id) return true;

      try {
        const cookieStore = await cookies();
        const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

        if (guestId) {
          await prisma.chat.updateMany({
            where: { guestId },
            data: { userId: user.id, guestId: null },
          });
          cookieStore.delete(GUEST_COOKIE_NAME);
        }
      } catch {
        // Cookie access may fail in some contexts; migration is best-effort
      }

      return true;
    },
  },
});
