import type { Component, Evidence } from '@/lib/types';

/**
 * The five numbered parts. `key` is the model target in the WebGL scene, so
 * the order here is the order the hotspots pop in on the landing page.
 */
export const components: Component[] = [
  {
    n: 1,
    key: 'platform',
    title: 'Raised support platform',
    short: 'Supports the pot and guides drainage through the perforated surface.',
    long: 'The pot sits on this perforated platform instead of an open saucer. Drainage passes straight through the holes and below the barrier. The physical prototype showed the layout working: it carried a loaded pot and kept drainage contained in a basic demonstration.',
    status: 'demonstrated',
    statusLabel: 'Demonstrated in prototype layout',
  },
  {
    n: 2,
    key: 'mesh',
    title: 'Mosquito-blocking mesh',
    short: 'Intended to separate mosquitoes from the stored water below.',
    long: 'A fine mesh sits between the platform and the water. Together with sealed edges, it is meant to stop an adult mosquito reaching the stored water. Whether it actually does has not been tested. That needs a controlled protocol and independent review.',
    status: 'proposed',
    statusLabel: 'In the design',
  },
  {
    n: 3,
    key: 'storage',
    title: 'Mineral storage layer',
    short: 'Holds drainage below the barrier while reducing an exposed waterline.',
    long: 'A bed of mineral pebbles sits in the reservoir. The idea is to hold drainage down low and break up the open waterline that a plain saucer leaves behind. It appears in the concept design and the prototype, but its effect has not been measured.',
    status: 'concept',
    statusLabel: 'Concept component',
  },
  {
    n: 4,
    key: 'wick',
    title: 'Capillary wick',
    short: 'May return stored moisture to the pot when compatible soil becomes drier.',
    long: 'A fabric wick runs from the reservoir up through the drainage hole into the soil. As the soil dries, capillary action may pull some stored water back up to the roots. How well this works, and for which plants, still has to be tested.',
    status: 'proposed',
    statusLabel: 'In the design',
  },
  {
    n: 5,
    key: 'overflow',
    title: 'Screened overflow',
    short: 'Intended to release excess water without creating an open access route.',
    long: 'During heavy watering, excess water needs somewhere to go. Screened side outlets are meant to let it out while keeping the barrier intact. Overflow, blockage and debris are all part of the bench-testing plan.',
    status: 'proposed',
    statusLabel: 'In the design',
  },
];

export const steps = [
  { n: 1, label: 'Catch', copy: 'Drainage drops below the pot.', status: 'demonstrated' as Evidence },
  { n: 2, label: 'Separate', copy: 'A mesh is meant to keep mozzies off the water.', status: 'proposed' as Evidence },
  { n: 3, label: 'Return', copy: 'A wick may feed moisture back up.', status: 'proposed' as Evidence },
  { n: 4, label: 'Release', copy: 'Excess water exits through a screen.', status: 'proposed' as Evidence },
];

export const evidenceColumns: { status: Evidence; title: string; items: string[] }[] = [
  {
    status: 'demonstrated',
    title: 'Demonstrated',
    items: ['Physical base assembled beneath an existing pot', 'Pot support', 'Contained drainage', 'Rapid assembly'],
  },
  {
    status: 'proposed',
    title: 'In the design',
    items: ['Mesh and sealed gaps prevent access', 'Wick returns useful moisture', 'Screened overflow maintains barrier'],
  },
  {
    status: 'validate',
    title: 'Must validate',
    items: ['Mosquito exclusion', 'Overflow and blockage', 'Cleaning and eggs', 'Plant health', 'Durability and final cost'],
  },
];

/** Feature comparison (PRD 5.1, section 7). DryLah cells stay "proposed" until tested. */
export const comparison = {
  options: ['Ordinary saucer', 'No saucer', 'Wick tray', 'IKEA SVÄMSKOG insert', 'DryLah! concept'],
  rows: [
    { feature: 'Catches drainage', values: ['yes', 'no', 'yes', 'yes', 'yes'] },
    { feature: 'Keeps your existing pot', values: ['yes', 'yes', 'yes', 'no', 'proposed'] },
    { feature: 'Covers stored water', values: ['no', 'na', 'partial', 'yes', 'proposed'] },
    { feature: 'Returns moisture to soil', values: ['no', 'no', 'yes', 'yes', 'proposed'] },
    { feature: 'Screened overflow route', values: ['no', 'na', 'no', 'no', 'proposed'] },
    { feature: 'No repeated plate scrubbing', values: ['no', 'yes', 'no', 'no', 'validate'] },
  ],
  note: 'Based on public listings and NEA guidance. DryLah! entries are design intent, not test results. No saucer is free and suitable where drainage can run away safely.',
};
