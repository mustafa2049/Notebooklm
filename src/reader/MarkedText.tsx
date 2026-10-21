import React from 'react';
import { Text, type TextStyle } from 'react-native';
import { SyllableText } from './SyllableText';

/** Çizilen metinde işaretli aralıklar, `[başlangıç, bitiş)` (bkz. `core/vocabMarks`) */
export type MarkRanges = readonly (readonly [number, number])[];

/**
 * Metni hece renkleri ve defter işaretleriyle yazar. Bir `Text` içinde
 * kullanılır; yalnızca renk ve alt çizgi değiştiği için satır kırılımı ve
 * sayfalama aynı kalır.
 */
export const MarkedText = React.memo(function MarkedText({
  text,
  marks,
  markStyle,
  syllableColor,
}: {
  text: string;
  marks?: MarkRanges;
  markStyle?: TextStyle;
  syllableColor: string | null;
}) {
  const plain = (value: string) => (syllableColor ? <SyllableText text={value} color={syllableColor} /> : value);
  if (!marks?.length || !markStyle) return <>{plain(text)}</>;
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  marks.forEach(([start, end], index) => {
    if (start < cursor || end <= start) return;
    if (start > cursor) nodes.push(<React.Fragment key={`p${index}`}>{plain(text.slice(cursor, start))}</React.Fragment>);
    nodes.push(
      <Text key={`m${index}`} style={markStyle}>
        {plain(text.slice(start, end))}
      </Text>
    );
    cursor = end;
  });
  if (cursor < text.length) nodes.push(<React.Fragment key="end">{plain(text.slice(cursor))}</React.Fragment>);
  return <>{nodes}</>;
});

/**
 * Defter işaretinin biçimi: vurgu renginde noktalı alt çizgi. Android çizginin
 * rengini ve biçimini desteklemiyor; orada yazı renginde düz çizgi olur.
 */
export function vocabMarkStyle(color: string): TextStyle {
  return { textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: color };
}
