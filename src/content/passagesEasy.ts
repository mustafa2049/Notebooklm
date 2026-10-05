import type { Passage } from './passages';

/**
 * Kolay seviye test metinleri (Ateşman 70–89: kısa cümleler, kısa kelimeler).
 * Kurallar `passages.ts` ile aynı; doğrulama `passages.test.ts` içinde.
 */
export const EASY_PASSAGES: Passage[] = [
  {
    id: 'karinca',
    title: 'Karıncaların Yolu',
    genre: 'bilgi',
    use: 'test',
    level: 'kolay',
    text: `Yaz günü bahçede uzun bir karınca sırası gördün mü? Karıncalar bir yere giderken çoğu zaman uzun bir çizgi hâlinde yürür. Bu çizgi rastgele değildir, onu gözle görülmeyen bir koku yolu çizer.

Bir karınca yiyecek bulunca hemen yuvaya döner ve dönerken yere çok az bir koku bırakır. Bu kokuya iz kokusu da denir. Öteki karıncalar bu izi burnu gibi çalışan anteniyle alır. Sonra izi adım adım takip ederek yiyeceğe ulaşır. Onlar da yuvaya dönerken yere koku bırakır. Böylece yol her geçişte biraz daha güçlenir.

Peki yiyecek bitince ne olur? Artık kimse o yola yeni koku bırakmaz ve eski koku da zamanla uçup gider. Yol yavaş yavaş silinir. Karıncalar da bu kez yeni bir yiyecek yeri aramaya başlar. Bu, çok akıllıca kurulmuş bir düzendir. Kimse emir vermez ama iş yine de yapılır.

Karıncalar boylarına göre çok güçlüdür. Bir karınca kendi ağırlığının kat kat fazlasını taşıyabilir. Taşınacak büyük bir parça varsa birkaç karınca bir olur. Parçayı birlikte çeker, birlikte iterler. Yolda bir taş ya da dal gibi bir engel çıkarsa onun etrafından dolaşırlar.

Bir karınca yuvasında iş bölümü de vardır. Kimi karınca yiyecek arar, kimi yuvayı temizler, kimi de yavrulara bakar. Yuvanın kraliçesi ise yumurta bırakır. İşçi karıncaların hepsi dişidir.

Bilim insanları karıncaları uzun yıllar boyunca dikkatle izledi. Onların yol bulma yöntemi bugün bilgisayarlarda da kullanılıyor. Kimi programlar en kısa yolu bulmak için karıncaları taklit ediyor. Küçük bir böcek, insanlara büyük bir ders verdi. Tek başına zayıf olan, birlikte çok güçlü olabilir.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Karıncalar koku izini neyle algılar?',
        correct: 'Antenleriyle',
        wrong: ['Gözleriyle', 'Ayaklarıyla', 'Ağızlarıyla'],
        evidence: 'Öteki karıncalar bu izi burnu gibi çalışan anteniyle alır.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Bir yoldan çok karınca geçerse ne olur?',
        correct: 'Koku izi güçlenir.',
        wrong: ['Koku izi hemen silinir.', 'Karıncalar yolu terk eder.', 'Kraliçe yeni yol çizer.'],
        evidence: 'Böylece yol her geçişte biraz daha güçlenir.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Yiyecek bitince koku yoluna ne olur?',
        correct: 'Yavaş yavaş silinir.',
        wrong: ['Daha da güçlenir.', 'Kraliçe tarafından yenilenir.', 'Yuvanın içine taşınır.'],
        evidence: 'Yol yavaş yavaş silinir.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Karıncalar kokuyla ve iş birliğiyle, emir almadan düzen kurar.',
        wrong: [
          'Karıncalar en çok kraliçenin emirleriyle hareket eder.',
          'Karıncalar yalnızca yaz aylarında çalışır.',
          'Karıncalar bilgisayar programlarından yol bulmayı öğrendi.',
        ],
        evidence: 'Kimse emir vermez ama iş yine de yapılır.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "birkaç karınca bir olur" sözü ne anlatıyor?',
        correct: 'Karıncalar güçlerini birleştirir.',
        wrong: ['Karıncalar tek sıraya girer.', 'Karıncalar yarışır.', 'Karıncalar dağılır.'],
        evidence: 'Parçayı birlikte çeker, birlikte iterler.',
      },
    ],
    scan: [
      { prompt: 'Yuvada yumurta bırakan kim?', answer: 'kraliçesi' },
      { prompt: 'İşçi karıncalar hangi cinsiyettedir?', answer: 'dişidir' },
    ],
  },
  {
    id: 'yagmur',
    title: 'Bir Damlanın Yolculuğu',
    genre: 'bilgi',
    use: 'test',
    level: 'kolay',
    text: `Bugün penceremize vuran yağmur, belki birkaç gün önce uzak bir denizdeydi. Çünkü su hiç durmadan yer değiştirir. Denizden göğe, göğden yere, yerden yine denize gider. Bu yolculuğa su döngüsü denir.

Her şey güneşle başlar. Güneş denizleri, gölleri ve ırmakları her gün biraz ısıtır. Isınan suyun bir kısmı buhar olur ve gözle görülmeden havaya karışıp yukarı çıkar.

Yukarıda hava daha soğuktur ve buhar soğuyunca yeniden suya döner. Ama bu su, gözle zor görülen çok küçük damlacıklar hâlindedir. Bu damlacıklar havadaki toz ve tuz taneciklerine tutunur. Milyonlarca damlacık bir araya gelince bulut olur. Yani bulut aslında havada asılı duran sudur.

Bulutun içinde damlacıklar durmadan birbirine çarpar. Çarpışan damlalar birleşir ve yavaş yavaş büyür. Bir süre sonra hava onları taşıyamaz. Ağırlaşan damlalar da yere düşer ve biz buna yağmur deriz. Hava çok soğuksa su yolda donar. O zaman yağmur yerine kar ya da dolu yağar.

Yere düşen her damlanın yolu da farklıdır. Bir kısmı toprağa sızar. Bitkiler bu suyu kökleriyle alır ve yapraklarından yine havaya verir. Bir kısmı yer altında birikir. Kuyular ve kaynaklar bu sudan beslenir. Bir kısmı da derelere akar. Dereler ırmaklara, ırmaklar denize kavuşur. Sonra güneş yine ısıtır ve yolculuk baştan başlar.

Bu döngü milyonlarca yıldır hiç durmadan sürüyor. Dünyadaki su miktarı da hemen hemen hep aynı kalır. Su yok olmaz, yalnızca biçim değiştirir. Ama bu, suyu israf edebileceğimiz anlamına gelmez, çünkü içilecek temiz su sınırsız değildir. Kirlenen su, döngüye kirli olarak katılır.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Su döngüsü neyle başlar?',
        correct: 'Güneşin suyu ısıtmasıyla',
        wrong: ['Rüzgârın esmesiyle', 'Karın erimesiyle', 'Ayın çekimiyle'],
        evidence: 'Her şey güneşle başlar.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Damlacıklar bulutta neye tutunur?',
        correct: 'Havadaki toz ve tuz taneciklerine',
        wrong: ['Kuş tüylerine', 'Ağaç yapraklarına', 'Buz dağlarına'],
        evidence: 'Bu damlacıklar havadaki toz ve tuz taneciklerine tutunur.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Metne göre bir bulut neden yağmur yağdırır?',
        correct: 'Damlalar büyüyüp ağırlaşınca hava onları taşıyamaz.',
        wrong: [
          'Güneş bulutu iterek aşağı indirir.',
          'Bulut yere değince dağılır.',
          'Buhar soğuyunca hemen yere iner.',
        ],
        evidence: 'Bir süre sonra hava onları taşıyamaz.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Su yok olmaz; deniz, gök ve yer arasında durmadan dolaşır.',
        wrong: [
          'Bulutlar yalnızca denizlerin üstünde oluşur.',
          'Yağmur suyu içmeye uygun değildir.',
          'Kar ve dolu, yağmurdan daha faydalıdır.',
        ],
        evidence: 'Su yok olmaz, yalnızca biçim değiştirir.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "sızar" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Yavaşça içine işler',
        wrong: ['Hızla buharlaşır', 'Donup katılaşır', 'Yukarı fışkırır'],
        evidence: 'Bir kısmı toprağa sızar.',
      },
    ],
    scan: [
      { prompt: 'Hava çok soğuksa yağmur yerine ne yağar?', answer: 'kar ya da dolu' },
      { prompt: 'Kuyular hangi sudan beslenir?', answer: 'yer altında birikir' },
    ],
  },
  {
    id: 'bisiklet',
    title: 'Dedemin Bisikleti',
    genre: 'öykü',
    use: 'test',
    level: 'kolay',
    text: `Dokuz yaşındaydım ve hâlâ bisiklet süremiyordum. Sınıfta neredeyse herkes sürüyordu, ben ise her denemede düşüyordum. Bir yaz tatilinde annemle birlikte köye, dedemin yanına gittim. Ahırın köşesinde eski, mavi bir bisiklet duruyordu.

"Bu benim ilk bisikletim," dedi dedem. "Babana da bununla öğrettim."

Bisikletin boyası yer yer dökülmüştü, zinciri de paslıydı. Dedem bir sabah onu güzelce yağladı ve lastiklerini şişirdi. Sonra beni köyün dışındaki yola götürdü. Yol düz ve uzundu. İki yanında kavak ağaçları vardı.

"Önüne bakma," dedi. "Uzağa bak. Gözün nereye bakarsa bisiklet oraya gider."

Ben yine de korkudan hep ön tekerleğe bakıyordum. Dedem arkamdan yürüyüp selemi tutuyordu. Pedal çeviriyordum ama yüreğim ağzımdaydı. O gün birkaç kez düştüm ve dizlerim kanadı. Ağlamak istedim ama dedem bana bakıp gülümsedi.

"Düşmek öğrenmenin parçasıdır," dedi. "Ben de çok düştüm."

Üçüncü gün bir şey oldu. Uzaktaki büyük çınar ağacına baktım. Pedalları çevirdim ve rüzgâr yüzüme çarpmaya başladı. Bir süre sonra merak edip arkama döndüm. Dedem çok gerideydi ve bana elini sallıyordu. Meğer selemi çoktan bırakmış! Ben ise fark etmemiştim.

O an hem korktum hem güldüm. Bisiklet biraz sallandı ama düşmedim. Çınarın yanına kadar gittim, sonra yavaşça dönüp dedemin yanına geldim. Gözleri dolmuştu.

Aradan yıllar geçti ve dedem artık aramızda yok. Mavi bisiklet ise hâlâ bizim evin bodrumunda duruyor. Oğlum geçen ay dokuz yaşına bastı. Geçen pazar onu da aynı yola götürdüm. Selesini tuttum ve dedemin sözünü söyledim: "Uzağa bak."`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Bisikletin rengi neydi?',
        correct: 'Mavi',
        wrong: ['Kırmızı', 'Yeşil', 'Sarı'],
        evidence: 'Ahırın köşesinde eski, mavi bir bisiklet duruyordu.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Anlatıcı kaçıncı gün kendi başına sürmeyi başardı?',
        correct: 'Üçüncü gün',
        wrong: ['İlk gün', 'İkinci gün', 'Beşinci gün'],
        evidence: 'Üçüncü gün bir şey oldu.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Anlatıcı neden düşmeden sürebildi?',
        correct: 'Dedesinin dediği gibi uzağa baktı.',
        wrong: [
          'Dedesi selesini hiç bırakmadı.',
          'Bisikletin lastikleri yenilendi.',
          'Yol yokuş aşağı gidiyordu.',
        ],
        evidence: 'Uzaktaki büyük çınar ağacına baktım.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Öykünün ana fikri hangisidir?',
        correct: 'Öğrenilen bilgi ve sevgi kuşaktan kuşağa aktarılır.',
        wrong: [
          'Eski bisikletler yenilerinden daha sağlamdır.',
          'Köy yolları bisiklet için tehlikelidir.',
          'Bisiklet sürmek yalnızca çocuklukta öğrenilir.',
        ],
        evidence: 'Selesini tuttum ve dedemin sözünü söyledim',
      },
      {
        kind: 'kelime',
        prompt: '"Yüreğim ağzımdaydı" sözü ne anlatır?',
        correct: 'Çok korkuyordum.',
        wrong: ['Çok açtım.', 'Çok yorgundum.', 'Çok mutluydum.'],
        evidence: 'Pedal çeviriyordum ama yüreğim ağzımdaydı.',
      },
    ],
    scan: [
      { prompt: 'Anlatıcı kaç yaşındaydı?', answer: 'Dokuz yaşındaydım' },
      { prompt: 'Yolun iki yanında hangi ağaçlar vardı?', answer: 'kavak ağaçları' },
    ],
  },
  {
    id: 'ekmek',
    title: 'Ekmek Neden Kabarır?',
    genre: 'bilgi',
    use: 'test',
    level: 'kolay',
    text: `Fırından yeni çıkmış sıcak bir ekmeği kesince içi süngere benzer, çünkü içinde binlerce küçük delik vardır. Peki bu delikler nereden gelir? Cevap, gözle göremediğimiz bir canlıda saklıdır: mayada.

Maya, çok küçük bir mantardır. Hamura bir avuç maya katarız ama o avucun içinde sayısız canlı vardır. Bu küçük canlılar şekerle beslenir. Undaki nişasta da zamanla şekere döner. Maya bu şekeri yer ve bir gaz çıkarır. Bu gaz, havada da bulunan ve bizim soluk verirken çıkardığımız karbondioksittir.

Gaz hamurun içinde kabarcıklar yapar. Ama bu gaz neden hamurdan kaçıp gitmez? Çünkü hamur yoğrulunca esner. Undaki bir madde, suyla birleşince ağ gibi bir yapı kurar. Bu maddeye glüten denir. Glüten ağı bir balon gibi gazı içinde tutar ve hamur yavaş yavaş şişer. Biz buna hamurun mayalanması deriz.

Maya sıcağı sever. Soğuk bir odada hamur çok yavaş kabarır, ılık bir yerde ise daha hızlı kabarır. Ama çok sıcak da iyi değildir. Fazla sıcakta maya ölür. Bu yüzden hamur, ılık suyla yoğrulur.

Ekmek fırına girince ne olur? Fırının sıcağı, gaz kabarcıklarını ilk dakikalarda biraz daha büyütür. Sonra maya ölür ve kabarma durur. Glüten ve nişasta pişip sertleşir, kabarcıkların yeri de delik olarak kalır. Ekmeğin dış yüzü ise kızarıp çıtır bir kabuk olur.

İnsanlar binlerce yıldır ekmek yapıyor ama eskiden mayayı tanımıyorlardı. Bir parça hamuru saklar, ertesi günkü hamura katarlardı. Bu eski hamur, yeni hamuru da mayalardı ve bugün buna ekşi maya diyoruz. Yani bir dilim ekmek, mutfakta çalışan küçük canlıların emeğidir.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Maya şekeri yiyince hangi gazı çıkarır?',
        correct: 'Karbondioksit',
        wrong: ['Oksijen', 'Azot', 'Su buharı'],
        evidence: 'Bu gaz, havada da bulunan ve bizim soluk verirken çıkardığımız karbondioksittir.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Hamurdaki gazı içinde tutan yapı nedir?',
        correct: 'Glüten ağı',
        wrong: ['Tuz taneleri', 'Ekmek kabuğu', 'Nişasta tozu'],
        evidence: 'Glüten ağı bir balon gibi gazı içinde tutar',
      },
      {
        kind: 'çıkarım',
        prompt: 'Hamur kaynar suyla yoğrulursa ne olur?',
        correct: 'Maya ölür ve hamur iyi kabarmaz.',
        wrong: [
          'Hamur iki kat hızlı kabarır.',
          'Glüten ağı daha çok gaz tutar.',
          'Ekmeğin kabuğu daha yumuşak olur.',
        ],
        evidence: 'Fazla sıcakta maya ölür.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Ekmeğin kabarması, mayanın çıkardığı gazın hamurda tutulmasıyla olur.',
        wrong: [
          'Ekmek yalnızca fırında yüksek ısıyla kabarır.',
          'Ekşi maya, bugünkü mayadan daha sağlıklıdır.',
          'Ekmeğin delikleri yoğururken giren havadan oluşur.',
        ],
        evidence: 'Gaz hamurun içinde kabarcıklar yapar.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "esner" kelimesi ne anlama gelir?',
        correct: 'Uzayıp genişleyebilir',
        wrong: ['Kuruyup çatlar', 'Erir ve akar', 'Sertleşip kırılır'],
        evidence: 'Çünkü hamur yoğrulunca esner.',
      },
    ],
    scan: [
      { prompt: 'Eski hamurla yapılan mayaya ne denir?', answer: 'ekşi maya' },
      { prompt: 'Maya nasıl bir canlıdır?', answer: 'çok küçük bir mantardır' },
    ],
  },
  {
    id: 'pazar',
    title: 'Pazar Yerinde',
    genre: 'öykü',
    use: 'test',
    level: 'kolay',
    text: `Her cumartesi babaannemle pazara giderdik. O gün erkenden kalkar, büyük hasır sepetini alırdık. Pazar, evimize iki sokak ötedeki geniş bir meydana kurulurdu. Daha köşeyi dönmeden satıcıların sesleri kulağımıza gelirdi.

"Domatesin iyisi burada!"

"Gel abla, tatmadan alma!"

Babaannem acele etmezdi. Önce bütün pazarı bir baştan bir başa dolaşırdı. Hiçbir şey almadan yalnızca bakardı. Ben sıkılırdım. "Neden almıyoruz?" diye sorardım.

"Önce bak, sonra seç," derdi. "İlk gördüğün en iyisi olmayabilir."

Dolaşma bitince alışverişe başlardık. Babaannem domatesi eline alır, koklardı. Kokusu güzel değilse geri koyardı. Fasulyeyi kırar, sesine bakardı. Çıtır diye kırılırsa taze demekti. Satıcılar ona hep gülümserdi, çünkü onu yıllardır tanıyorlardı. Kimi ona bir elma, kimi bir avuç dut ikram ederdi.

Bir gün pazarın sonunda yaşlı bir adam gördük. Önünde yalnızca birkaç demet maydanoz vardı. Kimse onun tezgâhına uğramıyordu. Babaannem durdu. Bütün maydanozları aldı.

"Ama evde maydanoz var," dedim.

"Biliyorum," dedi. "Komşulara dağıtırız."

Eve dönünce gerçekten de maydanozları komşulara dağıttık. Kimine bir demet, kimine iki demet verdik. Herkes çok sevindi. Akşam alt kattaki teyze bize bir tabak börek getirdi. Börekte maydanoz vardı.

O gün bir şey anladım. Pazar yalnızca alışveriş yeri değildi. İnsanların birbirini tanıdığı, birbirine baktığı bir yerdi. Babaannem domates seçerken de insan seçerken de acele etmezdi. Şimdi pazara kendi kızımla gidiyorum. Ona da aynı şeyi söylüyorum: "Önce bak, sonra seç."`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Babaanne fasulyenin taze olduğunu nasıl anlıyordu?',
        correct: 'Kırınca çıtır diye ses çıkmasından',
        wrong: ['Rengine bakarak', 'Tadına bakarak', 'Satıcıya sorarak'],
        evidence: 'Çıtır diye kırılırsa taze demekti.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Alt kattaki teyze akşam ne getirdi?',
        correct: 'Bir tabak börek',
        wrong: ['Bir sepet domates', 'Bir demet maydanoz', 'Bir kavanoz reçel'],
        evidence: 'Akşam alt kattaki teyze bize bir tabak börek getirdi.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Babaanne yaşlı adamın bütün maydanozlarını neden aldı?',
        correct: 'Adama yardım etmek istediği için',
        wrong: [
          'Evde hiç maydanoz kalmadığı için',
          'Maydanozlar çok ucuz olduğu için',
          'Börek yapmayı planladığı için',
        ],
        evidence: 'Kimse onun tezgâhına uğramıyordu.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Öykünün ana fikri hangisidir?',
        correct: 'Pazar, alışverişin yanında insanların birbirini gözettiği bir yerdir.',
        wrong: [
          'Pazarda en ucuz ürün en sona kalır.',
          'Sebzeler en iyi sabah erkenden alınır.',
          'Satıcılar yaşlı müşterileri daha çok sever.',
        ],
        evidence: 'İnsanların birbirini tanıdığı, birbirine baktığı bir yerdi.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "tezgâh" kelimesi neyi anlatır?',
        correct: 'Satıcının malını sergilediği masa',
        wrong: ['Alışveriş sepeti', 'Pazarın giriş kapısı', 'Satıcının evi'],
        evidence: 'Kimse onun tezgâhına uğramıyordu.',
      },
    ],
    scan: [
      { prompt: 'Pazara hangi gün gidiyorlardı?', answer: 'cumartesi' },
      { prompt: 'Sepet neden yapılmıştı?', answer: 'hasır' },
    ],
  },
  {
    id: 'ay',
    title: 'Ay Neden Şekil Değiştirir?',
    genre: 'bilgi',
    use: 'test',
    level: 'kolay',
    text: `Ay bazı geceler bir tabak gibi yuvarlaktır, bazı geceler ise ince bir hilaldir. Bazı geceler de gökyüzüne ne kadar baksak hiç görünmez. Peki Ay gerçekten şekil mi değiştirir? Hayır. Ay hep aynı küredir. Değişen, onun bize görünen yüzüdür.

Ay kendi ışığını üretmez. Güneş'ten gelen ışığı yansıtır. Ay'ın her zaman yarısı aydınlıktır: Güneş'e bakan yüzü ışık alır, öteki yüzü karanlıkta kalır. Ay, Dünya'nın çevresinde döner ve bu dönüş yaklaşık bir ay sürer. Ay dönerken biz onun aydınlık yarısını farklı açılardan görürüz.

Ay, Dünya ile Güneş'in arasına gelince aydınlık yüzü bize dönük olmaz. O zaman Ay'ı göremeyiz ve buna yeni ay denir. Birkaç gün sonra ince bir hilal belirir. Hilal her gece biraz daha büyür. Bir hafta sonra Ay'ın yarısı aydınlık görünür. Buna ilk dördün denir.

İki hafta dolunca Ay, Dünya'nın öbür yanına geçer. Artık aydınlık yüzünün hepsi bize bakar ve gökte kocaman bir dolunay görürüz. Sonra aydınlık kısım her gece yine küçülür. Önce son dördün, sonra ince bir hilal gelir ve sonunda Ay yine kaybolur. Bu döngü aşağı yukarı yirmi dokuz buçuk gün sürer.

Ay'ın bir ilginç yanı daha var: bize hep aynı yüzünü gösterir. Çünkü kendi çevresinde dönmesi ile Dünya'nın çevresinde dönmesi aynı sürer. Bu yüzden Ay'ın öbür yüzünü insanlar uzun süre hiç görmedi; o yüzü ancak uzay araçları görebildi.

İnsanlar eskiden takvimlerini Ay'a göre yaparlardı ve bugün de bazı takvimler Ay'ı izler. "Ay" kelimesinin hem gökteki cismi hem de takvimdeki ayı anlatması bundandır.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Ay ışığını nereden alır?',
        correct: 'Güneş’ten gelen ışığı yansıtır.',
        wrong: ['Kendi ışığını üretir.', 'Dünya’dan yansıyan ışıktan', 'Yıldızlardan gelen ışıktan'],
        evidence: 'Güneş\'ten gelen ışığı yansıtır.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Ay’ın evreleri ne kadar sürede tamamlanır?',
        correct: 'Aşağı yukarı yirmi dokuz buçuk günde',
        wrong: ['Bir haftada', 'İki haftada', 'Bir yılda'],
        evidence: 'Bu döngü aşağı yukarı yirmi dokuz buçuk gün sürer.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Dolunayda Ay nerededir?',
        correct: 'Dünya’nın Güneş’e göre öbür yanında',
        wrong: [
          'Dünya ile Güneş’in tam arasında',
          'Güneş’in arkasında',
          'Dünya’ya en yakın noktada',
        ],
        evidence: 'İki hafta dolunca Ay, Dünya\'nın öbür yanına geçer.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Ay’ın görünüşü, aydınlık yarısını farklı açılardan görmemizden değişir.',
        wrong: [
          'Ay her ay küçülüp yeniden büyür.',
          'Ay’ın ışığı ay boyunca güçlenip zayıflar.',
          'Ay’ın öbür yüzü hiç ışık almaz.',
        ],
        evidence: 'Değişen, onun bize görünen yüzüdür.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "hilal" kelimesi neyi anlatır?',
        correct: 'Ay’ın ince, kavisli görünüşü',
        wrong: ['Ay’ın tam yuvarlak hâli', 'Ay’ın hiç görünmediği gece', 'Ay’ın yarısının görünmesi'],
        evidence: 'Birkaç gün sonra ince bir hilal belirir.',
      },
    ],
    scan: [
      { prompt: 'Ay’ın yarısı aydınlık görününce buna ne denir?', answer: 'ilk dördün' },
      { prompt: 'Ay’ın öbür yüzünü ne görebildi?', answer: 'uzay araçları' },
    ],
  },
  {
    id: 'penguen',
    title: 'Uçamayan Kuşlar',
    genre: 'bilgi',
    use: 'test',
    level: 'kolay',
    text: `Penguenler kuştur ama uçamaz. Kanatları vardır, tüyleri vardır, yumurta da bırakırlar. Ama gökyüzünde değil, suda uçarlar. Kanatları kısa ve serttir. Su altında kürek gibi çalışır.

Penguenlerin çoğu Dünya'nın güney yarısında, denize yakın yerlerde yaşar. En çok bilinenler buzlu Antarktika'dadır. Ama hepsi soğukta yaşamaz. Bazı türler daha ılık kıyılarda, hatta ekvatora yakın adalarda yaşar.

Penguenin vücudu suya göre yapılmıştır. Gövdesi bir mermi gibi uzundur. Bu şekil, suda balık avlarken hızlı gitmesini sağlar. Tüyleri sık ve yağlıdır. Su tüylerin arasından deriye geçemez. Derinin altında da kalın bir yağ katmanı vardır. Bu yağ onu soğuktan korur.

Penguenlerin rengi de bir işe yarar. Sırtları siyah, karınları beyazdır. Yukarıdan bakan bir av kuşu, siyah sırtı karanlık suyla karıştırır. Aşağıdan bakan bir fok ise beyaz karnı parlak gökle karıştırır. Böylece penguen iki yandan da gizlenir.

En büyük penguen, imparator pengueniydir. Bu türün babaları çok sabırlıdır. Anne yumurtayı bırakınca denize gider. Baba yumurtayı ayaklarının üstüne alır. Karnındaki sıcak bir deri katıyla onu örter. Kış boyunca, buz gibi rüzgârda, hiçbir şey yemeden bekler. Babalar ısınmak için birbirine sokulur. Sırayla ortaya ve kenara geçerler.

Yavru çıkınca anne geri döner. Denizden getirdiği yiyecekle yavrusunu besler. Artık sıra babadadır. Aylarca bir şey yemeyen ve iyice zayıflamış olan baba denize gider ve karnını doyurur. Bu düzen, penguenlerin en zor koşullarda bile yaşamasını sağlar.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Penguenin kanatları suda nasıl çalışır?',
        correct: 'Kürek gibi',
        wrong: ['Yelken gibi', 'Pervane gibi', 'Şemsiye gibi'],
        evidence: 'Su altında kürek gibi çalışır.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'İmparator penguenlerde yumurtayı kim korur?',
        correct: 'Baba',
        wrong: ['Anne', 'Yaşlı penguenler', 'Bütün sürü sırayla'],
        evidence: 'Baba yumurtayı ayaklarının üstüne alır.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Penguenin siyah-beyaz rengi en çok neye yarar?',
        correct: 'Avcılardan gizlenmesine',
        wrong: ['Eşini bulmasına', 'Güneşten korunmasına', 'Yavrusunu tanımasına'],
        evidence: 'Böylece penguen iki yandan da gizlenir.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Penguenlerin bedeni ve davranışları zor koşullarda yaşamaya uygundur.',
        wrong: [
          'Penguenler yalnızca Antarktika’da yaşar.',
          'Penguenler bir zamanlar uçabiliyordu.',
          'Penguen yavrularını yalnızca anneler büyütür.',
        ],
        evidence: 'Bu düzen, penguenlerin en zor koşullarda bile yaşamasını sağlar.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "sokulur" kelimesi hangi anlamda kullanılmıştır?',
        correct: 'Birbirine çok yaklaşır',
        wrong: ['Birbirinden kaçar', 'Suya dalar', 'Yuvasına girer'],
        evidence: 'Babalar ısınmak için birbirine sokulur.',
      },
    ],
    scan: [
      { prompt: 'En büyük penguen türü hangisi?', answer: 'imparator pengueni' },
      { prompt: 'Penguenin gövdesi neye benzetiliyor?', answer: 'bir mermi gibi' },
    ],
  },
  {
    id: 'kopek',
    title: 'Köpeğin Burnu',
    genre: 'bilgi',
    use: 'test',
    level: 'kolay',
    text: `Biz dünyayı en çok gözümüzle tanırız. Köpekler ise burnuyla tanır. Bir köpek için her sokak, okunacak bir kitap gibidir. Bir direğin dibini koklayarak oradan hangi köpeğin geçtiğini, hatta ne zaman geçtiğini anlayabilir.

Köpeğin burnu bizimkinden çok daha güçlüdür. Burnunun içinde koku alan hücreler bizden kat kat fazladır. Beyninin büyük bir kısmı da kokuları anlamaya ayrılmıştır. Biz bir çorbanın kokusunu alırız. Köpek ise çorbadaki her şeyi ayrı ayrı alır.

Köpekler bir şeyi koklarken burun deliklerini çok hızlı açıp kapar. Kısa kısa nefes alırlar. Böylece koku burnun içinde birikir. Burunlarının ıslak olması da bir işe yarar. Islak yüzey, havadaki koku taneciklerini tutar.

Köpeğin iki burun deliği ayrı ayrı koklar. Bu yüzden kokunun hangi yandan geldiğini anlayabilir. Bir izi takip ederken başını sağa sola çevirir. Koku hangi yanda güçlüyse o yana gider.

İnsanlar bu güçten çok yararlanır. Arama kurtarma köpekleri enkaz altında kalanları bulur. Karda ya da ormanda kaybolan insanları saatlerce arar. Havaalanlarında çalışan köpekler bavulların içini koklar. Bazı köpekler hastalıkları bile koku yoluyla fark edebilir. Bilim insanları bunu hâlâ araştırıyor.

Bir köpeği gezdirirken onu acele ettirmeyin. Her yeri koklaması boşuna değildir. O sırada haberleri okur, çevresini tanır. Koklamak köpeği yorar ama mutlu da eder. Kısa ama bol koklamalı bir yürüyüş, uzun ve aceleci bir yürüyüşten daha iyidir.`,
    questions: [
      {
        kind: 'ayrıntı',
        prompt: 'Köpeğin burnunun ıslak olması neye yarar?',
        correct: 'Havadaki koku taneciklerini tutar.',
        wrong: ['Burnunu soğuktan korur.', 'Daha iyi görmesini sağlar.', 'Nefesini yavaşlatır.'],
        evidence: 'Islak yüzey, havadaki koku taneciklerini tutar.',
      },
      {
        kind: 'çıkarım',
        prompt: 'Köpek bir kokunun yönünü nasıl bulur?',
        correct: 'İki burun deliğindeki kokuyu karşılaştırarak',
        wrong: ['Kulaklarıyla dinleyerek', 'Gözleriyle izleri görerek', 'Yere patisini sürterek'],
        evidence: 'Bu yüzden kokunun hangi yandan geldiğini anlayabilir.',
      },
      {
        kind: 'ayrıntı',
        prompt: 'Arama kurtarma köpekleri ne yapar?',
        correct: 'Enkaz altında kalanları bulur.',
        wrong: ['Hastaneleri korur.', 'Sürüleri güder.', 'Körlere yol gösterir.'],
        evidence: 'Arama kurtarma köpekleri enkaz altında kalanları bulur.',
      },
      {
        kind: 'anaFikir',
        prompt: 'Metnin ana fikri hangisidir?',
        correct: 'Köpekler dünyayı en çok güçlü burunlarıyla tanır.',
        wrong: [
          'Köpekler insanlardan daha iyi görür.',
          'Köpekler uzun yürüyüşlerden hoşlanmaz.',
          'Bütün köpekler hastalıkları koku yoluyla bulur.',
        ],
        evidence: 'Köpekler ise burnuyla tanır.',
      },
      {
        kind: 'kelime',
        prompt: 'Metinde "enkaz" kelimesi neyi anlatır?',
        correct: 'Yıkılmış bir yapının kalıntısı',
        wrong: ['Derin bir kar yığını', 'Kalabalık bir havaalanı', 'Sık bir orman'],
        evidence: 'Arama kurtarma köpekleri enkaz altında kalanları bulur.',
      },
    ],
    scan: [
      { prompt: 'Köpekler bavulları nerede koklar?', answer: 'Havaalanlarında' },
      { prompt: 'Köpek için her sokak neye benzetiliyor?', answer: 'okunacak bir kitap' },
    ],
  },
];
