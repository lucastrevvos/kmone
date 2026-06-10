import { X } from "lucide-react";
import type { ReactNode } from "react";

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
};
export function Modal({ children, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[var(--border-soft)] bg-[radial-gradient(circle_at_top,rgba(32,242,122,0.12),transparent_34%),#081923] p-5 text-[var(--text-main)] shadow-[0_28px_90px_rgba(0,0,0,0.58)] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[var(--text-muted)] transition hover:border-[var(--border-soft)] hover:bg-[var(--green-main)] hover:text-[#02100A]"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="max-h-[78vh] overflow-y-auto pr-2 text-[var(--text-muted)] [scrollbar-color:rgba(32,242,122,0.5)_rgba(255,255,255,0.08)] [&_a]:text-[var(--green-main)] [&_h2]:pr-10 [&_h2]:text-white [&_h3]:text-white [&_li]:leading-7 [&_p]:leading-7 [&_.text-gray-500]:text-[var(--text-muted)] [&_.underline]:text-[var(--green-main)]">
          {children}
        </div>
      </div>
    </div>
  );
}
