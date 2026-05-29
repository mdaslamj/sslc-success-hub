type Props = {
  compact?: boolean;
};

export default function ImageQualityGuide({ compact = false }: Props) {
  return (
    <div
      className={
        compact
          ? "rounded-xl border border-white/[0.06] bg-[#0F0F18] px-3 py-2.5 text-xs text-white/70"
          : "rounded-2xl border border-white/[0.06] bg-[#0F0F18] px-4 py-3 text-sm text-white/75"
      }
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <p className="font-semibold text-white/90">Quick photo tips</p>
      <ul className="mt-2 space-y-1.5">
        <li>📱 Hold the phone steady, directly above the page</li>
        <li>💡 Use bright light — avoid shadows on the writing</li>
        <li>📄 Capture the full page including all four edges</li>
      </ul>
    </div>
  );
}
