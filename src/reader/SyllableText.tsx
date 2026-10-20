import React, { useMemo } from 'react';
import { Text } from 'react-native';
import { syllableRuns } from '@/core/syllableRuns';

/**
 * Metni hece renkleriyle yazar (bkz. `core/syllableRuns`): 2., 4. heceler
 * `color` renginde. Bir `Text` içinde kullanılır; yalnızca renk değiştiği için
 * satır kırılımı ve sayfalama aynı kalır.
 */
export const SyllableText = React.memo(function SyllableText({ text, color }: { text: string; color: string }) {
  const runs = useMemo(() => syllableRuns(text), [text]);
  return (
    <>
      {runs.map((run, index) =>
        run.alt ? (
          <Text key={index} style={{ color }}>
            {run.text}
          </Text>
        ) : (
          <React.Fragment key={index}>{run.text}</React.Fragment>
        )
      )}
    </>
  );
});
