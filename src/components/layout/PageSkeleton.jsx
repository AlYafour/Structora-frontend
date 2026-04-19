/**
 * PageSkeleton - Shimmer loading placeholder shown during page navigation
 * Appears only in the content area while sidebar/topbar remain visible
 */
export default function PageSkeleton() {
  return (
    <div className="page-skeleton">
      {/* Header bar skeleton */}
      <div className="page-skeleton__bar">
        <div className="page-skeleton__block page-skeleton__block--sm" />
        <div className="page-skeleton__spacer" />
        <div className="page-skeleton__block page-skeleton__block--btn" />
      </div>

      {/* Content area skeletons */}
      <div className="page-skeleton__body">
        <div className="page-skeleton__card">
          <div className="page-skeleton__block page-skeleton__block--title" />
          <div className="page-skeleton__row">
            <div className="page-skeleton__block page-skeleton__block--md" />
            <div className="page-skeleton__block page-skeleton__block--md" />
            <div className="page-skeleton__block page-skeleton__block--md" />
          </div>
          <div className="page-skeleton__block page-skeleton__block--lg" />
          <div className="page-skeleton__block page-skeleton__block--full" />
          <div className="page-skeleton__block page-skeleton__block--full" />
          <div className="page-skeleton__block page-skeleton__block--three-quarter" />
        </div>
      </div>
    </div>
  );
}
