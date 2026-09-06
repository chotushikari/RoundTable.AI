type RoundTableLoadingScreenProps = {
  label?: string;
  overlay?: boolean;
};

export function RoundTableLoadingScreen({ label = 'Preparing your experience', overlay = false }: RoundTableLoadingScreenProps) {
  return (
    <div className={`roundtable-loading ${overlay ? 'roundtable-loading--overlay' : ''}`} role="status" aria-live="polite">
      <div className="roundtable-loading__brand"><i /> RoundTable AI</div>
      <div className="roundtable-loading__mark" aria-hidden="true"><span /><span /><span /></div>
      <div className="roundtable-loading__copy"><strong>{label}</strong><span>Secure voice session · Powered by Agora</span></div>
      <div className="roundtable-loading__bar" aria-hidden="true"><i /></div>
    </div>
  );
}
