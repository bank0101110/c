export const siteConfig = {
  name: "Stockly",
  tagline: "Know your stock, always.",
  description:
    "Browse live inventory across every product and unit type, in real time.",
  nav: [
    { label: "Home", href: "/" },
    { label: "Products", href: "#products" },
    { label: "Manage", href: "/manage" },
  ],
  hero: {
    eyebrow: "Live inventory",
    title: "Everything in stock, one search away.",
    subtitle:
      "Search the full catalog and see exactly what's available, right down to the unit.",
    searchPlaceholder: "Search products...",
  },
  footer: {
    text: `© ${new Date().getFullYear()} Stockly. All rights reserved.`,
  },
};
