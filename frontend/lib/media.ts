/**
 * Public-site image slots.
 *
 * Every slot renders a captioned frame. Drop a file at the `src` path inside `public/media/`
 * and it appears immediately  no code change. Until then the frame renders a designed
 * placeholder that states the expected filename and crop.
 *
 * Recommended: JPG or WebP, sRGB,long edge 2400px, under 400KB.
 */
export type MediaSlot = {
  id: string;
  /** Shipped artwork. Point this at a `.jpg` once a photograph is dropped into `public/media`. */
  src: string;
  alt: string;
  caption: string;
  credit?: string;
  ratio: "wide" | "tall" | "square" | "cinema";
  /** Optional motion loop. Rendered muted, looping and inline; `src` acts as the still fallback. */
  video?: { mp4: string; webm?: string; poster: string };
};

export const MEDIA: Record<string, MediaSlot> = {
  homeHero: {
    id: "homeHero",
    src: "/media/home-hero.svg",
    alt: "Reinforced concrete frame under construction at first-floor level",
    caption: "East Legon Residence, Accra",
    credit: "Estimate to final account | Construction",
    ratio: "cinema",
    video: { mp4: "/media/home-hero.mp4", webm: "/media/home-hero.webm", poster: "/media/home-hero-poster.jpg" }
  },
  homeWhoWeAre: {
    id: "homeWhoWeAre",
    src: "/media/home-who-we-are.svg",
    alt: "Site engineer reviewing drawings against blockwork",
    caption: "",
    credit: "Estimating and variations | Construction",
    ratio: "wide"
  },
  homeMethod: {
    id: "homeMethod",
    src: "/media/home-method.svg",
    alt: "Mason setting sandcrete blocks to a line",
    caption: "",
    credit: "Priced from the contractor's own rate book",
    ratio: "wide"
  },
  homeMoney: {
    id: "homeMoney",
    src: "/media/home-money.svg",
    alt: "Site office desk with invoices and a mobile phone",
    caption: "",
    credit: "Milestone invoicing and Mobile Money receipts",
    ratio: "wide"
  },
  homeFootprint: {
    id: "homeFootprint",
    src: "/media/home-footprint.svg",
    alt: "Completed residential development at dusk",
    caption: "",
    credit: "Contract value tracked from award to retention release",
    ratio: "cinema"
  },
  productHero: {
    id: "productHero",
    src: "/media/product-hero.svg",
    alt: "Quantity surveyor measuring a drawing on site",
    caption: "",
    credit: "Estimate to quotation in a single afternoon",
    ratio: "cinema",
    video: { mp4: "/media/product-hero.mp4", webm: "/media/product-hero.webm", poster: "/media/product-hero-poster.jpg" }
  },
  productEstimating: {
    id: "productEstimating",
    src: "/media/product-estimating.svg",
    alt: "Rebar cages and formwork before a pour",
    caption: "",
    credit: "Concrete, reinforcement and formwork priced by rate",
    ratio: "wide"
  },
  productCash: {
    id: "productCash",
    src: "/media/product-cash.svg",
    alt: "Contractor and client shaking hands beside a completed unit",
    caption: "",
    credit: "Final account agreed with every variation on record",
    ratio: "wide"
  },
  pricingHero: {
    id: "pricingHero",
    src: "/media/pricing-hero.svg",
    alt: "Roofing crew fixing aluzinc sheets",
    caption: "",
    credit: "Priced, quoted and invoiced in one system",
    ratio: "wide"
  },
  aboutHero: {
    id: "aboutHero",
    src: "/media/about-hero.svg",
    alt: "Wide view of an active construction site in Accra",
    caption: "",
    credit: "Where the method was tested before it became software",
    ratio: "cinema"
  },
  aboutTeam: {
    id: "aboutTeam",
    src: "/media/about-team.svg",
    alt: "Two engineers reviewing a bill of quantities",
    caption: "",
    credit: "Every figure defended line by line",
    ratio: "wide"
  },
  contactHero: {
    id: "contactHero",
    src: "/media/contact-hero.svg",
    alt: "Site meeting under a partially completed slab",
    caption: "",
    credit: "We would rather see your bill than send you a brochure",
    ratio: "wide"
  },
  blogHero: {
    id: "blogHero",
    src: "/media/blog-hero.svg",
    alt: "Notebook of rates on a site table",
    caption: "",
    credit: "The practice this writing came from",
    ratio: "wide"
  }
};

export const RATIO_CLASS: Record<MediaSlot["ratio"], string> = {
  cinema: "aspect-[21/9]",
  wide: "aspect-[16/10]",
  square: "aspect-square",
  tall: "aspect-[4/5]"
};
