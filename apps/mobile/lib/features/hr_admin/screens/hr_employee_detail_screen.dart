import 'package:flutter/material.dart';

class HrEmployeeDetailScreen extends StatelessWidget {
  final String employeeId;
  const HrEmployeeDetailScreen({super.key, required this.employeeId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text('HR Employee Detail: $employeeId')),
    );
  }
}
