/**
 * BrandedLoader - Loading component with unified logo.
 * Uses BrandLogo (auto mode) — shows tenant logo or STRUCTORA based on user context.
 */
import BrandLogo from "./BrandLogo";

export default function BrandedLoader({ size = 80, className = "" }) {
  return (
    <div className={`branded-loader ${className}`}>
      <div className="branded-loader__container">
        <div className="branded-loader__logo-wrapper">
          <BrandLogo type="auto" size={size} className="branded-loader__logo" />
        </div>
      </div>
    </div>
  );
}
