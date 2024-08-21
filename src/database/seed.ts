import { prisma } from './prisma';

async function main(): Promise<void> {
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { slug: 'free' },
    create: {
      name: 'Free',
      slug: 'free',
      priceCents: 0,
      maxMembers: 5,
      maxProjects: 3,
      maxStorageMb: 500,
      features: ['basic_projects', 'basic_tasks', 'team_collaboration'],
    },
    update: {
      name: 'Free',
      priceCents: 0,
      maxMembers: 5,
      maxProjects: 3,
      maxStorageMb: 500,
      features: ['basic_projects', 'basic_tasks', 'team_collaboration'],
    },
  });

  console.log('Seeded subscription plan:', freePlan.slug);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
