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
      title: 'Missing Tooth Replacement Options',
      subtitle: 'A side-by-side comparison to help you understand the pros, cons, costs, and recovery time for each option.',
      implantDesc: 'A titanium post surgically placed into the jawbone to support a crown.',
      bridgeDesc: 'A false tooth anchored to the adjacent natural teeth.',
      dentureDesc: 'A removable plate with one or more replacement teeth.'
    },
    'extraction-replacement': {
      title: 'Extraction Replacement Options',
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
      return '<span style="background-color:#d4edda;color:#155724;padding:2px 8px;border-radius:12px;font-size:12px;margin-left:8px;">Recommended by your dentist</span>';
    }
    return '';
  };
  
  return `
    <div style="background-color:#f8f9fa;padding:20px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);margin-top:20px;">
      <h2 style="text-align:center;font-size:22px;margin-bottom:8px;font-weight:600;color:#2c3e50;">${info.title}</h2>
      <p style="text-align:center;font-size:15px;color:#6c757d;margin-bottom:24px;">
        ${info.subtitle}
      </p>

      <!-- Vertical Cards Layout - Much better for vertical reports -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        
        <!-- Dental Implant Card -->
        <div style="background:white;border-radius:8px;border:1px solid #e9ecef;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);padding:16px;color:white;">
            <h3 style="margin:0;font-size:18px;font-weight:600;">Dental Implant</h3>
            ${getRecommendationBadge('implant-placement')}
          </div>
          <div style="padding:16px;">
            <div style="margin-bottom:16px;">
              <strong style="color:#495057;">What it is:</strong>
              <p style="margin:8px 0 0 0;color:#6c757d;line-height:1.5;">${info.implantDesc}</p>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
              <div>
                <strong style="color:#495057;">Cost:</strong>
                <div style="background-color:#d4edda;color:#155724;padding:6px 12px;border-radius:6px;margin-top:4px;display:inline-block;font-weight:600;">$${implantPrice}</div>
              </div>
              <div>
                <strong style="color:#495057;">Recovery:</strong>
                <p style="margin:4px 0 0 0;color:#6c757d;font-size:14px;line-height:1.4;">
                  ${context === 'extraction-replacement' 
                    ? 'After extraction healing (3-6 months), mild swelling/discomfort for 3–5 days. Soft foods for ~1 week. Final healing over 3–6 months.'
                    : 'Mild swelling/discomfort for 3–5 days. Soft foods for ~1 week. Healing over 3–6 months. Normal activities resume in a few days.'
                  }
                </p>
              </div>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              <div>
                <strong style="color:#495057;">Pros:</strong>
                <ul style="margin:8px 0 0 0;padding-left:20px;color:#6c757d;line-height:1.4;">
                  <li>Long-lasting and stable</li>
                  <li>Preserves bone health</li>
                  <li>Feels like a real tooth</li>
                </ul>
              </div>
              <div>
                <strong style="color:#495057;">Cons:</strong>
                <ul style="margin:8px 0 0 0;padding-left:20px;color:#6c757d;line-height:1.4;">
                  <li>Requires surgery</li>
                  <li>Higher upfront cost</li>
                  <li>Longer healing time</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Dental Bridge Card -->
        <div style="background:white;border-radius:8px;border:1px solid #e9ecef;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);padding:16px;color:white;">
            <h3 style="margin:0;font-size:18px;font-weight:600;">Dental Bridge</h3>
            ${getRecommendationBadge('bridge')}
          </div>
          <div style="padding:16px;">
            <div style="margin-bottom:16px;">
              <strong style="color:#495057;">What it is:</strong>
              <p style="margin:8px 0 0 0;color:#6c757d;line-height:1.5;">${info.bridgeDesc}</p>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
              <div>
                <strong style="color:#495057;">Cost:</strong>
                <div style="background-color:#d4edda;color:#155724;padding:6px 12px;border-radius:6px;margin-top:4px;display:inline-block;font-weight:600;">$${bridgePrice}</div>
              </div>
              <div>
                <strong style="color:#495057;">Recovery:</strong>
                <p style="margin:4px 0 0 0;color:#6c757d;font-size:14px;line-height:1.4;">
                  ${context === 'extraction-replacement'
                    ? 'Can be done after extraction healing. Little to no downtime. Mild sensitivity in nearby teeth. Back to normal eating within 48 hours.'
                    : 'Little to no downtime. Mild sensitivity in nearby teeth. Back to normal eating within 48 hours.'
                  }
                </p>
              </div>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              <div>
                <strong style="color:#495057;">Pros:</strong>
                <ul style="margin:8px 0 0 0;padding-left:20px;color:#6c757d;line-height:1.4;">
                  <li>Non-surgical</li>
                  <li>Quicker treatment</li>
                  <li>Cost-effective</li>
                </ul>
              </div>
              <div>
                <strong style="color:#495057;">Cons:</strong>
                <ul style="margin:8px 0 0 0;padding-left:20px;color:#6c757d;line-height:1.4;">
                  <li>May require shaping healthy teeth</li>
                  <li>Less durable than implants</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Partial Denture Card -->
        <div style="background:white;border-radius:8px;border:1px solid #e9ecef;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);padding:16px;color:white;">
            <h3 style="margin:0;font-size:18px;font-weight:600;">Partial Denture</h3>
            ${getRecommendationBadge('partial-denture')}
          </div>
          <div style="padding:16px;">
            <div style="margin-bottom:16px;">
              <strong style="color:#495057;">What it is:</strong>
              <p style="margin:8px 0 0 0;color:#6c757d;line-height:1.5;">${info.dentureDesc}</p>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
              <div>
                <strong style="color:#495057;">Cost:</strong>
                <div style="background-color:#d4edda;color:#155724;padding:6px 12px;border-radius:6px;margin-top:4px;display:inline-block;font-weight:600;">$${denturePrice}</div>
              </div>
              <div>
                <strong style="color:#495057;">Recovery:</strong>
                <p style="margin:4px 0 0 0;color:#6c757d;font-size:14px;line-height:1.4;">
                  ${context === 'extraction-replacement'
                    ? 'Can be fitted after extraction healing. May feel strange at first. Adjusts over 1–2 weeks. Minor irritation or increased saliva is common initially.'
                    : 'May feel strange at first. Adjusts over 1–2 weeks. Minor irritation or increased saliva is common initially.'
                  }
                </p>
              </div>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              <div>
                <strong style="color:#495057;">Pros:</strong>
                <ul style="margin:8px 0 0 0;padding-left:20px;color:#6c757d;line-height:1.4;">
                  <li>Affordable</li>
                  <li>Removable & easy to produce</li>
                </ul>
              </div>
              <div>
                <strong style="color:#495057;">Cons:</strong>
                <ul style="margin:8px 0 0 0;padding-left:20px;color:#6c757d;line-height:1.4;">
                  <li>Less stable</li>
                  <li>May feel bulky</li>
                  <li>Requires daily maintenance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top:24px;padding:16px;background-color:#e3f2fd;border-radius:8px;border-left:4px solid #2196f3;">
        <p style="margin:0;color:#1565c0;font-size:14px;">
          <strong>Still unsure?</strong> Speak with your dental team about which option is best for your needs, budget, and lifestyle.
        </p>
      </div>
    </div>
  `;
}
