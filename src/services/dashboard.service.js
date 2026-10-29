import { prisma } from '../config/db.js';

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Week starts Monday 00:00 UTC (ISO week).
function startOfUtcWeek(date) {
  const start = startOfUtcDay(date);
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

async function countsByDay(delegate, since) {
  const rows = await delegate.aggregateRaw({
    pipeline: [
      { $match: { createdAt: { $gte: { $date: since.toISOString() } } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ],
  });

  return new Map((rows ?? []).map((row) => [row._id, row.count]));
}

export async function getSummary() {
  const weekStart = startOfUtcWeek(new Date());

  const [totalDoctors, totalPatients, newDoctorsThisWeek, newPatientsThisWeek] =
    await Promise.all([
      prisma.doctor.count(),
      prisma.patient.count(),
      prisma.doctor.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.patient.count({ where: { createdAt: { gte: weekStart } } }),
    ]);

  return { totalDoctors, totalPatients, newDoctorsThisWeek, newPatientsThisWeek };
}

export async function getPatientsPerDoctor(limit) {
  const grouped = await prisma.doctorPatient.groupBy({
    by: ['doctorId'],
    _count: { _all: true },
    orderBy: [{ _count: { doctorId: 'desc' } }, { doctorId: 'asc' }],
    take: limit,
  });

  const doctors = await prisma.doctor.findMany({
    where: { id: { in: grouped.map((row) => row.doctorId) } },
    select: { id: true, name: true, specialization: true },
  });
  const byId = new Map(doctors.map((doctor) => [doctor.id, doctor]));

  return grouped.map((row) => {
    const doctor = byId.get(row.doctorId);
    return {
      doctorId: row.doctorId,
      name: doctor?.name ?? null,
      specialization: doctor?.specialization ?? null,
      patientCount: row._count._all,
    };
  });
}

export async function getTimeline(range) {
  const days = RANGE_DAYS[range];
  const today = startOfUtcDay(new Date());
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const [doctorCounts, patientCounts] = await Promise.all([
    countsByDay(prisma.doctor, since),
    countsByDay(prisma.patient, since),
  ]);

  const timeline = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + offset);
    const key = dayKey(date);
    timeline.push({
      date: key,
      doctors: doctorCounts.get(key) ?? 0,
      patients: patientCounts.get(key) ?? 0,
    });
  }

  return timeline;
}
