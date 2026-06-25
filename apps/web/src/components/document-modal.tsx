'use client';

import { useState, useRef } from 'react';
import { X, Printer, FileDown, Mail, MessageSquare, Send, Phone } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

// ── Company defaults (configure in tenant settings) ───────────────────────────
const CO = {
  name: 'WorkZen Manpower Solutions Pvt. Ltd.',
  address: 'Plot No. 12, Sector 44, Gurugram, Haryana – 122003',
  phone: '+91 98765 43210',
  email: 'accounts@workzen.in',
  gstin: '06AABCW1234F1Z5',
  pan: 'AABCW1234F',
  bank: 'State Bank of India',
  accountNo: '1234567890',
  ifsc: 'SBIN0001234',
  branch: 'Cyber City, Gurugram',
};

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1 — Government / Formal (black & white letterhead)
// ─────────────────────────────────────────────────────────────────────────────

function T1WO({ wo }: { wo: any }) {
  const s: Record<string, React.CSSProperties> = {
    root: { fontFamily: '"Times New Roman", Times, serif', color: '#000', background: '#fff', padding: '48px 56px', maxWidth: '800px', margin: '0 auto', fontSize: '13px', lineHeight: 1.7 },
    header: { textAlign: 'center', borderBottom: '3px double #000', paddingBottom: '14px', marginBottom: '18px' },
    co: { fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' },
    sub: { fontSize: '11px', marginTop: '3px', color: '#222' },
    title: { textAlign: 'center', fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline', margin: '16px 0', textTransform: 'uppercase', letterSpacing: '2px' },
    kv: { border: '1px solid #999', padding: '6px 10px', width: '50%' },
    kvL: { border: '1px solid #999', padding: '6px 10px', fontWeight: 'bold', background: '#f5f5f5', width: '160px' },
    th: { border: '1px solid #000', padding: '7px 10px', background: '#e8e8e8', fontWeight: 'bold', textAlign: 'center' as const, fontSize: '12px' },
    td: { border: '1px solid #000', padding: '6px 10px', textAlign: 'center' as const, fontSize: '12px' },
    tdL: { border: '1px solid #000', padding: '6px 10px', fontSize: '12px' },
    tdR: { border: '1px solid #000', padding: '6px 10px', textAlign: 'right' as const, fontSize: '12px' },
    summary: { border: '1px solid #000', padding: '8px 12px', fontWeight: 'bold' },
    summaryV: { border: '1px solid #000', padding: '8px 12px' },
  };
  return (
    <div style={s.root} className="doc-print-area">
      <div style={s.header}>
        <div style={s.co}>{CO.name}</div>
        <div style={s.sub}>{CO.address}</div>
        <div style={s.sub}>Tel: {CO.phone} &nbsp;|&nbsp; Email: {CO.email}</div>
        <div style={s.sub}>GSTIN: {CO.gstin} &nbsp;|&nbsp; PAN: {CO.pan}</div>
      </div>
      <div style={s.title}>Work Order</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
        <tbody>
          <tr>
            <td style={s.kvL}>WO Number</td><td style={s.kv}>{wo.workOrderNo}</td>
            <td style={s.kvL}>Issued Date</td><td style={s.kv}>{wo.issuedDate ? formatDate(wo.issuedDate) : formatDate(wo.startDate)}</td>
          </tr>
          <tr>
            <td style={s.kvL}>Tender Ref.</td><td style={s.kv}>{wo.tender?.tenderNumber ?? '—'}</td>
            <td style={s.kvL}>Govt. Reference</td><td style={s.kv}>{wo.governmentRef ?? '—'}</td>
          </tr>
          <tr>
            <td style={s.kvL}>Period</td><td colSpan={3} style={s.kv}>{formatDate(wo.startDate)} to {wo.endDate ? formatDate(wo.endDate) : 'Open-ended'}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginBottom: '12px' }}><strong>Subject:</strong> {wo.title}</div>
      <div style={{ marginBottom: '16px' }}>
        This is to confirm the award of the above mentioned Work Order in accordance with the terms and conditions of the Tender{wo.tender?.tenderName ? ` "${wo.tender.tenderName}"` : ''}. The scope of work and deployment details are as follows:
      </div>
      {wo.positions?.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '8px' }}>Manpower Deployment Details</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['S.No', 'Designation', 'Required Count', 'Rate (₹)', 'Rate Type'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {wo.positions.map((p: any, i: number) => (
                <tr key={p.id}>
                  <td style={s.td}>{i + 1}</td>
                  <td style={s.tdL}>{p.designation}</td>
                  <td style={s.td}>{p.requiredCount}</td>
                  <td style={s.tdR}>{formatCurrency(Number(p.rate))}</td>
                  <td style={s.td}>{p.rateType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
        <tbody>
          <tr><td style={s.summary}>Total Work Order Value</td><td style={{ ...s.summaryV, fontSize: '15px', fontWeight: 'bold' }}>{formatCurrency(Number(wo.value))}</td></tr>
          <tr><td style={s.summaryV}>Sanctioned Strength</td><td style={s.summaryV}>{wo.sanctionedStrength} Persons</td></tr>
          <tr><td style={s.summaryV}>Status</td><td style={s.summaryV}>{wo.status}</td></tr>
        </tbody>
      </table>
      {wo.description && <div style={{ marginBottom: '16px', fontSize: '12px' }}><strong>Notes:</strong> {wo.description}</div>}
      <div style={{ marginBottom: '20px', fontSize: '11px' }}>
        <strong>Terms &amp; Conditions:</strong>
        <ol style={{ paddingLeft: '18px', margin: '6px 0', lineHeight: 1.6 }}>
          <li>Payment shall be made within 30 days of receipt of invoice and supporting documents.</li>
          <li>All statutory compliances (PF, ESI, Labour laws) shall be the responsibility of the contractor.</li>
          <li>GST shall be charged extra as per prevailing rates.</li>
          <li>The work order is subject to satisfactory performance.</li>
        </ol>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '56px' }}>
        <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #000', paddingTop: '8px', minWidth: '180px' }}>Authorized Signatory<br /><small>For {CO.name}</small></div></div>
        <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #000', paddingTop: '8px', minWidth: '180px' }}>Client Acknowledgement<br /><small>Date: _______________</small></div></div>
      </div>
    </div>
  );
}

function T1Invoice({ inv, wo }: { inv: any; wo: any }) {
  const s: Record<string, React.CSSProperties> = {
    root: { fontFamily: '"Times New Roman", Times, serif', color: '#000', background: '#fff', padding: '48px 56px', maxWidth: '800px', margin: '0 auto', fontSize: '13px', lineHeight: 1.7 },
    header: { textAlign: 'center', borderBottom: '3px double #000', paddingBottom: '14px', marginBottom: '18px' },
    co: { fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' },
    sub: { fontSize: '11px', marginTop: '3px' },
    title: { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', textDecoration: 'underline', margin: '14px 0', textTransform: 'uppercase', letterSpacing: '2px' },
    th: { border: '1px solid #000', padding: '7px 10px', background: '#e8e8e8', fontWeight: 'bold', fontSize: '12px' },
    td: { border: '1px solid #000', padding: '7px 10px', fontSize: '12px' },
    tdR: { border: '1px solid #000', padding: '7px 10px', fontSize: '12px', textAlign: 'right' as const },
  };
  const gst = Number(inv.gstAmount ?? 0);
  const base = Number(inv.amount ?? 0);
  const total = Number(inv.totalAmount ?? 0);
  const paid = Number(inv.paidAmount ?? 0);
  return (
    <div style={s.root} className="doc-print-area">
      <div style={s.header}>
        <div style={s.co}>{CO.name}</div>
        <div style={s.sub}>{CO.address}</div>
        <div style={s.sub}>Tel: {CO.phone} | Email: {CO.email}</div>
        <div style={s.sub}>GSTIN: {CO.gstin} | PAN: {CO.pan}</div>
      </div>
      <div style={s.title}>Tax Invoice</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #999', padding: '6px 10px', fontWeight: 'bold', background: '#f5f5f5', width: '160px' }}>Invoice No.</td>
            <td style={{ border: '1px solid #999', padding: '6px 10px', width: '200px' }}>{inv.invoiceNumber}</td>
            <td style={{ border: '1px solid #999', padding: '6px 10px', fontWeight: 'bold', background: '#f5f5f5', width: '130px' }}>Invoice Date</td>
            <td style={{ border: '1px solid #999', padding: '6px 10px' }}>{inv.invoiceDate ? formatDate(inv.invoiceDate) : '—'}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #999', padding: '6px 10px', fontWeight: 'bold', background: '#f5f5f5' }}>Work Order</td>
            <td style={{ border: '1px solid #999', padding: '6px 10px' }}>{wo?.workOrderNo ?? '—'}</td>
            <td style={{ border: '1px solid #999', padding: '6px 10px', fontWeight: 'bold', background: '#f5f5f5' }}>Period</td>
            <td style={{ border: '1px solid #999', padding: '6px 10px' }}>{inv.period}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #999', padding: '6px 10px', fontWeight: 'bold', background: '#f5f5f5' }}>Tender</td>
            <td colSpan={3} style={{ border: '1px solid #999', padding: '6px 10px' }}>{wo?.tender?.tenderName ?? '—'}</td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
        <thead>
          <tr>
            <th style={s.th}>S.No</th>
            <th style={s.th}>Description of Service</th>
            <th style={s.th}>Period</th>
            <th style={s.th}>Deployed</th>
            <th style={{ ...s.th, textAlign: 'right' as const }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...s.td, textAlign: 'center' as const }}>1</td>
            <td style={s.td}>{wo?.title ?? 'Manpower Services'}</td>
            <td style={{ ...s.td, textAlign: 'center' as const }}>{inv.period}</td>
            <td style={{ ...s.td, textAlign: 'center' as const }}>{inv.deployedCount ?? '—'}</td>
            <td style={s.tdR}>{formatCurrency(base)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} style={{ ...s.td, textAlign: 'right' as const, fontWeight: 'bold' }}>Sub Total</td>
            <td style={{ ...s.tdR, fontWeight: 'bold' }}>{formatCurrency(base)}</td>
          </tr>
          {gst > 0 && <>
            <tr>
              <td colSpan={4} style={{ ...s.td, textAlign: 'right' as const }}>CGST @ 9%</td>
              <td style={s.tdR}>{formatCurrency(gst / 2)}</td>
            </tr>
            <tr>
              <td colSpan={4} style={{ ...s.td, textAlign: 'right' as const }}>SGST @ 9%</td>
              <td style={s.tdR}>{formatCurrency(gst / 2)}</td>
            </tr>
          </>}
          <tr>
            <td colSpan={4} style={{ ...s.td, textAlign: 'right' as const, fontWeight: 'bold', background: '#e8e8e8', fontSize: '14px' }}>TOTAL</td>
            <td style={{ ...s.tdR, fontWeight: 'bold', background: '#e8e8e8', fontSize: '14px' }}>{formatCurrency(total)}</td>
          </tr>
          {paid > 0 && <tr>
            <td colSpan={4} style={{ ...s.td, textAlign: 'right' as const }}>Amount Received</td>
            <td style={s.tdR}>{formatCurrency(paid)}</td>
          </tr>}
          {paid > 0 && <tr>
            <td colSpan={4} style={{ ...s.td, textAlign: 'right' as const, fontWeight: 'bold' }}>Balance Due</td>
            <td style={{ ...s.tdR, fontWeight: 'bold', color: '#c00' }}>{formatCurrency(total - paid)}</td>
          </tr>}
        </tfoot>
      </table>
      <div style={{ marginBottom: '16px', fontSize: '12px', border: '1px solid #999', padding: '10px' }}>
        <strong>Bank Details for NEFT/RTGS:</strong><br />
        Bank: {CO.bank} &nbsp;|&nbsp; A/c No: {CO.accountNo} &nbsp;|&nbsp; IFSC: {CO.ifsc} &nbsp;|&nbsp; Branch: {CO.branch}
      </div>
      {inv.notes && <div style={{ marginBottom: '12px', fontSize: '12px' }}><strong>Notes:</strong> {inv.notes}</div>}
      <div style={{ fontSize: '11px', marginBottom: '20px' }}>
        Amount in words: <strong>{numberToWords(total)}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '48px' }}>
        <div style={{ fontSize: '11px' }}>
          <div>This is a computer generated document.</div>
          <div>Status: <strong>{inv.status}</strong></div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: '8px', minWidth: '180px' }}>Authorized Signatory<br /><small>For {CO.name}</small></div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2 — Modern / Professional (color accents)
// ─────────────────────────────────────────────────────────────────────────────

function T2WO({ wo }: { wo: any }) {
  return (
    <div className="doc-print-area" style={{ fontFamily: 'Arial, sans-serif', background: '#fff', maxWidth: '800px', margin: '0 auto', fontSize: '13px', color: '#1a1a2e' }}>
      {/* Color header strip */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: '#fff', padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' }}>{CO.name}</div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>{CO.address}</div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>{CO.phone} · {CO.email}</div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>GSTIN: {CO.gstin}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '28px', fontWeight: '800', opacity: 0.15, textTransform: 'uppercase', letterSpacing: '3px' }}>WO</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#a5b4fc' }}>{wo.workOrderNo}</div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>v{wo.currentVersion ?? 1}</div>
        </div>
      </div>

      <div style={{ padding: '32px 40px' }}>
        {/* Title band */}
        <div style={{ background: '#f1f5f9', borderLeft: '4px solid #6366f1', padding: '12px 16px', marginBottom: '24px', borderRadius: '0 4px 4px 0' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#6366f1', fontWeight: '600' }}>Work Order</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>{wo.title}</div>
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { l: 'Tender', v: wo.tender?.tenderNumber ?? '—' },
            { l: 'Issued Date', v: wo.issuedDate ? formatDate(wo.issuedDate) : formatDate(wo.startDate) },
            { l: 'Govt. Reference', v: wo.governmentRef ?? '—' },
            { l: 'Start Date', v: formatDate(wo.startDate) },
            { l: 'End Date', v: wo.endDate ? formatDate(wo.endDate) : 'Open-ended' },
            { l: 'Status', v: wo.status },
          ].map(({ l, v }) => (
            <div key={l} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '3px' }}>{l}</div>
              <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '12px' }}>{String(v)}</div>
            </div>
          ))}
        </div>

        {/* Value highlight */}
        <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', borderRadius: '10px', padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Work Order Value</div>
            <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px' }}>{formatCurrency(Number(wo.value))}</div>
          </div>
          <div style={{ textAlign: 'right', opacity: 0.9 }}>
            <div style={{ fontSize: '11px' }}>Sanctioned Strength</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{wo.sanctionedStrength}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>persons</div>
          </div>
        </div>

        {/* Positions */}
        {wo.positions?.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#475569', marginBottom: '10px' }}>Manpower Requirements</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1e1b4b', color: '#fff' }}>
                  {['Designation', 'Required', 'Rate', 'Type'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', fontSize: '11px', textAlign: 'left', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wo.positions.map((p: any, i: number) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px', fontWeight: '500' }}>{p.designation}</td>
                    <td style={{ padding: '8px 12px' }}>{p.requiredCount}</td>
                    <td style={{ padding: '8px 12px', fontWeight: '600', color: '#6366f1' }}>{formatCurrency(Number(p.rate))}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{p.rateType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {wo.description && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>{wo.description}</div>}

        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <div>GSTIN: {CO.gstin}</div>
          <div style={{ textAlign: 'center' }}>Authorized Signatory<br /><strong>For {CO.name}</strong></div>
          <div style={{ textAlign: 'right' }}>Generated: {new Date().toLocaleDateString('en-IN')}</div>
        </div>
      </div>
    </div>
  );
}

function T2Invoice({ inv, wo }: { inv: any; wo: any }) {
  const base = Number(inv.amount ?? 0);
  const gst = Number(inv.gstAmount ?? 0);
  const total = Number(inv.totalAmount ?? 0);
  const paid = Number(inv.paidAmount ?? 0);

  return (
    <div className="doc-print-area" style={{ fontFamily: 'Arial, sans-serif', background: '#fff', maxWidth: '800px', margin: '0 auto', fontSize: '13px', color: '#1a1a2e' }}>
      <div style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)', color: '#fff', padding: '32px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800' }}>{CO.name}</div>
            <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>{CO.address}</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>GSTIN: {CO.gstin} · PAN: {CO.pan}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '2px' }}>Tax Invoice</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#99f6e4' }}>{inv.invoiceNumber}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>{inv.invoiceDate ? formatDate(inv.invoiceDate) : '—'}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '32px 40px' }}>
        {/* Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { l: 'Work Order', v: wo?.workOrderNo ?? '—' },
            { l: 'Period', v: inv.period },
            { l: 'Tender', v: wo?.tender?.tenderName ?? '—' },
            { l: 'Deployed Count', v: inv.deployedCount ?? '—' },
          ].map(({ l, v }) => (
            <div key={l} style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '6px', padding: '10px 14px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#0f766e', letterSpacing: '0.5px', marginBottom: '3px' }}>{l}</div>
              <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(v)}</div>
            </div>
          ))}
        </div>

        {/* Line items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <thead>
            <tr style={{ background: '#0f766e', color: '#fff' }}>
              {['Description', 'Period', 'Qty', 'Amount'].map(h => (
                <th key={h} style={{ padding: '9px 12px', fontSize: '11px', textAlign: h === 'Amount' ? 'right' : 'left', fontWeight: '600' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px 12px' }}>{wo?.title ?? 'Manpower Services'}</td>
              <td style={{ padding: '10px 12px', color: '#64748b' }}>{inv.period}</td>
              <td style={{ padding: '10px 12px', color: '#64748b' }}>{inv.deployedCount ?? 1}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(base)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <div style={{ width: '260px' }}>
            {[
              { l: 'Sub Total', v: formatCurrency(base), bold: false },
              ...(gst > 0 ? [
                { l: 'CGST @ 9%', v: formatCurrency(gst / 2), bold: false },
                { l: 'SGST @ 9%', v: formatCurrency(gst / 2), bold: false },
              ] : []),
              { l: 'Total', v: formatCurrency(total), bold: true },
              ...(paid > 0 ? [
                { l: 'Paid', v: formatCurrency(paid), bold: false },
                { l: 'Balance Due', v: formatCurrency(total - paid), bold: true },
              ] : []),
            ].map(({ l, v, bold }) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: bold ? '#0f766e' : l === 'Sub Total' ? '#f8fafc' : '#fff', color: bold ? '#fff' : '#0f172a', fontWeight: bold ? '700' : '400', borderBottom: '1px solid #e2e8f0', fontSize: bold ? '14px' : '13px' }}>
                <span>{l}</span><span>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bank */}
        <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px', fontSize: '11px' }}>
          <div style={{ fontWeight: '700', color: '#0f766e', marginBottom: '6px' }}>Bank Details (NEFT/RTGS)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', color: '#334155' }}>
            <span>Bank: <strong>{CO.bank}</strong></span>
            <span>A/c No: <strong>{CO.accountNo}</strong></span>
            <span>IFSC: <strong>{CO.ifsc}</strong></span>
            <span>Branch: <strong>{CO.branch}</strong></span>
          </div>
        </div>

        {inv.notes && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}><strong>Notes:</strong> {inv.notes}</div>}
        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '20px' }}>Amount in words: <strong>{numberToWords(total)}</strong></div>

        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <div>Status: <span style={{ fontWeight: '700', color: paid >= total ? '#0f766e' : '#d97706' }}>{inv.status}</span></div>
          <div style={{ textAlign: 'center' }}>Authorized Signatory<br /><strong>For {CO.name}</strong></div>
          <div style={{ textAlign: 'right' }}>Generated: {new Date().toLocaleDateString('en-IN')}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function numberToWords(amount: number): string {
  if (!amount || isNaN(amount)) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = 'Rupees ' + convert(rupees);
  if (paise > 0) words += ' and ' + convert(paise) + ' Paise';
  return words + ' Only';
}

const PRINT_STYLE = `
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 0; background: #fff; }
  @page { size: A4; margin: 0; }
`;

function printHTML(innerHTML: string, title: string) {
  const w = window.open('', '_blank');
  if (!w) { toast.error('Please allow pop-ups to print'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>${PRINT_STYLE}</style></head><body>${innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

async function downloadPDF(innerHTML: string, filename: string) {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    const container = document.createElement('div');
    container.innerHTML = innerHTML;
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:#fff;';
    document.body.appendChild(container);
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    document.body.removeChild(container);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    let y = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();
    while (y < pdfHeight) {
      if (y > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -y, pdfWidth, pdfHeight);
      y += pageHeight;
    }
    pdf.save(filename);
  } catch {
    toast.error('PDF generation failed. Try Print → Save as PDF instead.');
  }
}

// ─── Main DocumentModal ───────────────────────────────────────────────────────

interface DocumentModalProps {
  type: 'work-order' | 'invoice';
  woData: any;
  invData?: any;
  onClose: () => void;
  onSendEmail?: (email: string, type: string) => Promise<void>;
}

export function DocumentModal({ type, woData, invData, onClose, onSendEmail }: DocumentModalProps) {
  const [template, setTemplate] = useState<1 | 2>(1);
  const [panel, setPanel] = useState<'none' | 'email' | 'whatsapp'>('none');
  const [emailAddr, setEmailAddr] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const docTitle = type === 'work-order'
    ? `WorkOrder_${woData?.workOrderNo ?? 'doc'}`
    : `Invoice_${invData?.invoiceNumber ?? 'doc'}`;

  const getHTML = () => previewRef.current?.innerHTML ?? '';

  const handlePrint = () => printHTML(getHTML(), docTitle);
  const handlePDF = async () => {
    toast.loading('Generating PDF…');
    await downloadPDF(getHTML(), `${docTitle}.pdf`);
    toast.dismiss();
  };

  const handleEmail = async () => {
    if (!emailAddr.trim()) { toast.error('Enter email address'); return; }
    setSending(true);
    try {
      if (onSendEmail) {
        await onSendEmail(emailAddr, type);
      } else {
        // fallback: mailto link
        const subject = encodeURIComponent(type === 'work-order' ? `Work Order: ${woData?.workOrderNo}` : `Invoice: ${invData?.invoiceNumber}`);
        const body = encodeURIComponent(buildTextSummary());
        window.open(`mailto:${emailAddr}?subject=${subject}&body=${body}`);
      }
      toast.success(`Sent to ${emailAddr}`);
      setPanel('none');
      setEmailAddr('');
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const buildTextSummary = () => {
    if (type === 'work-order') {
      return `Work Order: ${woData?.workOrderNo}\nTitle: ${woData?.title}\nValue: ${formatCurrency(Number(woData?.value))}\nPeriod: ${formatDate(woData?.startDate)} to ${woData?.endDate ? formatDate(woData?.endDate) : 'Open-ended'}\nStatus: ${woData?.status}`;
    }
    return `Invoice: ${invData?.invoiceNumber}\nPeriod: ${invData?.period}\nAmount: ${formatCurrency(Number(invData?.amount))}\nTotal (incl. GST): ${formatCurrency(Number(invData?.totalAmount))}\nStatus: ${invData?.status}`;
  };

  const handleWhatsApp = () => {
    const text = buildTextSummary() + `\n\n— ${CO.name}`;
    const num = phone.replace(/\D/g, '');
    const url = num
      ? `https://wa.me/${num}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setPanel('none');
    setPhone('');
  };

  const PreviewContent = () => {
    if (type === 'work-order') {
      return template === 1 ? <T1WO wo={woData} /> : <T2WO wo={woData} />;
    }
    return template === 1 ? <T1Invoice inv={invData} wo={woData} /> : <T2Invoice inv={invData} wo={woData} />;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-4xl my-4" style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)', borderRadius: '16px' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-white">{type === 'work-order' ? 'Work Order' : 'Invoice'} Preview</span>
            {/* Template switcher */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
              {[1, 2].map(t => (
                <button key={t} onClick={() => setTemplate(t as 1 | 2)}
                  className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                  style={{ background: template === t ? 'rgba(99,102,241,0.3)' : 'transparent', color: template === t ? '#a5b4fc' : 'rgba(255,255,255,0.5)' }}>
                  Template {t === 1 ? 'Classic' : 'Modern'}
                </button>
              ))}
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} title="Print" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Printer size={13} /> Print
            </button>
            <button onClick={handlePDF} title="Download PDF" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/10" style={{ color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
              <FileDown size={13} /> PDF
            </button>
            <button onClick={() => setPanel(p => p === 'email' ? 'none' : 'email')} title="Send Email" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: panel === 'email' ? 'rgba(99,102,241,0.2)' : 'transparent', color: panel === 'email' ? '#a5b4fc' : 'rgba(255,255,255,0.7)', border: `1px solid ${panel === 'email' ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.12)'}` }}>
              <Mail size={13} /> Email
            </button>
            <button onClick={() => setPanel(p => p === 'whatsapp' ? 'none' : 'whatsapp')} title="Send WhatsApp" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: panel === 'whatsapp' ? 'rgba(34,197,94,0.15)' : 'transparent', color: panel === 'whatsapp' ? '#4ade80' : 'rgba(255,255,255,0.7)', border: `1px solid ${panel === 'whatsapp' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.12)'}` }}>
              <MessageSquare size={13} /> WhatsApp
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
          </div>
        </div>

        {/* Email panel */}
        {panel === 'email' && (
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.06)' }}>
            <Mail size={14} style={{ color: '#a5b4fc', flexShrink: 0 }} />
            <input value={emailAddr} onChange={e => setEmailAddr(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEmail()}
              className="flex-1 text-sm bg-transparent outline-none" placeholder="recipient@example.com"
              style={{ color: 'rgba(255,255,255,0.9)', caretColor: '#a5b4fc' }} autoFocus />
            <button onClick={handleEmail} disabled={sending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc', opacity: sending ? 0.6 : 1 }}>
              <Send size={12} /> {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        )}

        {/* WhatsApp panel */}
        {panel === 'whatsapp' && (
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(34,197,94,0.04)' }}>
            <Phone size={14} style={{ color: '#4ade80', flexShrink: 0 }} />
            <input value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleWhatsApp()}
              className="flex-1 text-sm bg-transparent outline-none" placeholder="+91 98765 43210 (leave blank to share link)"
              style={{ color: 'rgba(255,255,255,0.9)', caretColor: '#4ade80' }} autoFocus />
            <button onClick={handleWhatsApp} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>
              <MessageSquare size={12} /> Open WhatsApp
            </button>
          </div>
        )}

        {/* Document preview */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: '75vh', background: '#e5e7eb' }}>
          <div ref={previewRef} style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
            <PreviewContent />
          </div>
        </div>
      </div>
    </div>
  );
}
