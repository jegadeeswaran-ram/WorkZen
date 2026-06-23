import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/hr_provider.dart';

class HrRecruitmentScreen extends ConsumerStatefulWidget {
  const HrRecruitmentScreen({super.key});

  @override
  ConsumerState<HrRecruitmentScreen> createState() =>
      _HrRecruitmentScreenState();
}

class _HrRecruitmentScreenState extends ConsumerState<HrRecruitmentScreen> {
  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Recruitment'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Requisitions'),
              Tab(text: 'Candidates'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _RequisitionsTab(),
            _CandidatesTab(),
          ],
        ),
      ),
    );
  }
}

// ── Requisitions Tab ──────────────────────────────────────────────────────────

class _RequisitionsTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(hrRequisitionsProvider);
    return state.when(
      loading: () =>
          const Center(child: CircularProgressIndicator()),
      error: (_, __) =>
          const Center(child: Text('Unable to load requisitions')),
      data: (list) {
        if (list.isEmpty) {
          return const Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.work_outline, size: 48, color: AppTheme.textMuted),
                SizedBox(height: 12),
                Text('No requisitions found',
                    style: TextStyle(color: AppTheme.textMuted)),
              ],
            ),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: list.length,
          itemBuilder: (context, i) => _RequisitionCard(list[i]),
        );
      },
    );
  }
}

class _RequisitionCard extends StatelessWidget {
  const _RequisitionCard(this.item);
  final HrJobRequisition item;

  @override
  Widget build(BuildContext context) {
    final barColor = item.status == 'OPEN'
        ? AppTheme.success
        : item.status == 'DRAFT'
            ? AppTheme.primary
            : AppTheme.textMuted;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: barColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  bottomLeft: Radius.circular(12),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.department,
                      style: const TextStyle(
                          color: AppTheme.textMuted, fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.work_outline,
                            size: 14, color: AppTheme.textMuted),
                        Text(
                          ' ${item.vacancies} vacancies',
                          style: const TextStyle(
                              fontSize: 12, color: AppTheme.textMuted),
                        ),
                        const SizedBox(width: 16),
                        const Icon(Icons.people_outline,
                            size: 14, color: AppTheme.textMuted),
                        Text(
                          ' ${item.applicationsCount} applications',
                          style: const TextStyle(
                              fontSize: 12, color: AppTheme.textMuted),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: _StatusChip(
                status: item.status,
                color: barColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Candidates Tab ────────────────────────────────────────────────────────────

class _CandidatesTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(hrCandidatesProvider);
    return state.when(
      loading: () =>
          const Center(child: CircularProgressIndicator()),
      error: (_, __) =>
          const Center(child: Text('Unable to load candidates')),
      data: (list) {
        if (list.isEmpty) {
          return const Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.work_outline, size: 48, color: AppTheme.textMuted),
                SizedBox(height: 12),
                Text('No candidates found',
                    style: TextStyle(color: AppTheme.textMuted)),
              ],
            ),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: list.length,
          itemBuilder: (context, i) => _CandidateCard(list[i]),
        );
      },
    );
  }
}

class _CandidateCard extends StatelessWidget {
  const _CandidateCard(this.candidate);
  final HrCandidate candidate;

  @override
  Widget build(BuildContext context) {
    final statusColor = _candidateStatusColor(candidate.status);
    final initials = _initials(candidate.name);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: _avatarColor(candidate.name),
            child: Text(
              initials,
              style: const TextStyle(
                  fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  candidate.name,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 14),
                ),
                Text(
                  candidate.position,
                  style: const TextStyle(
                      color: AppTheme.textMuted, fontSize: 12),
                ),
                if (candidate.currentStage != null)
                  Text(
                    'Stage: ${candidate.currentStage}',
                    style: const TextStyle(
                        color: AppTheme.primary, fontSize: 11),
                  ),
              ],
            ),
          ),
          _StatusChip(status: candidate.status, color: statusColor),
        ],
      ),
    );
  }

  Color _candidateStatusColor(String status) {
    switch (status) {
      case 'APPLIED':
        return AppTheme.primary;
      case 'INTERVIEWED':
        return AppTheme.warning;
      case 'SELECTED':
      case 'JOINED':
        return AppTheme.success;
      case 'REJECTED':
        return AppTheme.danger;
      default:
        return AppTheme.textMuted;
    }
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

Color _avatarColor(String name) {
  const colors = [
    AppTheme.primary,
    AppTheme.success,
    AppTheme.warning,
    Color(0xFF8B5CF6),
    Color(0xFFEC4899),
  ];
  return colors[name.hashCode.abs() % 5];
}

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+'));
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
    return parts[0][0].toUpperCase();
  }
  return '?';
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status, required this.color});
  final String status;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status,
        style: TextStyle(color: color, fontSize: 11),
      ),
    );
  }
}
