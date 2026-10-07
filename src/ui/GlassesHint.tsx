/** Numaralı gözlük kullananlara egzersiz öncesi hatırlatma. */
export function GlassesHint({ show, anaglyph }: { show: boolean | undefined; anaglyph: boolean }) {
  if (!show) return null;
  return (
    <div className="banner small" data-testid="glasses-hint">
      👓{' '}
      {anaglyph
        ? 'Numaralı gözlüğünü tak; kırmızı-mavi gözlüğü onun üzerine tak.'
        : 'Numaralı gözlüğünü tak; bandı gözlüğün altına, doğrudan göze yapıştır.'}
    </div>
  );
}
