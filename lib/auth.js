import AzureADProvider from "next-auth/providers/azure-ad";
import connectDB from "@/lib/db";
import Member from "@/lib/models/Member";
import { memberSlug } from "@/lib/slug";

export const authOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email?.endsWith('@kluniversity.in')) {
        return false;
      }

      try {
        await connectDB();
        const existingMember = await Member.findOne({ email: user.email });

        // Canonical slug for /[memberId] comes from lib/slug.js.
        // Same value is used as `id` and `rollNumber` for SSO users.
        const slug = memberSlug({ email: user.email });

        if (!existingMember) {
          await Member.create({
            id: slug,
            name: user.name || 'New Member',
            role: 'Student',
            email: user.email,
            rollNumber: slug,
            status: 'Online',
            photoUrl: user.image || '',
            domain: 'General',
            department: 'Pending',
            bio: 'K L University Student',
            roles: [],
            orderIndex: 999,
          });
          user.role = 'Student';
          user.memberId = slug;
        } else {
          if (existingMember.isSuspended) {
            throw new Error('SUSPENDED');
          }
          user.role = existingMember.role;
          user.memberId = existingMember.id;
        }
        return true;
      } catch (error) {
        if (error && error.message === 'SUSPENDED') throw error;
        console.error("Error during member auth/creation:", error);
        return true;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.memberId = user.memberId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.memberId || token.sub;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
