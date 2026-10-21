import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../data/demo_product.dart';
import '../database/sales_database.dart';
import '../models/sale_record.dart';
import '../services/billing_service.dart';
import '../services/server_reachability.dart';
import '../services/sync_service.dart';

class BillingScreen extends StatefulWidget {
  const BillingScreen({
    super.key,
    required this.database,
    required this.billingService,
    required this.syncService,
    required this.reachability,
    this.watchConnectivity = true,
    this.periodicSync,
  });

  final SalesDatabase database;
  final BillingService billingService;
  final SyncService syncService;
  final ServerReachability reachability;
  final bool watchConnectivity;
  final Duration? periodicSync;

  @override
  State<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends State<BillingScreen>
    with WidgetsBindingObserver {
  static final DateFormat _timeFormat = DateFormat('yyyy-MM-dd HH:mm:ss');

  final List<SaleRecord> _sales = [];
  int _quantity = 1;
  bool? _online;
  bool _saving = false;
  bool _syncInProgress = false;
  String? _message;
  Timer? _timer;
  StreamSubscription<List<ConnectivityResult>>? _connectivity;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (widget.watchConnectivity) {
      _connectivity = Connectivity().onConnectivityChanged.listen((_) {
        _sync();
      });
    }
    final period = widget.periodicSync;
    if (period != null) {
      _timer = Timer.periodic(period, (_) => _sync());
    }
    _boot();
  }

  Future<void> _boot() async {
    await _reload();
    await _sync();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _sync();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    _connectivity?.cancel();
    super.dispose();
  }

  Future<void> _reload() async {
    final sales = await widget.database.listSales();
    if (!mounted) {
      return;
    }
    setState(() {
      _sales
        ..clear()
        ..addAll(sales);
    });
  }

  Future<SyncReport> _sync({bool force = false}) async {
    if (_syncInProgress) {
      return SyncReport(
        apiReachable: _online ?? false,
        synced: 0,
        failed: 0,
        busy: true,
      );
    }
    setState(() => _syncInProgress = true);
    try {
      final report = await widget.syncService.syncPending(force: force);
      await _reload();
      if (mounted && !report.busy) {
        setState(() => _online = report.apiReachable);
      }
      return report;
    } finally {
      if (mounted) {
        setState(() => _syncInProgress = false);
      }
    }
  }

  Future<void> _generate() async {
    if (_saving) {
      return;
    }
    setState(() => _saving = true);
    try {
      final sale = await widget.billingService.generateBill(
        quantity: _quantity,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _message = 'Bill saved locally — waiting to sync';
      });
      await _reload();
      final report = await _sync(force: true);
      if (!mounted) {
        return;
      }
      final matches = _sales.where((item) => item.saleUuid == sale.saleUuid);
      if (matches.isEmpty) {
        setState(() {
          _message = 'Could not save the bill locally. Nothing was recorded.';
        });
        return;
      }
      if (matches.first.syncStatus == 'synced') {
        setState(() => _message = 'Bill saved locally and synchronized');
      } else if (!report.apiReachable) {
        setState(() => _message = 'Bill saved locally — waiting to sync');
      }
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _message = 'Could not save the bill locally. Nothing was recorded.';
      });
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _syncNow() async {
    final report = await _sync(force: true);
    if (!mounted || report.busy) {
      return;
    }
    setState(() {
      if (!report.apiReachable) {
        _message = 'API unreachable. Bills stay saved on this device.';
      } else if (report.failed > 0) {
        _message =
            'Some bills could not be synchronized. They remain on this device.';
      } else if (report.synced > 0) {
        _message = 'Synchronization finished.';
      } else {
        _message = 'No bills are waiting to sync.';
      }
    });
  }

  int get _pendingCount => _sales.where((sale) => !sale.isSynced).length;

  String get _syncLabel {
    if (_syncInProgress) {
      return 'Syncing';
    }
    if (_sales.any((sale) => sale.syncStatus == 'failed')) {
      return 'Sync Failed';
    }
    if (_pendingCount > 0) {
      return 'Pending Sync';
    }
    return 'Synced';
  }

  String? get _latestError {
    for (final sale in _sales) {
      if (sale.syncStatus == 'failed' &&
          sale.lastSyncError != null &&
          sale.lastSyncError!.isNotEmpty) {
        return sale.lastSyncError;
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final total = DemoProduct.totalAmount(_quantity);
    final network = _online == null
        ? 'Checking the API...'
        : _online!
        ? 'Online — API reachable'
        : 'Offline — API unreachable';

    return Scaffold(
      appBar: AppBar(title: const Text('Offline Billing Demo')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 880),
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                  sliver: SliverToBoxAdapter(
                    child: _StatusCard(
                      network: network,
                      syncLabel: _syncLabel,
                      pendingCount: _pendingCount,
                      error: _syncLabel == 'Sync Failed' ? _latestError : null,
                      syncing: _syncInProgress,
                      onSyncNow: _syncInProgress ? null : _syncNow,
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverToBoxAdapter(
                    child: _ProductCard(
                      quantity: _quantity,
                      total: total,
                      saving: _saving,
                      onMinus: _quantity > 1
                          ? () => setState(() => _quantity -= 1)
                          : null,
                      onPlus: _quantity < 100000
                          ? () => setState(() => _quantity += 1)
                          : null,
                      onGenerate: _saving ? null : _generate,
                    ),
                  ),
                ),
                if (_message != null)
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverToBoxAdapter(
                      child: Text(
                        _message!,
                        key: const Key('status-message'),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                  ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
                  sliver: SliverToBoxAdapter(
                    child: Text(
                      'Demo bills',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                ),
                if (_sales.isEmpty)
                  const SliverPadding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverToBoxAdapter(
                      child: Text(
                        'No bills yet. Generated bills stay on this device until the API confirms them.',
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    sliver: SliverList.separated(
                      itemCount: _sales.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        return _BillTile(
                          sale: _sales[index],
                          timeFormat: _timeFormat,
                        );
                      },
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

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.network,
    required this.syncLabel,
    required this.pendingCount,
    required this.error,
    required this.syncing,
    required this.onSyncNow,
  });

  final String network;
  final String syncLabel;
  final int pendingCount;
  final String? error;
  final bool syncing;
  final VoidCallback? onSyncNow;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(
                  key: const Key('network-status'),
                  avatar: Icon(
                    network.startsWith('Online')
                        ? Icons.cloud_done
                        : Icons.cloud_off,
                    size: 18,
                  ),
                  label: Text(network),
                ),
                Chip(
                  key: const Key('sync-status'),
                  avatar: Icon(
                    syncing ? Icons.sync : Icons.receipt_long,
                    size: 18,
                  ),
                  label: Text(syncLabel),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Pending sync: $pendingCount',
              key: const Key('pending-count'),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            if (error != null) ...[
              const SizedBox(height: 8),
              Text(
                error!,
                key: const Key('sync-error'),
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: 12),
            OutlinedButton.icon(
              key: const Key('sync-now'),
              onPressed: onSyncNow,
              icon: const Icon(Icons.sync),
              label: const Text('Sync Now'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({
    required this.quantity,
    required this.total,
    required this.saving,
    required this.onMinus,
    required this.onPlus,
    required this.onGenerate,
  });

  final int quantity;
  final String total;
  final bool saving;
  final VoidCallback? onMinus;
  final VoidCallback? onPlus;
  final VoidCallback? onGenerate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(DemoProduct.name, style: theme.textTheme.headlineSmall),
            const SizedBox(height: 4),
            Text('Product ID ${DemoProduct.id}'),
            Text('Price ${DemoProduct.formatRupees(DemoProduct.unitPrice)}'),
            Text('Initial stock: ${DemoProduct.initialStock}'),
            const SizedBox(height: 16),
            Row(
              children: [
                const Text('Quantity'),
                const Spacer(),
                IconButton(
                  key: const Key('quantity-minus'),
                  onPressed: onMinus,
                  icon: const Icon(Icons.remove),
                  tooltip: 'Decrease quantity',
                ),
                Text(
                  '$quantity',
                  key: const Key('quantity-value'),
                  style: theme.textTheme.headlineSmall,
                ),
                IconButton(
                  key: const Key('quantity-plus'),
                  onPressed: onPlus,
                  icon: const Icon(Icons.add),
                  tooltip: 'Increase quantity',
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Total ${DemoProduct.formatRupees(total)}',
              key: const Key('bill-total'),
              style: theme.textTheme.headlineMedium,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                key: const Key('generate-bill'),
                onPressed: onGenerate,
                icon: const Icon(Icons.receipt),
                label: Text(saving ? 'Saving...' : 'Generate Bill'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BillTile extends StatelessWidget {
  const _BillTile({required this.sale, required this.timeFormat});

  final SaleRecord sale;
  final DateFormat timeFormat;

  @override
  Widget build(BuildContext context) {
    final status = switch (sale.syncStatus) {
      'pending' => 'Pending',
      'syncing' => 'Syncing',
      'synced' => 'Synced',
      'failed' => 'Failed',
      _ => sale.syncStatus,
    };
    final color = switch (sale.syncStatus) {
      'synced' => Colors.green.shade800,
      'failed' => Theme.of(context).colorScheme.error,
      'syncing' => Colors.blue.shade800,
      _ => Colors.orange.shade900,
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SelectableText(sale.saleUuid),
            const SizedBox(height: 4),
            Text(
              'Qty ${sale.quantity} · ${DemoProduct.formatRupees(sale.totalAmount)} · ${timeFormat.format(sale.createdAt.toLocal())}',
            ),
            const SizedBox(height: 4),
            Text(
              status,
              key: Key('bill-status-${sale.saleUuid}'),
              style: TextStyle(color: color, fontWeight: FontWeight.w600),
            ),
            if (sale.syncStatus == 'failed' && sale.lastSyncError != null)
              Text(sale.lastSyncError!),
          ],
        ),
      ),
    );
  }
}
