export const BRAND_STYLE_MARKER = "archiv-brand-v1";

export const brandStyles = `
.cs-app {
  --cs-bg:#f4efe6 !important;
  --cs-bg-tint:#fffaf3 !important;
  --cs-surface:#fffdf8 !important;
  --cs-surface-2:#eee7dc !important;
  --cs-border:#d9cebf !important;
  --cs-border-strong:#9d8d79 !important;
  --cs-text:#08243b !important;
  --cs-muted:#6f6a62 !important;
  --cs-accent:#f59a23 !important;
  --cs-accent-text:#08243b !important;
  --cs-group:#526653 !important;
  --cs-danger:#a84631 !important;
  --cs-shadow:0 18px 48px -30px rgba(34,25,16,.38) !important;
  color-scheme:light !important;
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif !important;
  max-width:1080px !important;
  gap:20px !important;
  padding:24px 24px 112px !important;
  background:radial-gradient(circle at 90% 0%,rgba(245,154,35,.10),transparent 26%),linear-gradient(180deg,#fffdf8 0,#f4efe6 38%,#f4efe6 100%) !important;
}
.cs-header{padding:2px 0 6px !important;gap:3px !important}.cs-header__row{min-height:112px !important;align-items:center !important}
.cs-title,.cs-title[data-shelfie-home="true"]{display:block !important;flex:1 1 520px !important;font-size:0 !important;height:106px !important;margin:0 !important;max-width:520px !important;min-width:0 !important;overflow:visible !important;padding:0 !important;width:100% !important}
.cs-title[data-shelfie-home="true"]{cursor:pointer;border-radius:12px}.cs-title[data-shelfie-home="true"]:focus-visible{outline:3px solid #f59a23;outline-offset:6px}.cs-title::before,.cs-title::after{content:none !important;display:none !important}
.cs-title__logo{display:block !important;width:100% !important;height:100% !important;object-fit:contain !important;object-position:left center !important;pointer-events:none !important;user-select:none !important;-webkit-user-drag:none !important;filter:drop-shadow(0 5px 10px rgba(8,36,59,.08))}
.cs-subtitle{display:none !important}.cs-count{background:#08243b !important;border:0 !important;border-radius:999px !important;color:#fffaf0 !important;font-weight:700;padding:9px 13px !important}
.cs-tabs{align-self:flex-end;width:auto;display:flex !important;background:#fffdf8 !important;border:1px solid #d9cebf !important;border-radius:999px !important;padding:4px !important;margin-top:-62px;z-index:2;margin-right:160px;box-shadow:0 12px 34px -27px rgba(8,36,59,.45)}
.cs-tab{border-radius:999px !important;min-height:38px !important;color:#665f57 !important;padding:8px 16px !important;font-weight:700 !important}.cs-tab[aria-selected="true"]{background:#08243b !important;color:#fffaf0 !important}
.cs-search{gap:14px !important;padding-top:48px}.cs-search::before{content:"Add to your Archiv";display:block;font-family:Georgia,"Times New Roman",serif;font-size:clamp(34px,5vw,56px);font-weight:600;letter-spacing:-.035em;line-height:1.02;max-width:720px;color:#08243b}.cs-search::after{content:"Catalog the things you love. Search your collectibles, save the right match, and keep your collection in one beautiful place.";display:block;order:-1;color:#6f6a62;font-size:16px;line-height:1.55;max-width:720px;margin-top:-5px}
.cs-search__row{background:#fffdf8 !important;border:1px solid #bcae9d !important;border-radius:18px !important;padding:6px !important;box-shadow:0 20px 50px -35px rgba(45,31,19,.5) !important}.cs-search__row:focus-within{border-color:#08243b !important;box-shadow:0 0 0 3px rgba(245,154,35,.22),0 20px 50px -35px rgba(45,31,19,.5) !important}
.cs-search__row .cs-input{border:0 !important;background:transparent !important;min-height:54px !important;font-size:16px;padding-left:16px !important;color:#08243b !important}.cs-search__row .cs-input:focus{outline:0 !important}.cs-search__row .cs-button{background:#f59a23 !important;color:#08243b !important;border-radius:12px !important;min-width:112px;font-weight:800 !important;border:1px solid #dc8418 !important}
.cs-button{background:#08243b !important;color:#fffaf0 !important;border-radius:11px !important;border-color:#08243b !important;font-weight:750 !important}.cs-button--ghost{background:#fffdf8 !important;color:#08243b !important;border-color:#bcae9d !important}
.cs-chips{gap:8px !important}.cs-chip{background:#fffdf8 !important;color:#5c574f !important;border-color:#d9cebf !important;border-radius:999px !important;min-height:38px !important;font-weight:700}.cs-chip[aria-pressed="true"]{background:#08243b !important;color:#fffaf0 !important;border-color:#08243b !important;box-shadow:none !important}
.cs-section__title{font-family:Georgia,"Times New Roman",serif !important;font-size:22px !important;color:#08243b !important}.cs-state,.cs-card{background:#fffdf8 !important;border-color:#ddd2c4 !important;box-shadow:0 16px 38px -30px rgba(45,31,19,.55) !important}.cs-card{border-radius:16px !important;overflow:hidden}.cs-media{background:#eee7dc !important}.cs-tag--group,.cs-grouptag{color:#526653 !important}.cs-toast{background:#08243b !important;color:#fffaf0 !important}.cs-suggestions,.cs-state{background:#fffdf8 !important}.cs-hint,.cs-meta,.cs-muted{color:#746d64 !important}select,textarea,input{accent-color:#f59a23}
@media(max-width:640px){.cs-app{padding:14px 14px 92px !important;gap:14px !important}.cs-header__row{align-items:stretch !important;flex-direction:column !important;gap:4px !important;min-height:0 !important}.cs-title,.cs-title[data-shelfie-home="true"]{flex:none !important;height:90px !important;max-width:100% !important;width:100% !important}.cs-title__logo{object-position:center center !important}.cs-count{align-self:flex-end !important;font-size:11px !important;padding:6px 9px !important}.cs-tabs{margin:0 !important;align-self:stretch;justify-content:space-between}.cs-tab{flex:1}.cs-search{padding-top:14px}.cs-search::before{font-size:38px}.cs-search::after{font-size:15px}.cs-search__row{flex-direction:column;border:0 !important;background:transparent !important;padding:0 !important;box-shadow:none !important}.cs-search__row .cs-input{border:1px solid #bcae9d !important;border-radius:14px !important;background:#fffdf8 !important}.cs-search__row .cs-button{width:100%;min-height:50px !important}}
`;
