# Billing — Detailed Invoice & Quotation Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-featured invoice creation (with line items), invoice detail view, quotation creation/list, two print templates (Professional + Modern), PDF download, print, and WhatsApp send to the WorkZen billing module.

**Architecture:** Quotation is a new Prisma model (similar to Invoice but without payment fields). Both Invoice and Quotation share two printable React template components rendered in a side-drawer/modal, with Print/PDF/WhatsApp action buttons. PDF uses `html2canvas` + `jspdf` (client-side). WhatsApp send calls `POST /billing/invoices/:id/send-whatsapp` or `POST /billing/quotations/:id/send-whatsapp` which enqueues a WATI notification.

**Tech Stack:** Next.js 15 App Router, NestJS, Prisma, TanStack Query, React Hook Form + Zod, Shadcn/UI, jspdf + html2canvas, WATI WhatsApp API via existing NotificationsService.

---

## File Map

### New files
| File | Purpose |
|---|---|
| `packages/database/prisma/schema.prisma` | Add Quotation + QuotationLineItem models |
| `apps/api/src/billing/quotation.service.ts` | Quotation CRUD + convert-to-invoice |
| `apps/api/src/billing/dto/create-quotation.dto.ts` | Validated DTO |
| `apps/web/src/app/(dashboard)/billing/invoices/new/page.tsx` | Full invoice creation page |
| `apps/web/src/app/(dashboard)/billing/invoices/[id]/page.tsx` | Invoice detail + template view |
| `apps/web/src/app/(dashboard)/billing/quotations/page.tsx` | Quotation list page |
| `apps/web/src/app/(dashboard)/billing/quotations/new/page.tsx` | Quotation creation page |
| `apps/web/src/app/(dashboard)/billing/quotations/[id]/page.tsx` | Quotation detail + template view |
| `apps/web/src/components/billing/templates/TemplateClassic.tsx` | Template 1 — Professional GST invoice/quotation |
| `apps/web/src/components/billing/templates/TemplateModern.tsx` | Template 2 — Modern minimal |
| `apps/web/src/components/billing/DocumentActions.tsx` | Print / Download PDF / Send WhatsApp bar |
| `apps/web/src/components/billing/LineItemsEditor.tsx` | Reusable line-items table editor |

### Modified files
| File | Change |
|---|---|
| `apps/api/src/billing/billing.controller.ts` | Add quotation routes + WhatsApp send routes |
| `apps/api/src/billing/billing.module.ts` | Register QuotationService |
| `apps/web/src/lib/api.ts` | Add `quotationApi` + whatsapp methods |
| `apps/web/src/app/(dashboard)/billing/page.tsx` | Add Quotations tab; "New Invoice" button navigates to `/billing/invoices/new` |
| `apps/web/package.json` | Add `jspdf` + `html2canvas` |

---

## Task 1 — Prisma: Add Quotation model

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

- [ ] **Step 1: Add QuotationStatus enum and Quotation + QuotationLineItem models**

Add after the `InvoiceType` enum block (around line 313):

```prisma
enum QuotationStatus {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
  EXPIRED
}
```

Add after the `InvoiceLineItem` model (after line 1632):

```prisma
model Quotation {
  id              String          @id @default(cuid())
  tenantId        String
  quotationNo     String
  clientId        String
  tenderId        String?
  issueDate       DateTime        @db.Date
  validUntil      DateTime        @db.Date
  status          QuotationStatus @default(DRAFT)
  subtotal        Decimal         @db.Decimal(15, 2)
  discount        Decimal         @db.Decimal(15, 2) @default(0)
  taxableAmount   Decimal         @db.Decimal(15, 2)
  cgstAmount      Decimal         @db.Decimal(15, 2) @default(0)
  sgstAmount      Decimal         @db.Decimal(15, 2) @default(0)
  igstAmount      Decimal         @db.Decimal(15, 2) @default(0)
  totalAmount     Decimal         @db.Decimal(15, 2)
  notes           String?
  termsConditions String?
  createdBy       String?
  updatedBy       String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  deletedAt       DateTime?

  client    Client             @relation(fields: [clientId], references: [id])
  tender    Tender?            @relation(fields: [tenderId], references: [id])
  lineItems QuotationLineItem[]

  @@unique([tenantId, quotationNo])
  @@index([tenantId])
  @@index([clientId])
  @@index([status])
  @@map("quotations")
}

model QuotationLineItem {
  id          String    @id @default(cuid())
  quotationId String
  description String
  hsn         String?
  quantity    Decimal   @db.Decimal(10, 2)
  rate        Decimal   @db.Decimal(10, 2)
  amount      Decimal   @db.Decimal(15, 2)
  taxRate     Decimal   @db.Decimal(5, 2) @default(18)
  taxAmount   Decimal   @db.Decimal(15, 2) @default(0)

  quotation   Quotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)

  @@index([quotationId])
  @@map("quotation_line_items")
}
```

- [ ] **Step 2: Add `quotations` relation to Client model**

In `model Client` (around line 795), after `invoices Invoice[]`, add:
```prisma
  quotations           Quotation[]
```

- [ ] **Step 3: Add `quotations` relation to Tender model**

In `model Tender` (around line 683), after `invoices Invoice[]`, add:
```prisma
  quotations           Quotation[]
```

- [ ] **Step 4: Run migration**

```bash
cd "I:/Upcoming Projects/WorkZen"
npm run db:generate
npm run db:migrate
```

Expected: Migration file created, Prisma client regenerated with `Quotation` and `QuotationLineItem` types.

- [ ] **Step 5: Verify**

```bash
cd "I:/Upcoming Projects/WorkZen"
npx prisma studio --port 5555
```

Open http://localhost:5555 — confirm `quotations` and `quotation_line_items` tables appear.

---

## Task 2 — API: QuotationService

**Files:**
- Create: `apps/api/src/billing/quotation.service.ts`
- Create: `apps/api/src/billing/dto/create-quotation.dto.ts`

- [ ] **Step 1: Create DTO**

Create `apps/api/src/billing/dto/create-quotation.dto.ts`:

```typescript
import { IsString, IsOptional, IsArray, IsNumber, IsDateString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuotationLineItemDto {
  @IsString() description: string;
  @IsOptional() @IsString() hsn?: string;
  @IsNumber() @Min(0) quantity: number;
  @IsNumber() @Min(0) rate: number;
  @IsNumber() @Min(0) taxRate: number;
}

export class CreateQuotationDto {
  @IsString() clientId: string;
  @IsOptional() @IsString() tenderId?: string;
  @IsDateString() issueDate: string;
  @IsDateString() validUntil: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() termsConditions?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => QuotationLineItemDto)
  lineItems: QuotationLineItemDto[];
}
```

- [ ] **Step 2: Create QuotationService**

Create `apps/api/src/billing/quotation.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';

@Injectable()
export class QuotationService {
  constructor(private prisma: PrismaService) {}

  private calcTotals(lineItems: CreateQuotationDto['lineItems']) {
    let subtotal = 0;
    const items = lineItems.map(item => {
      const amount = item.quantity * item.rate;
      const taxAmount = (amount * item.taxRate) / 100;
      subtotal += amount;
      return { ...item, amount, taxAmount };
    });
    const taxableAmount = subtotal;
    const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
    const cgst = totalTax / 2;
    const sgst = totalTax / 2;
    return { items, subtotal, taxableAmount, cgstAmount: cgst, sgstAmount: sgst, igstAmount: 0, totalAmount: subtotal + totalTax };
  }

  async create(tenantId: string, dto: CreateQuotationDto, userId: string) {
    const { items, subtotal, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalAmount } = this.calcTotals(dto.lineItems);
    const count = await this.prisma.quotation.count({ where: { tenantId } });
    const quotationNo = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.quotation.create({
      data: {
        tenantId, quotationNo,
        clientId: dto.clientId,
        tenderId: dto.tenderId,
        issueDate: new Date(dto.issueDate),
        validUntil: new Date(dto.validUntil),
        subtotal, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalAmount,
        discount: 0,
        notes: dto.notes,
        termsConditions: dto.termsConditions,
        createdBy: userId,
        lineItems: {
          create: items.map(i => ({
            description: i.description, hsn: i.hsn,
            quantity: i.quantity, rate: i.rate,
            amount: i.amount, taxRate: i.taxRate, taxAmount: i.taxAmount,
          })),
        },
      },
      include: { client: true, tender: true, lineItems: true },
    });
  }

  async list(tenantId: string, query: any) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 15);
    const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.clientSearch) where.client = { name: { contains: query.clientSearch, mode: 'insensitive' } };

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where, skip, take: limit,
        include: { client: true, tender: true, lineItems: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quotation.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async get(tenantId: string, id: string) {
    const q = await this.prisma.quotation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { client: true, tender: true, lineItems: true },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    return q;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateQuotationDto> & { status?: string }) {
    const existing = await this.get(tenantId, id);
    let updateData: any = {};

    if (dto.lineItems) {
      const { items, subtotal, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalAmount } = this.calcTotals(dto.lineItems);
      await this.prisma.quotationLineItem.deleteMany({ where: { quotationId: id } });
      updateData = { subtotal, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalAmount, discount: 0,
        lineItems: { create: items.map(i => ({ description: i.description, hsn: i.hsn, quantity: i.quantity, rate: i.rate, amount: i.amount, taxRate: i.taxRate, taxAmount: i.taxAmount })) },
      };
    }
    if (dto.status) updateData.status = dto.status;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.termsConditions !== undefined) updateData.termsConditions = dto.termsConditions;
    if (dto.validUntil) updateData.validUntil = new Date(dto.validUntil);

    return this.prisma.quotation.update({
      where: { id },
      data: updateData,
      include: { client: true, tender: true, lineItems: true },
    });
  }

  async convertToInvoice(tenantId: string, id: string, userId: string) {
    const q = await this.get(tenantId, id);
    const count = await this.prisma.invoice.count({ where: { tenantId } });
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const now = new Date();
    const dueDate = new Date(now.getTime() + 30 * 86400000);

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId, invoiceNo,
        clientId: q.clientId, tenderId: q.tenderId,
        issueDate: now, dueDate,
        subtotal: q.subtotal, discount: 0, taxableAmount: q.taxableAmount,
        cgstAmount: q.cgstAmount, sgstAmount: q.sgstAmount, igstAmount: q.igstAmount,
        totalAmount: q.totalAmount, paidAmount: 0, balanceAmount: q.totalAmount,
        notes: q.notes, termsConditions: q.termsConditions,
        createdBy: userId,
        lineItems: {
          create: q.lineItems.map(l => ({
            description: l.description, hsn: l.hsn,
            quantity: l.quantity, rate: l.rate,
            amount: l.amount, taxRate: l.taxRate, taxAmount: l.taxAmount,
          })),
        },
      },
      include: { client: true, tender: true, lineItems: true },
    });

    await this.prisma.quotation.update({ where: { id }, data: { status: 'ACCEPTED' } });
    return invoice;
  }
}
```

---

## Task 3 — API: Register QuotationService + Add Routes + WhatsApp Send

**Files:**
- Modify: `apps/api/src/billing/billing.module.ts`
- Modify: `apps/api/src/billing/billing.controller.ts`

- [ ] **Step 1: Register QuotationService in billing.module.ts**

Read `apps/api/src/billing/billing.module.ts`, then add `QuotationService` to providers and imports:

```typescript
import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingSheetService } from './billing-sheet.service';
import { CollectionService } from './collection.service';
import { QuotationService } from './quotation.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [BillingController],
  providers: [BillingService, BillingSheetService, CollectionService, QuotationService],
  exports: [BillingService],
})
export class BillingModule {}
```

- [ ] **Step 2: Add quotation routes + WhatsApp send routes to billing.controller.ts**

In `apps/api/src/billing/billing.controller.ts`, add `QuotationService` and `NotificationsService` to constructor and add these routes after the existing debit-note route:

```typescript
// Add to imports at top:
import { QuotationService } from './quotation.service';
import { NotificationsService } from '../notifications/notifications.service';

// Update constructor:
constructor(
  private service: BillingService,
  private billingSheetService: BillingSheetService,
  private collectionService: CollectionService,
  private quotationService: QuotationService,
  private notificationsService: NotificationsService,
) {}

// Add these routes:

// ── WhatsApp Send ───────────────────────────────────────
@Post('invoices/:id/send-whatsapp')
@RequirePermissions('invoice:write')
async sendInvoiceWhatsApp(
  @TenantId() tenantId: string,
  @Param('id') id: string,
  @Body() dto: { phone: string; message?: string },
  @CurrentUser('id') userId: string,
) {
  const invoice = await this.service.getInvoice(tenantId, id);
  const body = dto.message ?? `Dear ${(invoice as any).client?.name},\n\nPlease find your invoice ${(invoice as any).invoiceNo} for ₹${(invoice as any).totalAmount}.\n\nThank you.\nWorkZen ERP`;
  return this.notificationsService.send({
    tenantId, userId,
    type: 'WHATSAPP',
    recipient: dto.phone,
    subject: `Invoice ${(invoice as any).invoiceNo}`,
    body,
    data: { invoiceId: id },
  });
}

// ── Quotations ──────────────────────────────────────────
@Get('quotations') @RequirePermissions('invoice:read')
listQuotations(@TenantId() t: string, @Query() q: any) {
  return this.quotationService.list(t, q);
}

@Post('quotations') @RequirePermissions('invoice:write')
createQuotation(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) {
  return this.quotationService.create(t, dto, uid);
}

@Get('quotations/:id') @RequirePermissions('invoice:read')
getQuotation(@TenantId() t: string, @Param('id') id: string) {
  return this.quotationService.get(t, id);
}

@Patch('quotations/:id') @RequirePermissions('invoice:write')
updateQuotation(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) {
  return this.quotationService.update(t, id, dto);
}

@Post('quotations/:id/convert') @RequirePermissions('invoice:write')
convertQuotation(@TenantId() t: string, @Param('id') id: string, @CurrentUser('id') uid: string) {
  return this.quotationService.convertToInvoice(t, id, uid);
}

@Post('quotations/:id/send-whatsapp')
@RequirePermissions('invoice:write')
async sendQuotationWhatsApp(
  @TenantId() tenantId: string,
  @Param('id') id: string,
  @Body() dto: { phone: string; message?: string },
  @CurrentUser('id') userId: string,
) {
  const quotation = await this.quotationService.get(tenantId, id);
  const body = dto.message ?? `Dear ${(quotation as any).client?.name},\n\nPlease find your quotation ${(quotation as any).quotationNo} for ₹${(quotation as any).totalAmount}.\n\nValid until: ${new Date((quotation as any).validUntil).toLocaleDateString('en-IN')}.\n\nWorkZen ERP`;
  return this.notificationsService.send({
    tenantId, userId,
    type: 'WHATSAPP',
    recipient: dto.phone,
    subject: `Quotation ${(quotation as any).quotationNo}`,
    body,
    data: { quotationId: id },
  });
}
```

- [ ] **Step 3: Verify API compiles**

```bash
curl -s http://localhost:3001/api/v1/billing/quotations \
  -H "Authorization: Bearer <token>" | head -c 200
```

Expected: `{"success":true,"data":[],"meta":{...}}`

---

## Task 4 — Frontend: Install PDF deps + API client

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/lib/api.ts`

- [ ] **Step 1: Install jspdf + html2canvas**

```bash
cd "I:/Upcoming Projects/WorkZen"
npm install jspdf html2canvas --workspace=@workzen/web
```

Expected: packages added to `apps/web/package.json`.

- [ ] **Step 2: Add quotationApi and whatsapp methods to api.ts**

In `apps/web/src/lib/api.ts`, after the `billingApi` block, add:

```typescript
export const quotationApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/billing/quotations', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get(`/billing/quotations/${id}`).then((r) => r.data.data),
  create: (data: Record<string, unknown>) =>
    api.post('/billing/quotations', data).then((r) => r.data.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/billing/quotations/${id}`, data).then((r) => r.data.data),
  convert: (id: string) =>
    api.post(`/billing/quotations/${id}/convert`, {}).then((r) => r.data.data),
  sendWhatsApp: (id: string, phone: string, message?: string) =>
    api.post(`/billing/quotations/${id}/send-whatsapp`, { phone, message }).then((r) => r.data.data),
};
```

Also add to `billingApi`:

```typescript
  sendWhatsApp: (id: string, phone: string, message?: string) =>
    api.post(`/billing/invoices/${id}/send-whatsapp`, { phone, message }).then((r) => r.data.data),
```

---

## Task 5 — Frontend: LineItemsEditor component

**Files:**
- Create: `apps/web/src/components/billing/LineItemsEditor.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client';

import { useFieldArray, Control, UseFormWatch } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface LineItem {
  description: string;
  hsn?: string;
  quantity: number;
  rate: number;
  taxRate: number;
}

interface Props {
  control: Control<any>;
  watch: UseFormWatch<any>;
  fieldName?: string;
}

const INPUT = 'w-full bg-transparent outline-none text-sm text-white placeholder:text-white/25';

export function LineItemsEditor({ control, watch, fieldName = 'lineItems' }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: fieldName });
  const items: LineItem[] = watch(fieldName) ?? [];

  const totals = items.reduce(
    (acc, item) => {
      const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
      const tax = (amount * (Number(item.taxRate) || 0)) / 100;
      acc.subtotal += amount;
      acc.tax += tax;
      return acc;
    },
    { subtotal: 0, tax: 0 },
  );

  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="grid gap-2 text-xs font-semibold uppercase tracking-wider px-1"
        style={{ color: 'rgba(255,255,255,0.3)', gridTemplateColumns: '2fr 80px 100px 90px 80px 80px 32px' }}>
        <span>Description</span>
        <span>HSN</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Rate (₹)</span>
        <span className="text-right">Tax %</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      {fields.map((field, i) => {
        const item = items[i] ?? {};
        const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
        return (
          <div key={field.id}
            className="grid gap-2 items-center px-3 py-2 rounded-xl"
            style={{ gridTemplateColumns: '2fr 80px 100px 90px 80px 80px 32px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <input {...control.register(`${fieldName}.${i}.description`)}
              className={INPUT} placeholder="Service description" />
            <input {...control.register(`${fieldName}.${i}.hsn`)}
              className={INPUT} placeholder="HSN" />
            <input {...control.register(`${fieldName}.${i}.quantity`, { valueAsNumber: true })}
              type="number" step="0.01" className={`${INPUT} text-right`} placeholder="1" />
            <input {...control.register(`${fieldName}.${i}.rate`, { valueAsNumber: true })}
              type="number" step="0.01" className={`${INPUT} text-right`} placeholder="0.00" />
            <select {...control.register(`${fieldName}.${i}.taxRate`, { valueAsNumber: true })}
              className={`${INPUT} text-right bg-transparent`}
              style={{ background: 'transparent' }}>
              <option value={0}>0%</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
            </select>
            <span className="text-right text-sm font-semibold" style={{ color: '#10b981' }}>
              {formatCurrency(amount)}
            </span>
            <button type="button" onClick={() => remove(i)}
              className="p-1 rounded hover:bg-red-500/10 transition-colors flex items-center justify-center"
              style={{ color: 'rgba(255,255,255,0.25)' }}>
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}

      <button type="button"
        onClick={() => append({ description: '', hsn: '', quantity: 1, rate: 0, taxRate: 18 })}
        className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-colors hover:bg-white/5"
        style={{ color: '#818cf8', border: '1px dashed rgba(99,102,241,0.3)' }}>
        <Plus size={14} /> Add Line Item
      </button>

      {/* Totals */}
      {fields.length > 0 && (
        <div className="rounded-xl p-4 space-y-2 mt-2"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Sub-Total</span>
            <span className="text-white font-medium">{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>CGST</span>
            <span style={{ color: '#818cf8' }}>{formatCurrency(totals.tax / 2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>SGST</span>
            <span style={{ color: '#818cf8' }}>{formatCurrency(totals.tax / 2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-white">Total</span>
            <span style={{ color: '#10b981' }}>{formatCurrency(totals.subtotal + totals.tax)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Task 6 — Frontend: DocumentActions component (Print / PDF / WhatsApp)

**Files:**
- Create: `apps/web/src/components/billing/DocumentActions.tsx`

- [ ] **Step 1: Create DocumentActions**

```typescript
'use client';

import { useState, useRef } from 'react';
import { Printer, Download, MessageCircle, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  documentRef: React.RefObject<HTMLDivElement>;
  documentNo: string;
  onSendWhatsApp: (phone: string, message: string) => Promise<void>;
  clientPhone?: string;
}

export function DocumentActions({ documentRef, documentNo, onSendWhatsApp, clientPhone }: Props) {
  const [waOpen, setWaOpen] = useState(false);
  const [phone, setPhone] = useState(clientPhone ?? '');
  const [waMsg, setWaMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handlePdf = async () => {
    if (!documentRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      const canvas = await html2canvas(documentRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${documentNo}.pdf`);
      toast.success('PDF downloaded');
    } catch {
      toast.error('PDF generation failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendWa = async () => {
    if (!phone) { toast.error('Enter a phone number'); return; }
    setSending(true);
    try {
      await onSendWhatsApp(phone, waMsg);
      toast.success('WhatsApp message queued');
      setWaOpen(false);
    } catch {
      toast.error('Failed to send WhatsApp');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <button onClick={handlePrint}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
        style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Printer size={14} /> Print
      </button>

      <button onClick={handlePdf} disabled={downloading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-indigo-500/10 disabled:opacity-50"
        style={{ color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
        {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        PDF
      </button>

      <button onClick={() => setWaOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-green-500/10"
        style={{ color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
        <MessageCircle size={14} /> WhatsApp <ChevronDown size={12} />
      </button>

      {waOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setWaOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 rounded-xl p-4 space-y-3"
            style={{ background: '#0f1b2e', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
            <p className="text-sm font-semibold text-white">Send via WhatsApp</p>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Phone Number (with country code)</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="input-field w-full text-sm" placeholder="+919876543210" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Custom Message (optional)</label>
              <textarea value={waMsg} onChange={e => setWaMsg(e.target.value)}
                rows={3} className="input-field w-full text-sm resize-none"
                placeholder="Leave blank for default message..." />
            </div>
            <button onClick={handleSendWa} disabled={sending}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
              {sending ? 'Sending...' : 'Send WhatsApp'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Task 7 — Frontend: Template 1 — TemplateClassic

**Files:**
- Create: `apps/web/src/components/billing/templates/TemplateClassic.tsx`

- [ ] **Step 1: Create TemplateClassic**

```typescript
import { forwardRef } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface LineItem {
  description: string; hsn?: string;
  quantity: number; rate: number;
  amount: number; taxRate: number; taxAmount: number;
}

interface DocumentData {
  type: 'invoice' | 'quotation';
  no: string;
  issueDate: string;
  dueDate?: string;
  validUntil?: string;
  status: string;
  client: { name: string; address?: any; gstin?: string };
  tender?: { tenderName: string; tenderNumber: string } | null;
  lineItems: LineItem[];
  subtotal: number; discount: number; taxableAmount: number;
  cgstAmount: number; sgstAmount: number; igstAmount: number;
  totalAmount: number; paidAmount?: number; balanceAmount?: number;
  notes?: string; termsConditions?: string;
}

interface Props { data: DocumentData; companyName?: string; companyAddress?: string; companyGstin?: string; }

export const TemplateClassic = forwardRef<HTMLDivElement, Props>(
  ({ data, companyName = 'WorkZen ERP', companyAddress = 'Your Company Address', companyGstin = '' }, ref) => {
    const isInvoice = data.type === 'invoice';
    const dateLabel = isInvoice ? 'Due Date' : 'Valid Until';
    const dateValue = isInvoice ? data.dueDate : data.validUntil;

    return (
      <div ref={ref} className="bg-white text-gray-900 p-10 min-h-a4 font-sans print:p-8"
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#1e1b4b' }}>{companyName}</h1>
            <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{companyAddress}</p>
            {companyGstin && <p className="text-xs text-gray-400 mt-0.5">GSTIN: {companyGstin}</p>}
          </div>
          <div className="text-right">
            <div className="inline-block px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider"
              style={{ background: '#e0e7ff', color: '#4338ca' }}>
              {isInvoice ? 'Tax Invoice' : 'Quotation'}
            </div>
            <p className="text-2xl font-bold mt-2" style={{ color: '#1e1b4b' }}>#{data.no}</p>
            <p className="text-xs text-gray-400 mt-1">Issue Date: {formatDate(data.issueDate)}</p>
            <p className="text-xs text-gray-400">{dateLabel}: {formatDate(dateValue ?? '')}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-0.5 mb-6" style={{ background: 'linear-gradient(to right, #4338ca, #818cf8, transparent)' }} />

        {/* Bill To + Tender */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Bill To</p>
            <p className="font-bold text-gray-900">{data.client.name}</p>
            {data.client.address && (
              <p className="text-sm text-gray-500 mt-1">
                {typeof data.client.address === 'object'
                  ? [data.client.address.line1, data.client.address.city, data.client.address.state, data.client.address.pincode].filter(Boolean).join(', ')
                  : data.client.address}
              </p>
            )}
            {data.client.gstin && <p className="text-xs text-gray-400 mt-1">GSTIN: {data.client.gstin}</p>}
          </div>
          {data.tender && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Reference</p>
              <p className="font-semibold text-gray-700">{data.tender.tenderName}</p>
              <p className="text-xs text-gray-400">#{data.tender.tenderNumber}</p>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <table className="w-full mb-6">
          <thead>
            <tr style={{ background: '#1e1b4b', color: 'white' }}>
              <th className="px-3 py-2 text-left text-xs font-semibold">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Description</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">HSN</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">Qty</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">Rate</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">Tax</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#f8f9ff' : 'white' }}>
                <td className="px-3 py-2 text-xs text-gray-500">{i + 1}</td>
                <td className="px-3 py-2 text-sm text-gray-800">{item.description}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{item.hsn ?? '—'}</td>
                <td className="px-3 py-2 text-sm text-right text-gray-700">{Number(item.quantity)}</td>
                <td className="px-3 py-2 text-sm text-right text-gray-700">{formatCurrency(Number(item.rate))}</td>
                <td className="px-3 py-2 text-xs text-right text-gray-500">{Number(item.taxRate)}%</td>
                <td className="px-3 py-2 text-sm text-right font-semibold text-gray-800">{formatCurrency(Number(item.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Sub-Total</span><span>{formatCurrency(Number(data.subtotal))}</span>
            </div>
            {Number(data.discount) > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Discount</span><span>− {formatCurrency(Number(data.discount))}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>CGST</span><span>{formatCurrency(Number(data.cgstAmount))}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>SGST</span><span>{formatCurrency(Number(data.sgstAmount))}</span>
            </div>
            {Number(data.igstAmount) > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>IGST</span><span>{formatCurrency(Number(data.igstAmount))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2"
              style={{ borderTop: '2px solid #1e1b4b', color: '#1e1b4b' }}>
              <span>Total</span><span>{formatCurrency(Number(data.totalAmount))}</span>
            </div>
            {isInvoice && data.paidAmount !== undefined && Number(data.paidAmount) > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid</span><span>− {formatCurrency(Number(data.paidAmount))}</span>
                </div>
                <div className="flex justify-between font-bold text-base"
                  style={{ color: Number(data.balanceAmount) > 0 ? '#dc2626' : '#16a34a' }}>
                  <span>Balance Due</span><span>{formatCurrency(Number(data.balanceAmount))}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes + Terms */}
        {(data.notes || data.termsConditions) && (
          <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>
            {data.notes && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{data.notes}</p>
              </div>
            )}
            {data.termsConditions && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Terms & Conditions</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{data.termsConditions}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 text-center text-xs text-gray-400" style={{ borderTop: '1px solid #e5e7eb' }}>
          Generated by WorkZen ERP · {new Date().toLocaleDateString('en-IN')}
        </div>
      </div>
    );
  }
);
TemplateClassic.displayName = 'TemplateClassic';
```

---

## Task 8 — Frontend: Template 2 — TemplateModern

**Files:**
- Create: `apps/web/src/components/billing/templates/TemplateModern.tsx`

- [ ] **Step 1: Create TemplateModern**

```typescript
import { forwardRef } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';

// Same interface as TemplateClassic
interface LineItem {
  description: string; hsn?: string;
  quantity: number; rate: number;
  amount: number; taxRate: number; taxAmount: number;
}
interface DocumentData {
  type: 'invoice' | 'quotation';
  no: string;
  issueDate: string;
  dueDate?: string;
  validUntil?: string;
  status: string;
  client: { name: string; address?: any; gstin?: string };
  tender?: { tenderName: string; tenderNumber: string } | null;
  lineItems: LineItem[];
  subtotal: number; discount: number; taxableAmount: number;
  cgstAmount: number; sgstAmount: number; igstAmount: number;
  totalAmount: number; paidAmount?: number; balanceAmount?: number;
  notes?: string; termsConditions?: string;
}
interface Props { data: DocumentData; companyName?: string; companyAddress?: string; companyGstin?: string; }

export const TemplateModern = forwardRef<HTMLDivElement, Props>(
  ({ data, companyName = 'WorkZen ERP', companyAddress = 'Your Company Address', companyGstin = '' }, ref) => {
    const isInvoice = data.type === 'invoice';
    const accentColor = isInvoice ? '#6366f1' : '#0ea5e9';

    return (
      <div ref={ref} className="bg-white text-gray-900 min-h-a4 font-sans"
        style={{ fontFamily: 'Inter, sans-serif', maxWidth: 800, margin: '0 auto' }}>

        {/* Top accent bar */}
        <div className="h-2" style={{ background: `linear-gradient(to right, ${accentColor}, #10b981)` }} />

        <div className="p-10">
          {/* Header — two columns */}
          <div className="flex justify-between items-start mb-10">
            <div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-3"
                style={{ background: accentColor }}>W</div>
              <h1 className="text-lg font-bold text-gray-900">{companyName}</h1>
              <p className="text-xs text-gray-400 mt-0.5 whitespace-pre-line">{companyAddress}</p>
              {companyGstin && <p className="text-xs text-gray-400">GSTIN: {companyGstin}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest font-semibold mb-1"
                style={{ color: accentColor }}>{isInvoice ? 'TAX INVOICE' : 'QUOTATION'}</p>
              <p className="text-3xl font-black text-gray-900">{data.no}</p>
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-3 justify-end text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">Issue Date</span>
                  <span>{formatDate(data.issueDate)}</span>
                </div>
                <div className="flex items-center gap-3 justify-end text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">{isInvoice ? 'Due Date' : 'Valid Until'}</span>
                  <span>{formatDate((isInvoice ? data.dueDate : data.validUntil) ?? '')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Client block */}
          <div className="rounded-2xl p-5 mb-8" style={{ background: '#f8fafc' }}>
            <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: accentColor }}>
              {isInvoice ? 'Invoice To' : 'Prepared For'}
            </p>
            <p className="font-bold text-gray-900 text-lg">{data.client.name}</p>
            {data.client.address && (
              <p className="text-sm text-gray-500 mt-0.5">
                {typeof data.client.address === 'object'
                  ? [data.client.address.line1, data.client.address.city, data.client.address.state].filter(Boolean).join(', ')
                  : data.client.address}
              </p>
            )}
            {data.client.gstin && <p className="text-xs text-gray-400 mt-1">GSTIN: {data.client.gstin}</p>}
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <div className="grid text-xs font-bold uppercase tracking-wider pb-2 px-3"
              style={{ gridTemplateColumns: '3fr 60px 90px 70px 80px', color: accentColor, borderBottom: `2px solid ${accentColor}` }}>
              <span>Description</span>
              <span className="text-right">HSN</span>
              <span className="text-right">Qty × Rate</span>
              <span className="text-right">Tax</span>
              <span className="text-right">Amount</span>
            </div>
            {data.lineItems.map((item, i) => (
              <div key={i} className="grid items-center px-3 py-3 text-sm"
                style={{ gridTemplateColumns: '3fr 60px 90px 70px 80px', borderBottom: '1px solid #f1f5f9' }}>
                <span className="font-medium text-gray-800">{item.description}</span>
                <span className="text-right text-xs text-gray-400">{item.hsn ?? '—'}</span>
                <span className="text-right text-gray-600">{Number(item.quantity)} × {formatCurrency(Number(item.rate))}</span>
                <span className="text-right text-xs text-gray-500">{Number(item.taxRate)}%</span>
                <span className="text-right font-bold text-gray-900">{formatCurrency(Number(item.amount))}</span>
              </div>
            ))}
          </div>

          {/* Totals block */}
          <div className="flex justify-end mb-8">
            <div className="w-56">
              {[
                { label: 'Subtotal', val: Number(data.subtotal), color: 'text-gray-600' },
                ...(Number(data.cgstAmount) > 0 ? [{ label: 'CGST', val: Number(data.cgstAmount), color: 'text-gray-500' }] : []),
                ...(Number(data.sgstAmount) > 0 ? [{ label: 'SGST', val: Number(data.sgstAmount), color: 'text-gray-500' }] : []),
                ...(Number(data.igstAmount) > 0 ? [{ label: 'IGST', val: Number(data.igstAmount), color: 'text-gray-500' }] : []),
              ].map(row => (
                <div key={row.label} className={`flex justify-between text-sm py-1 ${row.color}`}>
                  <span>{row.label}</span><span>{formatCurrency(row.val)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center mt-2 py-3 px-4 rounded-xl font-bold text-white text-base"
                style={{ background: accentColor }}>
                <span>Total</span><span>{formatCurrency(Number(data.totalAmount))}</span>
              </div>
              {isInvoice && Number(data.balanceAmount) > 0 && (
                <div className="flex justify-between text-sm mt-2 px-1" style={{ color: '#dc2626' }}>
                  <span className="font-semibold">Balance Due</span>
                  <span className="font-bold">{formatCurrency(Number(data.balanceAmount))}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {data.notes && (
            <div className="rounded-xl p-4 mb-4" style={{ background: '#f8fafc' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: accentColor }}>Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{data.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-300 mt-8">
            {companyName} · Generated by WorkZen ERP · {new Date().toLocaleDateString('en-IN')}
          </div>
        </div>
      </div>
    );
  }
);
TemplateModern.displayName = 'TemplateModern';
```

---

## Task 9 — Frontend: Invoice Detail Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/billing/invoices/[id]/page.tsx`

- [ ] **Step 1: Create invoice detail page**

```typescript
'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { billingApi } from '@/lib/api';
import { TemplateClassic } from '@/components/billing/templates/TemplateClassic';
import { TemplateModern } from '@/components/billing/templates/TemplateModern';
import { DocumentActions } from '@/components/billing/DocumentActions';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const docRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<'classic' | 'modern'>('classic');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => billingApi.invoice(id),
  });

  const sendWaMut = useMutation({
    mutationFn: ({ phone, message }: { phone: string; message: string }) =>
      billingApi.sendWhatsApp(id, phone, message),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  );
  if (!invoice) return <p className="text-white/50 text-center py-20">Invoice not found</p>;

  const docData = {
    type: 'invoice' as const,
    no: invoice.invoiceNo,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    client: invoice.client,
    tender: invoice.tender,
    lineItems: invoice.lineItems ?? [],
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    taxableAmount: invoice.taxableAmount,
    cgstAmount: invoice.cgstAmount,
    sgstAmount: invoice.sgstAmount,
    igstAmount: invoice.igstAmount,
    totalAmount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    balanceAmount: invoice.balanceAmount,
    notes: invoice.notes,
    termsConditions: invoice.termsConditions,
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              {invoice.invoiceNo}
            </h2>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{invoice.client?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Template switcher */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['classic', 'modern'] as const).map(t => (
              <button key={t} onClick={() => setTemplate(t)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all"
                style={{
                  background: template === t ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: template === t ? '#818cf8' : 'rgba(255,255,255,0.45)',
                }}>
                <FileText size={12} /> {t}
              </button>
            ))}
          </div>
          <DocumentActions
            documentRef={docRef}
            documentNo={invoice.invoiceNo}
            onSendWhatsApp={(phone, message) => sendWaMut.mutateAsync({ phone, message })}
            clientPhone={invoice.client?.phone}
          />
        </div>
      </div>

      {/* Template preview — white background */}
      <div className="rounded-2xl overflow-hidden shadow-2xl print:shadow-none">
        {template === 'classic'
          ? <TemplateClassic ref={docRef} data={docData} />
          : <TemplateModern ref={docRef} data={docData} />}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(.print-target) { display: none !important; }
          .print-target { display: block !important; }
        }
      `}</style>
    </div>
  );
}
```

---

## Task 10 — Frontend: Invoice Creation Page (full-page with line items)

**Files:**
- Create: `apps/web/src/app/(dashboard)/billing/invoices/new/page.tsx`

- [ ] **Step 1: Create invoice creation page**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { billingApi, clientsApi, tendersApi } from '@/lib/api';
import { LineItemsEditor } from '@/components/billing/LineItemsEditor';

const schema = z.object({
  clientId: z.string().min(1, 'Select a client'),
  tenderId: z.string().optional(),
  issueDate: z.string().min(1, 'Required'),
  dueDate: z.string().min(1, 'Required'),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1, 'Required'),
    hsn: z.string().optional(),
    quantity: z.number().min(0.01, 'Required'),
    rate: z.number().min(0, 'Required'),
    taxRate: z.number().default(18),
  })).min(1, 'Add at least one line item'),
});
type FormValues = z.infer<typeof schema>;

const F = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
    {children}
    {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
  </div>
);

export default function NewInvoicePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const now = new Date();

  const { control, register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: '', tenderId: '',
      issueDate: now.toISOString().split('T')[0],
      dueDate: new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0],
      notes: '', termsConditions: '',
      lineItems: [{ description: '', hsn: '', quantity: 1, rate: 0, taxRate: 18 }],
    },
  });

  const { data: clients = [] } = useQuery({ queryKey: ['clients-select-all'], queryFn: clientsApi.selectAll });
  const { data: tenders = [] } = useQuery({ queryKey: ['tenders-select-all'], queryFn: tendersApi.selectAll });

  const createMut = useMutation({
    mutationFn: (values: FormValues) => {
      const items = values.lineItems.map(item => {
        const amount = item.quantity * item.rate;
        const taxAmount = (amount * item.taxRate) / 100;
        return { ...item, amount, taxAmount };
      });
      const subtotal = items.reduce((s, i) => s + i.amount, 0);
      const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
      const cgst = totalTax / 2;
      return billingApi.create({
        clientId: values.clientId,
        tenderId: values.tenderId || undefined,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        notes: values.notes,
        termsConditions: values.termsConditions,
        subtotal, discount: 0, taxableAmount: subtotal,
        cgstAmount: cgst, sgstAmount: cgst, igstAmount: 0,
        totalAmount: subtotal + totalTax,
        paidAmount: 0, balanceAmount: subtotal + totalTax,
        status: 'DRAFT',
        lineItems: items,
      });
    },
    onSuccess: (inv: any) => {
      toast.success('Invoice created');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      router.push(`/billing/invoices/${inv.id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>New Invoice</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Create a detailed invoice with line items</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-5">
        {/* Client + Tender */}
        <div className="glass-card p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6366f1' }}>Invoice Details</p>
          <div className="grid grid-cols-2 gap-4">
            <F label="Client *" error={errors.clientId?.message}>
              <select {...register('clientId')} className="input-field w-full">
                <option value="">Select client</option>
                {(clients as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </F>
            <F label="Linked Tender">
              <select {...register('tenderId')} className="input-field w-full">
                <option value="">None</option>
                {(tenders as any[]).map((t: any) => <option key={t.id} value={t.id}>{t.tenderName}</option>)}
              </select>
            </F>
            <F label="Issue Date *" error={errors.issueDate?.message}>
              <input {...register('issueDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Due Date *" error={errors.dueDate?.message}>
              <input {...register('dueDate')} type="date" className="input-field w-full" />
            </F>
          </div>
        </div>

        {/* Line Items */}
        <div className="glass-card p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#10b981' }}>Line Items</p>
          {errors.lineItems && <p className="text-xs" style={{ color: '#f43f5e' }}>{(errors.lineItems as any)?.message ?? 'Check line items'}</p>}
          <LineItemsEditor control={control} watch={watch} />
        </div>

        {/* Notes + Terms */}
        <div className="glass-card p-5 grid grid-cols-2 gap-4">
          <F label="Notes">
            <textarea {...register('notes')} rows={3} className="input-field w-full resize-none" placeholder="Payment terms, notes..." />
          </F>
          <F label="Terms & Conditions">
            <textarea {...register('termsConditions')} rows={3} className="input-field w-full resize-none" placeholder="Terms..." />
          </F>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="btn-secondary px-6">Cancel</button>
          <button type="submit" disabled={createMut.isPending} className="btn-primary px-8 flex items-center gap-2">
            <Save size={14} /> {createMut.isPending ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## Task 11 — Frontend: Quotation Creation Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/billing/quotations/new/page.tsx`

- [ ] **Step 1: Create quotation creation page**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { quotationApi, clientsApi, tendersApi } from '@/lib/api';
import { LineItemsEditor } from '@/components/billing/LineItemsEditor';

const schema = z.object({
  clientId: z.string().min(1, 'Select a client'),
  tenderId: z.string().optional(),
  issueDate: z.string().min(1, 'Required'),
  validUntil: z.string().min(1, 'Required'),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1, 'Required'),
    hsn: z.string().optional(),
    quantity: z.number().min(0.01),
    rate: z.number().min(0),
    taxRate: z.number().default(18),
  })).min(1, 'Add at least one line item'),
});
type FormValues = z.infer<typeof schema>;

const F = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
    {children}
    {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
  </div>
);

export default function NewQuotationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const now = new Date();

  const { control, register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: '', tenderId: '',
      issueDate: now.toISOString().split('T')[0],
      validUntil: new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0],
      notes: '', termsConditions: '',
      lineItems: [{ description: '', hsn: '', quantity: 1, rate: 0, taxRate: 18 }],
    },
  });

  const { data: clients = [] } = useQuery({ queryKey: ['clients-select-all'], queryFn: clientsApi.selectAll });
  const { data: tenders = [] } = useQuery({ queryKey: ['tenders-select-all'], queryFn: tendersApi.selectAll });

  const createMut = useMutation({
    mutationFn: (values: FormValues) => quotationApi.create({
      clientId: values.clientId,
      tenderId: values.tenderId || undefined,
      issueDate: values.issueDate,
      validUntil: values.validUntil,
      notes: values.notes,
      termsConditions: values.termsConditions,
      lineItems: values.lineItems,
    }),
    onSuccess: (q: any) => {
      toast.success('Quotation created');
      qc.invalidateQueries({ queryKey: ['quotations'] });
      router.push(`/billing/quotations/${q.id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>New Quotation</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Create a detailed quotation with line items</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-5">
        <div className="glass-card p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#0ea5e9' }}>Quotation Details</p>
          <div className="grid grid-cols-2 gap-4">
            <F label="Client *" error={errors.clientId?.message}>
              <select {...register('clientId')} className="input-field w-full">
                <option value="">Select client</option>
                {(clients as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </F>
            <F label="Linked Tender">
              <select {...register('tenderId')} className="input-field w-full">
                <option value="">None</option>
                {(tenders as any[]).map((t: any) => <option key={t.id} value={t.id}>{t.tenderName}</option>)}
              </select>
            </F>
            <F label="Issue Date *" error={errors.issueDate?.message}>
              <input {...register('issueDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Valid Until *" error={errors.validUntil?.message}>
              <input {...register('validUntil')} type="date" className="input-field w-full" />
            </F>
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#10b981' }}>Line Items</p>
          {errors.lineItems && <p className="text-xs" style={{ color: '#f43f5e' }}>{(errors.lineItems as any)?.message ?? 'Check line items'}</p>}
          <LineItemsEditor control={control} watch={watch} />
        </div>

        <div className="glass-card p-5 grid grid-cols-2 gap-4">
          <F label="Notes">
            <textarea {...register('notes')} rows={3} className="input-field w-full resize-none" placeholder="Scope, exclusions..." />
          </F>
          <F label="Terms & Conditions">
            <textarea {...register('termsConditions')} rows={3} className="input-field w-full resize-none" placeholder="Payment terms, validity..." />
          </F>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="btn-secondary px-6">Cancel</button>
          <button type="submit" disabled={createMut.isPending} className="btn-primary px-8 flex items-center gap-2">
            <Save size={14} /> {createMut.isPending ? 'Creating...' : 'Create Quotation'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## Task 12 — Frontend: Quotation Detail Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/billing/quotations/[id]/page.tsx`

- [ ] **Step 1: Create quotation detail page**

```typescript
'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { quotationApi } from '@/lib/api';
import { TemplateClassic } from '@/components/billing/templates/TemplateClassic';
import { TemplateModern } from '@/components/billing/templates/TemplateModern';
import { DocumentActions } from '@/components/billing/DocumentActions';

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT:    { color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.06)', label: 'Draft' },
  SENT:     { color: '#818cf8', bg: 'rgba(99,102,241,0.12)', label: 'Sent' },
  ACCEPTED: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Accepted' },
  REJECTED: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', label: 'Rejected' },
  EXPIRED:  { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: 'Expired' },
};

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const docRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<'classic' | 'modern'>('classic');

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationApi.get(id),
  });

  const convertMut = useMutation({
    mutationFn: () => quotationApi.convert(id),
    onSuccess: (inv: any) => {
      toast.success('Converted to invoice');
      qc.invalidateQueries({ queryKey: ['quotations'] });
      router.push(`/billing/invoices/${inv.id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });

  const sendWaMut = useMutation({
    mutationFn: ({ phone, message }: { phone: string; message: string }) =>
      quotationApi.sendWhatsApp(id, phone, message),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
    </div>
  );
  if (!quotation) return <p className="text-white/50 text-center py-20">Quotation not found</p>;

  const cfg = STATUS_CFG[quotation.status] ?? STATUS_CFG.DRAFT;
  const docData = {
    type: 'quotation' as const,
    no: quotation.quotationNo,
    issueDate: quotation.issueDate,
    validUntil: quotation.validUntil,
    status: quotation.status,
    client: quotation.client,
    tender: quotation.tender,
    lineItems: quotation.lineItems ?? [],
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    taxableAmount: quotation.taxableAmount,
    cgstAmount: quotation.cgstAmount,
    sgstAmount: quotation.sgstAmount,
    igstAmount: quotation.igstAmount,
    totalAmount: quotation.totalAmount,
    notes: quotation.notes,
    termsConditions: quotation.termsConditions,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                {quotation.quotationNo}
              </h2>
              <span className="px-2 py-0.5 rounded-lg text-xs font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{quotation.client?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Template switcher */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['classic', 'modern'] as const).map(t => (
              <button key={t} onClick={() => setTemplate(t)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all"
                style={{
                  background: template === t ? 'rgba(14,165,233,0.2)' : 'transparent',
                  color: template === t ? '#38bdf8' : 'rgba(255,255,255,0.45)',
                }}>
                <FileText size={12} /> {t}
              </button>
            ))}
          </div>

          <DocumentActions
            documentRef={docRef}
            documentNo={quotation.quotationNo}
            onSendWhatsApp={(phone, message) => sendWaMut.mutateAsync({ phone, message })}
            clientPhone={quotation.client?.phone}
          />

          {!['ACCEPTED', 'REJECTED'].includes(quotation.status) && (
            <button onClick={() => convertMut.mutate()} disabled={convertMut.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              <ArrowRight size={14} />
              {convertMut.isPending ? 'Converting...' : 'Convert to Invoice'}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-2xl">
        {template === 'classic'
          ? <TemplateClassic ref={docRef} data={docData} />
          : <TemplateModern ref={docRef} data={docData} />}
      </div>
    </div>
  );
}
```

---

## Task 13 — Frontend: Quotation List Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/billing/quotations/page.tsx`

- [ ] **Step 1: Create quotation list page**

```typescript
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { quotationApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT:    { color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.06)', label: 'Draft' },
  SENT:     { color: '#818cf8', bg: 'rgba(99,102,241,0.12)', label: 'Sent' },
  ACCEPTED: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Accepted' },
  REJECTED: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', label: 'Rejected' },
  EXPIRED:  { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: 'Expired' },
};

const SkeletonRow = () => (
  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
    {[...Array(7)].map((_, j) => (
      <td key={j} className="px-4 py-3">
        <div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', width: j === 0 ? '60%' : '80%' }} />
      </td>
    ))}
  </tr>
);

export default function QuotationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', page, statusFilter, clientSearch],
    queryFn: () => quotationApi.list({ page, limit: 15, status: statusFilter || undefined, clientSearch: clientSearch || undefined }),
  });

  const quotations: any[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Quotations</h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Create and manage client quotations</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => router.push('/billing/quotations/new')}>
          <Plus size={16} /> New Quotation
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Filter size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-sm outline-none" style={{ color: statusFilter ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)' }}>
              <option value="">All Status</option>
              {Object.entries(STATUS_CFG).map(([v, cfg]) => <option key={v} value={v}>{cfg.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[180px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Search size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
            <input value={clientSearch} onChange={e => { setClientSearch(e.target.value); setPage(1); }}
              className="bg-transparent text-sm outline-none flex-1" style={{ color: 'rgba(255,255,255,0.85)' }}
              placeholder="Search client..." />
          </div>
          {(statusFilter || clientSearch) && (
            <button onClick={() => { setStatusFilter(''); setClientSearch(''); setPage(1); }}
              className="text-xs px-3 py-1.5 rounded-lg" style={{ color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Quotation No.', 'Client', 'Tender', 'Issue Date', 'Valid Until', 'Total', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
              {!isLoading && quotations.map((q: any) => {
                const cfg = STATUS_CFG[q.status] ?? STATUS_CFG.DRAFT;
                return (
                  <motion.tr key={q.id} whileHover={{ backgroundColor: 'rgba(255,255,255,0.015)' }}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onClick={() => router.push(`/billing/quotations/${q.id}`)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono font-medium" style={{ color: '#38bdf8' }}>{q.quotationNo}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{q.client?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{q.tender?.tenderName ?? '—'}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(q.issueDate)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(q.validUntil)}</td>
                    <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: '#10b981' }}>{formatCurrency(Number(q.totalAmount))}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                        {cfg.label}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
              {!isLoading && quotations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center">
                    <FileText size={40} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="font-medium text-white mb-1">No quotations found</p>
                    <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {statusFilter || clientSearch ? 'Try adjusting your filters' : 'Create your first quotation'}
                    </p>
                    {!statusFilter && !clientSearch && (
                      <button className="btn-primary flex items-center gap-2 mx-auto" onClick={() => router.push('/billing/quotations/new')}>
                        <Plus size={14} /> New Quotation
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{meta.total} quotations</p>
            <div className="flex gap-1 items-center">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30">
                <ChevronLeft size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
              <span className="text-xs px-2 py-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{page} / {meta.totalPages}</span>
              <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30">
                <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 14 — Frontend: Update Billing Main Page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/billing/page.tsx`

- [ ] **Step 1: Add Quotations tab + update New Invoice button to navigate**

In `billing/page.tsx`:

1. Add `'quotations'` to tab type and TABS array:
```typescript
const [tab, setTab] = useState<'dashboard' | 'invoices' | 'quotations'>('dashboard');

const TABS = [
  { id: 'dashboard', label: 'Overview', icon: TrendingUp },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'quotations', label: 'Quotations', icon: Receipt },
] as const;
```

2. Import `useRouter` and update the "Create Invoice" button and quick-action button to navigate:
```typescript
import { useRouter } from 'next/navigation';
const router = useRouter();
// Change onClick={() => setShowInvoiceModal(true)} 
// to onClick={() => router.push('/billing/invoices/new')}
```

3. Add invoice row click to navigate to detail:
```typescript
// In the row tr, add onClick:
onClick={() => router.push(`/billing/invoices/${inv.id}`)}
className="cursor-pointer ..."
```

4. Add Quotations tab panel after the invoices tab panel:
```typescript
{tab === 'quotations' && (
  <div className="flex items-center justify-center py-20 flex-col gap-4">
    <p className="text-white/50">View full quotations in the Quotations section</p>
    <button className="btn-primary flex items-center gap-2" onClick={() => router.push('/billing/quotations')}>
      <Receipt size={16} /> Go to Quotations
    </button>
  </div>
)}
```

5. Add to the Quick Actions card a "New Quotation" button:
```typescript
<button onClick={() => router.push('/billing/quotations/new')} className="p-4 rounded-xl text-left transition-colors hover:bg-white/5" style={{ border: '1px solid rgba(56,189,248,0.2)' }}>
  <FileText size={20} style={{ color: '#38bdf8' }} className="mb-2" />
  <p className="text-sm font-medium text-white">New Quotation</p>
  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Create and send quotation</p>
</button>
```

- [ ] **Step 2: Verify routing works**

Navigate to http://localhost:3000/billing — Quotations tab should appear. "New Invoice" opens `/billing/invoices/new`.

---

## Self-Review

**Spec coverage check:**
- ✅ Detailed invoice creation — Task 10 (full-page, line items, GST breakdown, notes, terms)
- ✅ Invoice list — existing + updated in Task 14 (row click → detail)
- ✅ Detailed quotation creation — Task 11 (same UX pattern as invoice)
- ✅ Quotation list — Task 13 (dedicated page with filters + pagination)
- ✅ Two templates for invoice/quotation — Task 7 (Classic), Task 8 (Modern)
- ✅ Print — Task 6 (`window.print()` in DocumentActions)
- ✅ PDF download — Task 6 (`html2canvas` + `jspdf` in DocumentActions)
- ✅ Send WhatsApp — Task 3 (API endpoint) + Task 6 (frontend UI in DocumentActions)

**Placeholder check:** All code blocks are complete. No TBD.

**Type consistency:** `DocumentData` interface is defined in TemplateClassic and re-declared in TemplateModern (identical shape). Both templates accept `ref` via `forwardRef`. `DocumentActions.documentRef` is `React.RefObject<HTMLDivElement>`. All match.

---

Plan complete and saved to `docs/superpowers/plans/2026-06-18-billing-invoice-quotation.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks

**2. Inline Execution** — Execute tasks in this session using executing-plans skill

Which approach?
