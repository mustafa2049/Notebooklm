import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { listDocuments } from '@/storage/documents';
import { deleteHighlight, listHighlights, type Highlight } from '@/storage/highlights';
import { deleteRecall, listRecalls, type Recall } from '@/storage/recalls';
import { Button, Card, IconButton, Screen, Txt } from '@/ui/primitives';

/**
 * Alıntı defteri: altı çizilen cümleler, kitap kitap.
 *
 * Dokununca metindeki yerine dönülür (`/reader/[id]?konum=`). Kitap
 * kütüphaneden silinmiş olsa da alıntı kalır — defter kullanıcınındır.
 */

interface Group {
  docId: string;
  title: string;
  available: boolean;
  items: Highlight[];
  recalls: Recall[];
}

export default function HighlightsScreen() {
  const router = useRouter();
  const { theme } = useSettings();
  const [items, setItems] = useState<Highlight[] | null>(null);
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [docIds, setDocIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([listHighlights(), listDocuments(), listRecalls()]).then(([highlights, documents, saved]) => {
        setItems(highlights);
        setRecalls(saved);
        setDocIds(new Set(documents.map((doc) => doc.id)));
      });
    }, [])
  );

  const groups = useMemo<Group[]>(() => {
    const byDoc = new Map<string, Group>();
    const groupOf = (docId: string, title: string) => {
      const group = byDoc.get(docId) ?? {
        docId,
        title: title || 'Adsız metin',
        available: docIds.has(docId),
        items: [],
        recalls: [],
      };
      byDoc.set(docId, group);
      return group;
    };
    for (const item of items ?? []) groupOf(item.docId, item.docTitle).items.push(item);
    for (const recall of recalls) groupOf(recall.docId, recall.docTitle).recalls.push(recall);
    // Kitap içinde metindeki sıraya göre: alıntılar kitabın akışını izlesin
    for (const group of byDoc.values()) group.items.sort((a, b) => a.charOffset - b.charOffset);
    return [...byDoc.values()];
  }, [items, recalls, docIds]);

  const share = async (item: Highlight) => {
    const text = `“${item.sentence}”\n— ${item.docTitle}${item.note ? `\n\nNotum: ${item.note}` : ''}`;
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(item.id);
      } catch {
        setCopied(null);
      }
      return;
    }
    await Share.share({ message: text });
  };

  const removeRecall = async (id: string) => {
    await deleteRecall(id);
    setRecalls((list) => list.filter((item) => item.id !== id));
  };

  const remove = async (id: string) => {
    await deleteHighlight(id);
    setItems((list) => (list ? list.filter((item) => item.id !== id) : list));
  };

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.space(4),
        }}
      >
        <Txt variant="title">Alıntılar</Txt>
        <IconButton name="close" onPress={() => router.back()} accessibilityLabel="Kapat" />
      </View>

      {items === null ? (
        <Txt variant="dim">Yükleniyor…</Txt>
      ) : items.length === 0 && recalls.length === 0 ? (
        <Card style={{ gap: theme.space(3) }}>
          <Txt variant="heading">Henüz alıntı yok</Txt>
          <Txt variant="dim">
            Okurken önemli bir cümlede ekrana uzun bas, açılan panelde “Alıntı” sekmesinden
            kaydet. İstersen bir not da düş: neden önemli, neyi hatırlatıyor?
          </Txt>
          <Button label="Geri dön" variant="secondary" onPress={() => router.back()} />
        </Card>
      ) : (
        <View style={{ gap: theme.space(5) }}>
          <Txt variant="dim">
            {items.length} alıntı{recalls.length ? ` · ${recalls.length} özet` : ''} · {groups.length} metin
          </Txt>
          {groups.map((group) => (
            <View key={group.docId} style={{ gap: theme.space(2) }}>
              <Txt variant="heading" numberOfLines={2}>
                {group.title}
              </Txt>
              {group.items.map((item) => (
                <Card
                  key={item.id}
                  style={{ gap: theme.space(2), borderLeftWidth: 3, borderLeftColor: theme.colors.accent }}
                >
                  <Txt variant="body">{item.sentence}</Txt>
                  {item.note ? (
                    <Txt variant="dim" style={{ fontSize: 13 }}>
                      Notun: {item.note}
                    </Txt>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(1) }}>
                    <Txt variant="dim" style={{ fontSize: 12, flex: 1 }}>
                      {new Date(item.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                      })}
                      {copied === item.id ? ' · kopyalandı' : ''}
                    </Txt>
                    {group.available ? (
                      <IconButton
                        name="book"
                        size={18}
                        emphasis="faint"
                        accessibilityLabel="Metinde aç"
                        onPress={() => router.push(`/reader/${item.docId}?konum=${item.charOffset}`)}
                      />
                    ) : null}
                    <IconButton
                      name="share"
                      size={18}
                      emphasis="faint"
                      accessibilityLabel={Platform.OS === 'web' ? 'Kopyala' : 'Paylaş'}
                      onPress={() => void share(item)}
                    />
                    <IconButton
                      name="trash"
                      size={18}
                      emphasis="faint"
                      accessibilityLabel="Sil"
                      onPress={() => void remove(item.id)}
                    />
                  </View>
                </Card>
              ))}
              {group.recalls.map((recall) => (
                <Card key={recall.id} style={{ gap: theme.space(2) }}>
                  <Txt variant="dim" style={{ fontSize: 12 }}>
                    Kendi cümlelerinle ·{' '}
                    {new Date(recall.at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                  </Txt>
                  <Txt variant="body">{recall.text}</Txt>
                  {recall.feedback?.feedback ? (
                    <Txt variant="dim" style={{ fontSize: 13 }}>
                      Geri bildirim: {recall.feedback.feedback}
                    </Txt>
                  ) : null}
                  {recall.feedback?.missed.length ? (
                    <Txt variant="dim" style={{ fontSize: 13 }}>
                      Gözden kaçanlar: {recall.feedback.missed.join(' · ')}
                    </Txt>
                  ) : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <IconButton
                      name="trash"
                      size={18}
                      emphasis="faint"
                      accessibilityLabel="Özeti sil"
                      onPress={() => void removeRecall(recall.id)}
                    />
                  </View>
                </Card>
              ))}
              {!group.available ? (
                <Txt variant="dim" style={{ fontSize: 12 }}>
                  Bu metin kütüphaneden silinmiş; alıntılar duruyor.
                </Txt>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
