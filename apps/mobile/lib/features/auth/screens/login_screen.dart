import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _errorMessage;

  late AnimationController _bgController;

  @override
  void initState() {
    super.initState();
    _bgController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _bgController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _errorMessage = null;
    });
    await ref
        .read(authStateProvider.notifier)
        .login(_emailCtrl.text.trim(), _passCtrl.text);
    if (mounted) {
      final state = ref.read(authStateProvider);
      if (state.hasError) {
        setState(() {
          _loading = false;
          _errorMessage = _friendlyError(state.error);
        });
      } else {
        setState(() => _loading = false);
      }
    }
  }

  String _friendlyError(Object? error) {
    final msg = error?.toString() ?? '';
    if (msg.contains('SocketException') ||
        msg.contains('connection') ||
        msg.contains('ECONNREFUSED')) {
      return 'Cannot reach server. Please check your connection.';
    }
    if (msg.contains('401') || msg.contains('Unauthorized')) {
      return 'Invalid email or password.';
    }
    if (msg.contains('403')) return 'Access denied for your account.';
    if (msg.contains('DioException')) return 'Network error. Please try again.';
    return 'Login failed. Please try again.';
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isWide = size.width > 600;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // ── Animated background ─────────────────────────────────────────────
          AnimatedBuilder(
            animation: _bgController,
            builder: (_, __) {
              final t = _bgController.value;
              return CustomPaint(painter: _LoginBgPainter(t));
            },
          ),

          // ── Scrollable content ──────────────────────────────────────────────
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.symmetric(
                  horizontal: isWide ? (size.width - 420) / 2 : 24,
                  vertical: 32,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Logo
                    SvgPicture.asset(
                      'assets/images/web-login-dark.svg',
                      height: 44,
                      fit: BoxFit.contain,
                    )
                        .animate()
                        .fadeIn(duration: 500.ms)
                        .slideY(begin: -0.2, end: 0.0, duration: 500.ms, curve: Curves.easeOut),

                    const SizedBox(height: 8),

                    Text(
                      'MANPOWER · PAYROLL · TENDER ERP',
                      style: TextStyle(
                        fontSize: 9.5,
                        letterSpacing: 2.5,
                        color: AppTheme.textMuted,
                        fontWeight: FontWeight.w500,
                      ),
                    ).animate().fadeIn(delay: 200.ms, duration: 400.ms),

                    const SizedBox(height: 40),

                    // Glassmorphic login card
                    _GlassCard(
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header
                            Text(
                              'Welcome back',
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ).animate().fadeIn(delay: 300.ms, duration: 400.ms),

                            const SizedBox(height: 6),

                            Text(
                              'Sign in to your WorkZen account',
                              style: TextStyle(
                                fontSize: 13,
                                color: AppTheme.textSecondary,
                              ),
                            ).animate().fadeIn(delay: 350.ms, duration: 400.ms),

                            const SizedBox(height: 28),

                            // Error banner
                            if (_errorMessage != null)
                              Container(
                                margin: const EdgeInsets.only(bottom: 20),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 12),
                                decoration: BoxDecoration(
                                  color: AppTheme.danger.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: AppTheme.danger.withValues(alpha: 0.35),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.error_outline,
                                        color: AppTheme.danger, size: 16),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        _errorMessage!,
                                        style: TextStyle(
                                          color: AppTheme.danger,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ).animate().fadeIn(duration: 300.ms).shakeX(),

                            // Email field
                            _FieldLabel('Email Address'),
                            const SizedBox(height: 8),
                            _HoverField(
                              child: TextFormField(
                                controller: _emailCtrl,
                                keyboardType: TextInputType.emailAddress,
                                autofillHints: const [AutofillHints.email],
                                style: const TextStyle(
                                    color: Colors.white, fontSize: 14),
                                decoration: InputDecoration(
                                  hintText: 'admin@workzen.in',
                                  prefixIcon: Icon(Icons.email_outlined,
                                      size: 18, color: AppTheme.textMuted),
                                ),
                                validator: (v) =>
                                    (v == null || !v.contains('@'))
                                        ? 'Enter a valid email'
                                        : null,
                              ),
                            ).animate().fadeIn(delay: 400.ms, duration: 400.ms),

                            const SizedBox(height: 18),

                            // Password field
                            _FieldLabel('Password'),
                            const SizedBox(height: 8),
                            _HoverField(
                              child: TextFormField(
                                controller: _passCtrl,
                                obscureText: _obscure,
                                style: const TextStyle(
                                    color: Colors.white, fontSize: 14),
                                decoration: InputDecoration(
                                  hintText: '••••••••',
                                  prefixIcon: Icon(Icons.lock_outline,
                                      size: 18, color: AppTheme.textMuted),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscure
                                          ? Icons.visibility_off_outlined
                                          : Icons.visibility_outlined,
                                      size: 18,
                                      color: AppTheme.textMuted,
                                    ),
                                    onPressed: () =>
                                        setState(() => _obscure = !_obscure),
                                  ),
                                ),
                                validator: (v) =>
                                    (v == null || v.length < 6)
                                        ? 'Password must be at least 6 characters'
                                        : null,
                                onFieldSubmitted: (_) => _submit(),
                              ),
                            ).animate().fadeIn(delay: 450.ms, duration: 400.ms),

                            const SizedBox(height: 28),

                            // Sign In button
                            _AnimatedButton(
                              loading: _loading,
                              onTap: _loading ? null : _submit,
                            ).animate().fadeIn(delay: 500.ms, duration: 400.ms),

                            const SizedBox(height: 20),

                            // Demo hint
                            Center(
                              child: Text(
                                'Demo: admin@workzen.in · Admin@123!',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppTheme.textMuted,
                                ),
                              ),
                            ).animate().fadeIn(delay: 600.ms, duration: 400.ms),
                          ],
                        ),
                      ),
                    ).animate().fadeIn(delay: 250.ms, duration: 500.ms).slideY(
                          begin: 0.15,
                          end: 0.0,
                          delay: 250.ms,
                          duration: 500.ms,
                          curve: Curves.easeOut,
                        ),

                    const SizedBox(height: 40),

                    // Bottom branding
                    Column(
                      children: [
                        Text(
                          'Developed by',
                          style: TextStyle(
                              fontSize: 11, color: AppTheme.textMuted),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 5,
                              height: 5,
                              decoration: const BoxDecoration(
                                color: Color(0xFFfc5700),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Ram Info Media',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.white.withValues(alpha: 0.8),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              width: 5,
                              height: 5,
                              decoration: const BoxDecoration(
                                color: Color(0xFFfc5700),
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ).animate().fadeIn(delay: 700.ms, duration: 500.ms),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Glassmorphic card ─────────────────────────────────────────────────────────
class _GlassCard extends StatelessWidget {
  final Widget child;
  const _GlassCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1929).withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppTheme.primary.withValues(alpha: 0.18),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.08),
            blurRadius: 40,
            spreadRadius: 0,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.4),
            blurRadius: 24,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }
}

// ── Hover-highlight wrapper for text fields ───────────────────────────────────
class _HoverField extends StatefulWidget {
  final Widget child;
  const _HoverField({required this.child});

  @override
  State<_HoverField> createState() => _HoverFieldState();
}

class _HoverFieldState extends State<_HoverField> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          boxShadow: _hovered
              ? [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.20),
                    blurRadius: 12,
                    spreadRadius: 0,
                  )
                ]
              : [],
        ),
        child: widget.child,
      ),
    );
  }
}

// ── Animated sign-in button with hover ───────────────────────────────────────
class _AnimatedButton extends StatefulWidget {
  final bool loading;
  final VoidCallback? onTap;
  const _AnimatedButton({required this.loading, required this.onTap});

  @override
  State<_AnimatedButton> createState() => _AnimatedButtonState();
}

class _AnimatedButtonState extends State<_AnimatedButton> {
  bool _hovered = false;
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final color = widget.loading || widget.onTap == null
        ? AppTheme.primary.withValues(alpha: 0.5)
        : _pressed
            ? const Color(0xFF4F52D1)
            : _hovered
                ? const Color(0xFF7577F5)
                : AppTheme.primary;

    return MouseRegion(
      cursor: widget.onTap != null
          ? SystemMouseCursors.click
          : SystemMouseCursors.basic,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _pressed = true),
        onTapUp: (_) {
          setState(() => _pressed = false);
          widget.onTap?.call();
        },
        onTapCancel: () => setState(() => _pressed = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: double.infinity,
          height: 50,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(12),
            boxShadow: _hovered && !widget.loading
                ? [
                    BoxShadow(
                      color: AppTheme.primary.withValues(alpha: 0.45),
                      blurRadius: 20,
                      spreadRadius: 0,
                      offset: const Offset(0, 6),
                    )
                  ]
                : [],
          ),
          child: Center(
            child: widget.loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        'Sign In',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          letterSpacing: 0.3,
                        ),
                      ),
                      AnimatedSlide(
                        offset: _hovered
                            ? const Offset(0.15, 0)
                            : Offset.zero,
                        duration: const Duration(milliseconds: 200),
                        child: const Padding(
                          padding: EdgeInsets.only(left: 8),
                          child: Icon(Icons.arrow_forward,
                              color: Colors.white, size: 16),
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

// ── Field label ───────────────────────────────────────────────────────────────
class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 13,
        fontWeight: FontWeight.w500,
      ),
    );
  }
}

// ── Animated background painter ───────────────────────────────────────────────
class _LoginBgPainter extends CustomPainter {
  final double t;
  _LoginBgPainter(this.t);

  @override
  void paint(Canvas canvas, Size size) {
    // Base gradient
    final bgPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: const [
          Color(0xFF080E1A),
          Color(0xFF0D1425),
          Color(0xFF080E1A),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawRect(
        Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    void drawGlow(double cx, double cy, double r, Color c, double alpha) {
      final p = Paint()
        ..shader = RadialGradient(
          colors: [c.withValues(alpha: alpha), c.withValues(alpha: 0)],
        ).createShader(Rect.fromCircle(center: Offset(cx, cy), radius: r));
      canvas.drawCircle(Offset(cx, cy), r, p);
    }

    drawGlow(
      size.width * (0.1 + 0.15 * math.sin(t * math.pi * 2)),
      size.height * (0.15 + 0.1 * math.cos(t * math.pi * 1.5)),
      size.width * 0.55,
      const Color(0xFF6366F1),
      0.14,
    );
    drawGlow(
      size.width * (0.9 - 0.12 * math.cos(t * math.pi * 2)),
      size.height * (0.8 - 0.08 * math.sin(t * math.pi)),
      size.width * 0.5,
      const Color(0xFF8B5CF6),
      0.10,
    );
    drawGlow(
      size.width * 0.5,
      size.height * (0.5 + 0.05 * math.sin(t * math.pi * 3)),
      size.width * 0.3,
      const Color(0xFFfc5700),
      0.04,
    );

    // Grid lines (subtle)
    final gridPaint = Paint()
      ..color = const Color(0xFF1E293B).withValues(alpha: 0.4)
      ..strokeWidth = 0.5;
    const step = 60.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }
  }

  @override
  bool shouldRepaint(_LoginBgPainter old) => old.t != t;
}
