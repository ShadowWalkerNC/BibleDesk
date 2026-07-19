/**
 * Country coordinate centroids for PrayerAtlas globe mapping.
 * Used when a user selects their country on the prayer request form.
 */

export interface CountryEntry {
  name: string;
  code: string;
  lat: number;
  lng: number;
  /** True = Restricted Access Nation (RAN) — location is intentionally vague on globe */
  isRestricted: boolean;
}

export const COUNTRIES: CountryEntry[] = [
  // Americas
  { name: 'United States', code: 'US', lat: 38.8951, lng: -77.0364, isRestricted: false },
  { name: 'Canada', code: 'CA', lat: 56.1304, lng: -106.3468, isRestricted: false },
  { name: 'Mexico', code: 'MX', lat: 23.6345, lng: -102.5528, isRestricted: false },
  { name: 'Brazil', code: 'BR', lat: -14.235, lng: -51.9253, isRestricted: false },
  { name: 'Argentina', code: 'AR', lat: -38.4161, lng: -63.6167, isRestricted: false },
  { name: 'Colombia', code: 'CO', lat: 4.5709, lng: -74.2973, isRestricted: false },
  { name: 'Chile', code: 'CL', lat: -35.6751, lng: -71.543, isRestricted: false },
  { name: 'Peru', code: 'PE', lat: -9.19, lng: -75.0152, isRestricted: false },
  { name: 'Venezuela', code: 'VE', lat: 6.4238, lng: -66.5897, isRestricted: false },
  { name: 'Ecuador', code: 'EC', lat: -1.8312, lng: -78.1834, isRestricted: false },
  { name: 'Guatemala', code: 'GT', lat: 15.7835, lng: -90.2308, isRestricted: false },
  { name: 'Cuba', code: 'CU', lat: 21.5218, lng: -77.7812, isRestricted: false },
  { name: 'Haiti', code: 'HT', lat: 18.9712, lng: -72.2852, isRestricted: false },
  // Europe
  { name: 'United Kingdom', code: 'GB', lat: 55.3781, lng: -3.436, isRestricted: false },
  { name: 'Germany', code: 'DE', lat: 51.1657, lng: 10.4515, isRestricted: false },
  { name: 'France', code: 'FR', lat: 46.2276, lng: 2.2137, isRestricted: false },
  { name: 'Italy', code: 'IT', lat: 41.8719, lng: 12.5674, isRestricted: false },
  { name: 'Spain', code: 'ES', lat: 40.4637, lng: -3.7492, isRestricted: false },
  { name: 'Netherlands', code: 'NL', lat: 52.1326, lng: 5.2913, isRestricted: false },
  { name: 'Poland', code: 'PL', lat: 51.9194, lng: 19.1451, isRestricted: false },
  { name: 'Sweden', code: 'SE', lat: 60.1282, lng: 18.6435, isRestricted: false },
  { name: 'Norway', code: 'NO', lat: 60.472, lng: 8.4689, isRestricted: false },
  { name: 'Ukraine', code: 'UA', lat: 48.3794, lng: 31.1656, isRestricted: false },
  { name: 'Romania', code: 'RO', lat: 45.9432, lng: 24.9668, isRestricted: false },
  { name: 'Greece', code: 'GR', lat: 39.0742, lng: 21.8243, isRestricted: false },
  { name: 'Portugal', code: 'PT', lat: 39.3999, lng: -8.2245, isRestricted: false },
  { name: 'Ireland', code: 'IE', lat: 53.1424, lng: -7.6921, isRestricted: false },
  { name: 'Russia', code: 'RU', lat: 61.524, lng: 105.3188, isRestricted: false },
  // Africa
  { name: 'Nigeria', code: 'NG', lat: 9.082, lng: 8.6753, isRestricted: false },
  { name: 'Ethiopia', code: 'ET', lat: 9.145, lng: 40.4897, isRestricted: false },
  { name: 'Kenya', code: 'KE', lat: -0.0236, lng: 37.9062, isRestricted: false },
  { name: 'Ghana', code: 'GH', lat: 7.9465, lng: -1.0232, isRestricted: false },
  { name: 'South Africa', code: 'ZA', lat: -30.5595, lng: 22.9375, isRestricted: false },
  { name: 'Tanzania', code: 'TZ', lat: -6.369, lng: 34.8888, isRestricted: false },
  { name: 'Uganda', code: 'UG', lat: 1.3733, lng: 32.2903, isRestricted: false },
  { name: 'Mozambique', code: 'MZ', lat: -18.665, lng: 35.5296, isRestricted: false },
  { name: 'Rwanda', code: 'RW', lat: -1.9403, lng: 29.8739, isRestricted: false },
  { name: 'Democratic Republic of the Congo', code: 'CD', lat: -4.0383, lng: 21.7587, isRestricted: false },
  { name: 'Cameroon', code: 'CM', lat: 7.3697, lng: 12.3547, isRestricted: false },
  { name: 'Sudan', code: 'SD', lat: 12.8628, lng: 30.2176, isRestricted: false },
  { name: 'Somalia', code: 'SO', lat: 5.152, lng: 46.1996, isRestricted: false },
  { name: 'Zimbabwe', code: 'ZW', lat: -19.0154, lng: 29.1549, isRestricted: false },
  { name: 'Zambia', code: 'ZM', lat: -13.1339, lng: 27.8493, isRestricted: false },
  { name: 'Egypt', code: 'EG', lat: 26.8206, lng: 30.8025, isRestricted: false },
  { name: 'Morocco', code: 'MA', lat: 31.7917, lng: -7.0926, isRestricted: false },
  { name: 'Libya', code: 'LY', lat: 26.3351, lng: 17.2283, isRestricted: false },
  // Middle East / Central Asia (many RAN)
  { name: 'Saudi Arabia', code: 'SA', lat: 23.8859, lng: 45.0792, isRestricted: true },
  { name: 'Iran', code: 'IR', lat: 32.4279, lng: 53.688, isRestricted: true },
  { name: 'Afghanistan', code: 'AF', lat: 33.9391, lng: 67.7099, isRestricted: true },
  { name: 'Yemen', code: 'YE', lat: 15.5527, lng: 48.5164, isRestricted: true },
  { name: 'Syria', code: 'SY', lat: 34.8021, lng: 38.9968, isRestricted: true },
  { name: 'Iraq', code: 'IQ', lat: 33.2232, lng: 43.6793, isRestricted: false },
  { name: 'Pakistan', code: 'PK', lat: 30.3753, lng: 69.3451, isRestricted: true },
  { name: 'Turkey', code: 'TR', lat: 38.9637, lng: 35.2433, isRestricted: false },
  { name: 'Israel', code: 'IL', lat: 31.0461, lng: 34.8516, isRestricted: false },
  { name: 'Jordan', code: 'JO', lat: 30.5852, lng: 36.2384, isRestricted: false },
  { name: 'Lebanon', code: 'LB', lat: 33.8547, lng: 35.8623, isRestricted: false },
  { name: 'United Arab Emirates', code: 'AE', lat: 23.4241, lng: 53.8478, isRestricted: false },
  // Asia
  { name: 'India', code: 'IN', lat: 20.5937, lng: 78.9629, isRestricted: false },
  { name: 'China', code: 'CN', lat: 35.8617, lng: 104.1954, isRestricted: true },
  { name: 'Japan', code: 'JP', lat: 36.2048, lng: 138.2529, isRestricted: false },
  { name: 'South Korea', code: 'KR', lat: 35.9078, lng: 127.7669, isRestricted: false },
  { name: 'North Korea', code: 'KP', lat: 40.3399, lng: 127.5101, isRestricted: true },
  { name: 'Indonesia', code: 'ID', lat: -0.7893, lng: 113.9213, isRestricted: false },
  { name: 'Philippines', code: 'PH', lat: 12.8797, lng: 121.774, isRestricted: false },
  { name: 'Myanmar', code: 'MM', lat: 21.9162, lng: 95.956, isRestricted: true },
  { name: 'Vietnam', code: 'VN', lat: 14.0583, lng: 108.2772, isRestricted: true },
  { name: 'Thailand', code: 'TH', lat: 15.87, lng: 100.9925, isRestricted: false },
  { name: 'Bangladesh', code: 'BD', lat: 23.685, lng: 90.3563, isRestricted: false },
  { name: 'Sri Lanka', code: 'LK', lat: 7.8731, lng: 80.7718, isRestricted: false },
  { name: 'Nepal', code: 'NP', lat: 28.3949, lng: 84.124, isRestricted: true },
  { name: 'Cambodia', code: 'KH', lat: 12.5657, lng: 104.991, isRestricted: false },
  { name: 'Malaysia', code: 'MY', lat: 4.2105, lng: 101.9758, isRestricted: false },
  // Oceania
  { name: 'Australia', code: 'AU', lat: -25.2744, lng: 133.7751, isRestricted: false },
  { name: 'New Zealand', code: 'NZ', lat: -40.9006, lng: 174.886, isRestricted: false },
  { name: 'Papua New Guinea', code: 'PG', lat: -6.315, lng: 143.9555, isRestricted: false },
];

/** Sort alphabetically by name for dropdown display */
export const COUNTRIES_SORTED = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

/** Look up a country by its code */
export function getCountryByCode(code: string): CountryEntry | undefined {
  return COUNTRIES.find(c => c.code === code);
}
