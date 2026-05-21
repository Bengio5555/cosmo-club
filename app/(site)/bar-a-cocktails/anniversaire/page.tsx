import type { Metadata } from "next";
import { LandingPage, type LandingConfig } from "@/components/landing/LandingPage";
import { getImagePath } from "@/lib/server/imagesConfig";

const SLUG = "/bar-a-cocktails/anniversaire";
const FALLBACK_HERO = "/brand/ai/bento-bar-cocktails.png";

export const metadata: Metadata = {
  title: "Bar à cocktails anniversaire Paris — 30, 40, 50 ans et +",
  description:
    "Bar à cocktails événementiel pour anniversaire à Paris et en Île-de-France. Mixologue, scénographie premium, cartes signature et mocktails. Pour 30, 40, 50 ans et plus. Devis sous 24 h.",
  keywords: [
    "bar à cocktails anniversaire",
    "barman anniversaire Paris",
    "cocktails anniversaire",
    "animation cocktail anniversaire",
    "bar à cocktails 40 ans",
    "bar à cocktails 30 ans",
    "bar à cocktails 50 ans",
    "soirée anniversaire Paris",
  ],
  alternates: { canonical: SLUG },
  openGraph: {
    title: "Bar à cocktails anniversaire — Cosmo Club Paris",
    description:
      "Mixologie événementielle pour un anniversaire qui marque. Bars modulables, cartes signature, mocktails et personnalisation.",
    url: SLUG,
    type: "website",
  },
};

const config: LandingConfig = {
  slug: SLUG,
  eyebrow: "Bar à cocktails anniversaire",
  h1: "Un bar à cocktails pour votre anniversaire.",
  h1Accent: "cocktails",
  subtitle:
    "30, 40, 50 ans ou plus : transformez votre anniversaire en moment marquant. Mixologie événementielle, cartes signature et scénographie sur mesure à Paris.",
  heroSrc: FALLBACK_HERO,
  intro: [
    "Un anniversaire qu'on retient, ce n'est pas un buffet de plus — c'est un moment construit. Le bar à cocktails Cosmo Club s'installe au centre de votre soirée et devient le rituel partagé : on commande, on goûte, on discute, on revient.",
    "Que vous fêtiez vos 30 ans dans un loft, vos 40 ans dans un appartement haussmannien, ou vos 50 ans dans une salle privée, nous adaptons la prestation au lieu, au nombre d'invités et à l'ambiance que vous voulez créer.",
  ],
  pillars: [
    {
      title: "Adapté à votre âge, votre tribu",
      body: "30 ans amis-cocktails, 40 ans cocktail-dînatoire, 50 ans réception : nous calibrons la carte, le bar, l'équipe et le tempo en fonction de votre soirée et de qui vous invitez.",
    },
    {
      title: "Une carte qui parle de vous",
      body: "Cocktail signature à votre prénom, twist sur votre boisson préférée, mocktails pour ceux qui ne boivent pas, shot fruité en clôture. Nous co-écrivons la carte avec vous.",
    },
    {
      title: "Un bar qui transforme l'espace",
      body: "Bars miroirs, bois, ou stations modulables. Personnalisable aux couleurs et au thème de la soirée : sticker, néon, glaçons brandés, pochoirs, fleurs comestibles.",
    },
    {
      title: "Zéro logistique pour vous",
      body: "On installe avant l'arrivée des invités, on assure le service pendant, on remballe à la fin. Vous restez côté soirée, jamais côté coordination.",
    },
  ],
  experience: {
    title: "Une soirée qui ressemble à votre dizaine.",
    paragraphs: [
      "Vos 30 ans, ce n'est pas vos 40 ni vos 50. Nos prestations s'ajustent. Pour les 30 ans, on travaille souvent un bar miroir compact, une carte cocktails vifs (mules, smashes, signatures fruitées), des shots en clôture. Pour les 40-50 ans, on installe un bar plus statutaire, une carte plus contemplative (negroni, old fashioned twistés, cocktails fumés), un mocktail élégant pour les invités sobres.",
      "Côté carte, vous choisissez parmi quatre univers : Cocktails Classico (les grands classiques exécutés au cordeau), Cocktails Cosmo (notre signature contemporaine), Émotion (créations sur mesure, liées à votre histoire) et Mocktails (sans alcool, à la hauteur des cocktails alcoolisés). Une carte mixte de 4 à 6 cocktails couvre la plupart des soirées privées.",
      "Côté scénographie, le bar n'est pas qu'un meuble : c'est le décor central. Pour un anniversaire à thème, nous personnalisons jusqu'au moindre détail — couleur des lumières, contour du verre, garnitures florales, glaçons brandés à vos initiales, pochoirs sur la mousse, cartes imprimées. Les compositions florales et l'impression des cartes sont incluses.",
      "Côté équipe, le format standard est un mixologue + un commis. Pour les soirées au-delà de 50-60 invités, nous étoffons. Nos mixologues sont sélectionnés autant pour leur technique que pour leur sens du service : ils animent le bar sans s'imposer, et savent rendre chaque commande personnelle.",
    ],
  },
  timeline: [
    {
      label: "Brief de soirée",
      body: "Conversation pour cerner votre ambiance — intime, festive, contemplative — et le profil de vos invités.",
    },
    {
      label: "Proposition",
      body: "Plaquette dédiée en 24 à 48 h : carte cocktails proposée, bar suggéré, personnalisations, chiffrage clair.",
    },
    {
      label: "Validation finale",
      body: "Ajustements de carte, des personnalisations, du timing. Tout est cadré au plus tard à J-7.",
    },
    {
      label: "Le jour J",
      body: "Installation discrète, service tout au long de la soirée, reprise en fin d'événement.",
    },
  ],
  faq: [
    {
      q: "À partir de combien d'invités proposez-vous un bar à cocktails pour un anniversaire ?",
      a: "Cosmo Club Paris intervient sur des formats anniversaire très variés : de la soirée intime à domicile (15-25 invités) à l'anniversaire grand format (200+ invités dans une salle privatisée). Plutôt qu'un seuil minimum, nous calibrons la prestation à votre format. Pour une soirée resserrée (15-30 invités), un bartender solo avec un bar compact suffit à donner le ton soirée mixologie sans surdimensionner. Pour 30-80 invités, l'équipe standard (mixologue + chef de salle) couvre confortablement la durée de l'événement. Au-delà de 80, nous ajoutons un deuxième bartender ou un barista selon le souhaité. La logique : on dimensionne pour que personne n'attende plus de 3-4 minutes au bar, sans pour autant créer un sentiment de sur-déploiement qui casserait l'intimité d'un anniversaire. Dites-nous votre nombre d'invités prévu et le type de lieu, on vous répond avec le format adapté et un devis cadré sous 48h.",
    },
    {
      q: "Pouvez-vous créer un cocktail à mon prénom pour mon anniversaire ?",
      a: "Oui, le cocktail signature à votre prénom est devenu l'une des prestations les plus demandées sur les anniversaires Cosmo Club Paris — particulièrement pour les anniversaires marquants (30, 40, 50, 60 ans). Nous concevons un cocktail dédié avec votre prénom comme nom de la création, un ingrédient totem qui fait sens dans votre histoire personnelle (un rhum de votre pays natal, une fleur comestible qui rappelle un voyage marquant, un ingrédient qui évoque votre métier ou votre passion), et une courte histoire imprimée sur la carte cocktails — quelques lignes qui contextualisent pourquoi cette création vous correspond. La conception se fait en 1 à 2 itérations selon votre disponibilité : un brief créatif court (15-20 min par téléphone), une proposition de 2-3 recettes, et un arbitrage. Vos invités gardent souvent la carte en souvenir après la soirée — c'est ce petit détail qui transforme un anniversaire bien organisé en moment dont on se rappelle des années après.",
    },
    {
      q: "Avez-vous une formule cocktails sans alcool ?",
      a: "Oui, la carte mocktails fait partie intégrante de chaque prestation Cosmo Club Paris, sans surcoût, et elle est construite avec la même exigence que la carte alcoolisée : ingrédients premium (purées de fruits frais, sirops maison cuits en atelier, jus pressés du jour, infusions à froid), présentation identique dans la même verrerie, et de vraies recettes pensées comme des compositions à part entière — pas du jus sucré déguisé. Trois à quatre mocktails signatures sont proposés en parallèle des cocktails classiques. Pour les soirées 100 % sans alcool (anniversaires familiaux multi-générationnels, mariages musulmans, fêtes pour adolescents), il suffit de nous le préciser au brief : nous adaptons toute la carte en compositions sans alcool, avec la même variété d'expressions gustatives (frais, amer, fruité, herbacé, complexe). Vos invités qui ne boivent pas ne ressentent jamais l'effet « lot de consolation » qui plombe trop souvent les options sans alcool dans l'événementiel.",
    },
    {
      q: "Personnalisez-vous le bar à mes couleurs pour un anniversaire ?",
      a: "Oui, la personnalisation visuelle du bar est l'un des leviers les plus efficaces pour qu'un anniversaire ait une vraie identité — au-delà du décor classique de la pièce. Six éléments peuvent être personnalisés à vos couleurs : sticker pleine façade du bar (logo perso, monogramme, message « 40 ans de XYZ »), glaçons gravés à vos initiales ou à un motif que vous choisissez (fleur, étoile, cœur, chiffre du nouvel âge), pastilles comestibles flottant à la surface des cocktails avec votre motif imprimé en couleur, toppings fruits sculptés aux initiales, pochoirs sur la mousse des lattes au cacao ou au curcuma, néon sur mesure pour la scénographie d'ambiance (« 40 », « Sarah », un message qui vous ressemble). Les compositions florales du bar et l'impression des cartes cocktails sont offertes. Les éléments plus complexes (néon dimensionné, scénographie complète) sont chiffrés au devis. L'objectif : que le bar lise comme une scénographie pensée pour vous, pas comme un meuble loué.",
    },
    {
      q: "Intervenez-vous à domicile pour un anniversaire ?",
      a: "Oui, l'anniversaire à domicile est l'un des formats sur lesquels nous intervenons le plus fréquemment, et c'est un format que nous maîtrisons quel que soit votre logement. Que vous receviez dans un appartement parisien (même au 5ème étage sans ascenseur), une maison avec jardin, un loft, un duplex avec rooftop ou une salle privatisée dans un restaurant, nous adaptons le déploiement. La logistique d'un anniversaire à domicile est validée en amont lors d'un échange préparatoire qui couvre quatre points : accessibilité du lieu (escalier, ascenseur, dimensions du couloir d'entrée pour le passage du matériel), présence d'un point d'eau et d'électricité (16 ou 32 ampères selon les cas), espace disponible pour le bar (idéalement 1m50 minimum de façade), et flux de circulation des invités. Si vous habitez un lieu atypique, dites-le simplement — nous avons l'habitude de nous adapter.",
    },
    {
      q: "Et si je veux organiser un anniversaire à la dernière minute ?",
      a: "Contactez-nous quand même — nous travaillons régulièrement dans des délais resserrés et trouvons généralement une solution, particulièrement en semaine ou sur des formats compacts. Sur un anniversaire à domicile pour 20-40 invités, un délai de 7 à 10 jours est largement opérable en basse saison (octobre à avril). Pour les anniversaires en haute saison (juin, septembre, période de fin d'année), un délai de 3 à 4 semaines est plus confortable mais nous gardons souvent une flexibilité de dernière minute pour des projets bien cadrés. Si nous ne sommes pas disponibles à votre date, nous vous le disons franchement dès le premier échange — sans vous faire perdre de temps avec un faux espoir. Dans ce cas, nous pouvons parfois recommander un confrère mixologue dont nous garantissons la qualité, plutôt que de vous laisser sans solution. La franchise est un standard chez nous, en particulier sur les demandes urgentes où le timing compte autant que la prestation.",
    },
  ],
  related: [
    {
      href: "/bar-a-cocktails/mariage",
      label: "Bar à cocktails mariage",
      desc: "La prestation mariage : scénographie, cartes signature, accompagnement complet.",
    },
    {
      href: "/bar-a-cocktails/entreprise",
      label: "Bar à cocktails entreprise",
      desc: "Cocktails de fin d'année, lancement, séminaire : la formule corporate.",
    },
    {
      href: "/concept",
      label: "Notre concept",
      desc: "Pourquoi Cosmo Club, notre approche de la mixologie événementielle.",
    },
  ],
  serviceJsonLd: {
    name: "Bar à cocktails anniversaire — Cosmo Club Paris",
    description:
      "Bar à cocktails événementiel pour anniversaire (30, 40, 50 ans et plus) à Paris et en Île-de-France. Cartes signature, scénographie premium, mocktails, mixologues professionnels.",
    serviceType: "Bar à cocktails anniversaire",
  },
  howToName:
    "Comment organiser un bar à cocktails pour un anniversaire à Paris",
};

export default async function AnniversairePage() {
  const heroSrc = await getImagePath("bar-a-cocktails-anniversaire", "hero", FALLBACK_HERO);
  return <LandingPage config={{ ...config, heroSrc }} />;
}
