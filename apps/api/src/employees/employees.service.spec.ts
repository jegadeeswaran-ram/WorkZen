import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { PrismaService } from '../common/prisma/prisma.service';

const TENANT_ID = 'tenant-1';
const USER_ID = 'user-1';

const mockEmployee = {
  id: 'emp-1',
  tenantId: TENANT_ID,
  employeeCode: 'EMP00001',
  firstName: 'Rajesh',
  lastName: 'Kumar',
  personalPhone: '9876543210',
  status: 'ACTIVE',
  joiningDate: new Date('2024-01-01'),
  designation: { name: 'Security Guard' },
  department: { name: 'Operations' },
  deletedAt: null,
};

describe('EmployeesService', () => {
  let service: EmployeesService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: PrismaService,
          useValue: {
            employee: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            designation: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
            department: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(EmployeesService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('getStats', () => {
    it('returns aggregated employee counts', async () => {
      jest.spyOn(prisma.employee, 'count')
        .mockResolvedValueOnce(100)   // total
        .mockResolvedValueOnce(80)    // active
        .mockResolvedValueOnce(5)     // onLeave
        .mockResolvedValueOnce(60);   // deployed

      const stats = await service.getStats(TENANT_ID);
      expect(stats).toEqual({ total: 100, active: 80, onLeave: 5, deployed: 60 });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when employee not found', async () => {
      jest.spyOn(prisma.employee, 'findFirst').mockResolvedValue(null);
      await expect(service.findOne(TENANT_ID, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('returns employee when found', async () => {
      jest.spyOn(prisma.employee, 'findFirst').mockResolvedValue(mockEmployee as any);
      const result = await service.findOne(TENANT_ID, 'emp-1');
      expect(result).toEqual(mockEmployee);
      expect(prisma.employee.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'emp-1', tenantId: TENANT_ID } }),
      );
    });
  });

  describe('create', () => {
    it('auto-generates employee code and creates employee', async () => {
      jest.spyOn(prisma.employee, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.employee, 'create').mockResolvedValue(mockEmployee as any);

      const dto = { firstName: 'Suresh', lastName: 'Patel', personalPhone: '9123456789' } as any;
      const result = await service.create(TENANT_ID, dto, USER_ID);

      expect(prisma.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          employeeCode: 'EMP00001',
          createdBy: USER_ID,
        }),
      });
      expect(result).toEqual(mockEmployee);
    });

    it('increments employee code based on existing count', async () => {
      jest.spyOn(prisma.employee, 'count').mockResolvedValue(42);
      jest.spyOn(prisma.employee, 'create').mockResolvedValue({ ...mockEmployee, employeeCode: 'EMP00043' } as any);

      await service.create(TENANT_ID, {} as any, USER_ID);

      expect(prisma.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ employeeCode: 'EMP00043' }),
      });
    });
  });

  describe('update', () => {
    it('throws NotFoundException when updating non-existent employee', async () => {
      jest.spyOn(prisma.employee, 'findFirst').mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {} as any, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('updates employee with userId as updatedBy', async () => {
      jest.spyOn(prisma.employee, 'findFirst').mockResolvedValue(mockEmployee as any);
      jest.spyOn(prisma.employee, 'update').mockResolvedValue({ ...mockEmployee, firstName: 'Updated' } as any);

      const result = await service.update(TENANT_ID, 'emp-1', { firstName: 'Updated' } as any, USER_ID);

      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-1' },
        data: expect.objectContaining({ firstName: 'Updated', updatedBy: USER_ID }),
      });
      expect(result.firstName).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('soft-deletes employee (sets deletedAt and status INACTIVE)', async () => {
      jest.spyOn(prisma.employee, 'findFirst').mockResolvedValue(mockEmployee as any);
      jest.spyOn(prisma.employee, 'update').mockResolvedValue({ ...mockEmployee, deletedAt: new Date(), status: 'INACTIVE' } as any);

      await service.remove(TENANT_ID, 'emp-1');

      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-1' },
        data: { deletedAt: expect.any(Date), status: 'INACTIVE' },
      });
    });
  });

  describe('findAll', () => {
    it('returns paginated employees with tenant isolation', async () => {
      jest.spyOn(prisma.employee, 'findMany').mockResolvedValue([mockEmployee] as any);
      jest.spyOn(prisma.employee, 'count').mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_ID }) }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('applies search filter when search param is provided', async () => {
      jest.spyOn(prisma.employee, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prisma.employee, 'count').mockResolvedValue(0);

      await service.findAll(TENANT_ID, { search: 'Rajesh', page: 1, limit: 20 });

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: expect.objectContaining({ contains: 'Rajesh' }) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('getDesignations', () => {
    it('returns designations ordered by name', async () => {
      const designations = [{ id: 'd1', name: 'Guard' }, { id: 'd2', name: 'Supervisor' }];
      jest.spyOn(prisma.designation, 'findMany').mockResolvedValue(designations as any);

      const result = await service.getDesignations(TENANT_ID);
      expect(prisma.designation.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(designations);
    });
  });
});
