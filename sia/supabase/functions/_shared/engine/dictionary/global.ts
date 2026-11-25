/**
 * GLOBAL language dictionary: shared knowledge of English, French, Arabic and Tunisian
 * Derja/Arabizi. It is code, not tenant data, so it is identical for every business and
 * changes only through a reviewed code change. Business-private terms live in the
 * vocabulary_entries table and are never merged into this file at runtime.
 */

/** concept -> aliases (any language, normalised at index time). */
export const CONCEPTS: Record<string, string[]> = {
  GREETING: [
    'hello', 'hi', 'hey', 'hola', 'good morning', 'good evening', 'good afternoon', 'bonjour', 'bonsoir', 'salut', 'coucou',
    'slm', 'salam', 'salem', 'selem', 'selam', 'salam alaykom', 'salam aleykom', 'assalam alaykom', 'assalamu alaykum',
    'aaslema', 'aslema', '3aslema', 'ahla', 'ahlen', 'ahlan', 'marhba', 'marhaba', 'sbeh el khir',
    'مرحبا', 'اهلا', 'السلام عليكم', 'سلام', 'صباح الخير', 'مساء الخير', 'عسلامه', 'اهلا وسهلا',
  ],
  GOODBYE: [
    'bye', 'goodbye', 'bye bye', 'see you', 'au revoir', 'a bientot', 'bslema', 'besslema', 'beslama', 'ma3a salema',
    'مع السلامه', 'بالسلامه', 'الى اللقاء',
  ],
  THANKS: [
    'thanks', 'thank you', 'thx', 'merci', 'mercii', 'mrc', 'barakallah', 'barak allah', '3ichek', 'aychek',
    'ya3tik essa7a', 'yaatik essaha', 'shokran', 'choukran', 'شكرا', 'بارك الله فيك', 'يعطيك الصحه', 'عيشك',
  ],
  HELP: ['help', 'aide', 'aidez moi', '3awenni', '3awnni', 'sa3edni', 'مساعده', 'ساعدني', 'عاوني'],
  PRICE: [
    'price', 'prices', 'cost', 'costs', 'how much', 'pricing', 'tarif', 'tarifs', 'prix', 'combien coute', 'combien ca coute',
    'combien',
    'soum', 'soma', 'souma', '9addech', '9adech', '9addesh', '9adesh', 'b9addech', 'b9dch', 'bqdch', 'bgdch', 'bgadech',
    'b9adech', 'bch7al', 'bech7al', 'ch7al', 'chhal', 'kaddech', 'qaddech', 'sa3r', 'se3r', 'thaman', 'taman',
    'تمن', 'الثمن', 'السعر', 'سعر', 'قداش', 'بقداش', 'شحال', 'بشحال',
  ],
  HOW_MANY: [
    'how many', 'combien de', 'combien d', 'number of', 'nombre de', 'nombre d', '9addech men', '9adech men', 'kadech men',
    'kaddech men', 'ch7al men', 'chhal men', 'كم عدد', 'عدد', 'قداش من',
  ],
  LOCATION: [
    'where', 'location', 'located', 'address', 'adresse', 'situated', 'situe', 'situee', 'emplacement', 'localisation',
    'win', 'wine', 'blasa', 'blasset', 'win mawjoudin', 'mawqi3', '3onwen', '3enwen', 'aanwan', 'adresse exacte',
    'ou etes vous', 'ou se trouve', 'ou est', 'ou se situe', 'ou etes', 'وين', 'اين', 'عنوان', 'موقع', 'وين موجودين',
  ],
  OPENING: [
    'opening', 'open', 'opens', 'hours', 'opening hours', 'horaire', 'horaires', 'ouvert', 'ouverte', 'ouvre', 'ouverture',
    'heures d ouverture', 'ma7loul', 'ma7lol', 'tefta7', 'fte7', 'ساعات العمل', 'مواعيد العمل', 'مفتوح', 'توقيت',
  ],
  CLOSING: [
    'close', 'closes', 'closing', 'closed', 'fermeture', 'ferme', 'fermes', 'fermez', 'ysakrou', 'tsakkar', 'tsakrou',
    'yesker', 'msakker', 'msaker', 'مغلق', 'تسكرو', 'اغلاق', 'يسكر',
  ],
  CONTACT: [
    'contact', 'phone', 'telephone', 'tel', 'email', 'mail', 'call you', 'whatsapp', 'joindre', 'appeler', 'numero',
    'nemra', 'nimro', 'ncontactikom', 'اتصال', 'هاتف', 'رقم', 'ايميل', 'تلفون', 'نمره',
  ],
  HAVE: [
    'do you have', 'have you', 'avez vous', 'vous avez', 'y a t il', 'il y a', 'est ce que vous avez', 'fama', 'famma',
    'fama 3andkom', 'famma 3andkom', '3andkom', '3andek', 'available', 'availability', 'disponible', 'disponibles',
    'disponibilite', 'mawjoud', 'mawjouda', 'mawjoudin', 'do you sell', 'do you offer', 'do you provide', 'offrez vous',
    'proposez vous', 'is there', 'are there', 'موجود', 'متوفر', 'عندكم', 'فما',
  ],
  STOCK: ['stock', 'in stock', 'en stock', 'stok', 'restock', 'il reste', 'restant', 'مخزون'],
  DELIVERY: [
    'delivery', 'deliver', 'delivers', 'ship', 'shipping', 'livraison', 'livrez', 'livrer', 'livrez vous', 'tawsil', 'tawsiil',
    'tawsel', 'twaslou', 'twasslou', 'twasel', 'fama livraison', 'famma livraison', 'frais de livraison',
    'توصيل', 'توصلو', 'تتوصلو',
  ],
  PAYMENT: [
    'payment', 'payments', 'pay', 'paiement', 'payer', 'card', 'cash', 'espece', 'especes', 'visa', 'credit card',
    'virement', 'bank transfer', 'flouss', 'flous', 'dfa3', 'ndfa3', 'kifech ndfa3', 'mode de paiement',
    'moyens de paiement', 'payment methods', 'cheque', 'carte bancaire', 'الدفع', 'دفع', 'بطاقه', 'نقدا', 'طريقه الدفع',
  ],
  DISCOUNT: [
    'discount', 'discounts', 'promo', 'promotion', 'promotions', 'reduction', 'remise', 'soldes', 'special offer',
    'offre speciale', '5om', 'ta5fid', 'takhfid', 'ta5fif', 'خصم', 'تخفيض',
  ],
  PURCHASE: [
    'buy', 'purchase', 'order', 'acheter', 'achat', 'commander', 'commande', 'nechri', 'nechrih', 'n7eb nechri',
    'nheb nechri', 'na3mel commande', 'i want to buy', 'i want to order', 'je veux acheter', 'je voudrais commander',
    'شراء', 'نشري', 'نحب نشري', 'نطلب',
  ],
  RESERVATION: [
    'book', 'booking', 'reserve', 'reservation', 'reserver', 'book a room', 'reserver une chambre', '7ajz', '7jez',
    'n7ajez', 'nheb n7ajez', 'nhajez', 'n7ajzou', 'حجز', 'نحجز', 'نحب نحجز',
  ],
  APPOINTMENT: ['appointment', 'rendez vous', 'rdv', 'rendezvous', 'mawid', 'maw3id', 'موعد'],
  CHECKIN: ['check in', 'checkin', 'arrivee', 'arrival', 'تسجيل الدخول', 'وقت الوصول'],
  CHECKOUT: ['check out', 'checkout', 'depart', 'departure', 'sortie', 'تسجيل الخروج'],
  ROOM: ['room', 'rooms', 'chambre', 'chambres', 'suite', 'suites', 'ghorfa', 'ghorfet', 'ghorf', '8orfa', 'غرفه', 'غرف'],
  TYPES: ['types', 'type', 'kinds', 'categories', 'category', 'categorie', 'genres', 'anwa3', 'anwe3', 'انواع'],
  FACILITIES: ['facilities', 'facility', 'amenities', 'equipment', 'equipements', 'installations', 'commodites', 'مرافق'],
  OFFER: [
    'what do you offer', 'what do you sell', 'what services', 'what products', 'services', 'products', 'produits',
    'quels produits', 'quels services', 'menu', 'chnowa 3andkom', 'خدماتكم', 'منتجاتكم',
  ],
  POLICY_CANCEL: ['cancel', 'cancellation', 'annuler', 'annulation', 'annulations', 'nal8i', 'nlaghi', 'الغاء', 'إلغاء'],
  POLICY_RETURN: [
    'return', 'returns', 'refund', 'retour', 'retourner', 'rembourser', 'remboursement', 'echange', 'exchange',
    'nrajja3', 'nraja3', 'nbaddel', 'استرجاع', 'ارجاع', 'تبديل',
  ],
  POLICY: ['policy', 'policies', 'politique', 'conditions', 'reglement', 'rules', 'سياسه', 'شروط'],
  ABOUT: ['about you', 'who are you', 'qui etes vous', 'presentez vous', 'chkoun intouma', 'من انتم', 'نبذه'],
  DURATION: [
    'how long', 'duration', 'combien de temps', 'modet', 'moddet', 'mouda', '9addech men wa9t', 'chhal men wa9t',
    'kadech men wa9t', 'مده',
  ],
  REQUIREMENTS: [
    'requirements', 'required', 'requirement', 'documents', 'document', 'papers', 'papiers', 'pieces', 'necessaire',
    'what do i need', 'que faut il', 'chnowa lazem', 'wathayeq', 'wthayek', 'وثائق', 'اوراق', 'ملفات',
  ],
  COLOR_QUERY: [
    'colors', 'colours', 'what color', 'which color', 'what colour', 'which colour', 'couleurs', 'quelle couleur',
    'quelles couleurs', 'alwan', 'alwen', 'el alwan', 'الوان',
  ],
  SIZE_QUERY: ['sizes', 'what sizes', 'which sizes', 'tailles', 'quelles tailles', '9iyesat', 'مقاسات', 'قياسات'],
  DETAILS: [
    'details', 'detail', 'info', 'infos', 'information', 'informations', 'description', 'describe', 'plus d infos',
    'tell me more', 'tell me about', 'more info', 'features', 'caracteristiques', 'tafsil', 'تفاصيل', 'معلومات',
  ],
}

/** Words that count as customer-facing facilities. canonical id -> aliases. */
export const FACILITIES: Record<string, string[]> = {
  pool: ['pool', 'swimming pool', 'piscine', 'pisina', 'مسبح', 'بسين'],
  wifi: ['wifi', 'wi fi', 'internet'],
  parking: ['parking', 'parking lot', 'stationnement'],
  spa: ['spa', 'sauna', 'hammam'],
  gym: ['gym', 'fitness', 'salle de sport'],
  breakfast: ['breakfast', 'petit dejeuner', 'ftour sbeh'],
  ac: ['air conditioning', 'climatisation', 'clim'],
  beach: ['beach', 'plage', 'private beach'],
  elevator: ['lift', 'elevator', 'ascenseur'],
  terrace: ['terrace', 'terrasse'],
  pets: ['pets', 'pet', 'animaux', 'dogs', 'chiens'],
}

export const COLORS: Record<string, string[]> = {
  black: ['black', 'noir', 'noire', 'noirs', 'noires', 'aswed', 'aswad', 'kahla', 'اسود'],
  white: ['white', 'blanc', 'blanche', 'abyadh', 'abiadh', 'byedh', 'ابيض'],
  red: ['red', 'rouge', 'a7mar', 'ahmar', 'a7mer', 'احمر'],
  blue: ['blue', 'bleu', 'bleue', 'azra9', 'azrag', 'ازرق'],
  green: ['green', 'vert', 'verte', 'a5dhar', 'akhdhar', 'اخضر'],
  yellow: ['yellow', 'jaune', 'asfar', 'اصفر'],
  gray: ['grey', 'gray', 'gris', 'grise', 'rmadi', 'remadi', 'رمادي'],
  beige: ['beige'],
  brown: ['brown', 'marron', '9ahwi', 'qahwi', 'بني'],
  pink: ['pink', 'rose', 'wardi', 'وردي'],
  orange: ['orange'],
  purple: ['purple', 'violet', 'violette', 'banafsaji', 'بنفسجي'],
}

/** Words that introduce a size ("taille L"). */
export const SIZE_WORDS = ['size', 'sizes', 'taille', 'tailles', 'pointure', 'talla', '9iyes', 'qias', 'مقاس', 'قياس']
export const SIZE_TOKENS: Record<string, string> = {
  xxs: 'XXS', xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL', xxl: 'XXL', xxxl: 'XXXL', '2xl': 'XXL', '3xl': 'XXXL',
  small: 'S', medium: 'M', large: 'L',
}

export const WEEKDAYS: Record<string, string[]> = {
  monday: ['monday', 'lundi', 'litnin', 'الاثنين'],
  tuesday: ['tuesday', 'mardi', 'ethletha', 'thaletha', 'الثلاثاء'],
  wednesday: ['wednesday', 'mercredi', 'lar8a', 'larb3a', 'الاربعاء'],
  thursday: ['thursday', 'jeudi', 'lekhmis', 'الخميس'],
  friday: ['friday', 'vendredi', 'jom3a', 'jemaa', 'الجمعه'],
  saturday: ['saturday', 'samedi', 'sebt', 'السبت'],
  sunday: ['sunday', 'dimanche', 'a7ad', '7ad', 'الاحد'],
}
export const RELATIVE_DAYS: Record<string, string[]> = {
  today: ['today', 'aujourd hui', 'lyoum', 'lyouma', 'اليوم'],
  tomorrow: ['tomorrow', 'demain', 'ghodwa', 'ghodoua', 'غدا'],
}
export const NEXT_WORDS = ['next', 'prochain', 'prochaine', 'jey', 'jeya', 'القادم']

export const NUMBER_WORDS: Record<string, number> = {
  one: 1, un: 1, une: 1, wa7ed: 1, two: 2, deux: 2, zouz: 2, three: 3, trois: 3, tletha: 3, four: 4, quatre: 4, arb3a: 4,
  five: 5, cinq: 5, '5amsa': 5, six: 6, seven: 7, sept: 7, eight: 8, huit: 8, nine: 9, neuf: 9, ten: 10, dix: 10,
}
export const PEOPLE_WORDS = [
  'people', 'persons', 'person', 'adults', 'adult', 'personnes', 'personne', 'pax', 'guests', 'ashkhas', 'nefar', 'nfar',
  'shakhs', 'اشخاص', 'نفر',
]

/** Language hint words. Used only to choose the reply language, never to answer. */
export const LANG_HINTS: Record<'en' | 'fr' | 'derja', string[]> = {
  en: [
    'the', 'you', 'your', 'do', 'does', 'is', 'are', 'how', 'what', 'where', 'when', 'much', 'many', 'have', 'can', 'i',
    'want', 'to', 'for', 'with', 'and', 'of', 'in', 'on', 'please', 'hello', 'hi', 'thanks', 'thank', 'open', 'close',
    'price', 'cost', 'deliver', 'delivery', 'size', 'room', 'rooms', 'book', 'next', 'time', 'it', 'a', 'an',
  ],
  fr: [
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'est', 'vous', 'avez', 'combien', 'quel', 'quelle', 'quels', 'ou',
    'quand', 'je', 'veux', 'voudrais', 'pour', 'avec', 'et', 'sur', 'bonjour', 'salut', 'merci', 'prix', 'ouvert',
    'ferme', 'livraison', 'taille', 'chambre', 'chambres', 'noir', 'svp', 'il', 'y', 'a', 'jeudi', 'vendredi', 'samedi',
    'heure', 'heures', 'fermez', 'ouvrez', 'livrez', 'fait', 'quelles', 'couleurs', 'tailles',
  ],
  derja: [
    'fama', 'famma', 'chnowa', 'chnouwa', 'chnia', 'win', 'kifech', 'kifeh', '9addech', '9adech', 'ch7al', 'barcha', 'behi',
    '3andkom', '3andek', 'nheb', 'n7eb', 'bch', 'bech', 'mawjoud', 'mawjoudin', 'wa9t', 'lyoum', 'ghodwa', 'slm', 'aslema',
    '3aslema', 'bgdch', 'b9dch', 'twaslou', 'tawsiil', 'mouch', 'moch', 'tnajem', 'n7ajez', 'el', 'w', 'elhoodi',
    'شنوه', 'شنيه', 'فما', 'قداش', 'برشا', 'باهي', 'نحب', 'توا', 'موش', 'علاش', 'وين', 'كيفاش', 'بقداش', 'نحجز',
  ],
}
