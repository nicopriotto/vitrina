export type LumenColor = { name: string; hex: string; image: string };

export type LumenProduct = {
  handle: string;
  name: string;
  priceArs: number;
  description: string;
  colors: LumenColor[];
  sizes: string[];
  /** "Color/Size" combinations that are sold out */
  soldOut: string[];
};

const img = (name: string) => `/mock/lumen/${name}.webp`;
const CLOTHES = ["S", "M", "L", "XL"];
const WAIST = ["30", "32", "34", "36"];
const DRESS = ["XS", "S", "M", "L"];
const SHOES = ["40", "41", "42", "43", "44"];

export const PRODUCTS: LumenProduct[] = [
  {
    handle: "remera-classic",
    name: "Classic Tee",
    priceArs: 38000,
    description:
      "Our everyday tee. 180 gsm combed cotton jersey, relaxed straight fit, pre-washed so it feels broken-in from day one. Sewn in Brooklyn.",
    colors: [
      { name: "Black", hex: "#17171a", image: img("tee-ink") },
      { name: "Navy", hex: "#1f2a44", image: img("tee-navy") },
      { name: "Sage", hex: "#8e9a82", image: img("tee-sage") },
      { name: "Rust", hex: "#a2532f", image: img("tee-rust") },
    ],
    sizes: CLOTHES,
    soldOut: ["Black/XL", "Sage/S", "Rust/XL"],
  },
  {
    handle: "remera-breton",
    name: "Breton Stripe Tee",
    priceArs: 44000,
    description:
      "A long-sleeve breton tee in soft striped cotton. Boat neck, slim fit and a little stretch so it moves with you.",
    colors: [{ name: "Navy Stripe", hex: "#2b3550", image: img("tee-breton") }],
    sizes: CLOTHES,
    soldOut: ["Navy Stripe/S"],
  },
  {
    handle: "buzo-hoodie",
    name: "Essential Hoodie",
    priceArs: 98000,
    description:
      "Heavy 400 gsm fleece hoodie with a double-layer hood and kangaroo pocket. Cut slightly boxy so it layers over a tee without bunching.",
    colors: [{ name: "Oat", hex: "#d9cdb6", image: img("hoodie") }],
    sizes: CLOTHES,
    soldOut: ["Oat/XL"],
  },
  {
    handle: "campera-denim",
    name: "Denim Chore Jacket",
    priceArs: 135000,
    description:
      "A four-pocket chore jacket in washed 12 oz denim with metal buttons. Easy through the shoulder, built to be worn every day.",
    colors: [{ name: "Washed Blue", hex: "#3f6597", image: img("jacket-denim") }],
    sizes: CLOTHES,
    soldOut: [],
  },
  {
    handle: "jean-straight",
    name: "Straight Jeans",
    priceArs: 89000,
    description:
      "Mid-rise straight-leg jeans in rigid American-milled denim. Five pockets, button fly, finished with a clean hem.",
    colors: [
      { name: "Light Wash", hex: "#8fa9c7", image: img("jeans-light") },
      { name: "Black", hex: "#1a1a1c", image: img("jeans-black") },
      { name: "Ecru", hex: "#e7e0d0", image: img("jeans-ecru") },
    ],
    sizes: WAIST,
    soldOut: ["Black/30", "Ecru/36"],
  },
  {
    handle: "pantalon-chino",
    name: "Slim Chinos",
    priceArs: 76000,
    description:
      "Slim-tapered chinos in garment-washed cotton twill with a touch of stretch. Smart enough for the office, soft enough for the weekend.",
    colors: [{ name: "Khaki", hex: "#c9b99a", image: img("chinos") }],
    sizes: WAIST,
    soldOut: ["Khaki/34"],
  },
  {
    handle: "camisa-franela",
    name: "Flannel Check Shirt",
    priceArs: 69000,
    description:
      "Brushed cotton flannel in a navy and grey buffalo check. Button-down collar and a clean, pocket-free front.",
    colors: [{ name: "Navy Check", hex: "#2f3b5c", image: img("shirt-flannel") }],
    sizes: CLOTHES,
    soldOut: ["Navy Check/XL"],
  },
  {
    handle: "zapatillas-cuero",
    name: "Leather Court Sneakers",
    priceArs: 112000,
    description:
      "Minimal low-top sneakers in smooth Italian leather with a cupsole and tonal laces. Handmade in small batches.",
    colors: [{ name: "White", hex: "#f1f1ef", image: img("sneakers") }],
    sizes: ["40", "41", "42", "43", "44"],
    soldOut: ["White/44"],
  },
  {
    handle: "campera-cuero",
    name: "Leather Chore Jacket",
    priceArs: 245000,
    description: "A four-pocket chore jacket in soft vegetable-tanned leather with a quilted lining. Heavy, easy and it only gets better with wear.",
    colors: [{ name: "Black", hex: "#17171a", image: img("jacket-leather") }],
    sizes: CLOTHES,
    soldOut: ["Black/S"],
  },
  {
    handle: "campera-bomber",
    name: "Nylon Bomber",
    priceArs: 128000,
    description: "Lightweight matte nylon bomber with ribbed cuffs, a hidden zip pocket on the sleeve and a relaxed, slightly cropped cut.",
    colors: [{ name: "Black", hex: "#1a1a1d", image: img("jacket-bomber") }],
    sizes: CLOTHES,
    soldOut: [],
  },
  {
    handle: "campera-varsity",
    name: "Varsity Jacket",
    priceArs: 142000,
    description: "Wool-blend body with cream leather sleeves, striped rib trims and a chenille letter on the chest. Snap front.",
    colors: [{ name: "Green / Cream", hex: "#1f5a3a", image: img("jacket-varsity") }],
    sizes: CLOTHES,
    soldOut: ["Green / Cream/XL"],
  },
  {
    handle: "sweater-trenzado",
    name: "Cable Knit Sweater",
    priceArs: 96000,
    description: "Chunky cable knit in a soft cotton and wool blend. Crew neck, ribbed hem and cuffs, made to be worn all winter.",
    colors: [{ name: "Cream", hex: "#ece4d2", image: img("knit-cable") }],
    sizes: CLOTHES,
    soldOut: [],
  },
  {
    handle: "cardigan-mohair",
    name: "Brushed Cardigan",
    priceArs: 88000,
    description: "A fuzzy brushed cardigan with a polo collar and button front. Light as air, warm as a blanket.",
    colors: [{ name: "Moss", hex: "#7d9a2e", image: img("knit-mohair") }],
    sizes: CLOTHES,
    soldOut: ["Moss/S"],
  },
  {
    handle: "sweater-cuello-alto",
    name: "Roll Neck Sweater",
    priceArs: 72000,
    description: "Fine merino roll neck with a close, clean fit. Layers under a jacket or stands on its own.",
    colors: [{ name: "Black", hex: "#141416", image: img("knit-roll") }],
    sizes: CLOTHES,
    soldOut: [],
  },
  {
    handle: "camisa-chambray",
    name: "Chambray Work Shirt",
    priceArs: 64000,
    description: "Washed cotton chambray with two chest pockets and pearl snap buttons. Soft from the first wear.",
    colors: [{ name: "Chambray", hex: "#6f8fb5", image: img("shirt-chambray") }],
    sizes: CLOTHES,
    soldOut: ["Chambray/XL"],
  },
  {
    handle: "camisa-palmeras",
    name: "Palm Camp Shirt",
    priceArs: 58000,
    description: "Short-sleeve camp collar shirt in a tropical palm print on viscose. Loose, breezy, made for the summer in Brooklyn.",
    colors: [{ name: "Palm Print", hex: "#2a5a48", image: img("shirt-camp") }],
    sizes: CLOTHES,
    soldOut: [],
  },
  {
    handle: "pantalon-cargo",
    name: "Cargo Pants",
    priceArs: 82000,
    description: "Tapered cargo pants in sturdy cotton twill with side pockets and an adjustable hem. Utility without the bulk.",
    colors: [{ name: "Olive", hex: "#6b6f43", image: img("pants-olive") }],
    sizes: WAIST,
    soldOut: ["Olive/30"],
  },
  {
    handle: "pantalon-pinzas",
    name: "Pleated Trousers",
    priceArs: 79000,
    description: "Wide-leg pleated trousers in a crisp cotton blend. High waist, clean drape, finished with a deep hem.",
    colors: [{ name: "Cream", hex: "#ece4d3", image: img("pants-cream") }],
    sizes: WAIST,
    soldOut: [],
  },
  {
    handle: "botas-chelsea",
    name: "Chelsea Boots",
    priceArs: 168000,
    description: "Black leather Chelsea boots with elastic side panels and a chunky rubber sole. Made in small batches.",
    colors: [{ name: "Black", hex: "#141416", image: img("boots-chelsea") }],
    sizes: ["40", "41", "42", "43", "44"],
    soldOut: ["Black/40"],
  },
  {
    handle: "mocasines-gamuza",
    name: "Suede Loafers",
    priceArs: 154000,
    description: "Penny loafers in soft brown suede with a flexible leather sole. Dress them up or down.",
    colors: [{ name: "Tobacco", hex: "#7a4a2a", image: img("loafers") }],
    sizes: ["40", "41", "42", "43", "44"],
    soldOut: [],
  },
  {
    handle: "abrigo-camel",
    name: "Camel Field Coat",
    priceArs: 265000,
    description: "A four-pocket field coat in brushed wool. Notch collar, horn buttons and a relaxed fit that sits over a sweater.",
    colors: [
      { name: "Camel", hex: "#b98a54", image: img("jacket-camel") },
    ],
    sizes: CLOTHES,
    soldOut: ["Camel/S"],
  },
  {
    handle: "campera-puffer",
    name: "Quilted Jacket",
    priceArs: 158000,
    description: "Glossy quilted jacket with a light synthetic fill and four patch pockets. Warm without the bulk.",
    colors: [
      { name: "Black", hex: "#141416", image: img("jacket-puffer") },
    ],
    sizes: CLOTHES,
    soldOut: [],
  },
  {
    handle: "blazer-tweed",
    name: "Tweed Blazer",
    priceArs: 186000,
    description: "Single-breasted blazer in a woven tweed with patch pockets and a soft shoulder. Dress it up or throw it over a tee.",
    colors: [
      { name: "Olive Tweed", hex: "#7a6a3c", image: img("blazer-tweed") },
    ],
    sizes: CLOTHES,
    soldOut: ["Olive Tweed/XL"],
  },
  {
    handle: "camisa-blanca",
    name: "White Poplin Shirt",
    priceArs: 62000,
    description: "Crisp cotton poplin shirt with a spread collar and mother-of-pearl buttons. The one white shirt you need.",
    colors: [
      { name: "White", hex: "#f4f3ee", image: img("shirt-white") },
    ],
    sizes: CLOTHES,
    soldOut: [],
  },
  {
    handle: "camisa-rayas",
    name: "Striped Oxford Shirt",
    priceArs: 66000,
    description: "Button-down oxford in a fine blue and white stripe. Slim through the body, softened by a garment wash.",
    colors: [
      { name: "Blue Stripe", hex: "#9db3d8", image: img("shirt-stripe") },
    ],
    sizes: CLOTHES,
    soldOut: ["Blue Stripe/S"],
  },
  {
    handle: "pantalon-sastre",
    name: "Tailored Trousers",
    priceArs: 92000,
    description: "Straight tailored trousers in a soft stretch twill. Mid rise, side adjusters and a clean line from hip to hem.",
    colors: [
      { name: "Charcoal", hex: "#3b3b3f", image: img("pants-charcoal") },
      { name: "Navy", hex: "#1d2540", image: img("pants-navy") },
      { name: "Rust", hex: "#9a4a28", image: img("pants-rust") },
    ],
    sizes: WAIST,
    soldOut: ["Navy/30", "Rust/36"],
  },
  {
    handle: "zapatillas-trail",
    name: "Trail Runners",
    priceArs: 134000,
    description: "Lightweight trail runners with a grippy lugged outsole and a breathable mesh upper.",
    colors: [
      { name: "Grey / Orange", hex: "#8c8d92", image: img("runners") },
    ],
    sizes: SHOES,
    soldOut: ["Grey / Orange/40"],
  },
  {
    handle: "zapatillas-altas",
    name: "Canvas High-Tops",
    priceArs: 84000,
    description: "Classic canvas high-tops with a vulcanised rubber sole and a cushioned insole.",
    colors: [
      { name: "Red", hex: "#c2262b", image: img("hightops") },
    ],
    sizes: SHOES,
    soldOut: [],
  },
  {
    handle: "sandalias-cuero",
    name: "Leather Slides",
    priceArs: 72000,
    description: "Cross-strap slides in vegetable-tanned leather on a cushioned footbed. They soften with every summer.",
    colors: [
      { name: "Tan", hex: "#a8662f", image: img("sandals") },
    ],
    sizes: SHOES,
    soldOut: ["Tan/44"],
  },
  {
    handle: "botas-bordadas",
    name: "Embroidered Western Boots",
    priceArs: 212000,
    description: "Hand-embroidered floral western boots in cream leather with a stacked heel. A conversation starter.",
    colors: [
      { name: "Cream", hex: "#e8dfcc", image: img("boots-western") },
    ],
    sizes: SHOES,
    soldOut: [],
  },
  {
    handle: "buzo-flores",
    name: "Floral Crew Sweatshirt",
    priceArs: 78000,
    description: "Heather grey crewneck with hand-stitched floral embroidery across the chest and down the sleeve.",
    colors: [
      { name: "Heather Grey", hex: "#a9aaae", image: img("sweat-floral") },
    ],
    sizes: CLOTHES,
    soldOut: ["Heather Grey/XL"],
  },
  {
    handle: "blusa-encaje",
    name: "Lace Shirt",
    priceArs: 74000,
    description: "A long-sleeve shirt in delicate cotton lace with a scalloped hem. Wear it open over a tee or buttoned to the top.",
    colors: [
      { name: "Ivory", hex: "#efe6d4", image: img("blouse-lace") },
    ],
    sizes: DRESS,
    soldOut: [],
  },
  {
    handle: "pollera-plisada",
    name: "Pleated Midi Skirt",
    priceArs: 69000,
    description: "Knife-pleated midi skirt in a fluid fabric with an elastic waist. Moves beautifully.",
    colors: [
      { name: "Sand", hex: "#c8ab82", image: img("skirt-pleat") },
    ],
    sizes: DRESS,
    soldOut: ["Sand/XS"],
  },
  {
    handle: "pollera-jean",
    name: "Denim Maxi Skirt",
    priceArs: 81000,
    description: "A-line denim maxi skirt with a high waist and a faded wash. Five pockets and a button fly.",
    colors: [
      { name: "Faded Blue", hex: "#5f7fa6", image: img("skirt-denim") },
    ],
    sizes: DRESS,
    soldOut: [],
  },
  {
    handle: "vestido-negro",
    name: "Midi Tank Dress",
    priceArs: 88000,
    description: "Sleeveless midi dress in a smooth stretch knit with a flared skirt. Effortless day to night.",
    colors: [
      { name: "Black", hex: "#141416", image: img("dress-black") },
    ],
    sizes: DRESS,
    soldOut: ["Black/L"],
  },
  {
    handle: "vestido-lencero",
    name: "Satin Slip Dress",
    priceArs: 96000,
    description: "Bias-cut slip dress in a soft satin finish with adjustable straps.",
    colors: [
      { name: "Cream", hex: "#efe8d6", image: img("dress-cream") },
    ],
    sizes: DRESS,
    soldOut: [],
  },
  {
    handle: "vestido-camisero",
    name: "Shirt Dress",
    priceArs: 94000,
    description: "A button-through shirt dress in navy cotton with a fitted bodice and a full skirt.",
    colors: [
      { name: "Navy", hex: "#1f2a4a", image: img("dress-navy") },
    ],
    sizes: DRESS,
    soldOut: ["Navy/XS"],
  },
  {
    handle: "vestido-cruzado",
    name: "Wrap Dress",
    priceArs: 99000,
    description: "Short-sleeve wrap dress in a drapey crepe with a tie waist. Flattering on everyone.",
    colors: [
      { name: "Red", hex: "#b0222a", image: img("dress-red") },
    ],
    sizes: DRESS,
    soldOut: [],
  },
  {
    handle: "remera-batik",
    name: "Tie-Dye Tee",
    priceArs: 41000,
    description: "Hand-dyed cotton tee, so no two are alike. Boxy fit, heavyweight jersey.",
    colors: [
      { name: "Pastel Swirl", hex: "#b9a3d8", image: img("tee-tiedye") },
    ],
    sizes: CLOTHES,
    soldOut: ["Pastel Swirl/XL"],
  },
  {
    handle: "jean-patchwork",
    name: "Patchwork Jeans",
    priceArs: 119000,
    description: "Straight-leg jeans pieced together from different washes of rigid denim. Every pair is cut and sewn by hand.",
    colors: [
      { name: "Patchwork", hex: "#4c6a96", image: img("jeans-patch") },
    ],
    sizes: WAIST,
    soldOut: ["Patchwork/30"],
  },
];

export function findProduct(handle: string) {
  return PRODUCTS.find((p) => p.handle === handle);
}

/** US store, prices in dollars (clean even amounts). */
export function priceUsd(p: { priceArs: number }) {
  return Math.round((p.priceArs * 0.00085) / 2) * 2;
}

export function formatUsd(n: number) {
  return `$${n.toFixed(2)}`;
}
