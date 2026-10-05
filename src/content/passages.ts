/**
 * Gömülü pratik ve test metinleri — bu uygulama için yazılmış özgün metinler.
 *
 * Neden gömülü: seviye testinin anlamlı olması için soruları ve zorluğu önceden
 * bilinen metinler gerekiyor. Kullanıcının kendi kitabı üzerinde "doğru cevap"
 * bilinmiyor (AI açık değilse), metinlerin zorluğu da birbirine denk değil.
 *
 * Kurallar:
 * - Bilgi metinleri yerleşik, tartışmasız bilgiye dayanır; emin olunmayan tarih
 *   ve sayı kullanılmaz (efsaneler "rivayete göre" diye belirtilir).
 * - Her sorunun `evidence` alanı metinden **birebir** alınmış bir parçadır;
 *   `passages.test.ts` bunu doğrular. Böylece cevabın metinde gerçekten olduğu
 *   kanıtlanır.
 * - Doğru şık veride ilk sırada değil, `correct` alanında duruyor; ekranda
 *   şıklar karıştırılır.
 */

export type QuestionKind = 'ayrıntı' | 'çıkarım' | 'anaFikir' | 'kelime';

export interface PassageQuestion {
  kind: QuestionKind;
  prompt: string;
  correct: string;
  wrong: [string, string, string];
  /** Cevabı destekleyen, metinden birebir alınmış parça */
  evidence: string;
}

/** Tarama egzersizi: metinde aranacak bilgi ve cevabın metindeki birebir hâli. */
export interface ScanTask {
  prompt: string;
  answer: string;
}

export interface Passage {
  id: string;
  title: string;
  genre: 'bilgi' | 'öykü';
  /** `test`: seviye/haftalık ölçüm metni; `drill`: egzersiz metni */
  use: 'test' | 'drill';
  text: string;
  questions: PassageQuestion[];
  scan: ScanTask[];
}

export const PASSAGES: Passage[] = [
  {
    id: 'arilar',
    title: 'Arıların Dansı',
    genre: 'bilgi',
    use: 'test',
    text: `Bir bal arısı zengin bir çiçek tarlası bulduğunda kovana döner ve bu haberi arkadaşlarına iletir. Ama arıların konuşacak sesleri yoktur; bunun yerine dans ederler. Avusturyalı bilim insanı Karl von Frisch, yıllarca süren gözlemlerle bu dansın gizli bir dil olduğunu gösterdi ve bu çalışması ona Nobel ödülü kazandırdı.

Kovana yakın bir kaynak için arı daireler çizerek döner. Buna yuvarlak dans denir ve diğer arılara yalnızca yakında yiyecek olduğunu söyler. Kaynak uzaktaysa dans değişir. Arı önce düz bir çizgi boyunca yürür ve bu sırada karnını hızla iki yana sallar. Sonra bir yandan dönüp başlangıç noktasına gelir, ardından aynı çizgiyi yeniden yürür. Bu hareketlere sallanma dansı adı verilir.

Sallanma dansının her ayrıntısı bir bilgi taşır. Düz çizginin yönü, kaynağın güneşe göre hangi açıda olduğunu anlatır. Kovanın içi karanlıktır ve petekler dikey durur; bu yüzden arı yukarı yönü güneşin yerine koyar. Çizgi tam yukarı doğruysa çiçekler güneşin bulunduğu yöndedir. Çizgi yukarının biraz sağına kayıyorsa, arılar da güneşin aynı ölçüde sağına uçmalıdır.

Uzaklık ise sallanma süresiyle anlatılır. Kaynak ne kadar uzaksa, arı düz çizgide o kadar uzun süre sallanır. İzleyen arılar dansçının arkasından yürüyerek bu hareketleri adeta okur. Dansçının üzerindeki çiçek kokusu da hangi bitkinin arandığı konusunda ipucu verir.

Daha da şaşırtıcı olan, arıların güneşin hareketini hesaba katmasıdır. Güneş gün boyunca gökyüzünde yer değiştirir. Saatler sonra dans eden bir arı, açıyı bu değişime göre ayarlar. Yani küçük bir böceğin içinde, zamanı ve yönü birlikte izleyen bir pusula vardır.

Bu keşif, hayvanların iletişimine bakışımızı değiştirdi. Uzun süre yalnızca insanların soyut bilgiyi aktarabildiği düşünülüyordu. Oysa arılar, orada olmayan bir yeri tarif edebiliyor. Bilim insanları bugün de bu dansı inceleyerek arı kolonilerinin nasıl karar verdiğini anlamaya çalışıyor. Çünkü bir kovan, binlerce küçük bilginin birleşmesiyle düşünen bir topluluk gibi davranır.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Kovana yakın bir kaynak için arılar hangi dansı yapar?',
        correct: 'Yuvarlak dans',
        wrong: ['Sallanma dansı', 'Zikzak dansı', 'Sarmal dans'],
        evidence: 'Buna yuvarlak dans denir',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Sallanma dansında kaynağın uzaklığı neyle anlatılır?',
        correct: 'Sallanma süresiyle',
        wrong: ['Dönüş sayısıyla', 'Çizginin yönüyle', 'Kanat sesiyle'],
        evidence: 'Uzaklık ise sallanma süresiyle anlatılır.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Dansın düz çizgisi yukarının biraz soluna doğruysa arılar nereye uçar?',
        correct: 'Güneşin biraz soluna',
        wrong: ['Tam güneşe doğru', 'Güneşin tersine', 'Kovanın hemen yanına'],
        evidence:
          'Çizgi yukarının biraz sağına kayıyorsa, arılar da güneşin aynı ölçüde sağına uçmalıdır.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Arılar dansla, orada olmayan bir yerin yönünü ve uzaklığını aktarabilir.',
        wrong: [
          'Arılar yalnızca koku yoluyla iletişim kurar.',
          'Kovanın içi karanlık olduğu için arılar birbirini göremez.',
          'Von Frisch arıları evcilleştiren ilk bilim insanıdır.',
        ],
        evidence: 'Oysa arılar, orada olmayan bir yeri tarif edebiliyor.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "adeta" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Sanki, neredeyse',
        wrong: ['Hemen, derhâl', 'Asla, hiçbir zaman', 'Yeniden, tekrar'],
        evidence: 'İzleyen arılar dansçının arkasından yürüyerek bu hareketleri adeta okur.',
      },
    ],
    scan: [
      { prompt: 'Dansı inceleyen bilim insanının adı ne?', answer: 'Karl von Frisch' },
      { prompt: 'Kovanın içi nasıldır?', answer: 'karanlıktır' },
    ],
  },
  {
    id: 'fenerler',
    title: 'Deniz Fenerleri',
    genre: 'bilgi',
    use: 'test',
    text: `Yüzyıllar boyunca denizciler için gecenin en büyük tehlikesi görünmeyen kıyılardı. Kayalıklar, sığlıklar ve dar boğazlar, yolunu kaybeden gemileri sessizce bekliyordu. Deniz fenerleri bu tehlikeye karşı insanların bulduğu en eski çözümlerden biridir.

Antik çağın en ünlü feneri İskenderiye'deydi. Rivayete göre kulesinin tepesinde yakılan ateş, gündüz dumanıyla, gece alevleriyle uzaklardan görülüyordu. Bu yapı dünyanın yedi harikasından biri sayıldı; ancak depremler sonunda onu yıktı ve bugün yalnızca anlatılarda yaşıyor.

İlk fenerlerde odun, kömür ya da yağ yakılırdı. Işığın büyük kısmı her yöne dağıldığı için ancak sınırlı bir mesafeden görülebilirdi. On dokuzuncu yüzyılda Fransız fizikçi Augustin Fresnel bu sorunu çözen bir mercek tasarladı. Halka hâlinde dizilmiş cam parçalarından oluşan bu mercek, ışığı tek bir güçlü demet hâlinde topluyordu. Aynı lamba artık çok daha uzaktan görülebiliyordu.

Bir fener yalnızca yanıp sönmekle yetinmez; kendine özgü bir işaret de verir. Kimi fener iki kez kısa, bir kez uzun yanar; kimi ise belli aralıklarla döner. Bu düzene fenerin karakteri denir. Denizciler haritalarında her fenerin karakterini bulur ve gördükleri ışığın hangi kıyıya ait olduğunu böylece anlar. Yani fener yalnızca orada kara olduğunu söylemez, kendisinin hangi fener olduğunu da söyler.

Fenerlerin bir de bekçileri vardı. Bu insanlar fırtınalı gecelerde lambanın sönmemesi için uyumadan nöbet tutar, camları temizler, yakıtı tazelerdi. Çoğu zaman ıssız bir kayalıkta, aileleriyle birlikte yıllarca yaşarlardı. Yalnızlıkları, pek çok romana ve şiire konu oldu.

Günümüzde gemiler uydu sistemleriyle konumlarını metrelerce hassasiyetle bilebiliyor. Bu yüzden birçok fener otomatik hâle getirildi ve bekçilik mesleği neredeyse ortadan kalktı. Yine de fenerler tamamen gereksiz değil. Elektronik aletler bozulabilir, enerji kesilebilir. Böyle bir anda karanlıkta beliren tanıdık bir ışık, bir geminin yönünü bulmasına hâlâ yetebilir.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Fresnel’in tasarladığı mercek ne işe yarıyordu?',
        correct: 'Işığı tek bir güçlü demet hâlinde topluyordu.',
        wrong: [
          'Fenerin yakıt tüketimini yarıya indiriyordu.',
          'Işığın rengini değiştiriyordu.',
          'Gündüz daha çok duman çıkmasını sağlıyordu.',
        ],
        evidence: 'ışığı tek bir güçlü demet hâlinde topluyordu.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'İskenderiye Feneri bugün neden ayakta değil?',
        correct: 'Depremler yıktı.',
        wrong: ['Bir savaşta yakıldı.', 'Denize gömüldü.', 'Taşları başka bir yapıda kullanıldı.'],
        evidence: 'ancak depremler sonunda onu yıktı',
      },
      {
        kind: 'çıkarım',
        prompt: 'Denizciler gördükleri ışığın hangi fenere ait olduğunu nasıl anlar?',
        correct: 'Işığın yanıp sönme düzenini haritadaki karakterle karşılaştırarak',
        wrong: [
          'Işığın rengine bakarak',
          'Fener bekçisine telsizle sorarak',
          'Fenerin yüksekliğini ölçerek',
        ],
        evidence:
          'Denizciler haritalarında her fenerin karakterini bulur ve gördükleri ışığın hangi kıyıya ait olduğunu böylece anlar.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Yazar son paragrafta ne anlatmak istiyor?',
        correct: 'Teknoloji gelişse de fenerler bir yedek güvence olarak değerini koruyor.',
        wrong: [
          'Fenerler artık tamamen gereksiz hâle geldi.',
          'Bekçilik mesleği yeniden yaygınlaşıyor.',
          'Uydu sistemleri fenerlerden daha az güvenilirdir.',
        ],
        evidence: 'Yine de fenerler tamamen gereksiz değil.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "ıssız" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Kimsenin yaşamadığı, tenha',
        wrong: ['Çok soğuk', 'Tehlikeli', 'Yüksek'],
        evidence: 'Çoğu zaman ıssız bir kayalıkta, aileleriyle birlikte yıllarca yaşarlardı.',
      },
    ],
    scan: [
      { prompt: 'Merceği tasarlayan fizikçinin adı ne?', answer: 'Augustin Fresnel' },
      { prompt: 'Antik çağın en ünlü feneri hangi şehirdeydi?', answer: "İskenderiye'deydi" },
    ],
  },
  {
    id: 'uyku',
    title: 'Uyku ve Hafıza',
    genre: 'bilgi',
    use: 'test',
    text: `Sınavdan önceki gece sabaha kadar çalışmak, pek çok öğrencinin denediği bir yöntemdir. Mantıklı görünür: ne kadar çok saat, o kadar çok bilgi. Ancak beyin üzerine yapılan araştırmalar, bu hesabın önemli bir eksiği olduğunu gösteriyor. Öğrendiklerimizi kalıcı hâle getiren şeylerden biri, tam da feda ettiğimiz uykudur.

Gün içinde öğrendiğimiz bilgi önce geçici bir biçimde saklanır. Bu kayıtlar kırılgandır ve kolayca silinebilir. Uyku sırasında beyin, gün boyu toplananları yeniden gözden geçirir. Bazı deneylerde, hayvanların gündüz yaptığı bir yol öğrenme görevine ait beyin etkinliğinin gece uykuda kısa aralıklarla yeniden belirdiği görülmüştür. Beyin sanki öğrendiğini prova eder ve önemli olanı daha sağlam bir yere taşır.

İnsanlarla yapılan çalışmalarda da benzer bir tablo ortaya çıkar. Bir kelime listesi ya da yeni bir hareket öğrenen kişilerden bir grup ardından uyur, diğer grup aynı süre boyunca uyanık kalır. Uyuyan grubun ertesi gün hatırladıkları genellikle daha fazladır. Üstelik uyku yalnızca bilgiyi korumakla kalmaz; dağınık parçalar arasında yeni bağlantılar kurulmasına da yardım eder. Bu yüzden zor bir problem üzerinde düşündükten sonra uyuyan biri, sabah çözüme daha yakın uyanabilir.

Uykusuzluğun bir başka bedeli de dikkattir. Yorgun bir beyin yeni bilgiyi almakta zorlanır. Gece boyunca çalışan öğrenci, sınav sabahı hem daha az şey hatırlar hem de soruları okurken daha sık hata yapar. Kısacası uykudan çalınan saatler, çoğu zaman kazançtan çok kayıp getirir.

Peki bu bilgiler okuma alışkanlığı için ne anlama geliyor? Akşamları okunan bir kitap, gece uykusunda pekişme fırsatı bulur. Öğrenmeyi birkaç güne yaymak da tek seferde yüklenmekten daha verimlidir; çünkü her gecenin uykusu, bir önceki günün öğrendiklerini sağlamlaştırır. Düzenli ve dinlenmiş bir zihinle okumak, uzun ve yorgun oturumlardan daha fazlasını bırakır.

Elbette uyku tek başına mucize yaratmaz. Hiç çalışmadan uyuyan birinin pekiştireceği bir şey yoktur. Ama çalışmanın değerini tamamlayan, öğrenilenleri kalıcı kılan sessiz bir ortak olarak uyku, en az ders kitapları kadar önemlidir.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Hayvanlarla yapılan deneylerde uyku sırasında ne görülmüştür?',
        correct: 'Gündüz öğrenilen göreve ait beyin etkinliğinin yeniden belirmesi',
        wrong: ['Kalp atışlarının durması', 'Hiç rüya görülmemesi', 'Beynin tamamen dinlenmesi'],
        evidence:
          'hayvanların gündüz yaptığı bir yol öğrenme görevine ait beyin etkinliğinin gece uykuda kısa aralıklarla yeniden belirdiği görülmüştür.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'İnsanlarla yapılan çalışmalarda ertesi gün kim daha fazlasını hatırlar?',
        correct: 'Öğrendikten sonra uyuyan grup',
        wrong: ['Uyanık kalan grup', 'İki grup eşit hatırlar', 'Sabah erken kalkan grup'],
        evidence: 'Uyuyan grubun ertesi gün hatırladıkları genellikle daha fazladır.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Metne göre bir sınava hazırlanmanın en verimli yolu hangisidir?',
        correct: 'Çalışmayı birkaç güne yayıp her gece uyumak',
        wrong: [
          'Son gece sabaha kadar çalışmak',
          'Hiç çalışmadan erkenden uyumak',
          'Yalnızca sınav sabahı tekrar etmek',
        ],
        evidence: 'Öğrenmeyi birkaç güne yaymak da tek seferde yüklenmekten daha verimlidir',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Uyku, öğrenilenleri kalıcı kılmada çalışmanın vazgeçilmez tamamlayıcısıdır.',
        wrong: [
          'Uyku tek başına öğrenmeyi sağlar.',
          'Gece çalışmak öğrenmenin en verimli yoludur.',
          'Hayvanlar insanlardan daha iyi öğrenir.',
        ],
        evidence: 'Öğrendiklerimizi kalıcı hâle getiren şeylerden biri, tam da feda ettiğimiz uykudur.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "kırılgan" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Kolayca bozulabilen, sağlam olmayan',
        wrong: ['Çok değerli', 'Ağır', 'Kalıcı'],
        evidence: 'Bu kayıtlar kırılgandır ve kolayca silinebilir.',
      },
    ],
    scan: [
      { prompt: 'Beynin uykuda öğrendiğini ne ettiği söyleniyor?', answer: 'prova' },
      { prompt: 'Uykusuzluğun bir başka bedeli nedir?', answer: 'dikkattir' },
    ],
  },
  {
    id: 'kagit',
    title: 'Kâğıdın Yolculuğu',
    genre: 'bilgi',
    use: 'test',
    text: `Bugün elimizi uzatınca bulduğumuz kâğıt, insanlık tarihinin büyük bölümünde ya hiç yoktu ya da çok pahalıydı. Eski Mısırlılar Nil kıyısında yetişen papirüs bitkisinin saplarını üst üste dizip kurutarak yazı yüzeyi elde ediyordu. Avrupa'da ve Anadolu'da ise uzun süre hayvan derisinden hazırlanan parşömen kullanıldı. Parşömen dayanıklıydı ama bir kitap için bazen bir sürünün derisi gerekiyordu.

Kâğıt yaklaşık iki bin yıl önce Çin'de ortaya çıktı. Ağaç kabuğu, kenevir lifleri, eski kumaş parçaları suyla dövülüp hamur hâline getiriliyordu. Bu hamur ince bir elek üzerine yayılıyor, su süzülünce geriye birbirine kenetlenmiş lifler kalıyordu. Kuruyan tabaka hafif, ucuz ve üzerine kolayca yazılabilen bir yüzeydi.

Çinliler bu tekniği yüzyıllarca kendilerine sakladı. Bilgi, İpek Yolu üzerindeki ticaret ve savaşlar aracılığıyla batıya yavaş yavaş yayıldı. Rivayete göre Semerkant'ta esir düşen Çinli ustalar kâğıt yapımını öğretti ve şehir kısa sürede önemli bir kâğıt merkezi oldu. Oradan Bağdat'a, Şam'a, Kahire'ye ulaşan kâğıt, İslam dünyasında kitapların ve kütüphanelerin çoğalmasını sağladı.

Avrupa kâğıtla daha geç tanıştı. İlk atölyeler Endülüs'te ve İtalya'da kuruldu. Su gücüyle çalışan değirmenler hamur hazırlamayı hızlandırdı. Ama asıl dönüm noktası matbaa oldu. Matbaa, binlerce sayfayı hızla basabiliyordu; bu da ancak bol ve ucuz kâğıtla mümkündü. Parşömenle basılan bir kitap servet demekti, kâğıtla basılan bir kitap ise sıradan insanların bile alabileceği bir eşyaya dönüştü.

Kâğıdın yayılması, bilginin kimin elinde olduğunu değiştirdi. Önceleri yazılı metinler çoğunlukla saraylarda ve dini kurumlarda saklanıyordu. Ucuz kâğıt ve matbaa sayesinde mektuplar, gazeteler, ders kitapları çoğaldı. Okuma, birkaç kişinin uzmanlığı olmaktan çıkıp geniş kitlelerin alışkanlığı hâline geldi.

Bugün dijital ekranlar kâğıdın yerini kısmen alıyor. Yine de kâğıdın hikâyesi bize önemli bir şey hatırlatıyor: Bir buluşun gücü, ne kadar parlak olduğundan çok, ne kadar insana ulaşabildiğiyle ölçülür.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Parşömen neyden hazırlanırdı?',
        correct: 'Hayvan derisinden',
        wrong: ['Papirüs saplarından', 'Ağaç kabuğundan', 'Eski kumaş parçalarından'],
        evidence: 'hayvan derisinden hazırlanan parşömen kullanıldı.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Rivayete göre kâğıt yapımı batıda ilk hangi şehirde öğretildi?',
        correct: 'Semerkant',
        wrong: ['Bağdat', 'Kahire', 'Şam'],
        evidence: "Rivayete göre Semerkant'ta esir düşen Çinli ustalar kâğıt yapımını öğretti",
      },
      {
        kind: 'çıkarım',
        prompt: 'Matbaanın yaygınlaşması neden kâğıda bağlıydı?',
        correct: 'Çok sayıda sayfa basmak bol ve ucuz bir yüzey gerektiriyordu.',
        wrong: [
          'Parşömen mürekkebi tutmuyordu.',
          'Kâğıt parşömenden daha dayanıklıydı.',
          'Saraylar parşömen kullanımını yasaklamıştı.',
        ],
        evidence:
          'Matbaa, binlerce sayfayı hızla basabiliyordu; bu da ancak bol ve ucuz kâğıtla mümkündü.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Kâğıdın ucuzlayıp yayılması, bilgiyi ve okumayı geniş kitlelere ulaştırdı.',
        wrong: [
          'Kâğıt ilk olarak Avrupa’da icat edildi.',
          'Parşömen kâğıttan her yönüyle daha kullanışlıydı.',
          'Dijital ekranlar kâğıdı tamamen ortadan kaldırdı.',
        ],
        evidence: 'Kâğıdın yayılması, bilginin kimin elinde olduğunu değiştirdi.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "kenetlenmiş" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Birbirine sıkıca tutunmuş',
        wrong: ['Kurumuş', 'Dağılmış', 'Boyanmış'],
        evidence: 'birbirine kenetlenmiş lifler kalıyordu.',
      },
    ],
    scan: [
      { prompt: 'Eski Mısırlıların kullandığı bitki hangisi?', answer: 'papirüs' },
      { prompt: 'Endülüs dışında ilk atölyelerin kurulduğu yer?', answer: "İtalya'da" },
    ],
  },
  {
    id: 'su',
    title: 'Su Döngüsü',
    genre: 'bilgi',
    use: 'test',
    text: `Bir bardak suyun geçmişini izleyebilseydik, şaşırtıcı bir yolculukla karşılaşırdık. Bugün içtiğimiz suyun bir kısmı belki yüzyıllar önce bir buzulda donmuş, bir okyanusta dalgalanmış ya da bir ormanın yapraklarından buharlaşmıştır. Çünkü dünyadaki su sürekli yer değiştirir ama toplam miktarı pek değişmez. Bu kesintisiz dolaşıma su döngüsü denir.

Döngünün motoru güneştir. Güneş ısısı denizlerin, göllerin ve nehirlerin yüzeyindeki suyu buharlaştırır. Bitkiler de köklerinden aldıkları suyun büyük kısmını yapraklarındaki küçük gözeneklerden havaya bırakır. Su buharı gözle görülmez ve sıcak havayla birlikte yükselir.

Yükseldikçe hava soğur. Soğuyan buhar, havadaki toz ve tuz parçacıklarının çevresinde yoğunlaşarak minicik damlacıklara dönüşür. Milyarlarca damlacık bir araya gelince bulutları oluşturur. Damlacıklar birleşip büyüdükçe ağırlaşır; artık havada asılı kalamayınca yağmur, kar ya da dolu olarak yere düşer.

Yere düşen suyun önünde birkaç yol vardır. Bir kısmı toprağın derinliklerine sızarak yer altı sularına karışır. Bu sular bazen yüzlerce yıl sonra bir pınardan yeniden yüzeye çıkar. Bir kısmı dereler ve nehirler hâlinde akarak denize döner. Bir kısmı ise dağların tepesinde kar ve buz olarak uzun süre bekler, ilkbaharda eriyince yeniden yola koyulur.

Su döngüsü yalnızca suyu taşımaz, ısıyı da taşır. Buharlaşan su, çevresinden ısı alır; yoğunlaşırken bu ısıyı havaya geri verir. Bu sayede sıcak bölgelerin enerjisi daha soğuk bölgelere aktarılır ve iklim daha dengeli kalır. Okyanuslardan karalara taşınan nem olmasaydı, kıtaların iç kesimleri büyük ölçüde çöle dönerdi.

İnsan etkinlikleri bu dengeyi giderek daha fazla etkiliyor. Ormanların kesilmesi, toprağın betonla kaplanması ve yer altı sularının hızla çekilmesi, suyun doğal yolculuğunu bozabiliyor. Döngünün işleyişini anlamak, musluktan akan suyun aslında ne kadar uzun ve kırılgan bir yolculuğun sonunda bize ulaştığını görmemizi sağlıyor.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Metne göre su döngüsünün motoru nedir?',
        correct: 'Güneş',
        wrong: ['Rüzgâr', 'Ay', 'Dünyanın dönüşü'],
        evidence: 'Döngünün motoru güneştir.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Soğuyan su buharı neyin çevresinde yoğunlaşır?',
        correct: 'Havadaki toz ve tuz parçacıklarının',
        wrong: ['Yaprakların', 'Buzulların', 'Dalgaların'],
        evidence: 'havadaki toz ve tuz parçacıklarının çevresinde yoğunlaşarak',
      },
      {
        kind: 'çıkarım',
        prompt: 'Okyanuslardan karalara nem taşınmasaydı ne olurdu?',
        correct: 'Kıtaların iç kesimleri büyük ölçüde çölleşirdi.',
        wrong: ['Denizler taşardı.', 'Bulutlar daha büyük olurdu.', 'Buzullar hızla erirdi.'],
        evidence:
          'Okyanuslardan karalara taşınan nem olmasaydı, kıtaların iç kesimleri büyük ölçüde çöle dönerdi.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Dünyadaki su, güneşin sürdürdüğü kesintisiz ve kırılgan bir döngüyle yer değiştirir.',
        wrong: [
          'Yağmurun tamamı denizlerden gelir.',
          'Yer altı suları hiçbir zaman yüzeye çıkmaz.',
          'Bitkiler aldıkları suyu yok eder.',
        ],
        evidence: 'Bu kesintisiz dolaşıma su döngüsü denir.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "gözenek" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Çok küçük delik',
        wrong: ['Kök', 'Damar', 'Leke'],
        evidence: 'yapraklarındaki küçük gözeneklerden havaya bırakır.',
      },
    ],
    scan: [
      { prompt: 'Yağmur ve kar dışında hangi biçimde yağış düşer?', answer: 'dolu' },
      { prompt: 'Yer altı suları yüzeye nereden çıkar?', answer: 'pınardan' },
    ],
  },
  {
    id: 'kuslar',
    title: 'Göçmen Kuşlar',
    genre: 'bilgi',
    use: 'test',
    text: `Her sonbahar gökyüzünde uzun bir yolculuk başlar. Leylekler, kırlangıçlar, yırtıcı kuşlar ve daha nice tür, kışı geçirecekleri sıcak bölgelere doğru binlerce kilometre uçar. İlkbaharda da aynı kuşların büyük kısmı, bir önceki yıl ayrıldıkları yuvaların yakınına geri döner. Haritası, pusulası olmayan bu yolcular yollarını nasıl bulur?

Bilim insanları kuşların birden fazla yönlendirme aracı kullandığını düşünüyor. Gündüz uçanlar güneşin konumundan yararlanır. Gece uçan türler ise yıldızlara bakar. Yapılan deneylerde, yapay bir yıldızlı gökyüzü altında büyütülen genç kuşların, gökyüzünün dönüş merkezini öğrenerek yön buldukları görülmüştür. Bunlara ek olarak pek çok kuşun dünyanın manyetik alanını algılayabildiği biliniyor. Bu yetenek, bulutlu ve yıldızsız gecelerde bile yön duygusunu korumalarına yardım eder.

Yolculuk yaklaştıkça kuşların bedeni de değişir. Göçten önce bol bol yiyip vücutlarında yağ depolarlar. Bu yağ, uzun uçuşun yakıtıdır. Bazı küçük ötücü kuşlar, kendi ağırlıklarının neredeyse yarısı kadar yağ biriktirebilir.

Büyük süzülücü kuşların göçü ise başka bir hesaba dayanır. Leylekler ve kartallar kanat çırparak uzun mesafe uçmakta zorlanır; enerjilerini korumak için güneşle ısınan topraktan yükselen sıcak hava akımlarını kullanırlar. Bu akımlar deniz üzerinde zayıf olduğu için bu kuşlar geniş denizleri geçmekten kaçınır ve karanın en dar noktalarını seçer. İstanbul Boğazı, Avrupa'dan Afrika'ya giden leyleklerin ve yırtıcı kuşların en önemli geçiş yollarından biridir. Sonbaharda Boğaz'ın tepelerinden, binlerce leyleğin aynı gökyüzünde döne döne yükseldiği görülebilir.

Göç, kuşlar için büyük bir risktir. Fırtınalar, yorgunluk, avcılar ve yol üzerindeki elektrik hatları pek çok kuşun canına mal olur. Son yıllarda iklimdeki değişimler de göç zamanlarını etkiliyor; bazı türler daha erken dönüyor, bazıları ise beslendikleri böceklerin bollaştığı zamanı kaçırıyor.

Yine de her yıl yeniden başlayan bu yolculuk, doğanın en etkileyici düzenlerinden biri olmayı sürdürüyor. Gökyüzünde dizi hâlinde uçan bir sürü gördüğümüzde, aslında kuşaklar boyunca sınanmış bir bilginin iz sürdüğüne tanık oluyoruz.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Gece uçan kuşlar yön bulmak için neye bakar?',
        correct: 'Yıldızlara',
        wrong: ['Aya', 'Şimşeklere', 'Şehir ışıklarına'],
        evidence: 'Gece uçan türler ise yıldızlara bakar.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Kuşlar göçten önce neden yağ depolar?',
        correct: 'Uzun uçuşun yakıtı olarak kullanmak için',
        wrong: ['Soğuktan korunmak için', 'Avcılardan saklanmak için', 'Yumurtlamaya hazırlanmak için'],
        evidence: 'Bu yağ, uzun uçuşun yakıtıdır.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Leylekler neden geniş denizleri geçmekten kaçınır?',
        correct: 'Onları taşıyan sıcak hava akımları deniz üzerinde zayıf olduğu için',
        wrong: [
          'Deniz üzerinde avcılar olduğu için',
          'Denizde yıldızları göremedikleri için',
          'Tuzlu sudan zarar gördükleri için',
        ],
        evidence:
          'Bu akımlar deniz üzerinde zayıf olduğu için bu kuşlar geniş denizleri geçmekten kaçınır',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Göçmen kuşlar birden çok yön bulma yöntemi ve bedensel uyumlarla uzun yolculukları başarır.',
        wrong: [
          'Kuşlar yalnızca manyetik alanla yön bulur.',
          'İstanbul Boğazı kuşlar için en tehlikeli yerdir.',
          'Göç her yıl kuşlar için daha kolay hâle geliyor.',
        ],
        evidence: 'Bilim insanları kuşların birden fazla yönlendirme aracı kullandığını düşünüyor.',
      },
      {
        kind: 'kelime',
        prompt: 'Metindeki "süzülücü kuşlar" ifadesi hangi kuşları anlatır?',
        correct: 'Kanat çırpmadan, hava akımlarıyla kayarak uçan kuşları',
        wrong: ['Suda yüzen kuşları', 'Yalnızca gece uçan kuşları', 'Küçük ötücü kuşları'],
        evidence: 'Leylekler ve kartallar kanat çırparak uzun mesafe uçmakta zorlanır',
      },
    ],
    scan: [
      { prompt: 'Leyleklerin en önemli geçiş yollarından biri neresi?', answer: 'İstanbul Boğazı' },
      { prompt: 'Kuşlar dünyanın hangi alanını algılayabilir?', answer: 'manyetik' },
    ],
  },
  {
    id: 'saatci',
    title: 'Saat Tamircisi',
    genre: 'öykü',
    use: 'test',
    text: `Kasabanın çarşısında, bakırcıların arasında sıkışmış küçük bir dükkân vardı. Camındaki solgun yazı çoktandır okunmuyordu ama herkes orayı bilirdi: Rıza Usta'nın saat dükkânı. İçeride duvarları kaplayan onlarca saat, birbirine hiç uymayan tıkırtılarla zamanı sayardı.

Elif o yaz, okul tatilinde dedesinin yanında çalışmaya başladı. İlk gün ona yalnızca bir fırça ve bir kutu vida verildi. Dedesi, önce bakmayı öğrenmesi gerektiğini söyledi. Ona göre aceleyle açılan bir saat, bütün sırlarını saklardı. Elif bu sözü pek anlamadı. Saatleri hızla söküp takmak, çarkları tanımak, bir an önce gerçek bir tamirci olmak istiyordu.

Günler geçtikçe dedesinin çalışma biçimi dikkatini çekti. Rıza Usta, getirilen bir saati hemen açmazdı. Önce kulağına götürür, uzun uzun dinlerdi. Sonra saati masaya koyar, akrebin ve yelkovanın hareketini birkaç dakika izlerdi. Ancak bundan sonra büyütecini takıp kapağı açardı. Çoğu zaman da arızanın nerede olduğunu, kapağı açmadan önce bilirdi.

Bir öğleden sonra yaşlı bir kadın, kocasından kalma bir cep saatiyle geldi. Saat her gün yaklaşık yirmi dakika geri kalıyordu. Rıza Usta o sırada pazara gitmişti. Elif fırsatı kaçırmak istemedi; saati açtı, bütün çarkları tek tek söktü, temizledi ve yeniden taktı. Ama saat bu kez hiç çalışmadı. Elif'in elleri titremeye başladı.

Dedesi döndüğünde masadaki dağınıklığa uzun süre sessizce baktı. Sonra torununun yanına oturdu. Saati yeniden kurmak bütün akşamlarını aldı. Rıza Usta her parçayı yerine koymadan önce Elif'e gösteriyor, neden orada olduğunu anlatıyordu. Sorun sonunda bulundu: Saatin kıl kadar ince yayına toz girmişti. Sökülüp takılan çarkların hiçbirinde kusur yoktu.

Ertesi sabah kadın saatini almaya geldiğinde, saat dakikası dakikasına doğru gösteriyordu. Kadın teşekkür edip gidince Elif başını önüne eğdi ve bütün çarkları boşuna söktüğünü söyledi. Dedesi gülümsedi. Boşuna olmadığını, artık bakmanın neden önce geldiğini öğrendiğini söyledi.

O yazın sonunda Elif hâlâ hızlı çalışmayı seviyordu. Ama bir saati eline aldığında, kapağını açmadan önce bir süre kulağına götürüp dinlemeyi hiç unutmadı.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Rıza Usta getirilen bir saate ilk olarak ne yapardı?',
        correct: 'Kulağına götürüp dinlerdi.',
        wrong: ['Hemen kapağını açardı.', 'Parçalarını yıkardı.', 'Sahibine sorular sorardı.'],
        evidence: 'Önce kulağına götürür, uzun uzun dinlerdi.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Cep saatinin asıl sorunu neydi?',
        correct: 'İnce yayına toz girmişti.',
        wrong: ['Çarklarından biri kırıktı.', 'Akrebi eğrilmişti.', 'Kapağı çatlamıştı.'],
        evidence: 'Saatin kıl kadar ince yayına toz girmişti.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Elif saati neden çalışmaz hâle getirdi?',
        correct: 'Sorunu anlamadan aceleyle bütün parçaları söktüğü için',
        wrong: [
          'Yanlış bir alet kullandığı için',
          'Saati yere düşürdüğü için',
          'Dedesi ona yanlış tarif verdiği için',
        ],
        evidence: 'saati açtı, bütün çarkları tek tek söktü, temizledi ve yeniden taktı.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Öykünün vermek istediği ders nedir?',
        correct: 'Bir işe girişmeden önce dikkatle gözlemlemek gerekir.',
        wrong: [
          'Hızlı çalışan herkes sonunda başarılı olur.',
          'Eski saatler artık tamir edilemez.',
          'Yaşlılar gençlere hiçbir zaman güvenmez.',
        ],
        evidence: 'artık bakmanın neden önce geldiğini öğrendiğini söyledi.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "solgun" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Rengi atmış, soluk',
        wrong: ['Yepyeni', 'Parlak', 'Yırtık'],
        evidence: 'Camındaki solgun yazı çoktandır okunmuyordu',
      },
    ],
    scan: [
      { prompt: 'Saat her gün kaç dakika geri kalıyordu?', answer: 'yirmi' },
      { prompt: 'Dükkân hangi esnafın arasındaydı?', answer: 'bakırcıların' },
    ],
  },
  {
    id: 'tren',
    title: 'Son Tren',
    genre: 'öykü',
    use: 'test',
    text: `Kar akşamüstü başlamıştı ve istasyonun saati dokuzu gösterdiğinde perondaki banklar tamamen beyaza bürünmüştü. Mert, son trenin yirmi dakika rötarlı olduğunu bildiren tabelaya baktı ve paltosunun yakasını kaldırdı. Bekleme salonunda kendisinden başka yalnızca iki kişi vardı: elinde örgü şişleriyle yaşlı bir kadın ve sırt çantasına yaslanmış uyuklayan bir genç.

Mert'in aklı ertesi sabahki iş görüşmesindeydi. Aylardır böyle bir fırsat bekliyordu. Trene yetişemezse sabaha şehre varamayacak, belki de bu fırsatı kaçıracaktı. Her iki dakikada bir saatine bakıyor, salonda bir uçtan öbür uca yürüyordu.

Yaşlı kadın örgüsünü bırakıp ona seslendi. Trenin onun yürümesiyle daha çabuk gelmeyeceğini söyledi ve oturmasını istedi. Mert istemeye istemeye oturdu. Kadın termosundan bir bardak ıhlamur doldurup uzattı. Konuşmaya başladılar. Kadın, kırk yıl boyunca bu hatta kondüktörlük yapan kocasını anlattı. Kocası öleli beş yıl olmuştu ama kadın her kış, kocasının son seferini yaptığı gün bu istasyona gelip son treni beklerdi.

Saat ona yaklaşırken anons yapıldı: Kar yüzünden yol kapanmıştı, son tren gelmeyecekti. Mert'in yüzü bembeyaz oldu. Genç yolcu uyanıp homurdandı, sonra yeniden uyumaya çalıştı. Yaşlı kadın ise hiç şaşırmamış gibiydi. Kocasının, tren gelmeyen gecelerde istasyon şefinin mutlaka bir yol bulduğunu anlattığını söyledi.

Gerçekten de biraz sonra istasyon şefi salona girdi. Şehre yük taşıyan bir lokomotif, sabaha karşı kar küreme aracının arkasından yola çıkacaktı. Makinistin yanında yalnızca bir kişilik yer vardı. Şef yaşlı kadına baktı; onu ve kocasını yıllardır tanıyordu. Kadın ise Mert'i gösterdi. Kendisinin bir yere yetişmesi gerekmediğini, bu gencin gerektiğini söyledi.

Mert o gece lokomotifin dar kabininde, karla örtülü ovaların arasından şehre doğru ilerlerken kadının sözlerini düşündü. Görüşmeye yorgun ama zamanında yetişti. İşe kabul edildiğini öğrendiği gün yaptığı ilk şey, bir paket ıhlamur alıp o küçük istasyona bırakmak oldu.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Son tren neden gelmedi?',
        correct: 'Kar yüzünden yol kapandığı için',
        wrong: ['Lokomotif arızalandığı için', 'Makinist hastalandığı için', 'Sefer iptal edildiği için'],
        evidence: 'Kar yüzünden yol kapanmıştı, son tren gelmeyecekti.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Yaşlı kadının kocası hangi işi yapmıştı?',
        correct: 'Bu hatta kondüktörlük',
        wrong: ['İstasyon şefliği', 'Makinistlik', 'Bekçilik'],
        evidence: 'kırk yıl boyunca bu hatta kondüktörlük yapan kocasını anlattı.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Yaşlı kadın lokomotifteki yeri neden Mert’e verdi?',
        correct: 'Mert’in yetişmesi gereken önemli bir işi olduğu için',
        wrong: [
          'Lokomotifle yolculuktan korktuğu için',
          'İstasyon şefi onu tanımadığı için',
          'Mert ondan yerini istediği için',
        ],
        evidence: 'Kendisinin bir yere yetişmesi gerekmediğini, bu gencin gerektiğini söyledi.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Öykünün ana düşüncesi hangisidir?',
        correct: 'Zor anlar telaşla değil, sakinlik ve dayanışmayla aşılabilir.',
        wrong: [
          'Trenler kışın hiç çalışmaz.',
          'İş görüşmeleri her zaman ertelenmelidir.',
          'Yaşlılar tren yolculuğunu gençlerden çok sever.',
        ],
        evidence: 'Trenin onun yürümesiyle daha çabuk gelmeyeceğini söyledi',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "rötarlı" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Gecikmeli',
        wrong: ['İptal edilmiş', 'Erken gelen', 'Tıklım tıklım dolu'],
        evidence: 'son trenin yirmi dakika rötarlı olduğunu bildiren tabelaya baktı',
      },
    ],
    scan: [
      { prompt: 'Kadının termosundaki içecek ne?', answer: 'ıhlamur' },
      { prompt: 'Kocası kaç yıl kondüktörlük yapmış?', answer: 'kırk' },
    ],
  },
  {
    id: 'kahve',
    title: 'Kahvenin Yolculuğu',
    genre: 'bilgi',
    use: 'test',
    text: `Kahvenin nasıl keşfedildiğine dair en bilinen hikâye Etiyopya'nın yaylalarında geçer. Anlatıya göre Kaldi adlı bir keçi çobanı, keçilerinin bir çalının kırmızı meyvelerini yedikten sonra gece boyunca uyumadan zıpladığını fark eder. Bu hikâyenin gerçek olup olmadığını bilmiyoruz; ama kahve bitkisinin anavatanının Etiyopya çevresi olduğu kabul ediliyor.

Kahveyi bugünkü gibi bir içeceğe dönüştürenler büyük olasılıkla Yemenliler oldu. Yemen'deki tasavvuf ehli, uzun gece ibadetlerinde uyanık kalmak için kahve içiyordu. Kızıldeniz kıyısındaki Muha limanı uzun yıllar kahve ticaretinin merkezi oldu. Kahve buradan Mekke'ye, Kahire'ye ve İstanbul'a yayıldı.

On altıncı yüzyılda İstanbul'da ilk kahvehaneler açıldı. Kahvehaneler kısa sürede şehrin en canlı mekânları arasına girdi. İnsanlar burada yalnızca kahve içmiyor; sohbet ediyor, haber alıp veriyor, tavla oynuyor, meddahların hikâyelerini dinliyordu. Bu canlılık her zaman hoş karşılanmadı. Yöneticiler zaman zaman kahvehanelerde dedikodunun ve muhalefetin büyüdüğünden kaygılanarak onları kapattı. Ama yasaklar uzun sürmedi; kahvenin cazibesi her seferinde galip geldi.

İstanbul'da kahvenin kendine özgü bir hazırlanış biçimi gelişti. Çok ince çekilen kahve, cezvede su ve isteğe göre şekerle birlikte yavaş yavaş pişirilir. Telvesi süzülmeden fincana dökülür ve köpüğü özenle korunur. Bu yöntem bugün bütün dünyada Türk kahvesi adıyla bilinir. Kahvenin yanında bir bardak su sunmak ve misafiri kahveyle sohbete davet etmek, bu kültürün parçalarıdır.

Kahve Osmanlı topraklarından Avrupa'ya da ulaştı. Venedikli tüccarlar kahveyi limanlarına getirdi; zamanla Londra'da, Paris'te, Viyana'da kahvehaneler açıldı. Bu mekânlar Avrupa'da da tartışmaların, gazetelerin ve iş anlaşmalarının buluşma noktası hâline geldi.

Bugün kahve dünyanın en çok ticareti yapılan ürünlerinden biri. Ama bir fincan kahvenin arkasında, bir çobanın merakından başlayıp kıtaları dolaşan uzun bir yolculuk yatıyor. Belki de bu yüzden kahve, yalnızca bir içecek değil; insanları bir araya getiren bir bahane olarak görülür.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Uzun yıllar kahve ticaretinin merkezi olan liman hangisidir?',
        correct: 'Muha',
        wrong: ['Venedik', 'İskenderiye', 'Cidde'],
        evidence: 'Kızıldeniz kıyısındaki Muha limanı uzun yıllar kahve ticaretinin merkezi oldu.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Yemen’deki tasavvuf ehli kahveyi neden içiyordu?',
        correct: 'Uzun gece ibadetlerinde uyanık kalmak için',
        wrong: ['İlaç olarak kullanmak için', 'Misafir ağırlamak için', 'Ticaret yapmak için'],
        evidence: 'uzun gece ibadetlerinde uyanık kalmak için kahve içiyordu.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Yöneticiler kahvehaneleri neden zaman zaman kapattı?',
        correct: 'Kahvehanelerde dedikodunun ve muhalefetin büyümesinden kaygılandıkları için',
        wrong: [
          'Kahve çok pahalandığı için',
          'Kahvehanelerde yangın çıktığı için',
          'Kahvenin sağlığa zararlı olduğu anlaşıldığı için',
        ],
        evidence: 'kahvehanelerde dedikodunun ve muhalefetin büyüdüğünden kaygılanarak onları kapattı.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Kahve, dünyaya yayılırken insanları bir araya getiren bir kültüre dönüştü.',
        wrong: [
          'Kaldi hikâyesinin doğru olduğu kanıtlanmıştır.',
          'Türk kahvesi Avrupa’da icat edilmiştir.',
          'Kahvehaneler açıldıkları her yerde yasak kalmıştır.',
        ],
        evidence: 'insanları bir araya getiren bir bahane olarak görülür.',
      },
      {
        kind: 'kelime',
        prompt: 'Metne göre "telve" nedir?',
        correct: 'Kahvenin süzülmeden fincana geçen posası',
        wrong: ['Kahvenin köpüğü', 'Kahveye katılan şeker', 'Cezvenin sapı'],
        evidence: 'Telvesi süzülmeden fincana dökülür',
      },
    ],
    scan: [
      { prompt: 'Keçi çobanının adı ne?', answer: 'Kaldi' },
      { prompt: 'Kahveyi Avrupa limanlarına getiren tüccarlar nereli?', answer: 'Venedikli' },
    ],
  },
  {
    id: 'ahtapot',
    title: 'Ahtapotun Zekâsı',
    genre: 'bilgi',
    use: 'test',
    text: `Denizlerin en tuhaf canlılarından biri sayılan ahtapot, ilk bakışta yalnızca kollardan oluşan yumuşak bir yığın gibi görünür. Ama bu görüntünün ardında, bilim insanlarını yıllardır şaşırtan bir zekâ saklıdır.

Ahtapotun vücudu bize alışık olduğumuz hayvanlardan çok farklı çalışır. Üç kalbi vardır: ikisi kanı solungaçlara pompalar, üçüncüsü bütün vücuda dağıtır. Kanı kırmızı değil mavidir; çünkü oksijeni taşıyan madde demir yerine bakır içerir. İskeleti olmadığı için, gagasından büyük olmayan hemen her deliğe sızabilir.

En dikkat çekici özelliği ise sinir sistemidir. Ahtapotun sinir hücrelerinin büyük bir kısmı beyninde değil, kollarındadır. Her kol bir ölçüde kendi kararlarını verebilir; dokunduğu şeyi tadabilir, bir kabuğu yoklayıp içinde yiyecek olup olmadığını anlayabilir. Beyin genel yönü belirler, kollar ayrıntıyı kendileri halleder. Bu yüzden ahtapotun düşünme biçimini, merkezden yönetilen bir ordudan çok birlikte çalışan bir ekibe benzetenler vardır.

Laboratuvar deneyleri bu zekânın sınırlarını yoklar. Ahtapotlar kapaklı kavanozları açmayı, labirentlerden çıkmayı ve basit bulmacaları çözmeyi öğrenebilir. Bazıları bakıcılarını tanır; sevmedikleri bir kişiye su püskürttükleri bile gözlemlenmiştir. Akvaryumlardan kaçıp gece komşu tanklara geçen, sabah da yerine dönen ahtapotlara dair anlatılar da vardır.

Ahtapotun bir başka yeteneği kılık değiştirmektir. Derisindeki özel hücreler sayesinde birkaç saniye içinde rengini, hatta yüzeyinin dokusunu değiştirebilir. Bir kayanın üzerinde kaya, yosunların arasında yosun olur. İlginçtir ki gözleri renkleri bizim gibi ayırt edemediği hâlde, çevresinin rengine bu kadar ustalıkla uyum sağlar. Bunun nasıl mümkün olduğu hâlâ tam olarak çözülebilmiş değil.

Bütün bu yeteneklere karşın ahtapotun ömrü kısadır; çoğu tür yalnızca bir iki yıl yaşar. Öğrendiklerini yavrularına aktaramaz, çünkü yavrular kendi başlarına büyür. Her ahtapot dünyayı neredeyse sıfırdan keşfetmek zorundadır. Belki de onu bu kadar etkileyici kılan şey budur: Bu zekâ, öğretmensiz ve kısa bir ömrün içine sığdırılmıştır.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Ahtapotun kanı neden mavidir?',
        correct: 'Oksijeni taşıyan madde bakır içerdiği için',
        wrong: ['Üç kalbi olduğu için', 'Derin denizde yaşadığı için', 'İskeleti olmadığı için'],
        evidence: 'çünkü oksijeni taşıyan madde demir yerine bakır içerir.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Ahtapotun sinir hücrelerinin büyük kısmı nerededir?',
        correct: 'Kollarında',
        wrong: ['Beyninde', 'Kalplerinde', 'Derisinde'],
        evidence: 'Ahtapotun sinir hücrelerinin büyük bir kısmı beyninde değil, kollarındadır.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Ahtapotun düşünme biçimi neden bir ekibe benzetiliyor?',
        correct: 'Kolları, beyinden bağımsız olarak ayrıntıya dair kararlar verebildiği için',
        wrong: [
          'Ahtapotlar sürü hâlinde yaşadığı için',
          'Üç kalbi birlikte çalıştığı için',
          'Akvaryumlarda başka ahtapotlarla anlaştığı için',
        ],
        evidence: 'Beyin genel yönü belirler, kollar ayrıntıyı kendileri halleder.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Ahtapot, kısa ve öğretmensiz ömrüne rağmen olağanüstü bir zekâ ve uyum yeteneği gösterir.',
        wrong: [
          'Ahtapotlar balıklardan çok daha uzun yaşar.',
          'Ahtapotlar insanlara karşı saldırgandır.',
          'Ahtapotlar renkleri insanlardan daha iyi görür.',
        ],
        evidence: 'Bu zekâ, öğretmensiz ve kısa bir ömrün içine sığdırılmıştır.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "yoklamak" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Dokunarak araştırmak, kontrol etmek',
        wrong: ['Yemek', 'Kırmak', 'Saklamak'],
        evidence: 'bir kabuğu yoklayıp içinde yiyecek olup olmadığını anlayabilir.',
      },
    ],
    scan: [
      { prompt: 'Ahtapotun kaç kalbi var?', answer: 'Üç' },
      { prompt: 'Kanında demir yerine hangi madde var?', answer: 'bakır' },
    ],
  },
  {
    id: 'kapadokya',
    title: 'Peribacalarının Hikâyesi',
    genre: 'bilgi',
    use: 'drill',
    text: `Kapadokya'yı ilk kez gören biri, bu toprakların başka bir gezegene ait olduğunu düşünebilir. Vadilerden yükselen, tepesinde şapka gibi bir kaya taşıyan sivri sütunlar yüzyıllardır yolcuları şaşırtıyor. Halk bu tuhaf biçimlere peribacası adını vermiş; bir zamanlar orada perilerin yaşadığına inanılırmış.

Peribacalarının hikâyesi milyonlarca yıl önce, bölgedeki yanardağlarla başlar. Erciyes, Hasandağı ve çevredeki diğer yanardağlar defalarca patlayarak bölgeyi kalın kül ve lav katmanlarıyla örttü. Küller zamanla sıkışarak tüf adı verilen yumuşak bir kayaya dönüştü. Tüfün üzerinde yer yer daha sert bir kaya tabakası kaldı.

Ardından su ve rüzgâr işe koyuldu. Yağmur suları ve eriyen karlar yumuşak tüfü kolayca aşındırırken sert tabakaya pek etki edemedi. Sert kaya parçasının altında kalan tüf korundu, çevresi ise yavaş yavaş oyuldu. Böylece tepesinde sert bir şapka taşıyan sütunlar ortaya çıktı. Şapka bir gün düşerse, korumasız kalan sütun da kısa sürede aşınıp yok olur.

Tüfün yumuşaklığı insanların da işine yaradı. Bölge halkı kayaları oyarak evler, ambarlar, güvercinlikler yaptı. Bizans döneminde keşişler kayalara kiliseler oydu ve duvarlarını renkli resimlerle süsledi. Derinkuyu ve Kaymaklı gibi yeraltı şehirleri, birkaç kat aşağıya inen tüneller ve odalarla tehlike zamanlarında binlerce insana sığınak oldu.

Bugün Kapadokya, sıcak hava balonlarının gün doğumunda vadilerin üzerinde süzüldüğü manzarasıyla ünlü. Ama bu manzaranın asıl ustası doğadır. Yanardağların ateşi, suyun sabrı ve insanların emeği bu toprakları birlikte biçimlendirdi.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Tüf nasıl oluştu?',
        correct: 'Yanardağ küllerinin zamanla sıkışmasıyla',
        wrong: ['Deniz kumunun birikmesiyle', 'Buzulların erimesiyle', 'Ağaçların taşlaşmasıyla'],
        evidence: 'Küller zamanla sıkışarak tüf adı verilen yumuşak bir kayaya dönüştü.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Yeraltı şehirleri neye hizmet etti?',
        correct: 'Tehlike zamanlarında sığınak oldu.',
        wrong: ['Maden olarak kullanıldı.', 'Pazar yeri oldu.', 'Okul olarak kullanıldı.'],
        evidence: 'tehlike zamanlarında binlerce insana sığınak oldu.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Bir peribacasının şapkası düşerse ne olur?',
        correct: 'Sütun korumasız kalır ve kısa sürede aşınır.',
        wrong: ['Sütun daha da uzar.', 'Hemen yeni bir şapka oluşur.', 'Hiçbir şey değişmez.'],
        evidence: 'Şapka bir gün düşerse, korumasız kalan sütun da kısa sürede aşınıp yok olur.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Kapadokya, yanardağların, aşınmanın ve insan emeğinin ortak eseridir.',
        wrong: [
          'Peribacalarını bölgede yaşayan insanlar yapmıştır.',
          'Kapadokya’da hiç yanardağ olmamıştır.',
          'Balonlar vadileri aşındırmaktadır.',
        ],
        evidence: 'Yanardağların ateşi, suyun sabrı ve insanların emeği bu toprakları birlikte biçimlendirdi.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "aşındırmak" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Yavaş yavaş yiyip eksiltmek',
        wrong: ['Boyamak', 'Yükseltmek', 'Sertleştirmek'],
        evidence: 'yumuşak tüfü kolayca aşındırırken sert tabakaya pek etki edemedi.',
      },
    ],
    scan: [
      { prompt: 'Erciyes dışında adı geçen yanardağ hangisi?', answer: 'Hasandağı' },
      { prompt: 'Adı geçen yeraltı şehirlerinden biri?', answer: 'Derinkuyu' },
    ],
  },
  {
    id: 'kutuphane',
    title: 'Köy Kütüphanesi',
    genre: 'öykü',
    use: 'drill',
    text: `Öğretmen Selma köye geldiğinde okulun tek odasında bir kara tahta, on iki sıra ve tozlu bir dolap vardı. Dolabın içinde ise yalnızca yırtık kapaklı üç kitap duruyordu. Çocuklar okumayı biliyordu ama okumayı sevmiyordu; onlar için harfler, tahtaya yazılıp silinen işaretlerden ibaretti.

Selma ilk hafta kimseye bir şey söylemedi. Her akşam okulun penceresinin önüne oturup yüksek sesle kitap okudu. Önce kimse aldırmadı. Sonra bir akşam, keçilerini otlaktan döndüren Hasan pencerenin dibinde durdu. Ertesi akşam yanında iki arkadaşı vardı. Bir hafta sonra pencerenin önü, hikâyenin devamını bekleyen çocuklarla doluydu.

Selma hikâyeyi hep en heyecanlı yerinde bırakıyor, gerisini merak edenlerin ertesi gün gelmesini söylüyordu. Bir gün Hasan dayanamadı ve kitabı ödünç istedi. Selma kitabı verdi ama bir şart koştu: Hasan okuduğu bölümü ertesi gün arkadaşlarına anlatacaktı. Hasan o gece lambanın ışığında kitabın yarısını bitirdi.

Kış gelince Selma şehirdeki arkadaşlarına mektup yazdı ve eski kitaplarını göndermelerini istedi. Koliler birer birer gelmeye başladı. Köylüler dolabın yetmeyeceğini görünce muhtarın izniyle okulun arkasındaki eski ambarı temizlediler. Marangoz Ali Usta raflar yaptı, kadınlar perdeler dikti. Ambarın kapısına çocuklar kendi elleriyle bir tabela astı: Köy Kütüphanesi.

Kütüphane her cumartesi açılıyordu. Kitap alan herkes, getirdiği kitabın en sevdiği cümlesini küçük bir deftere yazıyordu. Defter dolunca ikincisi, sonra üçüncüsü açıldı. Yıllar sonra köyden üniversiteye giden ilk öğrenci olan Hasan, mezuniyet töreninde bu defterlerden birini yanında taşıyordu.

Selma başka bir okula tayin olduğunda kütüphanede yedi yüzden fazla kitap vardı. Ama ona göre asıl başarı kitapların sayısı değildi. Köyden ayrıldığı akşam, okulun penceresinin önünde küçük bir çocuğa yüksek sesle kitap okuyan Hasan'ın kız kardeşini gördü.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Selma geldiğinde dolapta kaç kitap vardı?',
        correct: 'Üç',
        wrong: ['On iki', 'Yedi yüz', 'Hiç yoktu'],
        evidence: 'yırtık kapaklı üç kitap duruyordu.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Kütüphanenin raflarını kim yaptı?',
        correct: 'Marangoz Ali Usta',
        wrong: ['Hasan', 'Muhtar', 'Selma'],
        evidence: 'Marangoz Ali Usta raflar yaptı',
      },
      {
        kind: 'çıkarım',
        prompt: 'Selma hikâyeyi neden hep en heyecanlı yerde bırakıyordu?',
        correct: 'Çocuklar merak edip ertesi gün yeniden gelsin diye',
        wrong: ['Çabuk yorulduğu için', 'Kitabın sonu olmadığı için', 'Hava karardığı için'],
        evidence: 'gerisini merak edenlerin ertesi gün gelmesini söylüyordu.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Öykünün ana düşüncesi hangisidir?',
        correct: 'Okuma sevgisi zorlamayla değil, merak uyandırarak ve örnek olarak kazandırılır.',
        wrong: [
          'Köylere kitap göndermenin bir yararı yoktur.',
          'Öğretmenlerin kendi kitaplarını yazması gerekir.',
          'Bir kütüphanenin en önemli yanı binasıdır.',
        ],
        evidence: 'Ama ona göre asıl başarı kitapların sayısı değildi.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "tayin olmak" ifadesi hangi anlamda kullanılmıştır?',
        correct: 'Görev yeri değiştirilmek',
        wrong: ['Emekli olmak', 'Ödül almak', 'Hastalanmak'],
        evidence: 'Selma başka bir okula tayin olduğunda',
      },
    ],
    scan: [
      { prompt: 'Keçilerini otlaktan döndüren çocuğun adı?', answer: 'Hasan' },
      { prompt: 'Kütüphane hangi gün açılıyordu?', answer: 'cumartesi' },
    ],
  },
];

export const TEST_PASSAGES = PASSAGES.filter((passage) => passage.use === 'test');

export function passageById(id: string | undefined): Passage | undefined {
  return PASSAGES.find((passage) => passage.id === id);
}

/**
 * Egzersizlerde kullanılabilecek metinler: egzersiz metinleri + kullanıcının
 * daha önce test olarak okuduğu metinler. Henüz test edilmemiş bir metni
 * egzersizde göstermek, o metinle yapılacak ölçümü "tanıdıklık" ile şişirirdi.
 */
export function practicePassages(testedIds: Iterable<string>): Passage[] {
  const tested = new Set(testedIds);
  return PASSAGES.filter((passage) => passage.use === 'drill' || tested.has(passage.id));
}
