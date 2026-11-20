import { pageUrl } from "@/lib/sales/copy";
import { inr, pct } from "@/lib/sales/format";
import type { Channel, Scored } from "@/lib/sales/types";

export type Network =
  | "WhatsApp"
  | "Telegram"
  | "Reddit"
  | "X"
  | "Facebook"
  | "Instagram"
  | "Forum";

export type Place = {
  id: string;
  name: string;
  network: Network;
  channel: Channel;
  note: string;
  custom?: boolean;
};

export const NETWORKS: Network[] = [
  "WhatsApp",
  "Telegram",
  "Reddit",
  "Facebook",
  "Instagram",
  "X",
  "Forum",
];

/** Public doors. Private groups are added by you. The tool does not join them. */
export const PLACES: Place[] = [
  {
    id: "wa-groups",
    name: "WhatsApp Web",
    network: "WhatsApp",
    channel: "whatsapp",
    note: "If WhatsApp Web is already logged in on this browser, the message is filled in. You still tap Send. A website is not allowed to tap Send for you.",
  },
  {
    id: "wa-status",
    name: "WhatsApp Status",
    network: "WhatsApp",
    channel: "whatsapp",
    note: "Same text. Status reaches people who already have your number, which is the only list that converts.",
  },
  {
    id: "tg-channel",
    name: "Flash Deals channel",
    network: "Telegram",
    channel: "telegram",
    note: "Your channel, t.me/Flash_Deals_Flipkart_Amazon. Text is copied and the channel opens. Paste, then send.",
  },
  {
    id: "reddit-deals",
    name: "r/Indiashopping",
    network: "Reddit",
    channel: "reddit",
    note: "r/Indiashopping, the community already on the site. Title and link are filled if you are logged in. You still press Post.",
  },
  {
    id: "reddit-gaming",
    name: "r/IndianGaming",
    network: "Reddit",
    channel: "reddit",
    note: "Only audio, mobiles, and computing. A cooker post here gets removed.",
  },
  {
    id: "desidime",
    name: "DesiDime",
    network: "Forum",
    channel: "reddit",
    note: "They check price history. Paste the log. If someone has seen it cheaper, say so.",
  },
  {
    id: "x-post",
    name: "X post",
    network: "X",
    channel: "x",
    note: "Opens the X compose box. If @PrasadDammai is the logged-in account, you only press Post.",
  },
  {
    id: "fb-share",
    name: "Facebook",
    network: "Facebook",
    channel: "whatsapp",
    note: "Share dialog. Then paste into buy-sell groups you are already in. New accounts that only drop links get banned.",
  },
  {
    id: "ig",
    name: "Instagram",
    network: "Instagram",
    channel: "instagram",
    note: "Caption is copied. Instagram will not take a prefilled caption. Story or reel, link in bio.",
  },
];

export const STARTER_GROUPS: Place[] = [
  {
    id: "g-family",
    name: "Family WhatsApp",
    network: "WhatsApp",
    channel: "whatsapp",
    note: "People who know you. One deal. Do not send a second one the same day.",
    custom: true,
  },
  {
    id: "g-friends",
    name: "Friends WhatsApp",
    network: "WhatsApp",
    channel: "whatsapp",
    note: "Same rule. If the group is not for deals, skip it.",
    custom: true,
  },
  {
    id: "g-local",
    name: "Local buy-sell group",
    network: "WhatsApp",
    channel: "whatsapp",
    note: "Only if deals are allowed. Read the last ten messages before you post.",
    custom: true,
  },
  {
    id: "g-fb",
    name: "Your Facebook deals group",
    network: "Facebook",
    channel: "whatsapp",
    note: "Open the group after you copy. Do not create a fresh account just to drop links.",
    custom: true,
  },
  {
    id: "g-tg",
    name: "Your Telegram channel",
    network: "Telegram",
    channel: "telegram",
    note: "DealDash already posts here. This is the same deal, in your words, with your site link.",
    custom: true,
  },
];

export function blurb(row: Scored, channel: Channel) {
  const name = `${row.deal.brand} ${row.deal.title}`;
  const price = inr(row.effective);
  const url = pageUrl(row.deal.id);
  const low = row.newLow
    ? "Hamare record mein isse sasta nahi dikha."
    : "Isse sasta pehle bhi dikha tha, isliye 'sabse sasta' mat likhna.";
  const coupon = row.deal.couponCode
    ? `Coupon ${row.deal.couponCode} price mein already kata hua hai.`
    : "Koi coupon nahi. Jo price hai wahi hai.";

  if (channel === "x") {
    return [
      `${price} ${name} — ${pct(row.discount)} off`,
      "bharatbazaro.com",
      "",
      "#AmazonIndia #LootDeal #OnlineShopping #AmazonDeals",
    ].join("\n");
  }
  if (channel === "reddit") {
    return [
      `${price} — ${name} (${pct(row.discount)} off, MRP ${inr(row.deal.mrp)})`,
      "",
      low,
      coupon,
      `${row.deal.rating.toFixed(1)} stars. Stock check about ${row.deal.seenHoursAgo}h ago.`,
      "",
      url,
      "",
      "Affiliate: BharatBazaro is in Amazon Associates. Price is not marked up.",
    ].join("\n");
  }
  if (channel === "instagram") {
    return [
      `${price}`,
      name,
      row.newLow ? "Record low on our log" : pct(row.discount) + " off",
      "",
      `${name} abhi ${price} mein hai. MRP ${inr(row.deal.mrp)}.`,
      low,
      "Link bio mein hai.",
      url,
    ].join("\n");
  }
  if (channel === "telegram") {
    return [
      `${price} — ${name}`,
      "",
      `MRP ${inr(row.deal.mrp)}. ${pct(row.discount)} off.`,
      low,
      coupon,
      "",
      "Site ka link, seedha Amazon nahi:",
      url,
    ].join("\n");
  }
  return [
    `${price} mein ${name}.`,
    "",
    `MRP ${inr(row.deal.mrp)}. ${pct(row.discount)} off.`,
    low,
    coupon,
    "",
    "Yahan se kholo:",
    url,
  ].join("\n");
}

export function openHref(place: Place, row: Scored, text: string) {
  const url = pageUrl(row.deal.id);
  const title = text.split("\n")[0] ?? row.deal.title;
  if (place.id === "reddit-deals") {
    return `https://www.reddit.com/r/Indiashopping/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  }
  if (place.id === "reddit-gaming") {
    return `https://www.reddit.com/r/IndianGaming/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  }
  if (place.id === "desidime") return "https://www.desidime.com/";
  if (place.id === "ig") return "https://www.instagram.com/";
  if (place.id === "tg-channel") return "https://t.me/Flash_Deals_Flipkart_Amazon";
  if (place.network === "X" || place.channel === "x") {
    return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
  }
  if (place.network === "Telegram") {
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  }
  if (place.network === "Facebook" && place.id === "fb-share") {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  }
  if (place.network === "WhatsApp") {
    const phone = typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent);
    const textQ = encodeURIComponent(text);
    return phone ? `https://wa.me/?text=${textQ}` : `https://web.whatsapp.com/send?text=${textQ}`;
  }
  return null;
}

export function placeFits(place: Place, row: Scored) {
  if (place.id !== "reddit-gaming") return true;
  return row.deal.category === "Audio" || row.deal.category === "Computing" || row.deal.category === "Mobiles";
}
