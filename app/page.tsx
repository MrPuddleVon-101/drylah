import { EvidenceStates, Faq, FinalCta, Interviews, Marquee, Problem } from '@/components/home/Sections';
import { Stage } from '@/components/home/Stage';
import { Team } from '@/components/home/Team';

export default function Home() {
  return (
    <>
      <Stage />
      <Team />
      <Marquee items={['Plant can drink', 'Mozzie cannot', 'Keep your pot', 'Catch the drainage', 'Cover the water']} />
      <Problem />
      <Interviews />
      <EvidenceStates />
      <Faq />
      <FinalCta />
    </>
  );
}
