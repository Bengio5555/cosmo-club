import type { Metadata } from "next";
import { LandingPage, type LandingConfig } from "@/components/landing/LandingPage";

const SLUG = "/bar-a-cocktails/anniversaire";

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
  heroSrc: "/brand/ai/bento-bar-cocktails.png",
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
      q: "À partir de combien d'invités proposez-vous un bar à cocktails ?",
      a: "Notre prestation s'adapte aussi bien à une soirée intime qu'à un anniversaire d'envergure. Plutôt que de poser un seuil, parlons-en : nous évaluons ce qui a du sens pour votre format. Pour une petite soirée, nous proposons parfois un bartender solo avec un bar compact.",
    },
    {
      q: "Pouvez-vous créer un cocktail à mon prénom ?",
      a: "Oui, c'est même devenu un classique. Nous concevons un cocktail signature à votre nom, avec une histoire courte (un ingrédient totem, un souvenir, un voyage) imprimée sur la carte. Vos invités gardent souvent la carte en souvenir.",
    },
    {
      q: "Avez-vous une formule cocktails sans alcool ?",
      a: "Oui, nos mocktails sont conçus avec la même exigence que les cocktails alcoolisés — ingrédients premium, présentation identique, vraies recettes (pas de jus sucré déguisé). Pour une soirée 100 % sans alcool, dites-le simplement, nous adaptons toute la carte.",
    },
    {
      q: "Personnalisez-vous le bar à mes couleurs ?",
      a: "Oui : sticker pleine façade, glaçons brandés, pastilles comestibles aux initiales, pochoirs, néon sur mesure, fleurs comestibles. La composition florale et l'impression des cartes sont offertes. Le reste est sur devis selon vos envies.",
    },
    {
      q: "Intervenez-vous à domicile ?",
      a: "Oui. Que ce soit dans un appartement, une maison, une loft ou une salle privatisée, nous nous adaptons. Nous validons en amont les contraintes du lieu (ascenseur, point d'eau, électricité) pour qu'il n'y ait aucune surprise le jour J.",
    },
    {
      q: "Et si je veux organiser ça à la dernière minute ?",
      a: "Contactez-nous quand même. Nous travaillons souvent dans des délais resserrés et trouvons généralement une solution, surtout en semaine ou sur des formats compacts. Si nous ne sommes pas disponibles à la date demandée, nous le disons franchement.",
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
};

export default function AnniversairePage() {
  return <LandingPage config={config} />;
}
