import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const patientSelect = {
  id: true,
  name: true,
  age: true,
  gender: true,
  phone: true,
  condition: true,
  createdAt: true,
  updatedAt: true,
};

const patientWithDoctorSelect = {
  ...patientSelect,
  doctorLink: {
    select: { doctor: { select: { id: true, name: true } } },
  },
};

const linkWithPatientSelect = {
  createdAt: true,
  patient: { select: patientSelect },
};

const SORTS = {
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
  name_asc: [{ name: 'asc' }, { id: 'asc' }],
  name_desc: [{ name: 'desc' }, { id: 'desc' }],
};

function buildPatientWhere({ search, condition, doctorId, from, to }) {
  const where = {};

  if (search) {
    where.OR = [
      { name: { startsWith: search, mode: 'insensitive' } },
      { condition: { startsWith: search, mode: 'insensitive' } },
    ];
  }

  if (condition) where.condition = condition;
  if (doctorId) where.doctorLink = { is: { doctorId } };

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  return where;
}

function buildLinkWhere({ search, condition }) {
  if (!search && !condition) return {};

  const patientWhere = {};

  if (search) {
    patientWhere.OR = [
      { name: { startsWith: search, mode: 'insensitive' } },
      { condition: { startsWith: search, mode: 'insensitive' } },
    ];
  }

  if (condition) patientWhere.condition = condition;
  return { patient: { is: patientWhere } };
}

function toPatient(row) {
  const { doctorLink, ...patient } = row;
  return { ...patient, doctor: doctorLink?.doctor ?? null };
}

function paginationMeta(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

function mapPatientError(error, notFoundMessage = 'Patient not found') {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return ApiError.duplicate('This patient is already assigned to a doctor');
    }
    if (error.code === 'P2025') {
      return ApiError.notFound(notFoundMessage);
    }
  }

  return error;
}

async function assertDoctorExists(client, doctorId) {
  const doctor = await client.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true },
  });

  if (!doctor) throw ApiError.notFound('Doctor not found');
}

export async function listPatients(query) {
  const where = buildPatientWhere(query);
  const skip = (query.page - 1) * query.limit;

  const [rows, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: SORTS[query.sort],
      skip,
      take: query.limit,
      select: patientWithDoctorSelect,
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    items: rows.map(toPatient),
    meta: paginationMeta(query.page, query.limit, total),
  };
}

export async function getPatientById(id) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    select: patientWithDoctorSelect,
  });

  if (!patient) throw ApiError.notFound('Patient not found');
  return toPatient(patient);
}

export async function updatePatient(id, data) {
  try {
    const patient = await prisma.patient.update({
      where: { id },
      data,
      select: patientWithDoctorSelect,
    });
    return toPatient(patient);
  } catch (error) {
    throw mapPatientError(error);
  }
}

export async function deletePatient(id) {
  try {
    await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!patient) throw ApiError.notFound('Patient not found');

      await tx.doctorPatient.deleteMany({ where: { patientId: id } });
      await tx.patient.delete({ where: { id } });
    });

    return { id };
  } catch (error) {
    throw mapPatientError(error);
  }
}

export async function listDoctorPatients(doctorId, query) {
  await assertDoctorExists(prisma, doctorId);

  const where = { doctorId, ...buildLinkWhere(query) };
  const skip = (query.page - 1) * query.limit;

  const [links, total] = await Promise.all([
    prisma.doctorPatient.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: query.limit,
      select: linkWithPatientSelect,
    }),
    prisma.doctorPatient.count({ where }),
  ]);

  return {
    items: links.map(({ createdAt, patient }) => ({
      ...patient,
      assignedAt: createdAt,
    })),
    meta: paginationMeta(query.page, query.limit, total),
  };
}

export async function createDoctorPatient(doctorId, data) {
  try {
    return await prisma.$transaction(async (tx) => {
      await assertDoctorExists(tx, doctorId);

      const patient = await tx.patient.create({
        data,
        select: patientSelect,
      });
      await tx.doctorPatient.create({
        data: { doctorId, patientId: patient.id },
      });

      return patient;
    });
  } catch (error) {
    throw mapPatientError(error, 'Doctor not found');
  }
}

export async function removeDoctorPatient(doctorId, patientId) {
  try {
    await prisma.$transaction(async (tx) => {
      const link = await tx.doctorPatient.findUnique({
        where: { patientId },
        select: { doctorId: true },
      });

      if (!link || link.doctorId !== doctorId) {
        throw ApiError.notFound('Patient is not under this doctor');
      }

      await tx.doctorPatient.delete({ where: { patientId } });
      await tx.patient.delete({ where: { id: patientId } });
    });

    return { id: patientId };
  } catch (error) {
    throw mapPatientError(error);
  }
}
