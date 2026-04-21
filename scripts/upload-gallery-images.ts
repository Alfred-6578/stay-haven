import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "path";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// Upload a local file and return the Cloudinary URL
async function upload(localFile: string, publicId: string): Promise<string> {
  const localPath = path.join(process.cwd(), "public", localFile);
  if (!fs.existsSync(localPath)) throw new Error(`File not found: ${localPath}`);

  const result = await cloudinary.uploader.upload(localPath, {
    folder: "stayhaven/gallery",
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
  });
  return result.secure_url;
}

// Map each room type slug to the extra image files it should use
// We rotate through available images so each type gets 2-3 gallery images
const galleryMap: Record<string, string[]> = {
  "standard":           ["room_5.jpeg",  "room_11.jpeg", "room_3.jpeg"],
  "superior":           ["room_4.jpg",   "room_6.jpeg",  "room_2.jpeg"],
  "deluxe":             ["room_7.jpeg",  "room_9.jpeg",  "room_5.jpeg"],
  "premium":            ["room_8.jpeg",  "room_3.jpeg",  "room_12.jpeg"],
  "junior-suite":       ["room_10.jpeg", "room_4.jpg",   "room_7.jpeg"],
  "executive-suite":    ["room_9.jpeg",  "room_12.jpeg", "room_5.jpeg"],
  "presidential-suite": ["room_6.jpeg",  "room_10.jpeg", "room_13.jpeg"],
  "penthouse":          ["room_7.jpeg",  "room_11.jpeg", "room_3.jpeg"],
  "family-room":        ["room_2.jpeg",  "room_8.jpeg",  "room_6.jpeg"],
  "twin-room":          ["room_13.jpeg", "room_9.jpeg",  "room_4.jpg"],
  "honeymoon-suite":    ["room_5.jpeg",  "room_10.jpeg", "room_8.jpeg"],
  "accessible-room":    ["room_3.jpeg",  "room_11.jpeg", "room_7.jpeg"],
};

async function main() {
  const roomTypes = await prisma.roomType.findMany({
    select: { id: true, slug: true, name: true, images: true },
  });

  console.log(`Found ${roomTypes.length} room types\n`);

  // Track already-uploaded URLs to avoid re-uploading the same file
  const uploadedCache = new Map<string, string>();

  for (const rt of roomTypes) {
    const extraFiles = galleryMap[rt.slug];
    if (!extraFiles) {
      console.log(`⏭  ${rt.name} — no gallery mapping, skipping`);
      continue;
    }

    // Skip if already has gallery images
    if (rt.images.length >= 2) {
      console.log(`⏭  ${rt.name} — already has ${rt.images.length} gallery images`);
      continue;
    }

    console.log(`📸 ${rt.name} — uploading ${extraFiles.length} gallery images...`);
    const urls: string[] = [];

    for (const file of extraFiles) {
      try {
        // Use cache to avoid re-uploading same file
        const cacheKey = file;
        let url = uploadedCache.get(cacheKey);
        if (!url) {
          const publicId = file.replace(/\.(jpeg|jpg|png)$/, "");
          url = await upload(file, publicId);
          uploadedCache.set(cacheKey, url);
        }
        urls.push(url);
        console.log(`   ✅ ${file}`);
      } catch (err) {
        console.error(`   ❌ ${file}:`, err);
      }
    }

    if (urls.length > 0) {
      await prisma.roomType.update({
        where: { id: rt.id },
        data: { images: urls },
      });
      console.log(`   → Saved ${urls.length} gallery images\n`);
    }
  }

  console.log("Done!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
