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

async function main() {
  const roomTypes = await prisma.roomType.findMany({
    where: { image: { not: null } },
    select: { id: true, name: true, slug: true, image: true },
  });

  console.log(`Found ${roomTypes.length} room types with local images\n`);

  for (const rt of roomTypes) {
    if (!rt.image || rt.image.startsWith("http")) {
      console.log(`⏭  ${rt.name} — already a URL, skipping`);
      continue;
    }

    // Resolve local path: "/room_2.jpeg" → "public/room_2.jpeg"
    const localPath = path.join(process.cwd(), "public", rt.image);

    if (!fs.existsSync(localPath)) {
      console.log(`⚠  ${rt.name} — file not found: ${localPath}`);
      continue;
    }

    console.log(`📤 ${rt.name} — uploading ${rt.image}...`);

    try {
      const result = await cloudinary.uploader.upload(localPath, {
        folder: "stayhaven/rooms",
        public_id: rt.slug,
        overwrite: true,
        resource_type: "image",
      });

      await prisma.roomType.update({
        where: { id: rt.id },
        data: { image: result.secure_url },
      });

      console.log(`✅ ${rt.name} → ${result.secure_url}\n`);
    } catch (err) {
      console.error(`❌ ${rt.name} — upload failed:`, err);
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
