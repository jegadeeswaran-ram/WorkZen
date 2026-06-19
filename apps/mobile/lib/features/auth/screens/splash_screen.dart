import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  Timer? _fallbackTimer;

  @override
  void initState() {
    super.initState();
    // Safety net: if auth check takes longer than 6s, go to login
    _fallbackTimer = Timer(const Duration(seconds: 6), () {
      if (mounted) context.go('/login');
    });
  }

  @override
  void dispose() {
    _fallbackTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authStateProvider, (_, next) {
      if (next is! AsyncLoading) {
        _fallbackTimer?.cancel();
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          if (next.value != null) {
            context.go('/home');
          } else {
            context.go('/login');
          }
        });
      }
    });

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
              ),
              child: const Icon(Icons.shield_outlined,
                  color: AppTheme.primary, size: 40),
            ).animate().scale(duration: 400.ms, curve: Curves.easeOut),
            const SizedBox(height: 20),
            Text('WorkZen',
                    style: Theme.of(context)
                        .textTheme
                        .headlineLarge
                        ?.copyWith(color: Colors.white))
                .animate()
                .fadeIn(delay: 200.ms),
            const SizedBox(height: 8),
            Text('Manpower ERP',
                    style: Theme.of(context).textTheme.bodyMedium)
                .animate()
                .fadeIn(delay: 300.ms),
            const SizedBox(height: 48),
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppTheme.primary.withValues(alpha: 0.6)),
            ).animate().fadeIn(delay: 400.ms),
          ],
        ),
      ),
    );
  }
}
