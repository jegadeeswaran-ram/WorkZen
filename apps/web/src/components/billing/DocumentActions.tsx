'use client';

import { useState } from 'react';
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
