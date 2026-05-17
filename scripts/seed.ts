/**
 * Veritabanı seed scripti.
 *
 *   npm run seed:panels | seed:inverters | seed:tariffs | seed:all
 *
 * Katalog JSON'larından Panel/Inverter/Tariff tablolarını doldurur ve
 * (varsa) dev kullanıcısını oluşturur. Coolify ilk deploy sonrası çalışır:
 *   npx prisma migrate deploy && npm run seed:all
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getPanels, getInverters, getTariffs } from "../lib/data/catalog";

const prisma = new PrismaClient();

async function seedPanels() {
  const panels = getPanels();
  for (const p of panels) {
    await prisma.panel.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }
  console.log(`✔ ${panels.length} panel seed edildi`);
}

async function seedInverters() {
  const inverters = getInverters();
  for (const i of inverters) {
    await prisma.inverter.upsert({
      where: { id: i.id },
      update: i,
      create: i,
    });
  }
  console.log(`✔ ${inverters.length} inverter seed edildi`);
}

async function seedTariffs() {
  const t = getTariffs();
  for (const [category, data] of Object.entries(t.tariffs)) {
    await prisma.tariff.upsert({
      where: { category },
      update: { timeOfUse: data.timeOfUse, data, year: data.year },
      create: { category, timeOfUse: data.timeOfUse, data, year: data.year },
    });
  }
  console.log(`✔ ${Object.keys(t.tariffs).length} tarife seed edildi`);
}

async function seedDevUser() {
  const email = process.env.DEV_LOGIN_EMAIL?.toLowerCase();
  const pass = process.env.DEV_LOGIN_PASSWORD;
  if (!email || !pass) {
    console.log("ℹ DEV_LOGIN_* tanımlı değil, dev kullanıcı atlandı");
    return;
  }
  const passwordHash = await bcrypt.hash(pass, 10);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, name: "Dev Kullanıcı", role: "admin", passwordHash },
  });
  console.log(`✔ Dev kullanıcı hazır: ${email}`);
}

async function main() {
  const arg = process.argv[2] ?? "all";
  if (arg === "panels") await seedPanels();
  else if (arg === "inverters") await seedInverters();
  else if (arg === "tariffs") await seedTariffs();
  else {
    await seedPanels();
    await seedInverters();
    await seedTariffs();
    await seedDevUser();
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
