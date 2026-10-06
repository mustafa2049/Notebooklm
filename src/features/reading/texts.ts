/** Dikoptik okuma için kısa, özgün Türkçe metinler. */
export const READING_TEXTS: { title: string; text: string }[] = [
  {
    title: 'Deniz Feneri',
    text: `Küçük bir adanın ucunda eski bir deniz feneri vardı. Fenerci Rıza Amca her akşam güneş batarken merdivenleri tek tek çıkar, camları siler ve lambayı yakardı. Uzaklardan geçen gemiler o ışığı görünce kayalıklardan uzak durmaları gerektiğini anlardı. Bir gece fırtına çıktı ve elektrik kesildi. Rıza Amca hiç telaşlanmadı; dolaptan eski gaz lambasını çıkardı, aynaların önüne yerleştirdi ve sabaha kadar başında bekledi. Ertesi sabah limana sağ salim varan balıkçılar ona taze balık ve sıcak ekmek getirdiler. Rıza Amca gülümsedi: “Işık küçük de olsa, yolunu kaybedene yeter.”`,
  },
  {
    title: 'Kayıp Uçurtma',
    text: `Elif, dedesinin yaptığı kırmızı uçurtmayı tepede uçururken ip birden koptu. Uçurtma rüzgârla süzülüp ormanın üzerinden kayboldu. Elif önce çok üzüldü, sonra dedesiyle birlikte bir harita çizdi. Rüzgârın yönüne bakıp patikaları takip ettiler, derenin üzerindeki köprüyü geçtiler ve yaşlı bir çınarın dallarında kırmızı bir şey parladığını gördüler. Uçurtma oradaydı! Dedesi uzun bir dalla onu dikkatlice indirdi. Eve dönerken Elif şöyle dedi: “Kaybolan bir şeyi bulmak için önce sakin olmak ve iyi bakmak gerekiyormuş.” Dedesi başını salladı ve ipin ucuna daha sağlam bir düğüm attı.`,
  },
  {
    title: 'Gözlerimiz Nasıl Görür?',
    text: `Gözümüze giren ışık, saydam kornea ve göz merceğinden geçerek gözün arka yüzündeki ağ tabakaya düşer. Ağ tabakadaki milyonlarca hücre bu ışığı sinir sinyallerine çevirir ve sinyaller görme siniriyle beyne ulaşır. Asıl görme işini beyin yapar: iki gözden gelen görüntüleri birleştirir, derinliği hesaplar ve gördüklerimize anlam verir. Çocuklukta bir göz yeterince net görmezse beyin o gözden gelen bilgiyi görmezden gelmeye başlayabilir. Buna göz tembelliği denir. Sağlam gözü kapatmak ya da iki gözü birlikte çalıştıran egzersizler, beynin tembel gözü yeniden kullanmayı öğrenmesine yardım eder.`,
  },
  {
    title: 'Pazar Kahvaltısı',
    text: `Pazar sabahı evde herkes erkenden uyandı. Annem domatesleri doğrarken babam çayı demledi, kardeşim de masaya peynir, zeytin ve bal taşıdı. Ben fırından yeni çıkmış simitleri almak için köşedeki fırına koştum. Fırıncı Hasan Bey her zamanki gibi gülerek “Bugün de en sıcakları senin için ayırdım” dedi. Eve döndüğümde balkondaki masa hazırdı. Güneş yavaşça yükselirken hep birlikte oturduk, haftanın planlarını konuştuk ve bol bol güldük. Kahvaltıdan sonra parka gitmeye karar verdik. Bazen en güzel günler, sıradan görünen küçük anlarla başlar.`,
  },
  {
    title: 'Küçük Astronot',
    text: `Can, uzay hakkında okuduğu her kitabı ezbere bilirdi. Bir gün okulda gökyüzü gözlemi yapıldı. Öğretmenleri bahçeye büyük bir teleskop kurdu ve sırayla bakmalarını istedi. Sıra Can'a geldiğinde önce hiçbir şey göremedi; görüntü bulanıktı. Öğretmeni ayar düğmesini yavaşça çevirmesini söyledi. Can sabırla düğmeyi çevirdikçe karanlıkta parlak bir nokta belirdi, sonra çevresinde ince bir halka göründü. Bu Satürn'dü! Can heyecanla bağırdı. O gece eve dönerken kendine bir söz verdi: Bir gün o halkaları çok daha yakından görecekti. Netlik bazen yalnızca biraz sabır ve doğru ayar isterdi.`,
  },
];

/** Metni kelimelere ayırır; her kelime sırayla tembel göze (0) ya da sağlam göze (1) atanır. */
export function splitDichoptic(text: string): { word: string; eye: 0 | 1 }[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => ({ word, eye: (i % 2) as 0 | 1 }));
}
