import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { finishEstimateDays } from '@/habit/books';
import { bookStats } from '@/habit/bookStats';
import { useSettings } from '@/store/SettingsContext';
import { listAssessments } from '@/storage/assessments';
import { bookmarksForDoc, removeBookmarks, type Bookmark } from '@/storage/bookmarks';
import {
  getDocument,
  loadProgress,
  saveProgress,
  SOURCE_LABEL,
  type DocumentMeta,
  type DocumentProgress,
} from '@/storage/documents';
import { highlightsForDoc, type Highlight } from '@/storage/highlights';
import { journalFor, saveJournal } from '@/storage/journal';
import { listRecalls, type Recall } from '@/storage/recalls';
import { listSessions, type ReadingSession } from '@/storage/stats';
import { listVocab, type VocabEntry } from '@/storage/vocab';
import { naturalWpm } from '@/train/assessment';
import { formatDuration, formatNumber, formatPercent, formatShortDuration } from '@/ui/format';
import { PlanSection } from '@/ui/PlanSection';
import { Button, Card, Chip, Field, IconButton, ProgressBar, Screen, SectionHeader, Txt } from '@/ui/primitives';
import { fontStyle } from '@/ui/theme';

/**
 * Kitap kartı: bir kitapla ilgili her şey tek yerde — ilerleme, harcanan
 * süre, kendi hızın, bitirme planı, bölümler, yer imleri, alıntılar,
 * özetlerin ve bu kitaptan kaydettiğin kelimeler.
 */

interface Snapshot {
  meta: DocumentMeta;
  progress: DocumentProgress | null;
  sessions: ReadingSession[];
  wpm: number;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  recalls: Recall[];
  vocab: VocabEntry[];
}

const LIST_LIMIT = 8;

function formatDate(at: number): string {
  return new Date(at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useSettings();
  const [snapshot, setSnapshot] = useState<Snapshot | null | undefined>(undefined);
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([
      getDocument(id),
      loadProgress(id),
      listSessions(),
      listAssessments(),
      bookmarksForDoc(id),
      highlightsForDoc(id),
      listRecalls(),
      listVocab(),
    ]).then(([meta, progress, sessions, assessments, bookmarks, highlights, recalls, vocab]) => {
      if (!meta) {
        setSnapshot(null);
        return;
      }
      setSnapshot({
        meta,
        progress,
        sessions,
        wpm: naturalWpm(assessments),
        bookmarks,
        highlights: [...highlights].sort((a, b) => a.charOffset - b.charOffset),
        recalls: recalls.filter((item) => item.docId === id),
        vocab: vocab.filter((item) => item.docId === id),
      });
    });
  }, [id]);
  // Okuyucudan dönünce ilerleme ve listeler güncel olsun
  useFocusEffect(load);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/library'));
  const open = (offset?: number) =>
    router.push(offset === undefined ? `/reader/${id}` : `/reader/${id}?konum=${offset}`);

  if (snapshot === undefined) return <Screen />;
  if (snapshot === null) {
    return (
      <Screen>
        <Header onBack={back} />
        <Card style={{ gap: theme.space(3) }}>
          <Txt variant="heading">Kitap bulunamadı</Txt>
          <Txt variant="dim">Kütüphaneden silinmiş olabilir.</Txt>
          <Button label="Kütüphaneye dön" variant="secondary" onPress={() => router.replace('/library')} />
        </Card>
      </Screen>
    );
  }

  const { meta, progress, sessions, wpm } = snapshot;
  const ratio = progress?.ratio ?? 0;
  const finished = Boolean(progress?.finished);
  const readWords = Math.round(meta.wordCount * ratio);
  const remainingWords = Math.max(0, meta.wordCount - readWords);
  const stats = bookStats(sessions, meta.id);
  const estimateDays = finishEstimateDays(remainingWords, sessions, Date.now());
  const limited = <T,>(key: string, items: T[]) => (showAll[key] ? items : items.slice(0, LIST_LIMIT));
  const more = (key: string, count: number) =>
    count > LIST_LIMIT && !showAll[key] ? (
      <Txt
        variant="dim"
        style={{ color: theme.colors.accent, fontSize: 13 }}
        onPress={() => setShowAll((current) => ({ ...current, [key]: true }))}
      >
        Tümünü göster ({count})
      </Txt>
    ) : null;

  return (
    <Screen>
      <Header onBack={back} />
      <Txt variant="title" style={{ fontSize: 26 }}>
        {meta.title}
      </Txt>
      <Txt variant="dim" style={{ marginTop: theme.space(1), fontSize: 13 }}>
        {SOURCE_LABEL[meta.source]} · {formatNumber(meta.wordCount)} kelime · {formatDate(meta.createdAt)} eklendi
      </Txt>

      <Card style={{ gap: theme.space(3), marginTop: theme.space(4) }}>
        <ProgressBar ratio={ratio} />
        <Txt variant="dim" style={{ fontSize: 13 }}>
          {finished
            ? progress?.finishedAt
              ? `${formatDate(progress.finishedAt)} günü bitirdin.`
              : 'Bitirdin.'
            : ratio > 0.001
              ? `${formatPercent(ratio)} okundu · kalan ${formatNumber(remainingWords)} kelime, doğal hızınla ~${formatShortDuration((remainingWords / wpm) * 60000)}`
              : `Henüz başlamadın · doğal hızınla ~${formatShortDuration((meta.wordCount / wpm) * 60000)}`}
        </Txt>
        <Button
          label={finished ? 'Baştan oku' : ratio > 0.001 ? 'Okumaya devam' : 'Okumaya başla'}
          icon="play"
          onPress={() => open(finished ? 0 : undefined)}
        />
        {!finished ? (
          <Button
            label="Bitirdim"
            icon="check"
            variant="secondary"
            onPress={() => {
              const now = Date.now();
              // Kâğıttan ya da başka yerde bitirilen kitap da günlüğe girebilsin
              void saveProgress(meta.id, {
                charOffset: meta.charCount,
                ratio: 1,
                updatedAt: now,
                finished: true,
                finishedAt: now,
              }).then(load);
            }}
          />
        ) : null}
      </Card>

      {finished ? (
        <>
          <SectionHeader title="Okuma günlüğü" />
          <Card>
            <JournalSection meta={meta} finishedAt={progress?.finishedAt ?? Date.now()} />
          </Card>
          <Txt
            variant="dim"
            style={{ color: theme.colors.accent, fontSize: 13, marginTop: theme.space(2) }}
            onPress={() => router.push('/books')}
          >
            Okuduğum kitaplar ›
          </Txt>
        </>
      ) : null}

      <SectionHeader title="Okuma" />
      <Card style={{ gap: theme.space(2) }}>
        {stats.sessions === 0 ? (
          <Txt variant="dim">Bu kitapla henüz okuma kaydı yok.</Txt>
        ) : (
          <>
            <Row label="Harcanan süre" value={formatDuration(stats.totalMs)} />
            <Row label="Okuduğun gün" value={`${stats.days} gün · ${stats.sessions} oturum`} />
            {stats.firstAt ? <Row label="İlk okuma" value={formatDate(stats.firstAt)} /> : null}
            {stats.lastAt ? <Row label="Son okuma" value={formatDate(stats.lastAt)} /> : null}
            <Row
              label="Bu kitaptaki hızın"
              value={stats.ownWpm ? `${stats.ownWpm} kelime/dk (Sayfa modu)` : 'Sayfa modunda okuyunca çıkar'}
            />
            {!finished && estimateDays ? (
              <Row
                label="Bu tempoyla"
                value={estimateDays === 1 ? 'bir okuma gününde biter' : `~${estimateDays} okuma gününde biter`}
              />
            ) : null}
          </>
        )}
      </Card>

      <SectionHeader title="Bitirme planı" />
      <Card>
        <PlanSection
          docId={meta.id}
          wordCount={meta.wordCount}
          readWords={readWords}
          finished={finished}
          sessions={sessions}
          wpm={wpm}
        />
      </Card>

      {meta.chapters?.length ? (
        <>
          <SectionHeader title={`Bölümler (${meta.chapters.length})`} />
          <View style={{ gap: theme.space(2) }}>
            {limited('chapters', meta.chapters).map((chapter, index) => (
              <Card key={`${chapter.charOffset}-${index}`} onPress={() => open(chapter.charOffset)}>
                <Txt variant="body" numberOfLines={2}>
                  {index + 1}. {chapter.title}
                </Txt>
                <Txt variant="dim" style={{ fontSize: 12, marginTop: 2 }}>
                  %{Math.round((chapter.charOffset / Math.max(1, meta.charCount)) * 100)}
                  {chapter.charOffset <= (progress?.charOffset ?? -1) ? ' · okundu' : ''}
                </Txt>
              </Card>
            ))}
            {more('chapters', meta.chapters.length)}
          </View>
        </>
      ) : null}

      <SectionHeader title={`Yer imleri${snapshot.bookmarks.length ? ` (${snapshot.bookmarks.length})` : ''}`} />
      {snapshot.bookmarks.length === 0 ? (
        <Txt variant="dim">Okurken başlıktaki yer imi düğmesiyle dönmek istediğin yerleri işaretle.</Txt>
      ) : (
        <View style={{ gap: theme.space(2) }}>
          {limited('bookmarks', snapshot.bookmarks).map((bookmark) => (
            <Card key={bookmark.id} onPress={() => open(bookmark.charOffset)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="body" numberOfLines={2} style={{ fontSize: 14 }}>
                    {bookmark.excerpt || '…'}
                  </Txt>
                  <Txt variant="dim" style={{ fontSize: 12, marginTop: 2 }}>
                    %{Math.round((bookmark.charOffset / Math.max(1, meta.charCount)) * 100)}
                  </Txt>
                </View>
                <IconButton
                  name="trash"
                  size={18}
                  emphasis="faint"
                  accessibilityLabel="Yer imini sil"
                  onPress={() => void removeBookmarks([bookmark.id]).then(load)}
                />
              </View>
            </Card>
          ))}
          {more('bookmarks', snapshot.bookmarks.length)}
        </View>
      )}

      <SectionHeader title={`Alıntılar${snapshot.highlights.length ? ` (${snapshot.highlights.length})` : ''}`} />
      {snapshot.highlights.length === 0 ? (
        <Txt variant="dim">Okurken önemli bir cümlede ekrana uzun bas ve "Alıntı"dan kaydet.</Txt>
      ) : (
        <View style={{ gap: theme.space(2) }}>
          {limited('highlights', snapshot.highlights).map((item) => (
            <Card
              key={item.id}
              onPress={() => open(item.charOffset)}
              style={{ borderLeftWidth: 3, borderLeftColor: theme.colors.accent, gap: theme.space(1) }}
            >
              <Txt variant="body" style={{ fontSize: 14 }}>
                {item.sentence}
              </Txt>
              {item.note ? (
                <Txt variant="dim" style={{ fontSize: 13 }}>
                  Notun: {item.note}
                </Txt>
              ) : null}
            </Card>
          ))}
          {more('highlights', snapshot.highlights.length)}
        </View>
      )}

      {snapshot.recalls.length ? (
        <>
          <SectionHeader title={`Özetlerin (${snapshot.recalls.length})`} />
          <View style={{ gap: theme.space(2) }}>
            {limited('recalls', snapshot.recalls).map((recall) => (
              <Card key={recall.id} style={{ gap: theme.space(1) }}>
                <Txt variant="body" style={{ fontSize: 14 }}>
                  {recall.text}
                </Txt>
                <Txt variant="dim" style={{ fontSize: 12 }}>
                  {formatDate(recall.at)}
                </Txt>
              </Card>
            ))}
            {more('recalls', snapshot.recalls.length)}
          </View>
        </>
      ) : null}

      {snapshot.vocab.length ? (
        <>
          <SectionHeader title={`Bu kitaptan kelimeler (${snapshot.vocab.length})`} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
            {snapshot.vocab.map((entry) => (
              <Chip key={entry.id} label={entry.word} active={false} onPress={() => router.push('/vocab')} />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

/** Bitirilen kitaba puan (1–5) ve kısa not: "Okuduğum kitaplar"da görünür. */
function JournalSection({ meta, finishedAt }: { meta: DocumentMeta; finishedAt: number }) {
  const { theme } = useSettings();
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void journalFor(meta.id).then((entry) => {
      if (!entry) return;
      setRating(entry.rating);
      setNote(entry.note);
      setSaved(true);
    });
  }, [meta.id]);

  const save = async () => {
    await saveJournal({
      docId: meta.id,
      title: meta.title,
      wordCount: meta.wordCount,
      finishedAt,
      rating,
      note: note.trim(),
      updatedAt: Date.now(),
    });
    setSaved(true);
  };

  return (
    <View style={{ gap: theme.space(3) }}>
      <Txt variant="dim">Nasıldı? Puan ve kısa bir not "Okuduğum kitaplar"da kalır.</Txt>
      <View style={{ flexDirection: 'row', gap: theme.space(1) }}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            onPress={() => {
              setRating(value === rating ? 0 : value);
              setSaved(false);
            }}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`${value} yıldız`}
            accessibilityState={{ selected: value <= rating }}
            style={{ padding: theme.space(1) }}
          >
            <Text
              style={{
                fontSize: 30,
                color: value <= rating ? theme.colors.accent : theme.colors.textFaint,
                ...fontStyle(theme, '700'),
              }}
            >
              {value <= rating ? '★' : '☆'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Field
        value={note}
        onChangeText={(value) => {
          setNote(value);
          setSaved(false);
        }}
        placeholder="Kısa not (isteğe bağlı): aklında ne kaldı?"
        multiline
      />
      <Button
        label={saved ? 'Günlüğe kaydedildi' : 'Günlüğe kaydet'}
        icon="check"
        disabled={saved}
        onPress={() => void save()}
      />
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const { theme } = useSettings();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.space(2), marginLeft: -theme.space(2) }}>
      <IconButton name="chevronLeft" onPress={onBack} accessibilityLabel="Geri" emphasis="strong" />
      <Txt variant="label">Kitap kartı</Txt>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { theme } = useSettings();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.space(3) }}>
      <Txt variant="dim" style={{ fontSize: 14 }}>
        {label}
      </Txt>
      <Txt variant="body" style={{ fontSize: 14, flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Txt>
    </View>
  );
}
