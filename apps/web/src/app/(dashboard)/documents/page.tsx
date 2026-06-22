'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DUMMY_DOCUMENTS_DATA } from '@/lib/dummy-data';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Search,
  FileText,
  Download,
  Trash2,
  X,
  FolderOpen,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileBadge,
  Files,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatFileSize } from '@/lib/utils';
import { documentsApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type DocumentType =
  | 'CONTRACT'
  | 'IDENTITY'
  | 'CERTIFICATE'
  | 'INVOICE'
  | 'PAYSLIP'
  | 'TENDER'
  | 'OTHER';

interface Document {
  id: string;
  name: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  documentType: DocumentType;
  description?: string;
  tags?: string;
  expiryDate?: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_TYPES: Array<{ value: DocumentType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'IDENTITY', label: 'Identity' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'PAYSLIP', label: 'Payslip' },
  { value: 'TENDER', label: 'Tender' },
  { value: 'OTHER', label: 'Other' },
];

const TYPE_BADGE: Record<DocumentType, string> = {
  CONTRACT: 'badge badge-info',
  IDENTITY: 'badge badge-warning',
  CERTIFICATE: 'badge badge-info',
  INVOICE: 'badge badge-neutral',
  PAYSLIP: 'badge badge-neutral',
  TENDER: 'badge badge-info',
  OTHER: 'badge badge-neutral',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FileIcon({ fileType, size = 28 }: { fileType?: string; size?: number }) {
  const t = (fileType ?? '').toLowerCase();
  if (t.includes('image')) return <FileImage size={size} />;
  if (t.includes('spreadsheet') || t.includes('excel') || t.includes('xlsx') || t.includes('csv'))
    return <FileSpreadsheet size={size} />;
  if (t.includes('zip') || t.includes('archive')) return <FileArchive size={size} />;
  if (t.includes('pdf') || t.includes('word') || t.includes('document'))
    return <FileText size={size} />;
  return <FileBadge size={size} />;
}

function typeColor(type: DocumentType): string {
  const map: Record<DocumentType, string> = {
    CONTRACT: '#6366f1',
    IDENTITY: '#f59e0b',
    CERTIFICATE: '#10b981',
    INVOICE: '#3b82f6',
    PAYSLIP: '#8b5cf6',
    TENDER: '#ec4899',
    OTHER: '#64748b',
  };
  return map[type] ?? '#64748b';
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const uploadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  documentType: z.enum([
    'CONTRACT',
    'IDENTITY',
    'CERTIFICATE',
    'INVOICE',
    'PAYSLIP',
    'TENDER',
    'OTHER',
  ]),
  description: z.string().optional(),
  tags: z.string().optional(),
  expiryDate: z.string().optional(),
});

type UploadForm = z.infer<typeof uploadSchema>;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [docTypeFilter, setDocTypeFilter] = useState<DocumentType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['documents', { docTypeFilter, search, page }],
    queryFn: () =>
      documentsApi.list({
        page,
        limit: 12,
        search: search || undefined,
        documentType: docTypeFilter === 'ALL' ? undefined : docTypeFilter,
      }),
    placeholderData: DUMMY_DOCUMENTS_DATA,
  });

  const docs: Document[] = data?.data?.length ? data.data : (DUMMY_DOCUMENTS_DATA.data as any);
  const meta = data?.meta;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteDoc } = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const { mutate: createDoc, isPending: creating } = useMutation({
    mutationFn: (data: Record<string, unknown>) => documentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document uploaded successfully');
      setShowModal(false);
      reset();
    },
    onError: () => toast.error('Failed to upload document'),
  });

  // ── Form ───────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { documentType: 'CONTRACT' },
  });

  const onSubmit = (values: UploadForm) => {
    createDoc({
      name: values.name,
      fileName: values.name,
      fileType: 'application/pdf',
      fileSize: 0,
      s3Key: 'uploaded/' + values.name,
      documentType: values.documentType,
      description: values.description,
      tags: values.tags,
      expiryDate: values.expiryDate || undefined,
    });
  };

  // ── Download handler ───────────────────────────────────────────────────────
  const handleDownload = async (id: string) => {
    try {
      const result = await documentsApi.getDownloadUrl(id);
      const url = result?.downloadUrl ?? result;
      if (url) window.open(url as string, '_blank');
      else toast.error('Download URL not available');
    } catch {
      toast.error('Failed to get download link');
    }
  };

  // ── KPI derived values ─────────────────────────────────────────────────────
  const total = meta?.total ?? docs.length;
  const contractCount = docs.filter((d) => d.documentType === 'CONTRACT').length;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            Document Manager
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Centralised document repository for all company records
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Upload size={14} /> Upload Document
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<Files size={18} />}
          label="Total Documents"
          value={isLoading ? '—' : String(total)}
          color="#6366f1"
        />
        <KpiCard
          icon={<FileBadge size={18} />}
          label="Contracts"
          value={isLoading ? '—' : String(contractCount)}
          color="#10b981"
        />
        <KpiCard
          icon={<AlertTriangle size={18} />}
          label="Expiring Soon"
          value="0"
          color="#f59e0b"
        />
        <KpiCard
          icon={<Clock size={18} />}
          label="Recent Uploads"
          value="5"
          color="#8b5cf6"
        />
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Type filter chips */}
        <div className="flex gap-2 flex-wrap">
          {DOC_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setDocTypeFilter(t.value as DocumentType | 'ALL');
                setPage(1);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background:
                  docTypeFilter === t.value
                    ? 'rgba(99,102,241,0.2)'
                    : 'rgba(255,255,255,0.04)',
                color:
                  docTypeFilter === t.value ? '#818cf8' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${
                  docTypeFilter === t.value
                    ? 'rgba(99,102,241,0.3)'
                    : 'rgba(255,255,255,0.06)'
                }`,
              }}
            >
              <FolderOpen size={11} />
              {t.label}
            </button>
          ))}
        </div>
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl sm:ml-auto"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            minWidth: 220,
          }}
        >
          <Search size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search documents..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          />
        </div>
      </div>

      {/* Documents grid */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton h-36 rounded-2xl" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="p-16 text-center">
            <FileText
              size={44}
              style={{ color: 'rgba(255,255,255,0.1)' }}
              className="mx-auto mb-3"
            />
            <p className="text-white font-medium">No documents found</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Upload your first document using the button above
            </p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {docs.map((doc, i) => {
                const color = typeColor(doc.documentType);
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative rounded-2xl p-4 flex flex-col gap-3"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.borderColor = `${color}40`)
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.borderColor =
                        'rgba(255,255,255,0.07)')
                    }
                  >
                    {/* Icon area */}
                    <div
                      className="w-full h-20 rounded-xl flex items-center justify-center"
                      style={{ background: `${color}12`, border: `1px solid ${color}22` }}
                    >
                      <span style={{ color }}>
                        <FileIcon fileType={doc.fileType} size={32} />
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold text-white truncate"
                        title={doc.name}
                      >
                        {doc.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={TYPE_BADGE[doc.documentType]}>
                          {doc.documentType}
                        </span>
                      </div>
                      <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {formatFileSize(doc.fileSize ?? 0)} &bull;{' '}
                        {formatDate(doc.createdAt)}
                      </p>
                      {doc.tags && (
                        <p
                          className="text-xs mt-1 truncate"
                          style={{ color: 'rgba(255,255,255,0.25)' }}
                        >
                          {doc.tags}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(doc.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: 'rgba(99,102,241,0.12)',
                          color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.2)',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background =
                            'rgba(99,102,241,0.25)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background =
                            'rgba(99,102,241,0.12)';
                        }}
                      >
                        <Download size={12} /> Download
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${doc.name}"?`)) deleteDoc(doc.id);
                        }}
                        className="p-1.5 rounded-lg transition-all"
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          color: '#f87171',
                          border: '1px solid rgba(239,68,68,0.15)',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background =
                            'rgba(239,68,68,0.25)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background =
                            'rgba(239,68,68,0.1)';
                        }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div
            className="px-4 py-3 border-t flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {meta.total} documents
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg text-xs disabled:opacity-30"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                Prev
              </button>
              <span className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-3 py-1 rounded-lg text-xs disabled:opacity-30"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowModal(false);
                reset();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="glass-card w-full max-w-md p-6"
              style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3
                    className="text-base font-bold text-white"
                    style={{ fontFamily: 'Plus Jakarta Sans' }}
                  >
                    Upload Document
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Register a new document in the repository
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    reset();
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Document Name <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    {...register('name')}
                    placeholder="e.g. Service Contract Q1 2026"
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${errors.name ? '#f87171' : 'rgba(255,255,255,0.1)'}`,
                      color: 'rgba(255,255,255,0.85)',
                    }}
                  />
                  {errors.name && (
                    <p className="text-xs mt-1" style={{ color: '#f87171' }}>
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Document Type <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    {...register('documentType')}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.85)',
                    }}
                  >
                    {DOC_TYPES.filter((t) => t.value !== 'ALL').map((t) => (
                      <option
                        key={t.value}
                        value={t.value}
                        style={{ background: '#1e1e2e', color: '#fff' }}
                      >
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Description{' '}
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span>
                  </label>
                  <textarea
                    {...register('description')}
                    rows={2}
                    placeholder="Brief description of the document..."
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.85)',
                    }}
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Tags{' '}
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>(comma-separated)</span>
                  </label>
                  <input
                    {...register('tags')}
                    placeholder="e.g. Q1, 2026, security"
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.85)',
                    }}
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Expiry Date{' '}
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span>
                  </label>
                  <input
                    {...register('expiryDate')}
                    type="date"
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.85)',
                      colorScheme: 'dark',
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      reset();
                    }}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn-primary flex-1 justify-center disabled:opacity-60"
                  >
                    {creating ? (
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"
                        />
                        Saving…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Upload size={14} /> Upload
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="stat-card"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {label}
        </p>
        <span style={{ color }}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
        {value}
      </p>
    </div>
  );
}
