import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with TickerProviderStateMixin {
  Timer? _fallbackTimer;
  late AnimationController _bgController;
  late AnimationController _particleController;

  @override
  void initState() {
    super.initState();

    _bgController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    )..repeat(reverse: true);

    _particleController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();

    _fallbackTimer = Timer(const Duration(seconds: 7), () {
      if (mounted) context.go('/login');
    });
  }

  @override
  void dispose() {
    _fallbackTimer?.cancel();
    _bgController.dispose();
    _particleController.dispose();
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
      body: Stack(
        fit: StackFit.expand,
        children: [
          // ── Animated gradient background ──────────────────────────────────
          AnimatedBuilder(
            animation: _bgController,
            builder: (context, _) {
              final t = _bgController.value;
              return Container(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment(
                      -0.4 + 0.8 * t,
                      -0.6 + 0.4 * math.sin(t * math.pi),
                    ),
                    radius: 1.2,
                    colors: [
                      const Color(0xFF1A1040),
                      AppTheme.background,
                      const Color(0xFF0A0F20),
                    ],
                    stops: const [0.0, 0.55, 1.0],
                  ),
                ),
              );
            },
          ),

          // ── Floating glow orbs ────────────────────────────────────────────
          AnimatedBuilder(
            animation: _bgController,
            builder: (context, _) {
              final t = _bgController.value;
              return CustomPaint(
                painter: _OrbPainter(t),
              );
            },
          ),

          // ── Floating particles ────────────────────────────────────────────
          AnimatedBuilder(
            animation: _particleController,
            builder: (context, _) {
              return CustomPaint(
                painter: _ParticlePainter(_particleController.value),
              );
            },
          ),

          // ── Centered content ──────────────────────────────────────────────
          Column(
            children: [
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // App icon with glow ring
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        // Pulsing outer glow ring
                        Container(
                          width: 130,
                          height: 130,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppTheme.primary.withValues(alpha: 0.15),
                              width: 1.5,
                            ),
                          ),
                        )
                            .animate(onPlay: (c) => c.repeat(reverse: true))
                            .scale(
                              begin: const Offset(1.0, 1.0),
                              end: const Offset(1.12, 1.12),
                              duration: 1800.ms,
                              curve: Curves.easeInOut,
                            )
                            .fadeIn(duration: 600.ms),

                        // Inner glow ring
                        Container(
                          width: 104,
                          height: 104,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppTheme.primary.withValues(alpha: 0.30),
                              width: 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.primary.withValues(alpha: 0.25),
                                blurRadius: 28,
                                spreadRadius: 4,
                              ),
                            ],
                          ),
                        )
                            .animate(onPlay: (c) => c.repeat(reverse: true))
                            .scale(
                              begin: const Offset(1.0, 1.0),
                              end: const Offset(1.06, 1.06),
                              duration: 1400.ms,
                              curve: Curves.easeInOut,
                            )
                            .fadeIn(delay: 100.ms, duration: 600.ms),

                        // App icon
                        ClipRRect(
                          borderRadius: BorderRadius.circular(22),
                          child: SvgPicture.asset(
                            'assets/images/app-icon.svg',
                            width: 88,
                            height: 88,
                          ),
                        )
                            .animate()
                            .scale(
                              begin: const Offset(0.0, 0.0),
                              end: const Offset(1.0, 1.0),
                              duration: 700.ms,
                              curve: Curves.elasticOut,
                            )
                            .fadeIn(duration: 400.ms),
                      ],
                    ),

                    const SizedBox(height: 36),

                    // Wordmark logo
                    SvgPicture.asset(
                      'assets/images/web-login-dark.svg',
                      height: 38,
                      fit: BoxFit.contain,
                    )
                        .animate()
                        .fadeIn(delay: 500.ms, duration: 600.ms)
                        .slideY(
                          begin: 0.3,
                          end: 0.0,
                          delay: 500.ms,
                          duration: 600.ms,
                          curve: Curves.easeOut,
                        ),

                    const SizedBox(height: 12),

                    // Tagline
                    Text(
                      'MANPOWER · PAYROLL · TENDER ERP',
                      style: TextStyle(
                        fontSize: 10,
                        letterSpacing: 2.5,
                        color: AppTheme.textMuted,
                        fontWeight: FontWeight.w500,
                      ),
                    )
                        .animate()
                        .fadeIn(delay: 800.ms, duration: 600.ms),

                    const SizedBox(height: 52),

                    // Loading indicator
                    SizedBox(
                      width: 36,
                      height: 2,
                      child: LinearProgressIndicator(
                        backgroundColor: AppTheme.border,
                        valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primary),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    )
                        .animate()
                        .fadeIn(delay: 1000.ms, duration: 400.ms),
                  ],
                ),
              ),

              // ── Bottom branding ─────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.only(bottom: 36),
                child: Column(
                  children: [
                    Text(
                      'Developed by',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppTheme.textMuted,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: const Color(0xFFfc5700),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 7),
                        Text(
                          'Ram Info Media',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.white.withValues(alpha: 0.85),
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(width: 7),
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: const Color(0xFFfc5700),
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ),
                  ],
                )
                    .animate()
                    .fadeIn(delay: 1200.ms, duration: 600.ms),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Floating glow orbs painter ─────────────────────────────────────────────────
class _OrbPainter extends CustomPainter {
  final double t;
  _OrbPainter(this.t);

  @override
  void paint(Canvas canvas, Size size) {
    void drawOrb(double cx, double cy, double radius, Color color, double alpha) {
      final paint = Paint()
        ..shader = RadialGradient(
          colors: [color.withValues(alpha: alpha), color.withValues(alpha: 0.0)],
        ).createShader(Rect.fromCircle(
          center: Offset(cx, cy),
          radius: radius,
        ));
      canvas.drawCircle(Offset(cx, cy), radius, paint);
    }

    // Slowly drifting orbs
    drawOrb(
      size.width * (0.15 + 0.1 * math.sin(t * math.pi * 2)),
      size.height * (0.2 + 0.08 * math.cos(t * math.pi * 2)),
      size.width * 0.45,
      const Color(0xFF6366F1),
      0.12,
    );
    drawOrb(
      size.width * (0.85 - 0.1 * math.cos(t * math.pi * 2)),
      size.height * (0.7 + 0.08 * math.sin(t * math.pi * 2)),
      size.width * 0.4,
      const Color(0xFF8B5CF6),
      0.10,
    );
    drawOrb(
      size.width * 0.5,
      size.height * (0.4 + 0.05 * math.sin(t * math.pi)),
      size.width * 0.35,
      const Color(0xFFfc5700),
      0.06,
    );
  }

  @override
  bool shouldRepaint(_OrbPainter old) => old.t != t;
}

// ── Floating particles painter ─────────────────────────────────────────────────
class _ParticlePainter extends CustomPainter {
  final double t;
  _ParticlePainter(this.t);

  static final List<_Particle> _particles = List.generate(22, (i) {
    final rng = math.Random(i * 31 + 7);
    return _Particle(
      x: rng.nextDouble(),
      y: rng.nextDouble(),
      size: 1.0 + rng.nextDouble() * 2.2,
      speed: 0.08 + rng.nextDouble() * 0.18,
      phase: rng.nextDouble(),
    );
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;

    for (final p in _particles) {
      final yPos = (p.y - p.speed * t + p.phase) % 1.0;
      final alpha = (math.sin((yPos) * math.pi) * 0.5).clamp(0.0, 1.0);
      paint.color = AppTheme.primary.withValues(alpha: alpha * 0.5);
      canvas.drawCircle(
        Offset(p.x * size.width, yPos * size.height),
        p.size,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_ParticlePainter old) => old.t != t;
}

class _Particle {
  final double x, y, size, speed, phase;
  const _Particle({
    required this.x,
    required this.y,
    required this.size,
    required this.speed,
    required this.phase,
  });
}
