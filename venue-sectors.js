// Shared by the public demo, builder and published venue renderer.
// Uses existing draft fields and feature keys; no database migration required.
export const venueSectors = [
  {
    "id": "social",
    "name": "Social & Members’ Clubs",
    "type": "Social club",
    "aliases": [
      "Working men’s club",
      "British Legion",
      "Social Club"
    ],
    "theme": "burgundy",
    "keys": [
      "events",
      "tickets",
      "room",
      "rewards",
      "contact"
    ],
    "media": "Community",
    "tables": "Members’ Lounge",
    "intro": "Discover club events, member updates and spaces for your next celebration.",
    "labels": {
      "events": "Club Events",
      "room": "Function Room Hire"
    },
    "example": [
      "Live music evening",
      "Add the confirmed performer, date and ticket information.",
      "Function room",
      "Describe capacity and facilities, then invite hire enquiries."
    ],
    "image": "assets/industry-icons/community-04.svg"
  },
  {
    "id": "pub",
    "name": "Pubs & Bars",
    "type": "Pub",
    "theme": "emerald",
    "keys": [
      "events",
      "games",
      "rewards",
      "gallery",
      "contact"
    ],
    "media": "Food & Drink",
    "tables": "Virtual Pub Tables",
    "intro": "Pull up a chair and meet your local community.",
    "labels": {},
    "example": [
      "Pub quiz",
      "Add confirmed quiz times and how to enquire.",
      "Private hire",
      "Describe the space available for group celebrations."
    ],
    "image": "assets/industry-icons/food-drink-01.svg"
  },
  {
    "id": "sports",
    "name": "Sports Clubs",
    "type": "Sports club",
    "theme": "navy",
    "keys": [
      "events",
      "room",
      "gallery",
      "contact"
    ],
    "media": "Sports",
    "tables": "Team & Supporter Groups",
    "intro": "Keep up with fixtures, club events and supporter news.",
    "labels": {
      "events": "Fixtures & Events",
      "room": "Clubhouse Hire",
      "gallery": "Club Gallery",
      "contact": "Contact the Club"
    },
    "example": [
      "Home fixture",
      "Share the confirmed opponent, start time and location.",
      "Clubhouse hire",
      "Describe facilities available for club socials and private events."
    ],
    "image": "assets/industry-icons/sports-01.svg"
  },
  {
    "id": "community",
    "name": "Village Halls & Community Centres",
    "type": "Community centre",
    "aliases": [
      "Community venue",
      "Village hall"
    ],
    "theme": "emerald",
    "keys": [
      "events",
      "room",
      "gallery",
      "contact"
    ],
    "media": "Community",
    "tables": "Community Groups",
    "intro": "Find local classes, community activities and spaces to hire.",
    "labels": {
      "events": "Classes & Events",
      "room": "Hire a Space"
    },
    "example": [
      "Community workshop",
      "Add the organiser’s confirmed schedule and joining details.",
      "Hall hire",
      "Describe the hall and invite availability enquiries."
    ],
    "image": "assets/industry-icons/community-04.svg"
  },
  {
    "id": "veterans",
    "name": "Veterans & Associations",
    "type": "Veterans association",
    "theme": "burgundy",
    "keys": [
      "events",
      "gallery",
      "contact"
    ],
    "media": "Veterans",
    "tables": "Branch Groups",
    "intro": "Reconnect with comrades and keep up with branch activities.",
    "labels": {
      "events": "Branch Events & Reunions",
      "gallery": "Memories & Photographs",
      "contact": "Contact the Branch"
    },
    "example": [
      "Branch reunion",
      "Add confirmed meeting details and who to contact.",
      "Meeting space",
      "Describe any available meeting space."
    ],
    "image": "assets/industry-icons/veterans-03.svg"
  },
  {
    "id": "charity",
    "name": "Charities & Nonprofits",
    "type": "Charity",
    "theme": "emerald",
    "keys": [
      "events",
      "gallery",
      "contact"
    ],
    "media": "Charity",
    "tables": "Supporter Circles",
    "intro": "Bring supporters and volunteers together.",
    "labels": {
      "events": "Activities & Fundraisers",
      "contact": "Contact the Organisation"
    },
    "example": [
      "Volunteer gathering",
      "Explain how supporters can take part.",
      "Community space",
      "Describe any space available to supporters."
    ],
    "image": "assets/industry-icons/charity-01.svg"
  },
  {
    "id": "music",
    "name": "Live Music & Comedy Venues",
    "type": "Live music venue",
    "theme": "charcoal",
    "keys": [
      "events",
      "tickets",
      "gallery",
      "contact"
    ],
    "media": "Entertainment",
    "tables": "Audience Lounge",
    "intro": "Discover upcoming performances and connect with fellow fans.",
    "labels": {
      "events": "Shows & Performances",
      "tickets": "Tickets & Booking Links"
    },
    "example": [
      "Upcoming performance",
      "Add the confirmed line-up and performance details.",
      "Private hire",
      "Describe the space for private performances."
    ],
    "image": "assets/industry-icons/entertainment-01.svg"
  },
  {
    "id": "hospitality",
    "name": "Cafés & Restaurants",
    "type": "Cafe or restaurant",
    "aliases": [
      "Café",
      "Cafe",
      "Restaurant"
    ],
    "theme": "emerald",
    "keys": [
      "events",
      "rewards",
      "gallery",
      "contact"
    ],
    "media": "Food & Drink",
    "tables": "Coffee Circles",
    "intro": "Discover events, offers and updates from your favourite local meeting place.",
    "labels": {
      "events": "Events & Offers",
      "rewards": "Customer Rewards",
      "gallery": "Food & Venue Gallery"
    },
    "example": [
      "Coffee morning",
      "Share confirmed details and how guests can enquire.",
      "Private dining",
      "Describe group dining or private hire options."
    ],
    "image": "assets/industry-icons/food-drink-01.svg"
  },
  {
    "id": "holiday",
    "name": "Campsites & Holiday Parks",
    "type": "Campsite or holiday park",
    "theme": "emerald",
    "keys": [
      "events",
      "gallery",
      "contact"
    ],
    "media": "Community",
    "tables": "Guest Community",
    "intro": "Find site activities, guest information and local recommendations.",
    "labels": {
      "events": "Activities & Guest Updates",
      "gallery": "Around the Park",
      "contact": "Contact Reception"
    },
    "example": [
      "Guest activity",
      "Add confirmed meeting points and activity information.",
      "Shared spaces",
      "Describe spaces guests can enquire about."
    ],
    "image": "assets/industry-icons/community-01.svg"
  },
  {
    "id": "fitness",
    "name": "Fitness, Dance & Hobby Studios",
    "type": "Fitness or hobby studio",
    "theme": "navy",
    "keys": [
      "events",
      "tickets",
      "gallery",
      "contact"
    ],
    "media": "Sports",
    "tables": "Member Groups",
    "intro": "Discover sessions, workshops and news from your studio.",
    "labels": {
      "events": "Classes & Workshops",
      "tickets": "Session Booking Links",
      "gallery": "Studio Gallery",
      "contact": "Contact the Studio"
    },
    "example": [
      "Studio class",
      "Add the instructor’s confirmed schedule and booking link.",
      "Studio hire",
      "Describe studio facilities and invite hire enquiries."
    ],
    "image": "assets/industry-icons/sports-05.svg"
  },
  {
    "id": "retail",
    "name": "Shops & Local Businesses",
    "type": "Independent business",
    "theme": "navy",
    "keys": [
      "events",
      "gallery",
      "contact"
    ],
    "media": "Retail",
    "tables": "Local Connections",
    "intro": "Bring customers and the local community together.",
    "labels": {
      "events": "Events & Updates",
      "gallery": "Products & Shop Gallery",
      "contact": "Contact the Business"
    },
    "example": [
      "In-store event",
      "Share confirmed event details and customer information.",
      "Event space",
      "Describe any available event space."
    ],
    "image": "assets/industry-icons/retail-05.svg"
  }
];
export function sectorForType(type) {
  const normal = String(type || '').trim().toLocaleLowerCase('en-GB');
  return venueSectors.find(p => [p.type, p.name, ...(p.aliases || [])]
    .some(value => value.toLocaleLowerCase('en-GB') === normal));
}
export function featureLabel(type, key, fallback) {
  return sectorForType(type)?.labels[key] || fallback;
}
export function sectorBrief(profile, name, town, goal = '') {
  return `Help set up ${name || 'our venue'}, a ${profile.type}${town ? ` in ${town}` : ''}. ${profile.intro} Recommend these existing sections: ${profile.keys.join(', ')}. ${goal ? `Our priority: ${goal}. ` : ''}Write a welcoming introduction. Do not invent dates, prices, facilities or working features.`;
}
