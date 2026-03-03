import "dotenv/config";
import { prisma } from "@/lib/db";

/**
 * main function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
async function main() {
  const targetUserId = "1";

  let user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) {
    user = await prisma.user.findFirst();
  }
  if (!user) {
    const bcrypt = await import("bcryptjs");
    user = await prisma.user.create({
      data: {
        id: targetUserId,
        email: "test@example.com",
        passwordHash: await bcrypt.hash("password123", 12),
        name: "Test User",
      },
    });
    console.log(`Created user ${user.id} (test@example.com / password123)`);
  }

  const count = 50;
  const titles = [
    "React Hooks Deep Dive",
    "TypeScript Best Practices",
    "Next.js App Router Guide",
    "CSS Grid Layout Tutorial",
    "Node.js Performance Tips",
    "Web Accessibility Checklist",
    "REST API Design Patterns",
    "GraphQL vs REST",
    "Docker for Developers",
    "Kubernetes Basics",
    "Python Data Science",
    "Machine Learning Intro",
    "Clean Code Principles",
    "Design Patterns in JS",
    "Testing Strategies",
    "CI/CD Pipeline Setup",
    "Database Optimization",
    "Redis Caching Guide",
    "WebSocket Real-time Apps",
    "JWT Authentication",
    "OAuth 2.0 Explained",
    "Security Best Practices",
    "SEO for SPAs",
    "Performance Monitoring",
    "Error Handling Patterns",
    "State Management Redux",
    "Zustand vs Jotai",
    "Tailwind CSS Tips",
    "CSS Variables Guide",
    "Responsive Design",
    "Dark Mode Implementation",
    "Animation with Framer",
    "Form Validation",
    "File Upload Patterns",
    "Image Optimization",
    "Lazy Loading Strategies",
    "Code Splitting",
    "Bundle Size Optimization",
    "Serverless Functions",
    "Edge Computing",
    "Progressive Web Apps",
    "Service Workers",
    "IndexedDB Usage",
    "Web Workers",
    "WebAssembly Intro",
    "Monorepo with Turborepo",
    "Git Workflow",
    "Code Review Checklist",
    "Documentation Best Practices",
    "API Versioning",
  ];

  const chats = Array.from({ length: count }, (_, i) => ({
    userId: user!.id,
    title: titles[i % titles.length] + (i >= titles.length ? ` (${i + 1})` : ""),
  }));

  const result = await prisma.chat.createMany({ data: chats });
  console.log(`Created ${result.count} dummy chats for user ${user.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
