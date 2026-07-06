export interface Branch {
  name: string;
  area: string;
  address: string;
  phone: string;
  /** Set for brand-exclusive outlets (Dell/Lenovo/Asus) */
  brand?: string;
}

export interface CityLocation {
  city: string;
  slug: string;
  /** Legacy SVG coords (unused) */
  x: number;
  y: number;
  /** Geographic centre for the interactive map */
  lat: number;
  lng: number;
  branches: Branch[];
}

/**
 * All retail + service locations, scraped from the live
 * laptopstoreindia.com store locator (tab panels) on 2026-07-03.
 */
export const locations: CityLocation[] = [
  {
    city: "Chennai",
    slug: "chennai",
    x: 246,
    y: 478,
    lat: 13.0827,
    lng: 80.2707,
    branches: [
      {
        name: "Laptop Store - Velachery",
        area: "Velachery",
        address: "Plot No-2, New No-189, 1st Floor, 100 Feet Rd, opp. Kazahana Jewellery, Vijaya Nagar, Velachery, Chennai 600042",
        phone: "099626 04525",
      },
      {
        name: "Laptop Store - Adyar",
        area: "Adyar",
        address: "1, 3D, Vantage Plaza, LB/MG Road, Adyar, next to Adyar Depot, Chennai 600041",
        phone: "072999 56831",
      },
      {
        name: "Laptop Store - T. Nagar",
        area: "T. Nagar",
        address: "No 2, North Usman Road, T. Nagar, near Kodambakkam Bridge, Chennai 600017",
        phone: "091764 38006",
      },
      {
        name: "Laptop Store - Anna Nagar",
        area: "Anna Nagar",
        address: "Shop No 32, JJ Complex, 100 Feet Road, Anna Nagar West, Chennai 600040",
        phone: "096000 91144",
      },
      {
        name: "Laptop Store - Tambaram",
        area: "Tambaram",
        address: "29, 4A, Gandhi Road, Tambaram West, Chennai 600045",
        phone: "072999 56832",
      },
      {
        name: "Laptop Store - Thoraipakkam",
        area: "Thoraipakkam (OMR)",
        address: "3/362, OMR, near Mahindra Showroom, Anand Nagar, Mettukuppam, Thoraipakkam, Chennai",
        phone: "095510 00445",
      },
      {
        name: "Laptop Store - Velachery Bypass",
        area: "Velachery",
        address: "109-C, Ground Floor, 100 Feet Bypass Rd, opp. Kotak Mahindra/HDFC Bank, Velachery, Chennai 600042",
        phone: "081110 55444",
      },
      {
        name: "Laptop Store - Head Office",
        area: "Velachery",
        address: "Corporation Park, Charvi Illam-21, Devi Karumari Amman Nagar, 8th St, behind Velachery, Chennai 600042",
        phone: "072999 56837",
      },
      {
        name: "Lenovo Exclusive Store - T. Nagar",
        area: "T. Nagar",
        address: "Lenovo Junction, Kodambakkam Bridge, 2, N Usman Rd, T. Nagar, Chennai",
        phone: "095000 66661",
        brand: "Lenovo",
      },
    ],
  },
  {
    city: "Bangalore",
    slug: "bangalore",
    x: 192,
    y: 481,
    lat: 12.9716,
    lng: 77.5946,
    branches: [
      {
        name: "Laptop Store - Marathahalli",
        area: "Marathahalli",
        address: "G6, Sigma Arcade, Ground Floor, Airport Road, Marathahalli, near Brand Factory, Bangalore",
        phone: "098803 63673",
      },
      {
        name: "Laptop Store - Jayanagar",
        area: "Jayanagar",
        address: "15, 1st Floor, Sapthagiri Complex, 3rd Block, Aurobindo Marg, Jayanagar, near Max Showroom, Bengaluru 560011",
        phone: "090358 00154",
      },
      {
        name: "Laptop Store - Malleshwaram",
        area: "Malleshwaram",
        address: "#279, Ground Floor, Sampige Rd, 18th Cross Rd, opp. PU Board, Malleshwaram, Bengaluru",
        phone: "080959 01102",
      },
      {
        name: "Laptop Store - Koramangala",
        area: "Koramangala",
        address: "650, 80 Feet Main Road, 5th Cross Rd, near Sony Signal, 6th Block, Koramangala, Bengaluru 560095",
        phone: "098444 22466",
      },
      {
        name: "Laptop Store - HSR Layout",
        area: "HSR Layout",
        address: "#2317, Sector-1, 27th Main Rd, HSR Layout, Bengaluru 560102",
        phone: "097424 85858",
      },
      {
        name: "Laptop Store - Electronic City",
        area: "Electronic City",
        address: "No 1, 1st Floor, SJR Equinox, Velankani Drive, Electronic City Phase-1, Bengaluru",
        phone: "088846 77793",
      },
      {
        name: "Laptop Store - Marathahalli 2",
        area: "Marathahalli",
        address: "237/109, HAL Old Airport Road, Marathahalli Village, Bengaluru 560037",
        phone: "090081 27777",
      },
      {
        name: "Laptop Store - Kammanahalli",
        area: "Kammanahalli",
        address: "401, 1st Floor, Kammanahalli Main Rd, HRBR Layout 2nd Block, Bengaluru 560043",
        phone: "097399 99078",
      },
      {
        name: "Laptop Store - Bommanahalli",
        area: "Bommanahalli",
        address: "No. 527, 1st Floor, Hosur Rd, Pillar No. 47, Garebhavipalya Bus Stop, Bommanahalli, Bengaluru 560068",
        phone: "095977 79655",
      },
      {
        name: "Dell Exclusive Store - Brookfield",
        area: "Brookfield",
        address: "No. 353/D, Shop #3, ITPL Main Rd, Brookfield, Bengaluru 560037",
        phone: "063660 63700",
        brand: "Dell",
      },
      {
        name: "Dell Exclusive Store - Marathahalli",
        area: "Marathahalli",
        address: "HAL Old Airport Rd, inside Annayya Reddy Building, Chowdeshwari Layout, Marathahalli, Bengaluru",
        phone: "090083 27777",
        brand: "Dell",
      },
      {
        name: "Dell Exclusive Store - Electronic City",
        area: "Electronic City",
        address: "Sri Sai Arcade, Shop No. 3, Ground Floor, 2nd Cross Rd, Electronic City Phase 1, Bengaluru",
        phone: "090083 27777",
        brand: "Dell",
      },
      {
        name: "Asus Exclusive Store - Marathahalli",
        area: "Marathahalli",
        address: "Annaiya Reddy Building, HAL Old Airport Rd, Chowdeshwari Layout, Marathahalli, Bengaluru",
        phone: "063663 77770",
        brand: "Asus",
      },
    ],
  },
  {
    city: "Mumbai",
    slug: "mumbai",
    x: 98,
    y: 358,
    lat: 19.076,
    lng: 72.8777,
    branches: [
      {
        name: "Laptop Store - Malad West",
        area: "Malad West",
        address: "Shop No 18, Bhoomi Classic CHS, C Wing, Goregaon–Mulund Link Rd, opp. Lower Malad Station, Malad West, Mumbai 400064",
        phone: "077100 06883",
      },
    ],
  },
  {
    city: "Pune",
    slug: "pune",
    x: 117,
    y: 370,
    lat: 18.5204,
    lng: 73.8567,
    branches: [
      {
        name: "Laptop Store - Kharadi",
        area: "Kharadi",
        address: "Shop No 6, Spring Field Apts, Hadapsar–Mundhwa–Magarpatta–Kharadi Rd, Tukaram Nagar, Kharadi, Pune 411014",
        phone: "095452 22237",
      },
      {
        name: "Laptop Store - Pimple Saudagar",
        area: "Pimple Saudagar",
        address: "512, Fourtuna Building, Shivar Chowk, opp. Rainbow Plaza/McDonald's, Pimple Saudagar, Pune 411027",
        phone: "077670 00605",
      },
      {
        name: "Laptop Store - Aundh",
        area: "Aundh",
        address: "2nd Floor, Daya Prabha House, ITI Rd, near Reliance Digital/ICICI Bank, Aundh, Pune 411007",
        phone: "095452 22204",
      },
      {
        name: "Laptop Store - Kalyani Nagar",
        area: "Kalyani Nagar",
        address: "Fortaleza Complex, 114, Central Ave, Kalyani Nagar, Pune 411006",
        phone: "095452 22284",
      },
    ],
  },
  {
    city: "Hyderabad",
    slug: "hyderabad",
    x: 210,
    y: 392,
    lat: 17.385,
    lng: 78.4867,
    branches: [
      {
        name: "Laptop Store - Gachibowli",
        area: "Gachibowli",
        address: "Shop No 80, Basement, City Pearl, Mumbai Highway Road, Indira Nagar, Gachibowli, Hyderabad 500032",
        phone: "073311 33305",
      },
      {
        name: "Laptop Store - Ameerpet",
        area: "Ameerpet",
        address: "Basement, Pillar No 1433, Surekha Chambers, Ameerpet Road, opp. Vijaya Textiles, Ameerpet, Hyderabad",
        phone: "073311 33301",
      },
      {
        name: "Laptop Store - Kukatpally",
        area: "Kukatpally",
        address: "No 210B, 2nd Floor, Vijaya Sai Tower, Viveknagar, Kukatpally, opp. Croma Showroom, Hyderabad",
        phone: "079972 72463",
      },
      {
        name: "Laptop Store - Dilsukhnagar",
        area: "Dilsukhnagar",
        address: "Metro Pillar No 1563, Shop No 20, Rajanigandha Complex Extension, Dilsukhnagar Main Rd, Hyderabad 500060",
        phone: "091339 19995",
      },
      {
        name: "Lenovo Exclusive Store - Ameerpet",
        area: "Ameerpet",
        address: "Shop No 8-3-215/C/1, Ground Floor, Srinivasa Colony West, opp. ICICI Bank, Ameerpet, Hyderabad 500003",
        phone: "096777 15507",
        brand: "Lenovo",
      },
      {
        name: "Lenovo Exclusive Store - Dilsukhnagar",
        area: "Dilsukhnagar",
        address: "No. 16-11-477/3/2/B, Ground Floor, LB Nagar Main Road, Dilsukhnagar, Hyderabad 500036",
        phone: "096777 15517",
        brand: "Lenovo",
      },
      {
        name: "Asus Exclusive Store - Kukatpally",
        area: "Kukatpally",
        address: "Metro Pillar No 821, Shop No 27/4, opp. Reliance Digital, Kukatpally, Hyderabad 500072",
        phone: "097900 56333",
        brand: "Asus",
      },
    ],
  },
  {
    city: "Kolkata",
    slug: "kolkata",
    x: 407,
    y: 289,
    lat: 22.5726,
    lng: 88.3639,
    branches: [
      {
        name: "Laptop Store - Gariahat",
        area: "Gariahat",
        address: "4, Jatin Bagchi Rd, 1st Floor, Hindustan Park, Lake Terrace, Gariahat, Kolkata 700029",
        phone: "091473 78291",
      },
    ],
  },
];

export const totalBranches = locations.reduce((n, c) => n + c.branches.length, 0);
