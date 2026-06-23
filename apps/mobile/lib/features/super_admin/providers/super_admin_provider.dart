import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

// ── HELPERS ──────────────────────────────────────────────────────────────────

/// Safely unwrap paginated or direct list responses from the API.
List<Map<String, dynamic>> _parseList(dynamic responseData) {
  final data = responseData['data'];
  if (data is List) return data.cast<Map<String, dynamic>>();
  if (data is Map && data['items'] is List) {
    return (data['items'] as List).cast<Map<String, dynamic>>();
  }
  return <Map<String, dynamic>>[];
}

/// Safely unwrap a single object from `{ "data": {...} }`.
Map<String, dynamic> _parseObject(dynamic responseData) {
  final data = responseData['data'];
  if (data is Map<String, dynamic>) return data;
  return <String, dynamic>{};
}

// ── MODELS ───────────────────────────────────────────────────────────────────

/// Dashboard KPI summary for the Super Admin home screen.
class SaSummary {
  final int totalEmployees;
  final int activeSites;
  final int activeTenders;
  final int openIssues;
  final int overdueCompliance;
  final double monthlyBilling; // in rupees

  const SaSummary({
    required this.totalEmployees,
    required this.activeSites,
    required this.activeTenders,
    required this.openIssues,
    required this.overdueCompliance,
    required this.monthlyBilling,
  });

  factory SaSummary.fromJson(Map<String, dynamic> j) => SaSummary(
        totalEmployees: _toInt(j['totalEmployees']),
        activeSites: _toInt(j['deploymentsActive'] ?? j['activeSites']),
        activeTenders: _toInt(j['activeTenders']),
        openIssues: _toInt(
            (j['complaints'] as Map<String, dynamic>?)?['open'] ??
                j['openIssues']),
        overdueCompliance: _toInt(j['complianceOverdue']),
        monthlyBilling: _toDouble(
            (j['invoicesThisMonth'] as Map<String, dynamic>?)?['totalAmount'] ??
                j['monthlyBilling']),
      );
}

/// A deployment site in the SA sites list.
class SaSite {
  final String id;
  final String name;
  final String address;
  final String status; // ACTIVE | INACTIVE | ISSUE
  final String? supervisorName;
  final String? supervisorPhone;
  final int employeeCount;
  final double attendancePercent; // 0..100

  const SaSite({
    required this.id,
    required this.name,
    required this.address,
    required this.status,
    this.supervisorName,
    this.supervisorPhone,
    required this.employeeCount,
    required this.attendancePercent,
  });

  factory SaSite.fromJson(Map<String, dynamic> j) {
    final supervisor = j['supervisor'] as Map<String, dynamic>?;
    final todayAttendance =
        j['todayAttendance'] as Map<String, dynamic>?;
    return SaSite(
      id: j['id'] as String? ?? '',
      name: j['name'] as String? ?? '',
      address: j['address'] as String? ?? '',
      status: j['status'] as String? ?? 'ACTIVE',
      supervisorName: supervisor?['name'] as String?,
      supervisorPhone: supervisor?['phone'] as String?,
      employeeCount: _toInt(j['employeeCount']),
      attendancePercent: _toDouble(todayAttendance?['percent']),
    );
  }
}

/// An employee's attendance record for a specific site today.
class SaSiteEmployee {
  final String id;
  final String name;
  final String designation;
  final String status; // PRESENT | ABSENT | ON_LEAVE

  final String? checkInTime;

  const SaSiteEmployee({
    required this.id,
    required this.name,
    required this.designation,
    required this.status,
    this.checkInTime,
  });

  factory SaSiteEmployee.fromJson(Map<String, dynamic> j) {
    final employee = j['employee'] as Map<String, dynamic>? ?? j;
    final firstName = employee['firstName'] as String? ?? '';
    final lastName = employee['lastName'] as String? ?? '';
    final rawStatus =
        (j['status'] as String?)?.toUpperCase() ?? 'ABSENT';
    final String mappedStatus;
    if (rawStatus == 'PRESENT' || rawStatus == 'LATE') {
      mappedStatus = 'PRESENT';
    } else if (rawStatus == 'LEAVE') {
      mappedStatus = 'ON_LEAVE';
    } else {
      mappedStatus = 'ABSENT';
    }
    return SaSiteEmployee(
      id: employee['id'] as String? ?? j['employeeId'] as String? ?? '',
      name: '$firstName $lastName'.trim(),
      designation: employee['designation'] as String? ?? '',
      status: mappedStatus,
      checkInTime: j['checkInTime'] as String?,
    );
  }
}

/// A complaint / issue filed for a site.
class SaSiteComplaint {
  final String id;
  final String title;
  final String status;
  final String severity; // LOW | MEDIUM | HIGH | CRITICAL
  final String createdAt;

  const SaSiteComplaint({
    required this.id,
    required this.title,
    required this.status,
    required this.severity,
    required this.createdAt,
  });

  factory SaSiteComplaint.fromJson(Map<String, dynamic> j) =>
      SaSiteComplaint(
        id: j['id'] as String? ?? '',
        title: j['title'] as String? ?? '',
        status: j['status'] as String? ?? '',
        severity: j['severity'] as String? ?? 'LOW',
        createdAt: j['createdAt'] as String? ?? '',
      );
}

/// A daily activity log entry for a site.
class SaActivityLog {
  final String id;
  final String logDate;
  final String workDone;
  final int headcount;
  final bool hasIncident;
  final String? incidentType;

  const SaActivityLog({
    required this.id,
    required this.logDate,
    required this.workDone,
    required this.headcount,
    required this.hasIncident,
    this.incidentType,
  });

  factory SaActivityLog.fromJson(Map<String, dynamic> j) => SaActivityLog(
        id: j['id'] as String? ?? '',
        logDate: j['logDate'] as String? ?? '',
        workDone: j['workDone'] as String? ?? '',
        headcount: _toInt(j['headcount']),
        hasIncident: j['hasIncident'] as bool? ?? false,
        incidentType: j['incidentType'] as String?,
      );
}

/// A government tender in the SA tenders list.
class SaTender {
  final String id;
  final String tenderNumber;
  final String title;
  final String status;
  final String clientName;
  final String startDate;
  final String endDate;
  final double contractValue;
  final double progressPercent; // 0..100

  const SaTender({
    required this.id,
    required this.tenderNumber,
    required this.title,
    required this.status,
    required this.clientName,
    required this.startDate,
    required this.endDate,
    required this.contractValue,
    required this.progressPercent,
  });

  factory SaTender.fromJson(Map<String, dynamic> j) {
    final client = j['client'] as Map<String, dynamic>?;
    final startDate = j['startDate'] as String? ?? '';
    final endDate = j['endDate'] as String? ?? '';
    final progress = _computeProgress(startDate, endDate);
    return SaTender(
      id: j['id'] as String? ?? '',
      tenderNumber: j['tenderNumber'] as String? ?? '',
      title: j['title'] as String? ?? '',
      status: j['status'] as String? ?? '',
      clientName: client?['name'] as String? ?? '',
      startDate: startDate,
      endDate: endDate,
      contractValue: _toDouble(j['contractValue']),
      progressPercent: progress,
    );
  }
}

/// Full detail for a single tender, including billing breakdown and work orders.
class SaTenderDetail {
  final SaTender tender;
  final double invoiced;
  final double collected;
  final double outstanding;
  final List<Map<String, dynamic>> workOrders; // id, woNumber, status
  final int deployedCount;

  const SaTenderDetail({
    required this.tender,
    required this.invoiced,
    required this.collected,
    required this.outstanding,
    required this.workOrders,
    required this.deployedCount,
  });

  factory SaTenderDetail.fromJson(Map<String, dynamic> j) {
    final billing = j['billing'] as Map<String, dynamic>?;
    final woRaw = j['workOrders'] as List?;
    final workOrders = woRaw
            ?.map((e) => e as Map<String, dynamic>)
            .map((e) => {
                  'id': e['id'],
                  'woNumber': e['woNumber'],
                  'status': e['status'],
                })
            .toList() ??
        <Map<String, dynamic>>[];

    return SaTenderDetail(
      tender: SaTender.fromJson(j),
      invoiced: _toDouble(billing?['invoiced'] ?? j['totalInvoiced']),
      collected: _toDouble(billing?['collected'] ?? j['totalCollected']),
      outstanding:
          _toDouble(billing?['outstanding'] ?? j['totalOutstanding']),
      workOrders: workOrders,
      deployedCount: _toInt(j['deployedCount']),
    );
  }
}

/// Overall billing summary for the SA billing screen.
class SaBillingSummary {
  final double totalBilled;
  final double collected;
  final double outstanding;
  final String collectionRatePercent; // e.g. "87%"

  const SaBillingSummary({
    required this.totalBilled,
    required this.collected,
    required this.outstanding,
    required this.collectionRatePercent,
  });

  factory SaBillingSummary.fromJson(Map<String, dynamic> j) {
    final billed = _toDouble(j['totalBilled']);
    final collected = _toDouble(j['collected']);
    final rate = billed > 0
        ? '${((collected / billed) * 100).round()}%'
        : j['collectionRatePercent'] as String? ?? '0%';
    return SaBillingSummary(
      totalBilled: billed,
      collected: collected,
      outstanding: _toDouble(j['outstanding']),
      collectionRatePercent: rate,
    );
  }
}

/// A single invoice in the SA billing / invoices list.
class SaInvoice {
  final String id;
  final String invoiceNumber;
  final String clientName;
  final String status;
  final String invoiceDate;
  final double amount;

  const SaInvoice({
    required this.id,
    required this.invoiceNumber,
    required this.clientName,
    required this.status,
    required this.invoiceDate,
    required this.amount,
  });

  factory SaInvoice.fromJson(Map<String, dynamic> j) {
    final client = j['client'] as Map<String, dynamic>?;
    return SaInvoice(
      id: j['id'] as String? ?? '',
      invoiceNumber: j['invoiceNumber'] as String? ?? '',
      clientName:
          client?['name'] as String? ?? j['clientName'] as String? ?? '',
      status: j['status'] as String? ?? '',
      invoiceDate: j['invoiceDate'] as String? ?? '',
      amount: _toDouble(j['amount'] ?? j['totalAmount']),
    );
  }
}

/// A client in the SA clients list.
class SaClient {
  final String id;
  final String name;
  final String type; // GOVERNMENT_DEPARTMENT | PSU | PRIVATE_ORGANIZATION
  final int activeTenders;
  final double outstandingBalance;

  const SaClient({
    required this.id,
    required this.name,
    required this.type,
    required this.activeTenders,
    required this.outstandingBalance,
  });

  factory SaClient.fromJson(Map<String, dynamic> j) => SaClient(
        id: j['id'] as String? ?? '',
        name: j['name'] as String? ?? '',
        type: j['type'] as String? ?? '',
        activeTenders: _toInt(j['activeTenders']),
        outstandingBalance: _toDouble(j['outstandingBalance']),
      );
}

/// An employee in the SA employees list (SA-level, all employees).
class SaEmployee {
  final String id;
  final String empCode;
  final String name;
  final String designation;
  final String department;
  final String siteName;
  final String status;

  const SaEmployee({
    required this.id,
    required this.empCode,
    required this.name,
    required this.designation,
    required this.department,
    required this.siteName,
    required this.status,
  });

  factory SaEmployee.fromJson(Map<String, dynamic> j) {
    final firstName = j['firstName'] as String? ?? '';
    final lastName = j['lastName'] as String? ?? '';
    final deployment = j['deployment'] as Map<String, dynamic>?;
    final site = deployment?['site'] as Map<String, dynamic>?;
    return SaEmployee(
      id: j['id'] as String? ?? '',
      empCode: j['employeeCode'] as String? ?? j['empCode'] as String? ?? '',
      name: '$firstName $lastName'.trim(),
      designation: j['designation'] as String? ?? '',
      department: j['department'] as String? ?? '',
      siteName: site?['name'] as String? ?? '-',
      status: j['status'] as String? ?? '',
    );
  }
}

/// A complaint / issue in the SA issues list.
class SaIssue {
  final String id;
  final String title;
  final String severity;
  final String status;
  final String siteName;
  final String reportedBy;
  final String createdAt;

  const SaIssue({
    required this.id,
    required this.title,
    required this.severity,
    required this.status,
    required this.siteName,
    required this.reportedBy,
    required this.createdAt,
  });

  factory SaIssue.fromJson(Map<String, dynamic> j) {
    final site = j['site'] as Map<String, dynamic>?;
    final reporter = j['reportedBy'] as Map<String, dynamic>?;
    return SaIssue(
      id: j['id'] as String? ?? '',
      title: j['title'] as String? ?? '',
      severity: j['severity'] as String? ?? 'LOW',
      status: j['status'] as String? ?? '',
      siteName: site?['name'] as String? ?? '-',
      reportedBy: reporter?['name'] as String? ?? 'Unknown',
      createdAt: j['createdAt'] as String? ?? '',
    );
  }
}

// ── INTERNAL HELPERS ─────────────────────────────────────────────────────────

int _toInt(dynamic v) {
  if (v == null) return 0;
  if (v is int) return v;
  if (v is double) return v.toInt();
  return int.tryParse(v.toString()) ?? 0;
}

double _toDouble(dynamic v) {
  if (v == null) return 0.0;
  if (v is double) return v;
  if (v is int) return v.toDouble();
  return double.tryParse(v.toString()) ?? 0.0;
}

/// Computes elapsed percentage of a date range, clamped to [0, 100].
double _computeProgress(String startDate, String endDate) {
  try {
    if (startDate.isEmpty || endDate.isEmpty) return 0.0;
    final start = DateTime.parse(startDate);
    final end = DateTime.parse(endDate);
    final now = DateTime.now();
    final total = end.difference(start).inDays;
    if (total <= 0) return 100.0;
    final passed = now.difference(start).inDays;
    return (passed / total * 100).clamp(0.0, 100.0);
  } catch (_) {
    return 0.0;
  }
}

// ── PROVIDERS ────────────────────────────────────────────────────────────────

/// Dashboard KPI summary.
/// GET /reports/summary
final saSummaryProvider =
    FutureProvider.autoDispose<SaSummary>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/reports/summary');
    return SaSummary.fromJson(_parseObject(res.data));
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load dashboard summary';
  }
});

/// All deployment sites.
/// GET /deployment/sites
final saSitesProvider =
    FutureProvider.autoDispose<List<SaSite>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/deployment/sites');
    return _parseList(res.data)
        .map(SaSite.fromJson)
        .toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load sites';
  }
});

/// Combined site detail: employees, complaints, activity logs, attendance.
/// Parallel: GET /deployment, /complaints, /activity-log, /attendance/site-today
final saSiteDetailProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, String>((ref, siteId) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final results = await Future.wait([
      dio.get('/deployment',
          queryParameters: {'siteId': siteId, 'include': 'employee'}),
      dio.get('/complaints',
          queryParameters: {'siteId': siteId, 'limit': '10'}),
      dio.get('/activity-log',
          queryParameters: {'siteId': siteId, 'limit': '10'}),
      dio.get('/attendance/site-today',
          queryParameters: {'siteId': siteId}),
    ]);
    return {
      'employees': _parseList(results[0].data),
      'complaints': _parseList(results[1].data),
      'activityLogs': _parseList(results[2].data),
      'attendance': _parseObject(results[3].data),
    };
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load site detail';
  }
});

/// Today's attendance for employees at a specific site, mapped to [SaSiteEmployee].
/// GET /attendance/site-today?siteId=siteId
final saSiteAttendanceProvider = FutureProvider.autoDispose
    .family<List<SaSiteEmployee>, String>((ref, siteId) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/attendance/site-today',
        queryParameters: {'siteId': siteId});
    return _parseList(res.data)
        .map(SaSiteEmployee.fromJson)
        .toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load site attendance';
  }
});

/// Full tenders list (SA view, up to 50).
/// GET /tenders?limit=50
final saTendersProvider =
    FutureProvider.autoDispose<List<SaTender>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res =
        await dio.get('/tenders', queryParameters: {'limit': '50'});
    return _parseList(res.data)
        .map(SaTender.fromJson)
        .toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load tenders';
  }
});

/// Detail for a single tender, including billing breakdown.
/// GET /tenders/:tenderId
final saTenderDetailProvider = FutureProvider.autoDispose
    .family<SaTenderDetail, String>((ref, tenderId) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/tenders/$tenderId');
    return SaTenderDetail.fromJson(_parseObject(res.data));
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load tender detail';
  }
});

/// Billing summary (totals, collection rate).
/// GET /billing/summary
final saBillingSummaryProvider =
    FutureProvider.autoDispose<SaBillingSummary>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/billing/summary');
    return SaBillingSummary.fromJson(_parseObject(res.data));
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load billing summary';
  }
});

/// Invoice list (SA view, up to 50).
/// Primary: GET /billing/invoices?limit=50
/// Fallback: GET /invoices?limit=50
final saInvoicesProvider =
    FutureProvider.autoDispose<List<SaInvoice>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio
        .get('/billing/invoices', queryParameters: {'limit': '50'});
    return _parseList(res.data)
        .map(SaInvoice.fromJson)
        .toList();
  } on DioException catch (_) {
    // Fallback endpoint
    try {
      final res = await dio
          .get('/invoices', queryParameters: {'limit': '50'});
      return _parseList(res.data)
          .map(SaInvoice.fromJson)
          .toList();
    } on DioException catch (e) {
      throw e.response?.data?['message'] as String? ??
          'Failed to load invoices';
    }
  }
});

/// All clients (SA view, up to 100).
/// GET /clients?limit=100
final saClientsProvider =
    FutureProvider.autoDispose<List<SaClient>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res =
        await dio.get('/clients', queryParameters: {'limit': '100'});
    return _parseList(res.data)
        .map(SaClient.fromJson)
        .toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load clients';
  }
});

/// All employees (SA view, up to 100, with deployment info).
/// GET /employees?limit=100&include=deployment
final saEmployeesProvider =
    FutureProvider.autoDispose<List<SaEmployee>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/employees',
        queryParameters: {'limit': '100', 'include': 'deployment'});
    return _parseList(res.data)
        .map(SaEmployee.fromJson)
        .toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load employees';
  }
});

/// All issues / complaints (SA view, up to 50).
/// GET /complaints?limit=50
final saIssuesProvider =
    FutureProvider.autoDispose<List<SaIssue>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio
        .get('/complaints', queryParameters: {'limit': '50'});
    return _parseList(res.data)
        .map(SaIssue.fromJson)
        .toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load issues';
  }
});

/// Recent complaints for dashboard (latest 5, sorted by createdAt desc).
/// GET /complaints?limit=5&sortBy=createdAt&sortOrder=desc
final saRecentComplaintsProvider =
    FutureProvider.autoDispose<List<SaSiteComplaint>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final res = await dio.get('/complaints', queryParameters: {
      'limit': '5',
      'sortBy': 'createdAt',
      'sortOrder': 'desc',
    });
    return _parseList(res.data)
        .map(SaSiteComplaint.fromJson)
        .toList();
  } on DioException catch (e) {
    throw e.response?.data?['message'] as String? ??
        'Failed to load recent complaints';
  }
});
