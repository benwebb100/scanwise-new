/**
 * Unified template for replacement options comparison table
 * Used for both missing tooth and extraction replacement scenarios
 */

export interface ReplacementOptionsData {
  context: 'missing-tooth' | 'extraction-replacement';
  selectedTreatment: string;
  clinicPrices: Record<string, number>;
  toothNumber?: string;
}

export function generateReplacementOptionsTable(data: ReplacementOptionsData): string {
  const { context, selectedTreatment, clinicPrices, toothNumber } = data;
  
  // Get pricing with fallback to defaults
  const getPrice = (treatment: string, defaultPrice: number): number => {
    return clinicPrices[treatment] || defaultPrice;
  };
  
  const implantPrice = getPrice('implant-placement', 2300);
  const bridgePrice = getPrice('bridge', 850);
  const denturePrice = getPrice('partial-denture', 600);
  
  // Context-specific content
  const contextInfo = {
    'missing-tooth': {
      title: '🦷 Missing Tooth Replacement Options',
      subtitle: 'A side-by-side comparison to help you understand the pros, cons, costs, and recovery time for each option.',
      implantDesc: 'A titanium post surgically placed into the jawbone to support a crown.',
      bridgeDesc: 'A false tooth anchored to the adjacent natural teeth.',
      dentureDesc: 'A removable plate with one or more replacement teeth.'
    },
    'extraction-replacement': {
      title: '🦷 Extraction Replacement Options',
      subtitle: `After extracting tooth ${toothNumber}, here are your replacement options with pros, cons, costs, and recovery time.`,
      implantDesc: 'A titanium post surgically placed into the jawbone after extraction healing to support a crown.',
      bridgeDesc: 'A false tooth anchored to the adjacent natural teeth, can be done after extraction.',
      dentureDesc: 'A removable plate with replacement teeth, can be fitted after extraction healing.'
    }
  };
  
  const info = contextInfo[context];
  
  // Helper function to check if treatment is recommended
  const isRecommended = (treatment: string): boolean => {
    return treatment === selectedTreatment;
  };
  
  // Helper function to get recommendation badge
  const getRecommendationBadge = (treatment: string): string => {
    if (isRecommended(treatment)) {
      return '<span style="background-color:#d4edda;color:#155724;padding:2px 8px;border-radius:12px;font-size:12px;margin-left:8px;">🟢 Recommended by your dentist</span>';
    }
    return '';
  };
  
  return `
    <div style="background-color:#f8f9fa;padding:20px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);margin-top:20px;overflow-x:auto;">
      <h2 style="text-align:center;font-size:28px;margin-bottom:8px;font-weight:600;">${info.title}</h2>
      <p style="text-align:center;font-size:18px;color:#6c757d;margin-bottom:24px;">
        ${info.subtitle}
      </p>

      <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;table-layout:fixed;">
        <thead>
          <tr style="background-color:#ffffff;">
            <th style="padding:12px;border:1px solid #dee2e6;text-align:left;width:15%;">Treatment</th>
            <th style="padding:12px;border:1px solid #dee2e6;text-align:left;width:20%;">What it is</th>
            <th style="padding:12px;border:1px solid #dee2e6;text-align:left;width:12%;">Cost</th>
            <th style="padding:12px;border:1px solid #dee2e6;text-align:left;width:18%;">Pros</th>
            <th style="padding:12px;border:1px solid #dee2e6;text-align:left;width:18%;">Cons</th>
            <th style="padding:12px;border:1px solid #dee2e6;text-align:left;width:17%;">Recovery</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background-color:#ffffff;">
            <td style="padding:12px;border:1px solid #dee2e6;border-left:4px solid #0d6efd;word-wrap:break-word;">
              <strong>🦷 Dental Implant</strong>
              ${getRecommendationBadge('implant-placement')}
            </td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;">${info.implantDesc}</td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;"><span style="background-color:#d4edda;color:#155724;padding:4px 10px;border-radius:20px;">$${implantPrice}</span></td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;">
              <ul style="padding-left:18px;margin:0;">
                <li>Long-lasting and stable</li>
                <li>Preserves bone health</li>
                <li>Feels like a real tooth</li>
              </ul>
            </td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;">
              <ul style="padding-left:18px;margin:0;">
                <li>Requires surgery</li>
                <li>Higher upfront cost</li>
                <li>Longer healing time</li>
              </ul>
            </td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;">
              ${context === 'extraction-replacement' 
                ? 'After extraction healing (3-6 months), mild swelling/discomfort for 3–5 days. Soft foods for ~1 week. Final healing over 3–6 months.'
                : 'Mild swelling/discomfort for 3–5 days. Soft foods for ~1 week. Healing over 3–6 months. Normal activities resume in a few days.'
              }
            </td>
          </tr>

          <tr style="background-color:#ffffff;">
            <td style="padding:12px;border:1px solid #dee2e6;border-left:4px solid #0d6efd;word-wrap:break-word;">
              <strong>🔗 Dental Bridge</strong>
              ${getRecommendationBadge('bridge')}
            </td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;">${info.bridgeDesc}</td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;"><span style="background-color:#d4edda;color:#155724;padding:4px 10px;border-radius:20px;">$${bridgePrice}</span></td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;">
              <ul style="padding-left:18px;margin:0;">
                <li>Non-surgical</li>
                <li>Quicker treatment</li>
                <li>Cost-effective</li>
              </ul>
            </td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;">
              <ul style="padding-left:18px;margin:0;">
                <li>May require shaping healthy teeth</li>
                <li>Less durable than implants</li>
              </ul>
            </td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;">
              ${context === 'extraction-replacement'
                ? 'Can be done after extraction healing. Little to no downtime. Mild sensitivity in nearby teeth. Back to normal eating within 48 hours.'
                : 'Little to no downtime. Mild sensitivity in nearby teeth. Back to normal eating within 48 hours.'
              }
            </td>
          </tr>

          <tr style="background-color:#ffffff;">
            <td style="padding:12px;border:1px solid #dee2e6;border-left:4px solid #0d6efd;word-wrap:break-word;">
              <strong>🛡️ Partial Denture</strong>
              ${getRecommendationBadge('partial-denture')}
            </td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;">${info.dentureDesc}</td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;"><span style="background-color:#d4edda;color:#155724;padding:4px 10px;border-radius:20px;">$${denturePrice}</span></td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;">
              <ul style="padding-left:18px;margin:0;">
                <li>Affordable</li>
                <li>Removable & easy to produce</li>
              </ul>
            </td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;">
              <ul style="padding-left:18px;margin:0;">
                <li>Less stable</li>
                <li>May feel bulky</li>
                <li>Requires daily maintenance</li>
              </ul>
            </td>
            <td style="padding:12px;border:1px solid #dee2e6;word-wrap:break-word;">
              ${context === 'extraction-replacement'
                ? 'Can be fitted after extraction healing. May feel strange at first. Adjusts over 1–2 weeks. Minor irritation or increased saliva is common initially.'
                : 'May feel strange at first. Adjusts over 1–2 weeks. Minor irritation or increased saliva is common initially.'
              }
            </td>
          </tr>
        </tbody>
      </table>

      <p style="margin-top:24px;">💡 <strong>Still unsure?</strong> Speak with your dental team about which option is best for your needs, budget, and lifestyle.</p>
    </div>
  `;
}
