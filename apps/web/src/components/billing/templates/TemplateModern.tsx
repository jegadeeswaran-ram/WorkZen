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

export const TemplateModern = forwardRef<HTMLDivElement, Props>(
  ({ data, companyName = 'WorkZen ERP', companyAddress = 'Your Company Address', companyGstin = '' }, ref) => {
    const isInvoice = data.type === 'invoice';
    const accentColor = isInvoice ? '#6366f1' : '#0ea5e9';

    return (
      <div ref={ref} className="bg-white text-gray-900 font-sans"
        style={{ fontFamily: 'Inter, sans-serif', maxWidth: 800, margin: '0 auto' }}>

        {/* Top accent bar */}
        <div className="h-2" style={{ background: `linear-gradient(to right, ${accentColor}, #10b981)` }} />

        <div className="p-10">
          {/* Header */}
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

          {/* Totals */}
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

          {/* Terms */}
          {data.termsConditions && (
            <div className="rounded-xl p-4 mb-4" style={{ background: '#f8fafc' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: accentColor }}>Terms & Conditions</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{data.termsConditions}</p>
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
