"use client";

import { X, ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ArchNode } from "@/content/schemas";

type Props = {
  node: ArchNode | null;
  onClose: () => void;
};

export function ArchitectureDrawer({ node, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (node && !dlg.open) dlg.showModal();
    if (!node && dlg.open) dlg.close();
  }, [node]);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    const handleClose = () => onClose();
    dlg.addEventListener("cancel", handleCancel);
    dlg.addEventListener("close", handleClose);
    return () => {
      dlg.removeEventListener("cancel", handleCancel);
      dlg.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  const onBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      onClick={onBackdropClick}
      className="arch-drawer fixed inset-0 m-0 h-dvh w-full max-w-md ml-auto bg-bg text-fg border-l border-line p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {node && (
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <p className="font-display text-[11px] uppercase tracking-[0.18em] text-fg-3">
                {node.kind === "external-old" ? "legacy" : node.kind}
              </p>
              <h2 className="mt-1 font-display text-h3 text-fg leading-tight">
                {node.label}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-2 text-fg-2 transition-colors hover:border-accent hover:text-accent"
            >
              <X size={16} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {node.detail?.role && (
              <Field label="Role">{node.detail.role}</Field>
            )}
            {node.detail?.scale && (
              <Field label="Scale">{node.detail.scale}</Field>
            )}
            {node.detail?.why && (
              <Field label="Why this choice">
                <p className="leading-relaxed">{node.detail.why}</p>
              </Field>
            )}
            {node.detail?.links && node.detail.links.length > 0 && (
              <Field label="Links">
                <ul className="space-y-2">
                  {node.detail.links.map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1.5 text-accent hover:underline"
                      >
                        {l.label}
                        <ArrowUpRight
                          size={13}
                          className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </Field>
            )}
            {!node.detail && (
              <p className="text-fg-3 text-sm">No additional notes for this node.</p>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-display text-[11px] uppercase tracking-[0.18em] text-fg-3">
        {label}
      </p>
      <div className="mt-2 text-fg-2 text-sm">{children}</div>
    </div>
  );
}
