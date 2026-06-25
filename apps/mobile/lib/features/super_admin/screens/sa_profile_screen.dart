import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';

class SaProfileScreen extends ConsumerWidget {
  const SaProfileScreen({super.key});

  String _initials(String? name) {
    if (name == null || name.trim().isEmpty) return 'SA';
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return parts[0][0].toUpperCase();
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Sign Out', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700)),
        content: const Text('Are you sure you want to sign out?', style: TextStyle(color: AppTheme.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.danger,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(authStateProvider.notifier).logout();
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authAsync = ref.watch(authStateProvider);
    final user = authAsync.valueOrNull;
    final name = user?.name ?? 'Super Admin';
    final email = user?.email ?? '';

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: CustomScrollView(
        slivers: [
          // ── HEADER ──────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF1C1456), Color(0xFF0F1929), Color(0xFF080E1A)],
                  stops: [0.0, 0.55, 1.0],
                ),
                border: Border(bottom: BorderSide(color: Color(0x1F6366F1))),
              ),
              child: SafeArea(
                bottom: false,
                child: Column(
                  children: [
                    // Back button row
                    Padding(
                      padding: const EdgeInsets.fromLTRB(4, 4, 16, 0),
                      child: Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppTheme.textSecondary, size: 20),
                            onPressed: () => context.pop(),
                          ),
                          const Text('Profile', style: TextStyle(color: AppTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),

                    // Avatar section
                    const SizedBox(height: 20),
                    Stack(
                      alignment: Alignment.bottomRight,
                      children: [
                        Container(
                          width: 90,
                          height: 90,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppTheme.primary, Color(0xFF4F46E5)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(28),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.25), width: 2),
                            boxShadow: [BoxShadow(color: AppTheme.primary.withValues(alpha: 0.5), blurRadius: 20, offset: const Offset(0, 6))],
                          ),
                          alignment: Alignment.center,
                          child: Text(_initials(name), style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800)),
                        ),
                        Container(
                          width: 28,
                          height: 28,
                          margin: const EdgeInsets.only(right: 2, bottom: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.success,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppTheme.background, width: 2),
                          ),
                          child: const Icon(Icons.edit_rounded, size: 13, color: Colors.white),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppTheme.textPrimary, letterSpacing: -0.3)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.35), width: 1),
                      ),
                      child: const Text('SUPER ADMIN', style: TextStyle(fontSize: 11, color: AppTheme.primary, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                    ),
                    if (email.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(email, style: const TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                    ],
                    const SizedBox(height: 28),
                  ],
                ),
              ),
            ).animate().fadeIn(duration: 350.ms),
          ),

          // ── INFO CARDS ───────────────────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _ProfileSectionTitle(title: 'Account Information'),
                  const SizedBox(height: 12),
                  _ProfileInfoCard(
                    items: [
                      _ProfileItem(icon: Icons.person_outline_rounded, label: 'Full Name', value: name),
                      if (email.isNotEmpty)
                        _ProfileItem(icon: Icons.email_outlined, label: 'Email', value: email),
                      _ProfileItem(icon: Icons.shield_outlined, label: 'Role', value: 'Super Administrator'),
                      _ProfileItem(icon: Icons.business_outlined, label: 'Access Level', value: 'Full Access'),
                    ],
                  ),

                  const SizedBox(height: 24),
                  const _ProfileSectionTitle(title: 'Settings'),
                  const SizedBox(height: 12),
                  _ProfileActionCard(
                    items: [
                      _ProfileAction(icon: Icons.lock_outline_rounded, label: 'Change Password', color: AppTheme.primary, onTap: () {}),
                      _ProfileAction(icon: Icons.notifications_none_rounded, label: 'Notification Preferences', color: AppTheme.warning, onTap: () {}),
                      _ProfileAction(icon: Icons.language_rounded, label: 'Language & Region', color: const Color(0xFF60A5FA), onTap: () {}),
                    ],
                  ),

                  const SizedBox(height: 24),
                  _LogoutButton(onTap: () => _showLogoutDialog(context, ref)),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileSectionTitle extends StatelessWidget {
  const _ProfileSectionTitle({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textMuted, letterSpacing: 0.8));
  }
}

class _ProfileInfoCard extends StatelessWidget {
  const _ProfileInfoCard({required this.items});
  final List<_ProfileItem> items;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border, width: 1),
      ),
      child: Column(
        children: items.asMap().entries.map((e) {
          final item = e.value;
          final isLast = e.key == items.length - 1;
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(item.icon, size: 17, color: AppTheme.primary),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.label, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w500)),
                        const SizedBox(height: 2),
                        Text(item.value, style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ],
                ),
              ),
              if (!isLast) const Divider(height: 1, color: AppTheme.border),
            ],
          );
        }).toList(),
      ),
    ).animate().fadeIn(delay: 100.ms, duration: 350.ms).slideY(begin: 0.05);
  }
}

class _ProfileActionCard extends StatelessWidget {
  const _ProfileActionCard({required this.items});
  final List<_ProfileAction> items;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border, width: 1),
      ),
      child: Column(
        children: items.asMap().entries.map((e) {
          final item = e.value;
          final isLast = e.key == items.length - 1;
          return Column(
            children: [
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: item.onTap,
                  borderRadius: BorderRadius.vertical(
                    top: e.key == 0 ? const Radius.circular(16) : Radius.zero,
                    bottom: isLast ? const Radius.circular(16) : Radius.zero,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: item.color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(item.icon, size: 17, color: item.color),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(item.label, style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
                        ),
                        const Icon(Icons.chevron_right_rounded, size: 18, color: AppTheme.textMuted),
                      ],
                    ),
                  ),
                ),
              ),
              if (!isLast) const Divider(height: 1, color: AppTheme.border),
            ],
          );
        }).toList(),
      ),
    ).animate().fadeIn(delay: 150.ms, duration: 350.ms).slideY(begin: 0.05);
  }
}

class _LogoutButton extends StatelessWidget {
  const _LogoutButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: AppTheme.danger.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3), width: 1),
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.power_settings_new_rounded, color: AppTheme.danger, size: 20),
              SizedBox(width: 10),
              Text('Sign Out', style: TextStyle(color: AppTheme.danger, fontSize: 15, fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(delay: 200.ms, duration: 300.ms);
  }
}

class _ProfileItem {
  const _ProfileItem({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label, value;
}

class _ProfileAction {
  const _ProfileAction({required this.icon, required this.label, required this.color, required this.onTap});
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
}
