import styles from './LoadingState.module.css';

export function LoadingSkeleton() {
  return (
    <div className={styles.wrapper} role="status" aria-label="Loading Bible study answer…">
      <div className={`skeleton ${styles.skeletonSummary}`} />
      <div className={styles.skeletonTabBar}>
        {[160, 140, 155, 160, 175].map((w, i) => (
          <div key={i} className={`skeleton ${styles.skeletonTab}`} style={{ maxWidth: w }} />
        ))}
      </div>
      <div className={`skeleton ${styles.skeletonPanel}`} />
      <p className={styles.statusText}>
        <span className={styles.statusDot} aria-hidden="true" />
        Studying scripture across 5 dimensions…
      </p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.error} role="alert" aria-live="assertive">
      <div className={styles.errorTitle}>⚠ Something went wrong</div>
      <p>{message}</p>
      {onRetry && (
        <button className={styles.retryBtn} onClick={onRetry} type="button">
          ↺ Try again
        </button>
      )}
    </div>
  );
}
