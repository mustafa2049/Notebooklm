import type { ActivityKind } from '../model/types';

export const tr = {
  appName: 'Göz Egzersiz',
  nav: {
    home: 'Ana sayfa',
    timer: 'Kapama',
    play: 'Egzersiz',
    stats: 'İlerleme',
    settings: 'Ayarlar',
  },
  disclaimer: {
    title: 'Önemli bilgilendirme',
    body: [
      'Bu uygulama tıbbi bir cihaz değildir ve göz doktorunun muayenesinin, teşhisinin ya da tedavisinin yerine geçmez.',
      'Kapama süresini, hangi gözün kapatılacağını ve gözlük kullanımını mutlaka göz doktorunuzun önerisine göre ayarlayın.',
      'Egzersiz sırasında baş ağrısı, çift görme, göz yorgunluğu ya da bulantı olursa ara verin ve doktorunuza danışın. Işığa duyarlı epilepsi öyküsü varsa oyunları kullanmadan önce doktorunuza danışın.',
      'Uygulamadaki ölçümler (Gabor eşiği, harf boyutu) yalnızca kendi ilerlemenizi izlemeniz içindir; klinik görme ölçümü değildir.',
    ],
    accept: 'Okudum, anladım',
  },
  eye: { left: 'Sol göz', right: 'Sağ göz' },
  symptom: {
    headache: 'Baş ağrısı',
    double: 'Çift görme',
    strain: 'Göz yorgunluğu',
    squint: 'Kaymada artış',
    none: 'Sorun yok',
  },
  compliance: {
    full: 'Tam taktım',
    partial: 'Kısmen',
    none: 'Takmadım',
  },
  activity: {
    'odd-one-out': {
      name: 'Farklı Olanı Bul',
      desc: 'Kalabalık harfler arasında farklı olana dokun. Doğru bildikçe harfler küçülür ve sıklaşır.',
      icon: '🔍',
    },
    catch: {
      name: 'Hedef Yakala',
      desc: 'Hareket eden hedeflere kaybolmadan önce dokun. Hedefler küçülür ve hızlanır.',
      icon: '🎯',
    },
    dots: {
      name: 'Noktaları Birleştir',
      desc: 'Küçük numaralı noktalara sırayla dokun. İnce ayrıntıyı görmeyi çalıştırır.',
      icon: '✏️',
    },
    'tumbling-e': {
      name: 'Dönen E',
      desc: 'E harfinin bacaklarının hangi yöne baktığını seç. Harf giderek küçülür.',
      icon: '🔠',
    },
    maze: {
      name: 'Labirent',
      desc: 'Noktayı parmağınla sürükleyerek çıkışa götür, duvarlara değme. Yollar giderek incelir.',
      icon: '🧭',
    },
    balloons: {
      name: 'Balon Patlat',
      desc: 'Üstte gösterilen harfi taşıyan balonlara dokun. Harfler küçülür ve birbirine benzer.',
      icon: '🎈',
    },
    blocks: {
      name: 'Dikoptik Bloklar',
      desc: 'Düşen parça tembel göze, yerdeki bloklar sağlam göze gösterilir. Satırları tamamla.',
      icon: '🧱',
    },
    breakout: {
      name: 'Dikoptik Top',
      desc: 'Top ve tuğlaları tembel göz, raketi sağlam göz görür. Tuğlaları kır.',
      icon: '🏓',
    },
    stars: {
      name: 'Yıldız Toplama',
      desc: 'Yıldızlar tembel göze, göktaşları sağlam göze gösterilir. Yıldızları topla, göktaşlarından kaç.',
      icon: '⭐',
    },
    snake: {
      name: 'Dikoptik Yılan',
      desc: 'Yılanın başı ve yem tembel göze, gövdesi sağlam göze gösterilir. Yemleri ye, kendine çarpma.',
      icon: '🐍',
    },
    puzzle: {
      name: 'Dikoptik Hafıza',
      desc: 'Kartları çevirip eşlerini bul. Semboller tembel göze, kart çerçeveleri sağlam göze gösterilir.',
      icon: '🃏',
    },
    depth: {
      name: 'Derinlik Avı',
      desc: 'Noktalar arasında havada yüzen şekli bul. Yalnızca iki göz birlikte çalışınca görünür (3D görme).',
      icon: '🧊',
    },
    reading: {
      name: 'Dikoptik Okuma',
      desc: 'Kelimelerin bir kısmı yalnızca tembel göze, bir kısmı yalnızca sağlam göze gösterilir. Okumak için iki göz birlikte çalışır.',
      icon: '📖',
    },
    video: {
      name: 'Dikoptik Film',
      desc: 'Kendi videonu kırmızı-mavi gözlükle izle: tembel göz net, sağlam göz soluk görür.',
      icon: '🎬',
    },
  } satisfies Record<ActivityKind, { name: string; desc: string; icon: string }>,
};

export type ActivityInfo = (typeof tr.activity)[ActivityKind];
