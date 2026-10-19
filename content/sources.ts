import type { Source } from '@/lib/types';

export const sources: Source[] = [
  {
    id: 'nea-peak-2026',
    publisher: 'National Environment Agency',
    title: 'Singapore Enters Peak Dengue Season; Public Urged To Stay Vigilant To Prevent Surge In Cases',
    date: '16 May 2026',
    url: 'https://www.nea.gov.sg/media/news/news/index/singapore-enters-peak-dengue-season-public-urged-to-stay-vigilant-to-prevent-surge-in-cases',
    accessed: '20 Oct 2026',
    usage: '2025 inspections, breeding habitats, cluster-area household share, annual cases',
  },
  {
    id: 'nea-sites',
    publisher: 'National Environment Agency',
    title: 'Know The Potential Aedes Breeding Sites',
    date: 'Live page',
    url: 'https://www.nea.gov.sg/dengue-zika/prevent-aedes-mosquito-breeding/know-the-potential-aedes-breeding-sites',
    accessed: '20 Oct 2026',
    usage: 'Home breeding-habitat rankings for 2023 to 2025',
  },
  {
    id: 'nea-measures',
    publisher: 'National Environment Agency',
    title: 'Other Preventive Measures',
    date: 'Live page',
    url: 'https://www.nea.gov.sg/dengue-zika/prevent-aedes-mosquito-breeding/other-preventive-measures',
    accessed: '20 Oct 2026',
    usage: 'Every-other-day plate emptying and scrubbing guidance',
  },
  {
    id: 'ang-2026',
    publisher: 'Ang, Chia and Oh',
    title: 'Addressing Knowledge, Attitudes and Practices Toward Dengue Fever, Vector Control, and Vaccine Acceptance Among the General Population in Singapore',
    date: '2026',
    url: 'https://doi.org/10.3390/tropicalmed11030064',
    accessed: '20 Oct 2026',
    usage: 'Singapore survey of 400 adults; awareness and practice scores',
  },
  {
    id: 'cdc-lifecycle',
    publisher: 'US Centers for Disease Control and Prevention',
    title: 'Life Cycle of Aedes Mosquitoes',
    date: '16 Apr 2024',
    url: 'https://www.cdc.gov/mosquitoes/about/life-cycle-of-aedes-mosquitoes.html',
    accessed: '20 Oct 2026',
    usage: 'Egg placement, adhesion, desiccation survival and aquatic stages',
  },
  {
    id: 'singstat-households',
    publisher: 'Singapore Department of Statistics',
    title: 'Get Latest Data: Resident Households',
    date: '2025 data',
    url: 'https://www.singstat.gov.sg/find-data/get-latest-data',
    accessed: '20 Oct 2026',
    usage: '1.4871 million resident households and dwelling types',
  },
  {
    id: 'ikea-svamskog',
    publisher: 'IKEA Singapore',
    title: 'SVÄMSKOG self-watering insert, 70 cl',
    date: 'Live listing',
    url: 'https://www.ikea.com/sg/en/p/svaemskog-self-watering-insert-terracotta-transparent-00570873/',
    accessed: '20 Oct 2026',
    usage: 'S$4.90 listing and insect-covering lid',
  },
  {
    id: 'tumbleweed-wick',
    publisher: 'Tumbleweed Plants',
    title: 'Plant tray with Self Watering Wick',
    date: 'Live listing',
    url: 'https://tumbleweedplants.com/products/plant-tray-with-self-watering-wick',
    accessed: '20 Oct 2026',
    usage: '16 cm wick tray and listed sale price',
  },
];

export const internalMaterial = [
  'DryLah! pitch deck and prototype documentation, October 2026.',
  'Twelve household interviews and prototype feedback supplied by the DryLah! team.',
  'DryLah! coloured concept illustration, pencil sketches, physical prototype photographs and logo supplied by the team.',
];

export const sourceById = (id: string) => sources.find((s) => s.id === id);
