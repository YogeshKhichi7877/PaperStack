import { useEffect, useRef } from 'react';

/**
 * Reusable Google AdSense Component for PaperStack
 *
 * Props:
 * @param {string}  adSlot       - Your ad-slot ID (required)
 * @param {string}  adFormat     - Ad format: 'fluid' | 'auto' | 'rectangle' etc. (default: 'fluid')
 * @param {string}  layoutKey    - Required when adFormat is 'fluid' (default: '-f6+5c+7j-c3-45')
 * @param {string}  className    - Optional wrapper CSS class for layout control
 * @param {object}  style        - Optional inline styles for the wrapper div
 *
 * Usage Examples:
 *
 * 1. Fluid ad (your current config):
 *    <GoogleAd adSlot="9315601513" />
 *
 * 2. Auto / responsive banner:
 *    <GoogleAd adSlot="9315601513" adFormat="auto" />
 *
 * 3. With custom positioning class:
 *    <GoogleAd adSlot="9315601513" className="my-ad-wrapper" />
 */

const AD_CLIENT = 'ca-pub-7802109402924823'; // Your AdSense publisher ID

export default function GoogleAd({
  adSlot,
  adFormat = 'fluid',
  layoutKey = '-f6+5c+7j-c3-45',
  className = '',
  style = {},
}) {
  const adRef = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    // Avoid pushing the same ad slot twice (React Strict Mode / remounts)
    if (pushed.current) return;

    try {
      // adsbygoogle is injected by the script tag in index.html
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
        pushed.current = true;
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  // Don't render ads in development to avoid AdSense policy issues
  if (process.env.NODE_ENV === 'development') {
    return (
      <div
        style={{
          background: '#f0f0f0',
          border: '2px dashed #ccc',
          color: '#999',
          textAlign: 'center',
          padding: '20px',
          fontSize: '13px',
          borderRadius: '6px',
          ...style,
        }}
        className={className}
      >
        📢 Ad Placeholder (hidden in development)
      </div>
    );
  }

  return (
    <div className={className} style={style} ref={adRef}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format={adFormat}
        data-ad-layout-key={adFormat === 'fluid' ? layoutKey : undefined}
        data-ad-client={AD_CLIENT}
        data-ad-slot={adSlot}
      />
    </div>
  );
}