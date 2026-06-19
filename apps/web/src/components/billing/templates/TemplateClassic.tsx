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
      <div ref={ref} className="bg-white text-gray-900 p-10 font-sans"
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
