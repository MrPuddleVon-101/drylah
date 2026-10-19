import type { Metadata } from 'next';

import { InterestForm } from '@/components/order/InterestForm';
import { PageHead } from '@/components/site/PageHead';
import { StatusGlyph } from '@/components/site/ui';

export const metadata: Metadata = {
  title: 'Register your interest',
  description: 'Register interest in the first DryLah! pilot. No payment is taken and this is not a confirmed order.',
};

const demo = !process.env.NEXT_PUBLIC_INTEREST_ENDPOINT;

export default function OrderPage() {
  return (
    <div className="page">
      <PageHead
        crumbs={[{ label: 'Order interest' }]}
        eyebrow="Register your interest"
        title={['Interested in the', 'first DryLah! pilot?']}
        accent={['pilot?']}
        lede="DryLah! is still being tested. Register your interest to help us understand pot sizes, quantity and price expectations. No payment is taken and this is not a confirmed order."
      />
      <div className="wrap">
        <div className="form-wrap">
          <aside className="form-aside">
            <div className="notice">
              <p className="notice-k"><StatusGlyph s="demonstrated" />No payment is taken</p>
              <h3>Interest only.<br />Not an order.</h3>
              <ul>
                <li><span>Card details</span><span>Never asked</span></li>
                <li><span>Checkout</span><span>None</span></li>
                <li><span>Delivery date</span><span>Not promised</span></li>
                <li><span>Target price</span><span>S$4.90</span></li>
              </ul>
              <p>Your answers help us plan a small pilot and test the target price.</p>
            </div>
            {demo && (
              <div className="notice" data-tone="demo" role="note">
                <p className="notice-k"><StatusGlyph s="proposed" />Demo mode</p>
                <p>No form backend is connected yet, so responses on this site are not saved. The confirmation will say so.</p>
              </div>
            )}
            <div className="notice" data-tone="plain" id="contact">
              <p className="notice-k">Contact the team</p>
              <p>Nurseries, testing labs and collaborators: pick the matching option and add a note. We reply from the team inbox.</p>
            </div>
          </aside>
          <InterestForm />
        </div>
      </div>
    </div>
  );
}
