import type { Passage } from './passages';

/**
 * Zor seviye test metinleri (Ateşman 30–49: uzun cümleler, soyut ve çok heceli
 * kelimeler). Kurallar `passages.ts` ile aynı; doğrulama `passages.test.ts`.
 */
export const HARD_PASSAGES: Passage[] = [
  {
    id: 'unutma',
    title: 'Unutmanın Eğrisi',
    genre: 'bilgi',
    use: 'test',
    level: 'zor',
    text: `On dokuzuncu yüzyılın sonlarında Alman psikolog Hermann Ebbinghaus, belleğin nasıl çalıştığını deneysel yöntemlerle incelemeye karar verdi. Araştırmasının tek deneği olarak da kendisini seçti. Önceden bildiği kelimelerin sonuçları çarpıtmasını önlemek amacıyla anlamsız hece dizileri oluşturdu. Bu dizileri ezberledi ve belirli aralıklarla ne kadarını hatırladığını titizlikle kaydetti.

Elde ettiği sonuçlar, bugün unutma eğrisi olarak bilinen düzenliliği ortaya koydu. Buna göre öğrenilen bilginin önemli bir bölümü ilk saatler ve günler içinde hızla kaybediliyor, ardından kayıp giderek yavaşlıyordu. Başka bir deyişle unutma, zamana eşit biçimde yayılan bir süreç değildi. Başlangıçta hızlanan ve sonra durulan bir eğilim gösteriyordu.

Ebbinghaus'un belki daha da önemli gözlemi, tekrarların zamanlamasıyla ilgiliydi. Aynı sayıda tekrarın tek oturumda yığılması yerine günlere yayılması durumunda bilginin çok daha kalıcı olduğunu fark etti. Aralıklı tekrar etkisi adı verilen bu bulgu, sonraki yüzyılda sayısız araştırmayla doğrulanmıştır. Bugün eğitim bilimlerinin en sağlam sonuçlarından biri hâline gelmiştir.

Sonraki araştırmacılar, yalnızca tekrarın değil, hatırlamaya çalışmanın da belleği güçlendirdiğini gösterdiler. Bir metni yeniden okumak, okuyana bilgiyi tanıdık gösterdiği için öğrenmiş olma yanılsaması yaratabilir. Oysa kitabı kapatıp hatırladıklarını yazmaya çalışmak, ilk bakışta daha zahmetli görünse de bilginin uzun süreli bellekte yerleşmesine belirgin biçimde katkıda bulunmaktadır.

Bu bulguların okuma alışkanlığı açısından doğurduğu sonuç oldukça açıktır. Bir kitabı hızla bitirmek, okunanın kalıcı olacağı anlamına gelmez. Okuduktan kısa bir süre sonra ana fikirleri kendi cümleleriyle özetlemek, önemli bölümlere birkaç gün arayla geri dönmek ve öğrenilenleri başkasına anlatmak, unutma eğrisinin dik düşüşünü yumuşatmanın en güvenilir yollarıdır.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Ebbinghaus deneylerinde neden anlamsız hece dizileri kullandı?',
        correct: 'Önceden bildiği kelimelerin sonuçları çarpıtmaması için',
        wrong: [
          'Anlamsız heceler daha kolay ezberlendiği için',
          'Deneklerin dilini bilmediği için',
          'Kelime listeleri o dönemde yasak olduğu için',
        ],
        evidence: 'Önceden bildiği kelimelerin sonuçları çarpıtmasını önlemek amacıyla',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Unutma eğrisine göre bilgi en hızlı ne zaman kaybedilir?',
        correct: 'İlk saatler ve günler içinde',
        wrong: ['Aylar sonra', 'Yıllar içinde eşit biçimde', 'Ancak tekrar yapılmazsa bir hafta sonra'],
        evidence: 'ilk saatler ve günler içinde hızla kaybediliyor',
      },
      {
        kind: 'çıkarım',
        prompt: 'Sınava altı saat çalışacak bir öğrenciye metne göre ne önerilir?',
        correct: 'Çalışmayı birkaç güne yayması',
        wrong: [
          'Altı saati sınavdan önceki geceye toplaması',
          'Metni olabildiğince çok kez yeniden okuması',
          'Yalnızca anlamsız hecelerle çalışması',
        ],
        evidence: 'günlere yayılması durumunda bilginin çok daha kalıcı olduğunu fark etti',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Bilgiyi kalıcı kılan, aralıklı tekrar ve hatırlamaya çalışmaktır.',
        wrong: [
          'Unutma, zamana eşit biçimde yayılan bir süreçtir.',
          'Bir kitabı hızla bitirmek, okunanı kalıcı kılmanın en iyi yoludur.',
          'Bellek araştırmaları ancak birçok denekle yapılabilir.',
        ],
        evidence: 'unutma eğrisinin dik düşüşünü yumuşatmanın en güvenilir yollarıdır',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "yanılsama" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Gerçekte olmayan bir şeyi var sanma',
        wrong: ['Ayrıntılı inceleme', 'Kesin bilgi', 'Hızlı tekrar'],
        evidence: 'öğrenmiş olma yanılsaması yaratabilir',
      },
    ],
    scan: [
      { prompt: 'Ebbinghaus hangi ülkedendi?', answer: 'Alman' },
      { prompt: 'Tekrarları günlere yaymanın etkisine ne ad verilir?', answer: 'Aralıklı tekrar etkisi' },
    ],
  },
  {
    id: 'sinan',
    title: 'Mimar Sinan ve Kubbe',
    genre: 'bilgi',
    use: 'test',
    level: 'zor',
    text: `Mimar Sinan, Osmanlı mimarisinin en tanınmış ismidir. Uzun meslek hayatı boyunca camilerden köprülere, medreselerden hamamlara kadar yüzlerce yapının inşasında görev almıştır. Böylece İstanbul'dan Edirne'ye uzanan geniş bir coğrafyanın görünümünü kalıcı biçimde değiştirmiştir.

Sinan'ın mimarlığa giden yolu alışılmışın dışındadır. Gençliğinde devşirme olarak yeniçeri ocağına alınmıştır. Katıldığı seferlerde köprü ve gemi yapımı gibi mühendislik gerektiren işlerde edindiği deneyim sayesinde dikkat çekmiştir. Sonunda da sarayın mimarlık örgütünün başına, yani mimarbaşılığa getirilmiştir. Sahada kazanılan bu pratik bilgi, onun yapılarında sağlamlık ile zarafeti bir arada gözetmesinin temelini oluşturmuştur.

Sinan'ın mimari arayışının merkezinde, geniş bir iç mekânı tek bir büyük kubbeyle örtme problemi yer alır. Kubbenin ağırlığı ve yanlara doğru uyguladığı itki, taşıyıcı duvarların kalınlaştırılmasını gerektirir. Bu yüzden mimarlar iç mekânı aydınlık ve ferah tutmakla yapıyı ayakta tutmak arasında sürekli bir denge kurmak zorundaydı. Sinan yarım kubbeler, ağırlık kuleleri ve payeler gibi elemanları ustalıkla düzenleyerek yükü dağıtmıştır. Bu sayede duvarlarda çok sayıda pencere açabilmiştir.

Rivayete göre Sinan, İstanbul'daki Şehzade Camii'ni çıraklık, Süleymaniye Camii'ni kalfalık, Edirne'deki Selimiye Camii'ni ise ustalık eseri olarak nitelendirmiştir. Bu sıralama, bir sanatçının olgunlaşma sürecini yansıtması bakımından anlamlıdır. Selimiye'de kubbe, sekiz payeye oturan ve mekânın neredeyse tamamını tek bir bütün hâlinde kavrayan bir düzenle sunulmuştur.

Sinan'ın yapıları yüzyıllar boyunca depremlere rağmen ayakta kalmıştır. Bu durum, onun yalnızca estetik bir dehaya değil, aynı zamanda malzemeyi, zemini ve yük dağılımını derinlemesine kavrayan bir mühendislik sezgisine de sahip olduğunu göstermektedir.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Sinan mühendislik deneyimini nerede edindi?',
        correct: 'Katıldığı seferlerde, köprü ve gemi yapımında',
        wrong: [
          'Avrupa’daki mimarlık okullarında',
          'Saraydaki kütüphanede kitap okuyarak',
          'Babasının yanında çıraklık yaparak',
        ],
        evidence: 'seferlerde köprü ve gemi yapımı gibi mühendislik gerektiren işlerde',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Rivayete göre Sinan hangi yapıyı ustalık eseri saymıştır?',
        correct: 'Selimiye Camii',
        wrong: ['Süleymaniye Camii', 'Şehzade Camii', 'Ayasofya'],
        evidence: 'Edirne\'deki Selimiye Camii\'ni ise ustalık eseri olarak nitelendirmiştir',
      },
      {
        kind: 'çıkarım',
        prompt: 'Sinan’ın yük dağıtma yöntemleri iç mekânı nasıl etkilemiştir?',
        correct: 'Duvarlara çok pencere açılabildiği için mekân aydınlanmıştır.',
        wrong: [
          'Duvarlar kalınlaştığı için mekân karanlıklaşmıştır.',
          'Kubbe küçüldüğü için mekân daralmıştır.',
          'Pencereler kapatıldığı için yapı serinlemiştir.',
        ],
        evidence: 'duvarlarda çok sayıda pencere açabilmiştir',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Sinan, estetik ile mühendislik bilgisini birleştirerek büyük kubbe sorununu çözmüştür.',
        wrong: [
          'Sinan yalnızca cami tasarlamış bir mimardır.',
          'Osmanlı yapıları depremlere karşı dayanıksızdır.',
          'Sinan’ın en iyi eseri Şehzade Camii’dir.',
        ],
        evidence: 'malzemeyi, zemini ve yük dağılımını derinlemesine kavrayan bir mühendislik sezgisine',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "itki" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Bir yüzeye yandan uygulanan zorlama, kuvvet',
        wrong: ['Yapının süslemesi', 'Kubbenin yüksekliği', 'Duvarın rengi'],
        evidence: 'yanlara doğru uyguladığı itki',
      },
    ],
    scan: [
      { prompt: 'Selimiye’de kubbe kaç payeye oturur?', answer: 'sekiz payeye' },
      { prompt: 'Sinan gençliğinde hangi ocağa alındı?', answer: 'yeniçeri ocağına' },
    ],
  },
  {
    id: 'lidya',
    title: 'Paranın Doğuşu',
    genre: 'bilgi',
    use: 'test',
    level: 'zor',
    text: `İnsanlık tarihinin uzun bir döneminde ekonomik ilişkiler, malların doğrudan birbiriyle değiştirildiği takas yöntemine dayanıyordu. Ancak bu yöntem, değiş tokuş yapmak isteyen iki tarafın aynı anda birbirinin ihtiyaç duyduğu ürüne sahip olmasını gerektirdiğinden ticaretin önünde ciddi bir engeldi.

Bu sorunu aşmak amacıyla farklı toplumlar, değeri genel olarak kabul edilen nesneleri aracı olarak kullanmaya başladı. Tahıl, tuz, deniz kabukları ve değerli madenler, farklı dönemlerde bu işlevi üstlenen nesneler arasında yer aldı. Ne var ki madenlerin her alışverişte yeniden tartılması gerekiyordu. Saflıklarının sınanması da işlemleri hem yavaşlatıyor hem de hileye açık hâle getiriyordu.

Tarihçilerin büyük çoğunluğuna göre bu soruna kalıcı çözüm, Batı Anadolu'da hüküm süren Lidya Krallığı'nda bulundu. Milattan önce yedinci yüzyılda Lidyalılar, altın ve gümüşün doğal bir alaşımı olan elektrumdan belirli ağırlıkta parçalar hazırladılar. Ardından bunların üzerine, değerini gösteren devlet damgasını basmaya başladılar. Damga, sikkenin ağırlığını ve değerini devletin güvencesi altına alıyordu. Böylece alıcı ile satıcının her seferinde tartı ve sınama yapmasına gerek kalmıyordu.

Bu yenilik kısa sürede çevre bölgelere yayıldı ve Yunan şehir devletlerinden Pers İmparatorluğu'na kadar geniş bir alanda benimsendi. Standart sikke, uzak mesafeler arasında ticareti kolaylaştırmakla kalmadı. Vergi toplanmasını ve askerlere ücret ödenmesini de düzenli hâle getirerek devletlerin örgütlenme biçimini dönüştürdü.

Paranın sonraki tarihi, değerin giderek soyutlaştığı bir süreç olarak okunabilir. Madenî sikkelerin ardından kâğıt para, ardından da bugünkü elektronik kayıtlar ortaya çıktı. Bu dönüşümün her aşamasında paranın işlevini sürdürebilmesi, temelde aynı unsura, yani toplumun o araca duyduğu güvene bağlı kalmıştır.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Lidyalıların ilk sikkeleri hangi madenden yapılmıştı?',
        correct: 'Elektrumdan',
        wrong: ['Saf bakırdan', 'Demirden', 'Kurşundan'],
        evidence: 'altın ve gümüşün doğal bir alaşımı olan elektrumdan',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Takas yönteminin temel sorunu neydi?',
        correct: 'İki tarafın aynı anda birbirinin istediği ürüne sahip olması gerekiyordu.',
        wrong: [
          'Takas devlet tarafından yasaklanmıştı.',
          'Ürünler taşınırken bozuluyordu.',
          'Tüccarlar yazı bilmiyordu.',
        ],
        evidence: 'aynı anda birbirinin ihtiyaç duyduğu ürüne sahip olmasını gerektirdiğinden',
      },
      {
        kind: 'çıkarım',
        prompt: 'Sikkenin üzerindeki damga alışverişi neden hızlandırdı?',
        correct: 'Değeri devlet güvence altına aldığı için tartmaya gerek kalmadı.',
        wrong: [
          'Damga sikkeyi daha parlak gösterdiği için',
          'Damgalı sikkeler daha hafif olduğu için',
          'Damga, sikkenin hangi tüccara ait olduğunu gösterdiği için',
        ],
        evidence: 'her seferinde tartı ve sınama yapmasına gerek kalmıyordu',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Para, ticaretin sorunlarını çözen ve güvene dayanan bir araç olarak gelişmiştir.',
        wrong: [
          'Takas, paradan daha adil bir yöntemdir.',
          'Kâğıt para ilk kez Lidya’da kullanılmıştır.',
          'Paranın değeri yalnızca içindeki madenden gelir.',
        ],
        evidence: 'toplumun o araca duyduğu güvene bağlı kalmıştır',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "alaşım" kelimesi neyi anlatır?',
        correct: 'İki ya da daha çok madenin karışımı',
        wrong: ['Paranın üzerindeki resim', 'Bir ölçü birimi', 'Madenin çıkarıldığı yer'],
        evidence: 'altın ve gümüşün doğal bir alaşımı',
      },
    ],
    scan: [
      { prompt: 'Lidya Krallığı nerede hüküm sürüyordu?', answer: 'Batı Anadolu' },
      { prompt: 'Lidyalılar sikke basmaya hangi yüzyılda başladı?', answer: 'Milattan önce yedinci yüzyılda' },
    ],
  },
  {
    id: 'penisilin',
    title: 'Antibiyotiklerin Sınırı',
    genre: 'bilgi',
    use: 'test',
    level: 'zor',
    text: `İskoç bilim insanı Alexander Fleming, 1928 yılında laboratuvarında unuttuğu bakteri kültürlerinden birinde beklenmedik bir durum fark etti. Kabın içine kazara bulaşmış bir küf mantarının çevresinde bakteriler üreyememişti. Fleming, bu küfün salgıladığı maddeye penisilin adını verdi. Ancak maddenin saflaştırılıp geniş ölçekte üretilmesi, başka araştırmacıların katkılarıyla yıllar sonra mümkün oldu.

Antibiyotikler sayesinde, daha önce sıklıkla ölümle sonuçlanan pek çok enfeksiyon tedavi edilebilir hâle geldi. Bu gelişme, modern tıbbın en büyük başarılarından biri sayıldı. Ameliyatlar, doğumlar ve kanser tedavileri gibi enfeksiyon riskinin yüksek olduğu birçok uygulama, büyük ölçüde etkili antibiyotiklerin varlığına dayanmaktadır.

Ne var ki Fleming daha Nobel ödülünü aldığı konuşmasında bir uyarıda bulunmuştu. Ona göre ilacın yanlış ve yetersiz kullanımı, bakterilerin dirençli hâle gelmesine yol açabilirdi. Bu uyarının arkasındaki mekanizma, doğal seçilimin işleyişiyle açıklanır. Bir antibiyotik uygulandığında duyarlı bakteriler ölür. Oysa rastlantısal değişiklikler sayesinde ilaca dayanabilen az sayıdaki bakteri hayatta kalır ve çoğalarak yeni nesillere bu özelliği aktarır.

Gereksiz durumlarda, örneğin antibiyotiklerin etkisiz olduğu viral enfeksiyonlarda ilaç kullanmak bu süreci hızlandırır. Tedaviyi hekimin önerdiği süreden önce yarıda bırakmak da başlıca etkenler arasında sayılır. Hayvancılıkta antibiyotiklerin yaygın kullanımı da sorunun büyümesine katkıda bulunmaktadır.

Dünya Sağlık Örgütü, antibiyotik direncini küresel halk sağlığını tehdit eden en ciddi sorunlardan biri olarak tanımlamaktadır. Bu nedenle uzmanlar, yeni ilaçların geliştirilmesi kadar mevcut antibiyotiklerin bilinçli kullanılmasının da hayati önem taşıdığını vurgulamaktadır. Aksi takdirde basit enfeksiyonlar yeniden tedavisi güç hastalıklara dönüşebilir.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Fleming küfün etkisini nasıl fark etti?',
        correct: 'Küfün çevresinde bakterilerin üreyemediğini gördü.',
        wrong: [
          'Bir hastayı küfle tedavi ederek',
          'Küfü bilerek bakterilerle karıştırarak',
          'Başka bir bilim insanının makalesini okuyarak',
        ],
        evidence: 'küf mantarının çevresinde bakteriler üreyememişti',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Metne göre antibiyotikler hangi enfeksiyonlarda etkisizdir?',
        correct: 'Viral enfeksiyonlarda',
        wrong: ['Bakteriyel enfeksiyonlarda', 'Ameliyat sonrası enfeksiyonlarda', 'Hiçbirinde'],
        evidence: 'antibiyotiklerin etkisiz olduğu viral enfeksiyonlarda',
      },
      {
        kind: 'çıkarım',
        prompt: 'Tedaviyi erken bırakmak neden dirence yol açabilir?',
        correct: 'Dayanıklı bakteriler hayatta kalıp çoğalabilir.',
        wrong: [
          'İlaç vücutta zehre dönüşür.',
          'Bakteriler ilacı yiyerek beslenir.',
          'Virüsler bakterilere dönüşür.',
        ],
        evidence: 'ilaca dayanabilen az sayıdaki bakteri hayatta kalır ve çoğalarak',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Antibiyotikler büyük bir başarıdır ama bilinçsiz kullanım etkilerini tehdit eder.',
        wrong: [
          'Penisilin artık hiçbir hastalıkta işe yaramamaktadır.',
          'Fleming antibiyotik direncinden habersizdi.',
          'Antibiyotik direnci yalnızca hayvancılıktan kaynaklanır.',
        ],
        evidence: 'mevcut antibiyotiklerin bilinçli kullanılmasının da hayati önem taşıdığını',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "rastlantısal" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Tesadüfen ortaya çıkan',
        wrong: ['Bilerek planlanmış', 'Her zaman tekrarlanan', 'Hekimce önerilen'],
        evidence: 'rastlantısal değişiklikler sayesinde',
      },
    ],
    scan: [
      { prompt: 'Fleming penisilini hangi yıl fark etti?', answer: '1928' },
      { prompt: 'Antibiyotik direncini küresel tehdit olarak tanımlayan kurum?', answer: 'Dünya Sağlık Örgütü' },
    ],
  },
  {
    id: 'pirireis',
    title: 'Piri Reis’in Haritası',
    genre: 'bilgi',
    use: 'test',
    level: 'zor',
    text: `Piri Reis, Osmanlı donanmasında görev yapmış bir denizci ve haritacıdır. 1513 yılında ceylan derisi üzerine çizdiği dünya haritasıyla, harita tarihinin en çok tartışılan belgelerinden birini yapmıştır. Haritanın günümüze ulaşan parçası, Atlas Okyanusu'nu, Avrupa ile Afrika'nın batı kıyılarını ve Güney Amerika'nın doğu kıyılarını göstermektedir.

Haritayı değerli kılan bir özellik, kaynakların açıkça belirtilmesidir. Piri Reis bunları haritaya kendi el yazısıyla not düşmüştür. Bu notlara göre harita, yaklaşık yirmi kaynaktan yararlanılarak derlenmiştir. Bu kaynaklar arasında eski dönemlere ait haritalar ve Kristof Kolomb'un çizdiği bir harita da vardır. Kolomb'un kendi haritası günümüze ulaşmamıştır. Bu yüzden Piri Reis'in çalışması bu kayıp belgenin izlerini taşıyan ender kaynaklardan biri olarak ayrı bir önem kazanmaktadır.

Haritanın 1929 yılında İstanbul'daki Topkapı Sarayı'nda yeniden bulunması, uluslararası bilim çevrelerinde büyük ilgi uyandırmıştır. Bazı popüler yayınlar, haritanın olağanüstü bilgiler içerdiğini iddia etmiştir. Oysa tarihçilerin büyük çoğunluğu haritanın değerini döneminin bilgisini titizlikle derleyen bir belge olmasında görmektedir.

Piri Reis'in haritacılık dışındaki en önemli eseri ise Kitab-ı Bahriye adlı denizcilik kılavuzudur. Bu eser Akdeniz'in kıyılarını, limanlarını, sığlıklarını ve rüzgârlarını ayrıntılı biçimde anlatır. Denizcilerin güvenli rotalar belirlemesine yardım etmek amacıyla yazılmış, çok sayıda ayrıntılı haritayla desteklenmiştir. Eser, yüzyıllar boyunca kopyalanarak denizciler arasında elden ele dolaşmıştır.

Piri Reis'in çalışmaları günümüzde de öğretici bir örnektir. Bilginin farklı kültürlerden derlenip eleştirel bir gözle birleştirilmesinin ne denli verimli olabileceğini gösterir.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Piri Reis haritasını neyin üzerine çizmişti?',
        correct: 'Ceylan derisi üzerine',
        wrong: ['Kâğıt üzerine', 'İpek kumaş üzerine', 'Bakır levha üzerine'],
        evidence: 'ceylan derisi üzerine çizdiği dünya haritasıyla',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Harita 1929 yılında nerede yeniden bulundu?',
        correct: 'Topkapı Sarayı’nda',
        wrong: ['Venedik’te', 'Kahire’de', 'Gelibolu’da'],
        evidence: 'İstanbul\'daki Topkapı Sarayı\'nda yeniden bulunması',
      },
      {
        kind: 'çıkarım',
        prompt: 'Harita Kolomb araştırmaları için neden önemlidir?',
        correct: 'Kolomb’un kayıp haritasının izlerini taşıyabildiği için',
        wrong: [
          'Kolomb’un kendi el yazısını içerdiği için',
          'Kolomb’un yolculuğuna katılan biri çizdiği için',
          'Kolomb’un gemisinde bulunduğu için',
        ],
        evidence: 'bu kayıp belgenin izlerini taşıyan ender kaynaklardan biri',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Piri Reis, farklı kaynakları titizlikle derleyerek değerli eserler ortaya koymuştur.',
        wrong: [
          'Piri Reis haritası olağanüstü ve açıklanamaz bilgiler içerir.',
          'Piri Reis yalnızca Akdeniz’i dolaşmış bir kaptandır.',
          'Kitab-ı Bahriye bir dünya haritasıdır.',
        ],
        evidence: 'döneminin bilgisini titizlikle derleyen bir belge olmasında',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "derlenmiştir" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Çeşitli kaynaklardan toplanıp bir araya getirilmiştir',
        wrong: ['Yeniden boyanmıştır', 'Başka dile çevrilmiştir', 'Gizlenmiştir'],
        evidence: 'yaklaşık yirmi kaynaktan yararlanılarak derlenmiştir',
      },
    ],
    scan: [
      { prompt: 'Piri Reis haritasını hangi yıl çizdi?', answer: '1513' },
      { prompt: 'Piri Reis’in denizcilik kılavuzunun adı?', answer: 'Kitab-ı Bahriye' },
    ],
  },
  {
    id: 'mercan',
    title: 'Mercanların Rengi',
    genre: 'bilgi',
    use: 'test',
    level: 'zor',
    text: `Mercan resifleri, tropikal denizlerin sığ ve berrak sularında yükselir. Kapladıkları alan okyanusların çok küçük bir bölümüne karşılık gelmesine rağmen, deniz canlılarının dikkate değer bir kısmına barınak ve besin sağlayan, gezegenin biyolojik çeşitlilik bakımından en zengin ekosistemleri arasında yer almaktadır.

İlk bakışta bir kaya ya da bitki gibi görünen mercanlar, aslında polip adı verilen küçük hayvanların oluşturduğu kolonilerdir. Bu poliplerin dokularında, fotosentez yapabilen mikroskobik algler yaşar. Algler, güneş ışığından ürettikleri besinin önemli bir kısmını mercana aktarırken, mercan da onlara korunaklı bir yaşam alanı ve fotosentez için gereken bazı maddeleri sağlar. Mercanların göz alıcı renklerinin büyük bölümü de bu ortak yaşamın bir sonucudur.

Ne var ki bu karşılıklı ilişki, deniz suyu sıcaklığındaki değişimlere karşı son derece hassastır. Su sıcaklığı alışılmış düzeyin üzerinde uzun süre kaldığında, strese giren mercanlar dokularındaki algleri dışarı atar. Renk veren algler ortadan kalktığından, mercanın beyaz kireç iskeleti saydam dokunun altından görünür hâle gelir. Bilim insanları bu olaya mercan ağarması adını vermektedir.

Ağarma, mercanın hemen öldüğü anlamına gelmez. Koşullar kısa sürede düzelirse algler geri dönebilir ve koloni toparlanabilir. Ancak yüksek sıcaklıkların uzun sürmesi ya da sık tekrarlanması durumunda, temel besin kaynağından yoksun kalan mercanlar zayıflar, hastalıklara karşı savunmasızlaşır ve sonunda ölebilir.

Son on yıllarda geniş alanları etkileyen ağarma olaylarının sıklaşması, deniz bilimcileri iklim değişikliğinin okyanuslar üzerindeki etkilerini daha yakından izlemeye yöneltmiştir. Çünkü mercan resiflerinin kaybı, yalnızca bir türün değil, ona bağlı binlerce canlının ve kıyı topluluklarının geleceğini ilgilendirmektedir.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Mercanlar aslında nedir?',
        correct: 'Polip adlı küçük hayvanların kolonileri',
        wrong: ['Deniz dibinde büyüyen bitkiler', 'Kireçli kaya parçaları', 'Dev yosun türleri'],
        evidence: 'polip adı verilen küçük hayvanların oluşturduğu kolonilerdir',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Mercan ağarmasında mercan neyi dışarı atar?',
        correct: 'Dokularındaki algleri',
        wrong: ['Kireç iskeletini', 'Yumurtalarını', 'Deniz suyunu'],
        evidence: 'strese giren mercanlar dokularındaki algleri dışarı atar',
      },
      {
        kind: 'çıkarım',
        prompt: 'Ağarmış bir mercan için hangisi söylenebilir?',
        correct: 'Koşullar çabuk düzelirse yeniden toparlanabilir.',
        wrong: [
          'Ağarır ağarmaz ölmüştür.',
          'Daha çok besin üretmeye başlamıştır.',
          'Soğuk sudan zarar görmüştür.',
        ],
        evidence: 'kısa sürede düzelirse algler geri dönebilir ve koloni toparlanabilir',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Mercanlarla algler arasındaki hassas ortak yaşam, ısınan sularla tehlikeye girmektedir.',
        wrong: [
          'Mercan resifleri okyanusların büyük bölümünü kaplar.',
          'Mercanların rengi kireç iskeletlerinden gelir.',
          'Algler mercanlara zarar veren asalaklardır.',
        ],
        evidence: 'deniz suyu sıcaklığındaki değişimlere karşı son derece hassastır',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "savunmasızlaşır" kelimesi ne anlama gelir?',
        correct: 'Kendini koruyamaz hâle gelir',
        wrong: ['Daha da güçlenir', 'Yer değiştirir', 'Rengini korur'],
        evidence: 'hastalıklara karşı savunmasızlaşır',
      },
    ],
    scan: [
      { prompt: 'Poliplerin dokularında hangi canlılar yaşar?', answer: 'mikroskobik algler' },
      { prompt: 'Bilim insanları bu olaya ne ad verir?', answer: 'mercan ağarması' },
    ],
  },
  {
    id: 'dil',
    title: 'Dillerin Değişimi',
    genre: 'bilgi',
    use: 'test',
    level: 'zor',
    text: `Konuştuğumuz dil, kuşaktan kuşağa aktarılırken hiçbir zaman olduğu gibi korunmaz; seslerden kelimelerin anlamlarına, cümle yapısından deyimlere kadar her düzeyde yavaş ama kesintisiz bir değişim geçirir. Bu değişim çoğu zaman konuşanlar tarafından fark edilmez, çünkü tek bir insan ömrü içinde gerçekleşen dönüşümler genellikle küçük ve dağınıktır.

Değişimin en kolay gözlemlenebilen biçimlerinden biri, başka dillerden kelime ödünçlenmesidir. Ticaret, din, bilim ve teknoloji yoluyla temas kuran toplumlar, birbirlerinin dillerinden yeni kavramları karşılayan kelimeler alırlar. Türkçenin tarih boyunca Arapçadan, Farsçadan, Fransızcadan ve son dönemde İngilizceden aldığı kelimeler, bu temasların dildeki somut izleri olarak değerlendirilebilir.

Daha az fark edilen bir değişim türü ise anlam kaymasıdır. Bir kelime, zaman içinde anlamını genişletebilir, daraltabilir ya da tamamen farklı bir kavramı karşılamaya başlayabilir. Yeni bir teknolojinin ortaya çıkması, eski bir kelimeye yeni bir anlam yüklenmesine yol açabileceği gibi, toplumsal tutumlardaki değişimler de kelimelerin olumlu ya da olumsuz çağrışımlarını dönüştürebilir.

Dilbilimciler, bu değişimleri bozulma olarak değil, dilin yaşayan bir sistem olmasının doğal sonucu olarak görmektedir. Her kuşak, dili kendi ihtiyaçlarına göre yeniden biçimlendirirken, dilin temel işlevi olan anlaşmayı sağlama gücü korunur. Nitekim günümüzde yanlış kabul edilen bazı kullanımların, gelecekte doğru sayılması da dil tarihinde sıkça rastlanan bir durumdur.

Bu bakış açısı, eski metinleri okurken karşılaşılan zorlukları da açıklamaktadır. Birkaç yüzyıl önce yazılmış bir metni anlamakta güçlük çekmemizin nedeni, yalnızca bilinmeyen kelimeler değil, tanıdık görünen kelimelerin o dönemde taşıdığı farklı anlamlardır.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Metne göre dil değişimi neden çoğu zaman fark edilmez?',
        correct: 'Bir insan ömründeki değişimler küçük ve dağınık olduğu için',
        wrong: [
          'Dil değişimi yalnızca yazıda görüldüğü için',
          'Değişimler devlet eliyle gizlendiği için',
          'Değişim yüzyıllarda bir kez olduğu için',
        ],
        evidence: 'tek bir insan ömrü içinde gerçekleşen dönüşümler genellikle küçük ve dağınıktır',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Metinde değişimin en kolay gözlemlenen biçimi hangisi olarak geçer?',
        correct: 'Başka dillerden kelime ödünçlenmesi',
        wrong: ['Anlam kayması', 'Ses değişimi', 'Cümle yapısının değişmesi'],
        evidence: 'başka dillerden kelime ödünçlenmesidir',
      },
      {
        kind: 'çıkarım',
        prompt: 'Eski bir metindeki tanıdık bir kelime neden yanıltıcı olabilir?',
        correct: 'O dönemde farklı bir anlam taşımış olabilir.',
        wrong: [
          'Eski metinlerde kelimeler yanlış yazılmıştır.',
          'Eski metinler başka dillerden çevrilmiştir.',
          'Tanıdık kelimeler eski metinlerde hiç geçmez.',
        ],
        evidence: 'tanıdık görünen kelimelerin o dönemde taşıdığı farklı anlamlardır',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Dil, yaşayan bir sistem olarak sürekli ve doğal biçimde değişir.',
        wrong: [
          'Başka dillerden kelime almak dili bozar.',
          'Türkçe yalnızca İngilizceden etkilenmiştir.',
          'Dil değişimi anlaşmayı giderek zorlaştırır.',
        ],
        evidence: 'dilin yaşayan bir sistem olmasının doğal sonucu olarak görmektedir',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "çağrışım" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Bir kelimenin akla getirdiği duygu ve düşünceler',
        wrong: ['Kelimenin yazılışı', 'Kelimenin kökeni', 'Kelimenin hece sayısı'],
        evidence: 'olumlu ya da olumsuz çağrışımlarını dönüştürebilir',
      },
    ],
    scan: [
      { prompt: 'Bir kelimenin anlamının değişmesine ne denir?', answer: 'anlam kaymasıdır' },
      { prompt: 'Türkçe son dönemde hangi dilden kelime almıştır?', answer: 'İngilizceden' },
    ],
  },
  {
    id: 'kurtlar',
    title: 'Kurtların Dönüşü',
    genre: 'bilgi',
    use: 'test',
    level: 'zor',
    text: `Amerika Birleşik Devletleri'ndeki Yellowstone Ulusal Parkı'nda kurtlar, yirminci yüzyılın başlarında yoğun avlanma sonucunda yok edilmişti. Yaklaşık yetmiş yıllık bir aradan sonra kurtlar, 1995 yılında bilim insanlarının denetiminde yeniden bölgeye getirildi. Bu karar, büyük yırtıcıların bir ekosistemdeki rolünü anlamak isteyen araştırmacılar için eşsiz bir gözlem olanağı yarattı.

Kurtların yokluğunda, başlıca avları olan geyiklerin sayısı belirgin biçimde artmıştı. Bu otçullar özellikle dere kenarlarındaki genç ağaçları ve çalıları yoğun biçimde tüketmeye başlamıştı. Kurtların geri dönüşüyle birlikte geyik sayısı azaldı. Bazı araştırmacılara göre geyiklerin davranışları da değişti ve hayvanlar, kaçmanın zor olduğu açık alanlarda daha az zaman geçirmeye başladı.

Ekologlar, bir yırtıcının av hayvanları aracılığıyla bitki örtüsünü ve oradan da başka canlıları etkilemesine trofik kademelenme adını vermektedir. Yellowstone'da bazı bölgelerde söğüt ve kavak gibi ağaçlar yeniden boy attı. Kunduzların ve ötücü kuşların bu alanlara dönmesi de zincirleme etkinin olası sonuçları arasında gösterilmiştir.

Bununla birlikte bilim insanları, bu değişimlerin tamamını yalnızca kurtlara bağlamanın aşırı basitleştirme olacağı konusunda uyarmaktadır. Aynı dönemde ayıların ve diğer yırtıcıların etkisi, kuraklık dönemleri ve insan faaliyetleri de ekosistemi etkilemiş olabilir. Dolayısıyla kurtların katkısının büyüklüğü, araştırmacılar arasında hâlâ tartışılmaktadır.

Yellowstone örneği, doğadaki ilişkilerin basit nedensellik zincirleriyle açıklanamayacağını gösterir. Bir türün yok edilmesinin ya da geri getirilmesinin öngörülmesi güç sonuçlar doğurabileceğini göstermesi bakımından koruma biyolojisinin en çok başvurulan vakalarından biridir.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Kurtlar Yellowstone’a hangi yıl yeniden getirildi?',
        correct: '1995',
        wrong: ['1925', '1965', '2005'],
        evidence: '1995 yılında bilim insanlarının denetiminde yeniden bölgeye getirildi',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Kurtların yokluğunda geyikler neyi yoğun biçimde tüketmişti?',
        correct: 'Dere kenarlarındaki genç ağaçları ve çalıları',
        wrong: ['Kunduz yuvalarını', 'Balıkları', 'Kuş yumurtalarını'],
        evidence: 'dere kenarlarındaki genç ağaçları ve çalıları yoğun biçimde tüketmeye başlamıştı',
      },
      {
        kind: 'çıkarım',
        prompt: 'Yazar, kurtların etkisi konusunda nasıl bir tutum sergiler?',
        correct: 'Etkiyi kabul eder ama tek nedene bağlamanın yanlış olacağını belirtir.',
        wrong: [
          'Bütün değişimlerin yalnızca kurtlardan kaynaklandığını savunur.',
          'Kurtların hiçbir etkisi olmadığını öne sürer.',
          'Kurtların yeniden getirilmesine karşı çıkar.',
        ],
        evidence: 'yalnızca kurtlara bağlamanın aşırı basitleştirme olacağı',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Bir yırtıcının geri dönüşü ekosistemde karmaşık ve zincirleme etkiler doğurabilir.',
        wrong: [
          'Kurtlar geyiklerin tamamen yok olmasına yol açmıştır.',
          'Yellowstone’daki değişimlerin tek nedeni kuraklıktır.',
          'Ulusal parklarda yırtıcı hayvan bulunmamalıdır.',
        ],
        evidence: 'öngörülmesi güç sonuçlar doğurabileceğini göstermesi bakımından',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "kademelenme" kelimesi neyi anlatır?',
        correct: 'Bir etkinin basamak basamak yayılması',
        wrong: ['Hayvanların göç etmesi', 'Ağaçların budanması', 'Avlanmanın yasaklanması'],
        evidence: 'trofik kademelenme adını vermektedir',
      },
    ],
    scan: [
      { prompt: 'Kurtların başlıca avı hangi hayvandır?', answer: 'geyiklerin' },
      { prompt: 'Hangi ağaçlar yeniden boy attı?', answer: 'söğüt ve kavak' },
    ],
  },
];
