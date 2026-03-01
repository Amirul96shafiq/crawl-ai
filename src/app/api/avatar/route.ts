import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const AVATAR_SIZE = 128;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("avatar") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 },
    );
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error:
          "Invalid format. Accepted: JPEG, JPG, PNG, WebP",
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 2MB" },
      { status: 400 },
    );
  }

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create upload directory:", err);
    return NextResponse.json(
      { error: "Failed to save avatar" },
      { status: 500 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  if (user?.image) {
    const oldPath = path.join(process.cwd(), "public", user.image);
    if (existsSync(oldPath)) {
      try {
        await unlink(oldPath);
      } catch {
        // Ignore if old file cannot be removed
      }
    }
  }

  const bytes = await file.arrayBuffer();
  const inputBuffer = Buffer.from(bytes);

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: "cover",
        position: "center",
        kernel: "lanczos2",
      })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (err) {
    console.error("Failed to process avatar:", err);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 },
    );
  }

  const filename = `${session.user.id}.jpg`;
  const filepath = path.join(UPLOAD_DIR, filename);

  try {
    await writeFile(filepath, outputBuffer);
  } catch (err) {
    console.error("Failed to write avatar file:", err);
    return NextResponse.json(
      { error: "Failed to save avatar" },
      { status: 500 },
    );
  }

  const imagePath = `/uploads/avatars/${filename}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: imagePath },
  });

  return NextResponse.json({ image: imagePath });
}
