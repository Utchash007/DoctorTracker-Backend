import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const doctorSelect = {
  id: true,
  name: true,
  specialization: true,
  hospital: true,
  phone: true,
  email: true,
  createdAt: true,
  updatedAt: true,
};

const SORTS = {
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
  name_asc: [{ name: 'asc' }, { id: 'asc' }],
  name_desc: [{ name: 'desc' }, { id: 'desc' }],
};

function buildWhere({ search, specialization, hospital, from, to }) {
  const where = {};

  if (search) {
    where.OR = [
      { name: { startsWith: search, mode: 'insensitive' } },
      { specialization: { startsWith: search, mode: 'insensitive' } },
      { hospital: { startsWith: search, mode: 'insensitive' } },
    ];
  }

  if (specialization) where.specialization = specialization;
  if (hospital) where.hospital = hospital;

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  return where;
}

function mapWriteError(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return ApiError.duplicate('A doctor with this email already exists');
    }
    if (error.code === 'P2025') {
      return ApiError.notFound('Doctor not found');
    }
  }

  return error;
}

export async function listDoctors(query) {
  const where = buildWhere(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      orderBy: SORTS[query.sort],
      skip,
      take: query.limit,
      select: doctorSelect,
    }),
    prisma.doctor.count({ where }),
  ]);

  return {
    items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getDoctorFilters() {
  const [specializations, hospitals] = await Promise.all([
    prisma.doctor.findMany({
      distinct: ['specialization'],
      select: { specialization: true },
      orderBy: { specialization: 'asc' },
    }),
    prisma.doctor.findMany({
      distinct: ['hospital'],
      select: { hospital: true },
      orderBy: { hospital: 'asc' },
    }),
  ]);

  return {
    specializations: specializations.map((row) => row.specialization),
    hospitals: hospitals.map((row) => row.hospital),
  };
}

export async function getDoctorById(id) {
  const doctor = await prisma.doctor.findUnique({
    where: { id },
    select: doctorSelect,
  });

  if (!doctor) throw ApiError.notFound('Doctor not found');
  return doctor;
}

export async function createDoctor(data) {
  try {
    return await prisma.doctor.create({ data, select: doctorSelect });
  } catch (error) {
    throw mapWriteError(error);
  }
}

export async function updateDoctor(id, data) {
  try {
    return await prisma.doctor.update({
      where: { id },
      data,
      select: doctorSelect,
    });
  } catch (error) {
    throw mapWriteError(error);
  }
}

export async function deleteDoctor(id) {
  try {
    return await prisma.$transaction(async (tx) => {
      const patientCount = await tx.doctorPatient.count({ where: { doctorId: id } });
      if (patientCount > 0) {
        throw ApiError.conflict('Cannot delete a doctor who still has patients');
      }

      await tx.doctor.delete({ where: { id } });
      return { id };
    });
  } catch (error) {
    throw mapWriteError(error);
  }
}
