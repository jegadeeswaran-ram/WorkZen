import 'package:flutter/material.dart';

class SaTenderDetailScreen extends StatelessWidget {
  final String tenderId;
  const SaTenderDetailScreen({super.key, required this.tenderId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text('SA Tender Detail: $tenderId')),
    );
  }
}
