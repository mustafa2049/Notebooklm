import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import { booksByYear, buildYearReport, finishedBooks, hoursLabel, type FinishedBook } from '@/habit/yearReport';
import { useSettings } from '@/store/SettingsContext';
import { listDocumentsWithProgress } from '@/storage/documents';
import { listHighlights, type Highlight } from '@/storage/highlights';
import { listJournal } from '@/storage/journal';
import { listSessions, type ReadingSession } from '@/storage/stats';
import { formatNumber } from '@/ui/format';
import { Button, Card, IconButton, Screen, Txt } from '@/ui/primitives';
import { shareYearReport } from '@/ui/shareReport';

/**
 * Okuduğum kitaplar: bitirilenler yıl yıl, puan ve notlarıyla; her yıl için
 * paylaşılabilir "Okuma yılım" kartı.
 */

interface Snapshot {
  books: FinishedBook[];
  libraryIds: Set<string>;
  sessions: ReadingSession[];
  highlights: Highlight[];
}

export default function BooksScreen() {
  const router = useRouter();
  const { theme } = useSettings();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [shareState, setShareState] = useState<Record<number, string>>({});

  useFocusEffect(
    useCallback(() => {
      Promise.all([listJournal(), listDocumentsWithProgress(), listSessions(), listHighlights()]).then(
        ([journal, library, sessions, highlights]) =>
          setSnapshot({
            books: finishedBooks(journal, library),
            libraryIds: new Set(library.map((item) => item.meta.id)),
            sessions,
            highlights,
          })
      );
    }, [])
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/library'));

  const share = async (year: number) => {
    if (!snapshot) return;
    const report = buildYearReport({
      year,
      sessions: snapshot.sessions,
      books: snapshot.books,
      highlights: snapshot.highlights,
    });
    try {
      const result = await shareYearReport(report, {
        bg: theme.colors.bg,
        surface: theme.colors.surface,
        text: theme.colors.text,
        dim: theme.colors.textDim,
        accent: theme.colors.accent,
      });
      setShareState((current) => ({
        ...current,
        [year]: result === 'downloaded' ? 'Kart görsel olarak indirildi.' : '',
      }));
    } catch (error) {
      setShareState((current) => ({
        ...current,
        [year]: error instanceof Error ? error.message : 'Paylaşılamadı.',
      }));
    }
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -theme.space(2), marginBottom: theme.space(2) }}>
        <IconButton name="chevronLeft" onPress={back} accessibilityLabel="Geri" emphasis="strong" />
        <Txt variant="title" style={{ fontSize: 26 }}>
          Okuduğum kitaplar
        </Txt>
      </View>

      {snapshot === null ? null : snapshot.books.length === 0 ? (
        <Card style={{ gap: theme.space(3) }}>
          <Txt variant="heading">Henüz bitirilmiş kitap yok</Txt>
          <Txt variant="dim">
            Bir kitabı bitirince burada yıl yıl birikir. Kitap kartındaki "Bitirdim" ile puan ve kısa
            bir not da ekleyebilirsin.
          </Txt>
          <Button label="Kütüphaneye git" variant="secondary" onPress={() => router.replace('/library')} />
        </Card>
      ) : (
        <View style={{ gap: theme.space(6) }}>
          {booksByYear(snapshot.books).map(({ year, books }) => {
            const report = buildYearReport({
              year,
              sessions: snapshot.sessions,
              books: snapshot.books,
              highlights: snapshot.highlights,
            });
            return (
              <View key={year} style={{ gap: theme.space(2) }}>
                <Txt variant="heading">
                  {year} · {books.length} kitap · {hoursLabel(report.minutes)}
                </Txt>
                {books.map((book) => (
                  <Card
                    key={book.docId}
                    onPress={snapshot.libraryIds.has(book.docId) ? () => router.push(`/book/${book.docId}`) : undefined}
                    style={{ gap: theme.space(1) }}
                  >
                    <Txt variant="body" numberOfLines={2}>
                      {book.title}
                    </Txt>
                    <Txt variant="dim" style={{ fontSize: 12 }}>
                      {new Date(book.finishedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} ·{' '}
                      {formatNumber(book.wordCount)} kelime
                      {book.rating ? ' · ' : ''}
                      {book.rating ? (
                        <Txt variant="dim" style={{ fontSize: 12, color: theme.colors.accent }}>
                          {'★'.repeat(book.rating)}
                        </Txt>
                      ) : null}
                      {snapshot.libraryIds.has(book.docId) ? '' : ' · kütüphaneden silinmiş'}
                    </Txt>
                    {book.note ? (
                      <Txt variant="dim" style={{ fontSize: 13 }} numberOfLines={3}>
                        {book.note}
                      </Txt>
                    ) : null}
                  </Card>
                ))}
                <Button
                  label={Platform.OS === 'web' ? `${year} kartını görsel olarak indir` : `${year} kartını paylaş`}
                  icon="share"
                  variant="secondary"
                  onPress={() => void share(year)}
                />
                {shareState[year] ? (
                  <Txt variant="dim" style={{ fontSize: 12 }}>
                    {shareState[year]}
                  </Txt>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
