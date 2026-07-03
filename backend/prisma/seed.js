import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const roles = await Promise.all(
    ['USER', 'ADMIN', 'SUPER_ADMIN'].map((name) =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name } }))
  );
  const superAdminRole = roles.find((r) => r.name === 'SUPER_ADMIN');

  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@footballai.app' },
    update: {},
    create: {
      email: 'admin@footballai.app',
      username: 'admin',
      passwordHash,
      fullName: 'Platform Admin',
      roleId: superAdminRole.id,
      isEmailVerified: true,
    },
  });

  await prisma.predictionModel.createMany({
    data: [
      { name: 'Statistical Prediction Engine', engineType: 'STATISTICAL', version: '1.0.0', accuracy: 61.2 },
      { name: 'ML Prediction Engine (Gradient Boosted)', engineType: 'MACHINE_LEARNING', version: '1.0.0', accuracy: 68.4 },
      { name: 'AI Hybrid Prediction Engine', engineType: 'HYBRID_AI', version: '1.0.0', accuracy: 71.9 },
    ],
    skipDuplicates: true,
  });

  await prisma.subscriptionPlan.createMany({
    data: [
      { name: 'Free', priceMonthly: 0, features: { predictions: 'basic', ads: true } },
      { name: 'Premium', priceMonthly: 9.99, priceYearly: 89.99, features: { predictions: 'hybrid-ai', ads: false, alerts: true } },
    ],
    skipDuplicates: true,
  });

  console.log('Seed complete. Admin login: admin@footballai.app / ChangeMe123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
