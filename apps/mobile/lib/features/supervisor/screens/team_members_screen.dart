import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/supervisor_provider.dart';

// ---------------------------------------------------------------------------
// Initials helper
// ---------------------------------------------------------------------------

String _initials(String? first, String? last) {
  final f = (first ?? '').isNotEmpty ? first![0].toUpperCase() : '';
  final l = (last ?? '').isNotEmpty ? last![0].toUpperCase() : '';
  return '$f$l';
}

// ---------------------------------------------------------------------------
// Team Members Screen
// ---------------------------------------------------------------------------

class TeamMembersScreen extends ConsumerStatefulWidget {
  const TeamMembersScreen({super.key});

  @override
  ConsumerState<TeamMembersScreen> createState() => _TeamMembersScreenState();
}

class _TeamMembersScreenState extends ConsumerState<TeamMembersScreen> {
  String _search = '';
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final teamAsync = ref.watch(supervisorTeamProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('My Team'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(supervisorTeamProvider),
          ),
        ],
      ),
      body: Column(
        children: [
          // ---- Search Bar ----
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _search = v.toLowerCase()),
              style: const TextStyle(color: AppTheme.textPrimary),
              decoration: InputDecoration(
                hintText: 'Search by name or code...',
                prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted),
                suffixIcon: _search.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: AppTheme.textMuted),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _search = '');
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppTheme.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.primary),
                ),
                hintStyle: const TextStyle(color: AppTheme.textMuted),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
              ),
            ),
          ),

          // ---- Main Content ----
          Expanded(
            child: teamAsync.when(
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppTheme.primary),
              ),
              error: (error, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      color: AppTheme.danger,
                      size: 48,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Failed to load team members',
                      style: const TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => ref.invalidate(supervisorTeamProvider),
                      icon: const Icon(Icons.refresh, size: 18),
                      label: const Text('Retry'),
                    ),
                  ],
                ),
              ),
              data: (deployments) {
                final filtered = _search.isEmpty
                    ? deployments
                    : deployments.where((d) {
                        final emp = d['employee'] as Map<String, dynamic>? ?? {};
                        final fullName =
                            '${emp['firstName'] ?? ''} ${emp['lastName'] ?? ''}'
                                .toLowerCase();
                        final code =
                            (emp['employeeCode'] as String? ?? '').toLowerCase();
                        return fullName.contains(_search) ||
                            code.contains(_search);
                      }).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.group_off,
                          color: AppTheme.textMuted,
                          size: 48,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _search.isNotEmpty
                              ? 'No employees match your search'
                              : 'No team members found',
                          style: const TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.only(bottom: 24),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) =>
                      _TeamMemberCard(deployment: filtered[index]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Team Member Card
// ---------------------------------------------------------------------------

class _TeamMemberCard extends StatelessWidget {
  final Map<String, dynamic> deployment;

  const _TeamMemberCard({required this.deployment});

  Color _statusColor(String? status) {
    switch ((status ?? '').toUpperCase()) {
      case 'ACTIVE':
        return AppTheme.success;
      case 'ON_HOLD':
        return AppTheme.warning;
      case 'COMPLETED':
      case 'TERMINATED':
        return AppTheme.textMuted;
      default:
        return AppTheme.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final emp = deployment['employee'] as Map<String, dynamic>? ?? {};
    final firstName = emp['firstName'] as String?;
    final lastName = emp['lastName'] as String?;
    final fullName =
        '${firstName ?? ''} ${lastName ?? ''}'.trim().isEmpty
            ? 'Unknown'
            : '${firstName ?? ''} ${lastName ?? ''}'.trim();
    final employeeCode = emp['employeeCode'] as String? ?? '—';
    final photo = emp['photo'] as String?;
    final phone = emp['personalPhone'] as String? ?? '—';
    final status = deployment['status'] as String?;
    final initials = _initials(firstName, lastName);
    final statusColor = _statusColor(status);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          radius: 24,
          backgroundColor: AppTheme.primary.withValues(alpha: 0.2),
          foregroundImage: (photo != null && photo.isNotEmpty)
              ? NetworkImage(photo)
              : null,
          onForegroundImageError: (photo != null && photo.isNotEmpty)
              ? (_, __) {} // ignore — falls through to child
              : null,
          child: Text(
            initials,
            style: const TextStyle(
              color: AppTheme.primary,
              fontWeight: FontWeight.w600,
              fontSize: 15,
            ),
          ),
        ),
        title: Text(
          fullName,
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.w600,
            fontSize: 15,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 2),
            Text(
              employeeCode,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 12,
              ),
            ),
            Text(
              phone,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 12,
              ),
            ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: statusColor.withValues(alpha: 0.4)),
              ),
              child: Text(
                (status ?? 'UNKNOWN').replaceAll('_', ' '),
                style: TextStyle(
                  color: statusColor,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                ),
              ),
            ),
            const SizedBox(height: 4),
            const Icon(
              Icons.chevron_right,
              color: AppTheme.textMuted,
              size: 20,
            ),
          ],
        ),
        onTap: () => showModalBottomSheet(
          context: context,
          backgroundColor: AppTheme.surface,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          isScrollControlled: true,
          builder: (_) => _EmployeeDetailSheet(deployment: deployment),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Employee Detail Bottom Sheet
// ---------------------------------------------------------------------------

class _EmployeeDetailSheet extends StatelessWidget {
  final Map<String, dynamic> deployment;

  const _EmployeeDetailSheet({required this.deployment});

  @override
  Widget build(BuildContext context) {
    final emp = deployment['employee'] as Map<String, dynamic>? ?? {};
    final firstName = emp['firstName'] as String?;
    final lastName = emp['lastName'] as String?;
    final fullName =
        '${firstName ?? ''} ${lastName ?? ''}'.trim().isEmpty
            ? 'Unknown'
            : '${firstName ?? ''} ${lastName ?? ''}'.trim();
    final employeeCode = emp['employeeCode'] as String? ?? '—';
    final photo = emp['photo'] as String?;
    final phone = emp['personalPhone'] as String? ?? '—';
    final status = deployment['status'] as String?;
    final shiftId = deployment['shiftId'] as String?;
    final siteId = deployment['siteId'] as String?;
    final initials = _initials(firstName, lastName);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),

            // Avatar
            CircleAvatar(
              radius: 40,
              backgroundColor: AppTheme.primary.withValues(alpha: 0.2),
              foregroundImage: (photo != null && photo.isNotEmpty)
                  ? NetworkImage(photo)
                  : null,
              onForegroundImageError: (photo != null && photo.isNotEmpty)
                  ? (_, __) {} // ignore — falls through to child
                  : null,
              child: Text(
                initials,
                style: const TextStyle(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.w700,
                  fontSize: 28,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Full name
            Text(
              fullName,
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),

            // Employee code subtitle
            Text(
              employeeCode,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 20),

            const Divider(color: AppTheme.border, thickness: 1),
            const SizedBox(height: 12),

            // Detail rows
            _DetailRow(Icons.badge, 'Employee Code', employeeCode),
            _DetailRow(Icons.phone, 'Phone', phone),
            _DetailRow(
              Icons.work,
              'Deployment Status',
              (status ?? '—').replaceAll('_', ' '),
            ),
            if (shiftId != null && shiftId.isNotEmpty)
              _DetailRow(Icons.schedule, 'Shift ID', shiftId),
            if (siteId != null && siteId.isNotEmpty)
              _DetailRow(Icons.location_on, 'Site ID', siteId),

            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Detail Row
// ---------------------------------------------------------------------------

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? value;

  const _DetailRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.textMuted, size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 12,
              ),
            ),
          ),
          Text(
            value ?? '—',
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
