import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Hero({
  title,
  subtitle,
  pill
}: {
  title: string;
  subtitle: string;
  pill?: string;
}) {
  return (
    <header className="hero">
      <div className="banner" />
      <div className="hero-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {pill && <span className="event-pill">{pill}</span>}
      </div>
    </header>
  );
}

export function Panel({
  title,
  eyebrow,
  action,
  children,
  className
}: {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("panel", className)}>
      {(title || eyebrow || action) && (
        <div className="panel-heading">
          <div>
            {eyebrow && <span className="eyebrow-text">{eyebrow}</span>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "default" | "small";
};

export function Button({
  variant = "secondary",
  size = "default",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={cx("button", variant, size === "small" && "small", className)} type="button" {...props}>
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <article className={cx("summary-card", tone === "warning" && "warning", tone === "success" && "success")}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function SyncBadge({ status }: { status: "pending" | "synced" | "sheet_sync_failed" }) {
  const label = status === "synced" ? "Synced" : status === "sheet_sync_failed" ? "Sheet Sync Failed" : "Pending";
  const tone = status === "synced" ? "ready" : status === "sheet_sync_failed" ? "blocked" : "watch";
  return <span className={cx("status-badge", tone)}>{label}</span>;
}
