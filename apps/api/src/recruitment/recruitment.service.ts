import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class RecruitmentService {
  constructor(private prisma: PrismaService) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboard(tenantId: string) {
    const [open, applied, shortlisted, interviews, offers, joined, onboarding] = await Promise.all([
      this.prisma.jobRequisition.count({ where: { tenantId, status: 'OPEN' } }),
      this.prisma.candidate.count({ where: { tenantId } }),
      this.prisma.candidate.count({ where: { tenantId, status: 'SHORTLISTED' } }),
      this.prisma.interview.count({ where: { tenantId } }),
      this.prisma.offerLetter.count({ where: { tenantId } }),
      this.prisma.candidate.count({ where: { tenantId, status: 'JOINED' } }),
      this.prisma.onboardingRecord.count({ where: { tenantId, status: { not: 'COMPLETED' } } }),
    ]);
    const totalOffers = await this.prisma.offerLetter.count({ where: { tenantId } });
    const rejectedOffers = await this.prisma.offerLetter.count({ where: { tenantId, status: 'REJECTED' } });
    return {
      openPositions: open, applied, shortlisted, interviews,
      offersReleased: offers, joined, pendingOnboarding: onboarding,
      offerRejectionPct: totalOffers > 0 ? Math.round((rejectedOffers / totalOffers) * 100) : 0,
    };
  }

  // ─── Requisitions ───────────────────────────────────────────────────────────

  async getRequisitions(tenantId: string, query: PaginationDto & { status?: string }) {
    const { page = 1, limit = 20, search, status } = query;
    const where: any = { tenantId, ...(status && { status }), ...(search && { title: { contains: search, mode: 'insensitive' } }) };
    const [data, total] = await Promise.all([
      this.prisma.jobRequisition.findMany({
        where,
        include: { _count: { select: { candidates: true } } },
        orderBy: { createdAt: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.jobRequisition.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async createRequisition(tenantId: string, dto: Record<string, unknown>, userId: string) {
    const count = await this.prisma.jobRequisition.count({ where: { tenantId } });
    const requisitionNo = `REQ${String(count + 1).padStart(5, '0')}`;
    return this.prisma.jobRequisition.create({ data: { ...dto, tenantId, requisitionNo, createdBy: userId } as any });
  }

  async updateRequisition(tenantId: string, id: string, dto: Record<string, unknown>, userId: string) {
    await this.prisma.jobRequisition.findFirstOrThrow({ where: { id, tenantId } });
    return this.prisma.jobRequisition.update({ where: { id }, data: { ...dto, updatedBy: userId } as any });
  }

  // ─── Candidates ─────────────────────────────────────────────────────────────

  async getAllCandidates(tenantId: string, query: PaginationDto & { status?: string }) {
    const { page = 1, limit = 20, search, status } = query;
    const where: any = {
      tenantId,
      ...(status && { status }),
      ...(search && { OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] }),
    };
    const [data, total] = await Promise.all([
      this.prisma.candidate.findMany({ where, include: { interviews: { orderBy: { scheduledAt: 'desc' }, take: 1 }, requisition: { select: { title: true, requisitionNo: true } } }, orderBy: { createdAt: 'desc' }, ...paginate(page, limit) }),
      this.prisma.candidate.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getCandidate(tenantId: string, id: string) {
    const c = await this.prisma.candidate.findFirst({
      where: { id, tenantId },
      include: { interviews: { include: { interviewFeedback: true }, orderBy: { scheduledAt: 'desc' } }, offerLetters: true, assessments: true, onboarding: true, requisition: { select: { title: true, requisitionNo: true } } },
    });
    if (!c) throw new NotFoundException('Candidate not found');
    return c;
  }

  async getCandidates(tenantId: string, requisitionId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const where = { tenantId, requisitionId };
    const [data, total] = await Promise.all([
      this.prisma.candidate.findMany({ where, include: { interviews: true }, ...paginate(page, limit) }),
      this.prisma.candidate.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async addCandidate(tenantId: string, requisitionId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.candidate.create({ data: { ...dto, tenantId, requisitionId, createdBy: userId } as any });
  }

  async updateCandidateStatus(tenantId: string, id: string, status: string) {
    return this.prisma.candidate.update({ where: { id }, data: { status: status as any } });
  }

  // ─── Interviews ─────────────────────────────────────────────────────────────

  async scheduleInterview(tenantId: string, candidateId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.interview.create({ data: { ...dto, tenantId, candidateId, createdBy: userId } as any });
  }

  async updateInterview(tenantId: string, id: string, dto: Record<string, unknown>) {
    return this.prisma.interview.update({ where: { id }, data: dto as any });
  }

  async submitInterviewFeedback(tenantId: string, interviewId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.interviewFeedback.upsert({
      where: { interviewId },
      create: { ...dto, tenantId, interviewId, submittedBy: userId, submittedAt: new Date() } as any,
      update: { ...dto, submittedBy: userId, submittedAt: new Date() } as any,
    });
  }

  // ─── Assessments ────────────────────────────────────────────────────────────

  async getAssessments(tenantId: string, candidateId: string) {
    return this.prisma.candidateAssessment.findMany({ where: { tenantId, candidateId }, orderBy: { createdAt: 'desc' } });
  }

  async createAssessment(tenantId: string, candidateId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.candidateAssessment.create({ data: { ...dto, tenantId, candidateId, createdBy: userId } as any });
  }

  async updateAssessment(tenantId: string, id: string, dto: Record<string, unknown>) {
    return this.prisma.candidateAssessment.update({ where: { id }, data: dto as any });
  }

  // ─── Offer Letters ──────────────────────────────────────────────────────────

  async getOffers(tenantId: string, query: PaginationDto & { status?: string }) {
    const { page = 1, limit = 20, status } = query;
    const where: any = { tenantId, ...(status && { status }) };
    const [data, total] = await Promise.all([
      this.prisma.offerLetter.findMany({ where, include: { candidate: { select: { firstName: true, lastName: true, phone: true, requisition: { select: { title: true } } } } }, orderBy: { createdAt: 'desc' }, ...paginate(page, limit) }),
      this.prisma.offerLetter.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async createOffer(tenantId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.offerLetter.create({ data: { ...dto, tenantId, createdBy: userId } as any });
  }

  async updateOfferStatus(tenantId: string, id: string, status: string) {
    const data: any = { status };
    if (status === 'ACCEPTED') data.acceptedAt = new Date();
    if (status === 'REJECTED') data.rejectedAt = new Date();
    return this.prisma.offerLetter.update({ where: { id }, data });
  }

  // ─── Onboarding ─────────────────────────────────────────────────────────────

  async getOnboardings(tenantId: string, query: PaginationDto & { status?: string }) {
    const { page = 1, limit = 20, status } = query;
    const where: any = { tenantId, ...(status && { status }) };
    const [data, total] = await Promise.all([
      this.prisma.onboardingRecord.findMany({ where, include: { candidate: { select: { firstName: true, lastName: true, phone: true, requisition: { select: { title: true } } } } }, orderBy: { createdAt: 'desc' }, ...paginate(page, limit) }),
      this.prisma.onboardingRecord.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async createOnboarding(tenantId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.onboardingRecord.create({ data: { ...dto, tenantId, createdBy: userId } as any });
  }

  async updateOnboarding(tenantId: string, id: string, dto: Record<string, unknown>) {
    return this.prisma.onboardingRecord.update({ where: { id }, data: dto as any });
  }
}
