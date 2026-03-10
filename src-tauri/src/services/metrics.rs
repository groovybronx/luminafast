use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Instant;

/// Threadpool metrics snapshot
#[derive(Debug, Clone)]
pub struct ThreadpoolMetrics {
    /// Number of currently active tasks
    pub active_tasks: usize,
    /// Approximate queue depth (pending tasks)
    pub queue_depth: usize,
    /// Maximum configured threads
    pub max_threads: usize,
    /// Saturation percentage (0-100)
    pub saturation_percentage: f32,
    /// Timestamp of this metrics snapshot
    pub timestamp: Instant,
}

impl ThreadpoolMetrics {
    /// Create a new metrics snapshot
    pub fn new(active_tasks: usize, queue_depth: usize, max_threads: usize) -> Self {
        let total_capacity = max_threads;
        let saturation_percentage = if total_capacity > 0 {
            (active_tasks as f32 / total_capacity as f32) * 100.0
        } else {
            0.0
        };

        Self {
            active_tasks,
            queue_depth,
            max_threads,
            saturation_percentage,
            timestamp: Instant::now(),
        }
    }

    /// Check if threadpool is saturated (> threshold)
    pub fn is_saturated(&self, threshold: f32) -> bool {
        self.saturation_percentage > threshold
    }
}

/// Trait for collecting and monitoring threadpool metrics
pub trait MetricsCollector: Send + Sync {
    /// Record current threadpool metrics
    fn record_threadpool_metrics(&self, metrics: ThreadpoolMetrics);

    /// Check if threadpool saturation exceeds threshold (0-100)
    fn check_saturation(&self, threshold: f32) -> bool;

    /// Get latest metrics snapshot
    fn get_latest_metrics(&self) -> Option<ThreadpoolMetrics>;

    /// Reset metrics collection
    fn reset(&self);
}

/// Default implementation using atomic counters (low-overhead)
pub struct DefaultMetricsCollector {
    active_tasks: Arc<AtomicUsize>,
    queue_depth: Arc<AtomicUsize>,
    max_threads: usize,
}

impl DefaultMetricsCollector {
    /// Create a new default metrics collector
    pub fn new(max_threads: usize) -> Self {
        Self {
            active_tasks: Arc::new(AtomicUsize::new(0)),
            queue_depth: Arc::new(AtomicUsize::new(0)),
            max_threads,
        }
    }

    /// Increment active task counter (call when task starts)
    pub fn increment_active_tasks(&self) {
        self.active_tasks.fetch_add(1, Ordering::Relaxed);
    }

    /// Decrement active task counter (call when task completes)
    pub fn decrement_active_tasks(&self) {
        self.active_tasks.fetch_sub(1, Ordering::Relaxed);
    }

    /// Update queue depth estimate
    pub fn set_queue_depth(&self, depth: usize) {
        self.queue_depth.store(depth, Ordering::Relaxed);
    }

    /// Get current active task count
    pub fn get_active_tasks(&self) -> usize {
        self.active_tasks.load(Ordering::Relaxed)
    }

    /// Get current queue depth
    pub fn get_queue_depth(&self) -> usize {
        self.queue_depth.load(Ordering::Relaxed)
    }
}

impl MetricsCollector for DefaultMetricsCollector {
    fn record_threadpool_metrics(&self, _metrics: ThreadpoolMetrics) {
        // Default implementation: metrics already tracked via atomics
        // Can be extended to log/export metrics
    }

    fn check_saturation(&self, threshold: f32) -> bool {
        let active = self.get_active_tasks();
        let metrics = ThreadpoolMetrics::new(active, self.get_queue_depth(), self.max_threads);
        metrics.is_saturated(threshold)
    }

    fn get_latest_metrics(&self) -> Option<ThreadpoolMetrics> {
        let active = self.get_active_tasks();
        let queue_depth = self.get_queue_depth();
        Some(ThreadpoolMetrics::new(
            active,
            queue_depth,
            self.max_threads,
        ))
    }

    fn reset(&self) {
        self.active_tasks.store(0, Ordering::Relaxed);
        self.queue_depth.store(0, Ordering::Relaxed);
    }
}

/// RAII guard for tracking active tasks (automatically decrements on drop)
pub struct ActiveTaskGuard {
    collector: Arc<DefaultMetricsCollector>,
}

impl ActiveTaskGuard {
    /// Create a new task guard (increments active task count)
    pub fn new(collector: Arc<DefaultMetricsCollector>) -> Self {
        collector.increment_active_tasks();
        Self { collector }
    }
}

impl Drop for ActiveTaskGuard {
    fn drop(&mut self) {
        self.collector.decrement_active_tasks();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_creation() {
        let metrics = ThreadpoolMetrics::new(4, 2, 8);
        assert_eq!(metrics.active_tasks, 4);
        assert_eq!(metrics.queue_depth, 2);
        assert_eq!(metrics.max_threads, 8);
        assert!((metrics.saturation_percentage - 50.0).abs() < 0.1);
    }

    #[test]
    fn test_saturation_calculation() {
        // 5 of 8 threads = 62.5%
        let metrics = ThreadpoolMetrics::new(5, 0, 8);
        assert!((metrics.saturation_percentage - 62.5).abs() < 0.1);
        assert!(!metrics.is_saturated(80.0));
        assert!(metrics.is_saturated(50.0));
    }

    #[test]
    fn test_collector_increment_decrement() {
        let collector = DefaultMetricsCollector::new(8);
        assert_eq!(collector.get_active_tasks(), 0);

        collector.increment_active_tasks();
        assert_eq!(collector.get_active_tasks(), 1);

        collector.increment_active_tasks();
        assert_eq!(collector.get_active_tasks(), 2);

        collector.decrement_active_tasks();
        assert_eq!(collector.get_active_tasks(), 1);

        collector.decrement_active_tasks();
        assert_eq!(collector.get_active_tasks(), 0);
    }

    #[test]
    fn test_collector_queue_depth() {
        let collector = DefaultMetricsCollector::new(8);
        assert_eq!(collector.get_queue_depth(), 0);

        collector.set_queue_depth(5);
        assert_eq!(collector.get_queue_depth(), 5);

        collector.set_queue_depth(0);
        assert_eq!(collector.get_queue_depth(), 0);
    }

    #[test]
    fn test_collector_saturation_check() {
        let collector = DefaultMetricsCollector::new(8);
        assert!(!collector.check_saturation(80.0));

        // 7 of 8 = 87.5% saturation
        for _ in 0..7 {
            collector.increment_active_tasks();
        }

        assert!(collector.check_saturation(80.0));
        assert!(collector.check_saturation(50.0));
        assert!(!collector.check_saturation(90.0));
    }

    #[test]
    fn test_active_task_guard() {
        let collector = Arc::new(DefaultMetricsCollector::new(8));
        assert_eq!(collector.get_active_tasks(), 0);

        {
            let _guard = ActiveTaskGuard::new(Arc::clone(&collector));
            assert_eq!(collector.get_active_tasks(), 1);

            {
                let _guard2 = ActiveTaskGuard::new(Arc::clone(&collector));
                assert_eq!(collector.get_active_tasks(), 2);
            }
            // guard2 dropped, should decrement
            assert_eq!(collector.get_active_tasks(), 1);
        }
        // guard dropped, should decrement
        assert_eq!(collector.get_active_tasks(), 0);
    }

    #[test]
    fn test_metrics_collector_trait() {
        let collector = DefaultMetricsCollector::new(8);

        // Record some activity
        collector.increment_active_tasks();
        collector.set_queue_depth(2);

        // Check saturation through trait
        assert!(!collector.check_saturation(80.0));

        // Get latest metrics
        let metrics = collector.get_latest_metrics();
        assert!(metrics.is_some());
        if let Some(m) = metrics {
            assert_eq!(m.active_tasks, 1);
            assert_eq!(m.queue_depth, 2);
            assert_eq!(m.max_threads, 8);
        }

        // Reset
        collector.reset();
        assert_eq!(collector.get_active_tasks(), 0);
        assert_eq!(collector.get_queue_depth(), 0);
    }

    #[test]
    fn test_zero_max_threads_edge_case() {
        let metrics = ThreadpoolMetrics::new(0, 0, 0);
        assert_eq!(metrics.saturation_percentage, 0.0);
        assert!(!metrics.is_saturated(50.0));
    }

    #[test]
    fn test_full_saturation() {
        let metrics = ThreadpoolMetrics::new(8, 5, 8);
        assert!((metrics.saturation_percentage - 100.0).abs() < 0.1);
        assert!(metrics.is_saturated(80.0));
        assert!(metrics.is_saturated(99.0)); // 100% > 99% ✓
        assert!(!metrics.is_saturated(100.0)); // 100% not > 100% (use >= in production if needed)
    }
}
