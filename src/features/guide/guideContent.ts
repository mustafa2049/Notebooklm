/**
 * Rehber metinleri. Kaynaklar: PEDIG (Pediatric Eye Disease Investigator Group) çalışmaları,
 * American Academy of Ophthalmology "Amblyopia Preferred Practice Pattern" (2022).
 * Paragraf: string; madde listesi: string[].
 */
export interface GuideSection {
  id: string;
  icon: string;
  title: string;
  body: (string | string[])[];
}

export const GUIDE: GuideSection[] = [
  {
    id: 'nedir',
    icon: '👁️',
    title: 'Göz tembelliği (ambliyopi) nedir?',
    body: [
      'Gözün kendisi sağlam olduğu hâlde beynin o gözden gelen görüntüyü yeterince kullanmayı öğrenmemesidir. Görme, çocuklukta gözler ve beyin birlikte çalışarak gelişir; bu dönemde bir göz net görüntü vermezse beyin o gözü “bastırır”.',
      'En sık nedenler:',
      [
        'İki göz arasında numara farkı (anizometropi) ya da iki gözde de yüksek numara (hipermetropi, astigmat).',
        'Şaşılık (gözlerden birinin kayması): beyin çift görmemek için kayan gözün görüntüsünü bastırır.',
        'Görmeyi engelleyen bir neden (göz kapağı düşüklüğü, doğuştan katarakt gibi).',
      ],
      'Toplumun yaklaşık %2–3’ünde görülür. Sorun beynin görme yollarında olduğu için gözlük tek başına her zaman tam düzeltmez; tembel gözün çalıştırılması gerekir.',
    ],
  },
  {
    id: 'tedavi',
    icon: '🩺',
    title: 'Tedavi nasıl yapılır?',
    body: [
      [
        'Önce doğru gözlük: Numara varsa gözlük sürekli takılır. Birçok çocukta yalnızca gözlükle birkaç ay içinde belirgin iyileşme olur (“optik tedavi”).',
        'Kapama: Sağlam göz bantla kapatılarak beyin tembel gözü kullanmaya zorlanır. Araştırmalarda orta düzey tembellikte günde 2 saat, ağır tembellikte günde 6 saat kapama başlangıç için çoğu zaman yeterli bulunmuştur. Süreyi her zaman doktorunuz belirler.',
        'Atropin damla: Sağlam gözü geçici olarak bulanıklaştırarak kapamaya benzer etki sağlar; yalnızca doktor önerisiyle kullanılır.',
        'İki gözlü (dikoptik) tedaviler: Kırmızı-mavi gözlükle oynanan oyunlar ve izlenen filmler iki gözü birlikte çalıştırır; kapamaya yardımcı ya da alternatif olarak araştırılmaktadır.',
      ],
      'Tedavi genellikle aylar sürer. Kontroller çoğunlukla 6–12 haftada bir yapılır; iyileşme durduğunda doktor kapamayı yavaşça azaltır. Ani bırakmak tembelliğin geri dönmesine yol açabilir.',
    ],
  },
  {
    id: 'kapama',
    icon: '🏴‍☠️',
    title: 'Kapama ipuçları',
    body: [
      [
        'Bant doğrudan göz çevresindeki cilde yapıştırılır, gözlüğün altına. Gözlüğe takılan kapaklar yandan bakmaya izin verebilir.',
        'Cilt tahriş olursa bandı her gün biraz farklı yere yapıştırın; çıkarırken su ya da bebek yağıyla nemlendirin.',
        'Kapama sırasında yakın işler (okuma, boyama, yapboz, uygulamadaki egzersizler) tembel gözü daha çok çalıştırır.',
        'Bir gün atlanırsa telafi için süreyi ikiye katlamak yerine düzenli devam edin.',
        'Doktorun önerdiğinden uzun süre kapamayın: özellikle küçük çocuklarda sağlam gözde geçici tembellik gelişebilir.',
        'Çocuklarda ödül tablosu, yıldızlar ve kapama sırasında birlikte yapılan etkinlikler uyumu artırır.',
      ],
    ],
  },
  {
    id: 'gozluk',
    icon: '👓',
    title: 'Gözlük ve reçete: hipermetropi, astigmat',
    body: [
      [
        'Hipermetropi (+): Göz hem yakına hem uzağa netlemek için fazladan efor harcar. Yüksek hipermetropi çocuklarda gözlerin içe kaymasına (akomodatif şaşılık) yol açabilir; gözlük bu kaymayı azaltabilir.',
        'Astigmat (CYL ve AKS): Korneanın farklı yönlerde farklı kırma gücüdür; bazı yöndeki çizgiler bulanık görünür. AKS, bu farkın yönünü derece olarak gösterir.',
        'Miyopi (−): Uzak bulanık, yakın net görülür.',
        'İki göz arasında 1 diyoptri ve üzeri fark (anizometropi) tembelliğin sık nedenlerindendir.',
      ],
      'Gözlük tembellik tedavisinin temelidir: Doktor aksini söylemedikçe gün boyu takılır. Kırmızı-mavi oyun gözlüğü numaralı gözlüğün yerine geçmez; onun üzerine takılır.',
    ],
  },
  {
    id: 'sasilik',
    icon: '↔️',
    title: 'Şaşılık ve göz tembelliği',
    body: [
      'Gözlerden biri içe, dışa, yukarı ya da aşağı kaydığında beyin çift görmemek için o gözün görüntüsünü bastırır ve göz tembelleşebilir. Tembellik tedavisi görmeyi iyileştirir ama kaymayı tek başına düzeltmez.',
      'Kayma için gözlük, prizmalı gözlük, bazı egzersizler ya da ameliyat seçenekleri vardır; karar doktorundur. Uygulamadaki fotoğraf günlüğü kaymayı zaman içinde izlemenize ve doktorunuza göstermenize yardımcı olur, tanı koymaz.',
    ],
  },
  {
    id: 'yetiskin',
    icon: '🧑',
    title: 'Yetişkinlerde tedavi işe yarar mı?',
    body: [
      'Görme sisteminin en esnek olduğu dönem çocukluktur (yaklaşık 7–8 yaşa kadar). Yetişkin beyni daha az esnektir ama tamamen değişmez değildir.',
      'Algısal öğrenme (Gabor eğitimi gibi) ve iki gözlü (dikoptik) oyunlarla yetişkinlerde de görme keskinliği ve kontrast duyarlılığında bir miktar iyileşme bildirilmiştir. Kazanımlar genelde çocuklardakinden küçüktür ve düzenli, haftalarca süren çalışma gerektirir. Yetişkinde hangi yöntemin uygun olduğunu göz doktorunuzla konuşun.',
    ],
  },
  {
    id: 'olcumler',
    icon: '📏',
    title: 'Uygulamadaki ölçümler ne anlama gelir?',
    body: [
      [
        'Görme keskinliği x/10: 10/10 normal görmedir. logMAR’da 0,0 = 10/10; her 0,1 artış bir satır daha kötü demektir (0,3 ≈ 5/10).',
        '3D (stereo) görme, arcsaniye (″): Görülebilen en küçük derinlik farkı. Küçük değer daha iyi; ≈60″ ve altı normal kabul edilir.',
        'Kontrast duyarlılığı, log CS: Soluk ayrıntıları görebilme. Büyük değer daha iyi; yetişkinlerde ≈1,65 ve üstü normaldir.',
        'Gabor ve yöne göre kontrast eşiği (%): Görülebilen en soluk desen. Küçük yüzde daha iyi.',
        'Sağlam göz kontrastı (%): Dikoptik oyunlarda sağlam göze verilen parlaklık. Yükseldikçe iki göz daha dengeli çalışıyor demektir.',
      ],
      'Ev ölçümleri ekran, ışık ve mesafeye bağlı olarak yaklaşıktır; klinik ölçümün yerine geçmez. En iyi karşılaştırma için her seferinde aynı cihaz, mesafe ve ışıkta yapın.',
    ],
  },
  {
    id: 'acil',
    icon: '🚨',
    title: 'Ne zaman hemen doktora gitmeli?',
    body: [
      [
        'Ani görme kaybı ya da görmede hızlı azalma',
        'Yeni başlayan çift görme',
        'Gözde ağrı, kızarıklık, ışığa karşı aşırı hassasiyet',
        'Gözde kaymanın yeni başlaması ya da belirgin artması',
        'Egzersiz ya da kapama sonrası geçmeyen baş ağrısı',
        'Kapanan (sağlam) gözde görmenin azaldığını fark etmek',
      ],
    ],
  },
  {
    id: 'sss',
    icon: '❓',
    title: 'Sık sorulan sorular',
    body: [
      'Kapama sırasında ekrana bakabilir miyim? Evet; yakın mesafeli etkinlikler önerilir. Her 20 dakikada bir 20 saniye uzağa bakarak mola verin.',
      'Bant mı, gözlüğe takılan kapak mı? Doğrudan cilde yapıştırılan bant daha etkilidir; kapaklarda yandan bakma riski vardır.',
      'Bandı ne zaman çıkarırım? Günlük süre dolunca. Uygulama hedefe ulaşınca bildirir.',
      'Dikoptik oyunlar kapamanın yerine geçer mi? Bazı çalışmalarda benzer sonuç alınmıştır ama karar doktorunuzundur; çoğu zaman kapamaya ek olarak kullanılır.',
      'Tedavi bitince tembellik geri gelir mi? Bir kısım hastada geri dönebilir. Bu yüzden kapama yavaş azaltılır ve kontroller sürdürülür.',
      'Kırmızı-mavi gözlükten nereden alırım? Optik mağazalarında ve internette “anaglif 3D gözlük (kırmızı-camgöbeği)” olarak satılır; karton olanlar yeterlidir.',
    ],
  },
];

/** Doktora sorulabilecek sorular (kontrol öncesi hazırlık). */
export const DOCTOR_QUESTIONS = [
  'Tembel gözümün şu anki görme düzeyi nedir? Son kontrole göre değişti mi?',
  'Günde kaç saat kapama yapmalıyım ve bu ne kadar sürecek?',
  'Gözlüğümü her zaman mı takmalıyım? Numaramda değişiklik gerekiyor mu?',
  'Atropin damla benim için bir seçenek mi?',
  'Dikoptik oyunlar, Gabor eğitimi gibi ev egzersizleri bana uygun mu? Ne kadar yapmalıyım?',
  'Gözümdeki kayma (şaşılık) için ek tedavi (prizma, egzersiz, ameliyat) gerekli mi?',
  'Kapamayı bırakırken nasıl azaltmalıyım?',
  'Bir sonraki kontrol ne zaman? Hangi belirtilerde daha erken gelmeliyim?',
];
