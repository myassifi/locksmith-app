const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const baseline = '20260907000000_postgresql_baseline';
const schema = path.resolve(__dirname, '../prisma/schema.postgres.prisma');
const prismaCommand = path.resolve(
  __dirname,
  `../node_modules/.bin/prisma${process.platform === 'win32' ? '.cmd' : ''}`,
);

function runPrisma(args, allowedStatuses = [0]) {
  const result = spawnSync(prismaCommand, args, {
    env: {
      ...process.env,
      CHECKPOINT_DISABLE: '1',
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
    },
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(`Prisma command failed with exit code ${result.status}`);
  }
  return result.status;
}

async function tableExists(prisma, name) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public."${name}"')::text AS "tableName"`,
  );
  return Boolean(rows[0]?.tableName);
}

async function baselineApplied(prisma) {
  if (!(await tableExists(prisma, '_prisma_migrations'))) return false;
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "_prisma_migrations"
    WHERE "migration_name" = ${baseline}
      AND "finished_at" IS NOT NULL
      AND "rolled_back_at" IS NULL
  `;
  return rows[0]?.count > 0;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be configured before database deployment.');
  }

  const prisma = new PrismaClient();
  let hasExistingSchema;
  let hasBaseline;

  try {
    hasExistingSchema = await tableExists(prisma, 'User');
    hasBaseline = hasExistingSchema && (await baselineApplied(prisma));
  } finally {
    await prisma.$disconnect();
  }

  if (hasExistingSchema && !hasBaseline) {
    console.log('Validating the existing PostgreSQL schema before migration baselining...');
    const driftStatus = runPrisma(
      [
        'migrate',
        'diff',
        '--from-url',
        process.env.DATABASE_URL,
        '--to-schema-datamodel',
        schema,
        '--exit-code',
      ],
      [0, 2],
    );

    if (driftStatus === 2) {
      throw new Error(
        'The production database differs from the Prisma schema. Refusing to baseline automatically.',
      );
    }

    runPrisma(['migrate', 'resolve', '--applied', baseline, '--schema', schema]);
  }

  runPrisma(['migrate', 'deploy', '--schema', schema]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
