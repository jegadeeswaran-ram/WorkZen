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
              className={`${INPUT} text-right`}
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
