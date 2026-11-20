export type Partner = {
  id: string;
  name: string;
  kind: string;
  fit: string;
  rule: string;
  touches: { when: string; title: string; body: string }[];
};

export const PARTNERS: Partner[] = [
  {
    id: "telegram",
    name: "Your Telegram",
    kind: "Owned",
    fit: "Every deal that clears Test or Frontpage.",
    rule: "DealDash already posts here. Put the score in front of the caption model so weak deals never reach it.",
    touches: [
      {
        when: "T+0",
        title: "The drop",
        body: "One deal. Effective price in the first line. Link to the bazaar page.",
      },
      {
        when: "T+45m",
        title: "Silence or a correction",
        body: "Do not post a second deal into the same silence. If stock died, edit the message.",
      },
      {
        when: "Next day",
        title: "The alert ask",
        body: "One line: set a price alert on the site. That is the list. The channel is only the top of it.",
      },
    ],
  },
  {
    id: "desidime",
    name: "DesiDime",
    kind: "Community",
    fit: "Frontpage deals with a real log, not a coupon code and a prayer.",
    rule: "They will check the price history. If you cannot show the log, do not post.",
    touches: [
      {
        when: "Touch 1",
        title: "The deal, with the log",
        body: "Price, previous low, coupon, rating. No ALL CAPS. No 'loot'.",
      },
      {
        when: "Touch 2",
        title: "Answer the thread",
        body: "If someone says they have seen it cheaper, check your log and reply with the row. Or concede.",
      },
      {
        when: "Touch 3",
        title: "Same thread, 24h later",
        body: "Still the low, or it died. Do not open a second thread for the same SKU.",
      },
    ],
  },
  {
    id: "reddit",
    name: "r/dealsforindia",
    kind: "Community",
    fit: "Frontpage only. Gaming gear can also try r/IndianGaming.",
    rule: "Title is the price. Disclose the affiliate. Mods remove raw affiliate links and fake MRPs.",
    touches: [
      {
        when: "Touch 1",
        title: "A single post",
        body: "Lead with rupees. Link your page. Say you are in Amazon Associates.",
      },
      {
        when: "Touch 2",
        title: "Stay in the comments",
        body: "Answer price questions. Do not drop three more products.",
      },
      {
        when: "Touch 3",
        title: "Close it",
        body: "When it sells out, say so. That is how the next post gets upvoted.",
      },
    ],
  },
  {
    id: "reels",
    name: "Reel pages",
    kind: "Partner",
    fit: "Audio, mobiles, kitchen. Anything you can show in three seconds.",
    rule: "You are pitching a price, not a friendship. One niche, one number, no media kit.",
    touches: [
      {
        when: "Touch 1",
        title: "A deal in their niche",
        body: "Send the three on-screen lines and the logged low. No ask yet.",
      },
      {
        when: "Touch 2",
        title: "Their last reel",
        body: "Name the last product they posted and why this price is the same shape. Still no ask.",
      },
      {
        when: "Touch 3",
        title: "One ask",
        body: "Link bharatbazaro.com in the bio for the week. They keep the audience. You keep the hop honest.",
      },
    ],
  },
  {
    id: "shorts",
    name: "YouTube shorts",
    kind: "Partner",
    fit: "Frontpage deals where 'is this actually low?' is a 20 second video.",
    rule: "Same three touches as reels. Do not offer a pile of products. Offer one.",
    touches: [
      {
        when: "Touch 1",
        title: "The question",
        body: "Is ₹X low for this? Here is our log. Use it if you want.",
      },
      {
        when: "Touch 2",
        title: "The proof",
        body: "Screenshot of the sighting, not a slogan. They can tell.",
      },
      {
        when: "Touch 3",
        title: "The link",
        body: "Description link to the bazaar page, so the price can update after the video is up.",
      },
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp broadcast",
    kind: "Owned",
    fit: "People who typed their number into an alert. Nobody else.",
    rule: "India's real inbox. Also the fastest way to get reported if you scrape groups.",
    touches: [
      {
        when: "Touch 1",
        title: "The alert they set",
        body: "Category or budget they picked. One product. A STOP line.",
      },
      {
        when: "Touch 2",
        title: "Only if it is still live",
        body: "45 minutes later, and only for a frontpage deal that survived the recheck.",
      },
      {
        when: "Touch 3",
        title: "Nothing",
        body: "Three messages in a day is how a broadcast becomes a block.",
      },
    ],
  },
  {
    id: "indexnow",
    name: "IndexNow and tier pages",
    kind: "Search",
    fit: "Every deal you publish, including Holds.",
    rule: "You already ping IndexNow from seo_promoter. The sales job is the page worth pinging.",
    touches: [
      {
        when: "Touch 1",
        title: "Ship the URL",
        body: "Question title, price, log, coupon. Then ping that URL, not the homepage again.",
      },
      {
        when: "Touch 2",
        title: "Point a tier page at it",
        body: "under-999, audio, kitchen. Internal links are the distribution you control.",
      },
      {
        when: "Touch 3",
        title: "Refresh or retire",
        body: "If the price died, say so on the page. A stale 'loot' page costs the next ten.",
      },
    ],
  },
];

export type Lesson = {
  tool: string;
  cost: string;
  steal: string;
  leave: string;
};

export const LESSONS: Lesson[] = [
  {
    tool: "Clay",
    cost: "About $185 a month",
    steal: "A waterfall. Cheapest confident source first, then a score, then one action. Do not enrich a deal you will not post.",
    leave: "The 150 vendors and the contact database. Your record is a product, not a person.",
  },
  {
    tool: "Instantly",
    cost: "About $38 a month",
    steal: "Pacing and fatigue. Many inboxes exist so one inbox is not burned. Your version is the 45 minute gate and a 6 deal cap.",
    leave: "Cold email at volume. Shoppers did not ask, and a bought list will not buy a cooker.",
  },
  {
    tool: "Lemlist",
    cost: "About $55 a month",
    steal: "Three touches, each one specific, and a variable that is a fact. Use it on reel pages and forums.",
    leave: "Image personalisation and LinkedIn bots. Wrong channel for a rupee price.",
  },
  {
    tool: "Apollo",
    cost: "About $49 a seat",
    steal: "Nothing operational. It is a map of companies.",
    leave: "The whole product. BharatBazaro does not have a sales rep and a quota. It has a click.",
  },
  {
    tool: "Slickdeals",
    cost: "Their desk, not a subscription",
    steal: "A content score before votes exist. Frontpage is a gate: history, reviews, stock. A held day outperforms a second headline.",
    leave: "Waiting for a US-sized community before you post. You earn that community by being right in public.",
  },
  {
    tool: "Keepa and Honey",
    cost: "Extensions people already trust",
    steal: "Price memory, coupon math, and an alert. The alert is the list you own. Honey grew on the moment of checkout, not on ads.",
    leave: "Building an extension this week. The site can tell the truth before the browser plugin exists.",
  },
  {
    tool: "DealDash, your bot",
    cost: "Already built",
    steal: "Two-stage check, effective price, spike and stock veto, hourly cap, caption that has to pass a critic.",
    leave: "Letting the caption model run before the score. Pretty words on a bad price is how channels die.",
  },
];
