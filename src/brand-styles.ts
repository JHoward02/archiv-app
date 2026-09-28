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
.cs-subtitle{display:none !important}
.cs-tabs{align-self:flex-end;width:auto;display:flex !important;background:#fffdf8 !important;border:1px solid #d9cebf !important;border-radius:999px !important;padding:4px !important;margin-top:-62px;z-index:2;margin-right:160px;box-shadow:0 12px 34px -27px rgba(8,36,59,.45)}
.cs-tab{border-radius:999px !important;min-height:38px !important;color:#665f57 !important;padding:8px 16px !important;font-weight:700 !important}.cs-tab[aria-selected="true"]{background:#08243b !important;color:#fffaf0 !important}
.cs-search{gap:14px !important;padding-top:48px}.cs-search::before{content:"Add to your Archív";display:block;font-family:Georgia,"Times New Roman",serif;font-size:clamp(34px,5vw,56px);font-weight:600;letter-spacing:-.035em;line-height:1.02;max-width:720px;color:#08243b}.cs-search::after{content:"Catalog the things you love. Search your collectibles, save the right match, and keep your collection in one beautiful place.";display:block;order:-1;color:#6f6a62;font-size:16px;line-height:1.55;max-width:720px;margin-top:-5px}
.cs-search__row{background:#fffdf8 !important;border:1px solid #bcae9d !important;border-radius:18px !important;padding:6px !important;box-shadow:0 20px 50px -35px rgba(45,31,19,.5) !important}.cs-search__row:focus-within{border-color:#08243b !important;box-shadow:0 0 0 3px rgba(245,154,35,.22),0 20px 50px -35px rgba(45,31,19,.5) !important}
.cs-search__row .cs-input{border:0 !important;background:transparent !important;min-height:54px !important;font-size:16px;padding-left:16px !important;color:#08243b !important}.cs-search__row .cs-input:focus{outline:0 !important}.cs-search__row .cs-button{background:#f59a23 !important;color:#08243b !important;border-radius:12px !important;min-width:112px;font-weight:800 !important;border:1px solid #dc8418 !important}
.cs-button{background:#08243b !important;color:#fffaf0 !important;border-radius:11px !important;border-color:#08243b !important;font-weight:750 !important}.cs-button--ghost{background:#fffdf8 !important;color:#08243b !important;border-color:#bcae9d !important}
.cs-chips{gap:8px !important}.cs-chip{background:#fffdf8 !important;color:#5c574f !important;border-color:#d9cebf !important;border-radius:999px !important;min-height:38px !important;font-weight:700}.cs-chip[aria-pressed="true"]{background:#08243b !important;color:#fffaf0 !important;border-color:#08243b !important;box-shadow:none !important}
.cs-section__title{font-family:Georgia,"Times New Roman",serif !important;font-size:22px !important;color:#08243b !important}.cs-state,.cs-card{background:#fffdf8 !important;border-color:#ddd2c4 !important;box-shadow:0 16px 38px -30px rgba(45,31,19,.55) !important}.cs-card{border-radius:16px !important;overflow:hidden}.cs-media{background:#eee7dc !important}.cs-tag--group,.cs-grouptag{color:#526653 !important}.cs-toast{background:#08243b !important;color:#fffaf0 !important}.cs-suggestions,.cs-state{background:#fffdf8 !important}.cs-hint,.cs-meta,.cs-muted{color:#746d64 !important}select,textarea,input{accent-color:#f59a23}
@media(max-width:640px){.cs-app{padding:14px 14px 92px !important;gap:14px !important}.cs-header__row{align-items:stretch !important;flex-direction:column !important;gap:4px !important;min-height:0 !important}.cs-title,.cs-title[data-shelfie-home="true"]{flex:none !important;height:90px !important;max-width:100% !important;width:100% !important}.cs-title__logo{object-position:center center !important}.cs-count{align-self:flex-end !important;font-size:11px !important;padding:6px 9px !important}.cs-tabs{margin:0 !important;align-self:stretch;justify-content:space-between}.cs-tab{flex:1}.cs-search{padding-top:14px}.cs-search::before{font-size:38px}.cs-search::after{font-size:15px}.cs-search__row{flex-direction:column;border:0 !important;background:transparent !important;padding:0 !important;box-shadow:none !important}.cs-search__row .cs-input{border:1px solid #bcae9d !important;border-radius:14px !important;background:#fffdf8 !important}.cs-search__row .cs-button{width:100%;min-height:50px !important}}
/* Collection-led layout inspired by the new brand board. */
.cs-app{max-width:1160px !important;gap:24px !important;padding:18px 30px 112px !important;background:#f5f0e9 !important}
.cs-header{border-bottom:1px solid #ded4c8;padding:0 0 12px !important}
.cs-header__row{min-height:76px !important;gap:16px !important;flex-direction:row !important;align-items:center !important}
.cs-title,.cs-title[data-shelfie-home="true"]{flex:0 1 245px !important;width:245px !important;max-width:245px !important;height:76px !important}
.cs-tabs{align-self:flex-start !important;margin:0 !important;background:#eae3da !important;border:0 !important;box-shadow:none !important}
.cs-collection{display:flex;flex-direction:column;gap:25px;min-width:0}
.cs-collection__intro{display:flex;align-items:end;justify-content:space-between;gap:25px}
.cs-eyebrow{color:#a26226;font-size:11px;letter-spacing:.23em;font-weight:800;margin:0 0 7px}
.cs-collection__title{font:500 clamp(36px,5vw,58px)/1.03 Georgia,"Times New Roman",serif;letter-spacing:-.055em;margin:0;color:#08243b}
.cs-collection__lead{max-width:280px;margin:0 0 3px;color:#625f5a;font-size:14px;line-height:1.5}
.cs-shelves{display:flex;flex-direction:column;gap:15px}
.cs-shelves__heading{display:flex;align-items:baseline;justify-content:space-between;gap:18px}
.cs-shelves__heading h2{font:500 24px/1.1 Georgia,"Times New Roman",serif;letter-spacing:-.025em;margin:0}
.cs-shelves__heading p{color:#736c64;font-size:13px;margin:0}
.cs-shelf-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.cs-shelf{appearance:none;padding:0;text-align:left;border:1px solid #ded4c8;border-radius:16px;overflow:hidden;background:#fffdf8;color:#08243b;cursor:pointer;box-shadow:0 10px 25px -20px #4a3422;min-width:0;transition:transform .2s,box-shadow .2s,border-color .2s}
.cs-shelf:hover{transform:translateY(-3px);box-shadow:0 15px 29px -20px #4a3422}
.cs-shelf--selected{border-color:#08243b;box-shadow:0 0 0 2px #08243b}
.cs-shelf__picture{height:150px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;background:linear-gradient(145deg,#172c32,#3f4938 54%,#7c5835)}
.cs-shelf__picture::after{content:"";position:absolute;inset:0;background:linear-gradient(155deg,rgba(255,210,140,.1),transparent 40%,rgba(5,17,25,.18));pointer-events:none}
.cs-shelf__picture img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cs-shelf__monogram{font:600 clamp(23px,3vw,35px)/1 Georgia,"Times New Roman",serif;color:#f5d7a6;letter-spacing:.04em;text-shadow:0 3px 14px #0b1b20;transform:rotate(-6deg)}
.cs-shelf--comic .cs-shelf__picture{background:linear-gradient(135deg,#1b3443,#6e392b)}
.cs-shelf--tcg .cs-shelf__picture{background:linear-gradient(135deg,#272c46,#795e44)}
.cs-shelf--sports-card .cs-shelf__picture{background:linear-gradient(135deg,#203849,#5e6e69)}
.cs-shelf--book .cs-shelf__picture{background:linear-gradient(135deg,#54392a,#b17739)}
.cs-shelf--video-game .cs-shelf__picture{background:linear-gradient(135deg,#152c38,#354a60)}
.cs-shelf--figure .cs-shelf__picture{background:linear-gradient(135deg,#654127,#a96b37)}
.cs-shelf--toy .cs-shelf__picture{background:linear-gradient(135deg,#304539,#836e47)}
.cs-shelf--coin .cs-shelf__picture{background:linear-gradient(135deg,#5c5036,#ad8950)}
.cs-shelf--vinyl .cs-shelf__picture{background:linear-gradient(135deg,#2a252a,#965931)}
.cs-shelf--sneaker .cs-shelf__picture{background:linear-gradient(135deg,#4b302c,#9d6855)}
.cs-shelf__info{display:flex;flex-direction:column;gap:2px;padding:11px 13px 13px}
.cs-shelf__info strong{font-size:14px;line-height:1.25}
.cs-shelf__info span{color:#716960;font-size:12px}
.cs-shelf-context{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#08243b;font-size:14px;font-weight:700;padding:4px 3px}.cs-shelf-context button{appearance:none;border:0;background:transparent;color:#294b63;text-decoration:underline;text-underline-offset:3px;font:inherit;cursor:pointer;padding:7px}.cs-shelf-context button:focus-visible{outline:2px solid #08243b;border-radius:4px}
.cs-category-page{gap:18px}.cs-category-page>.cs-button--ghost{align-self:flex-start}
.cs-category-page__hero{display:grid;grid-template-columns:minmax(180px,36%) 1fr;align-items:center;gap:28px;overflow:hidden;min-height:220px;border:1px solid #ded4c8;border-radius:18px;background:#fffdf8}
.cs-category-page__hero img{width:100%;height:220px;object-fit:cover}.cs-category-page__heading{padding:20px 24px 20px 0}.cs-category-page__heading .cs-collection__lead{margin-top:12px}
.cs-collection>.cs-section{padding:16px}
.cs-toolbar{padding:17px;border:1px solid #ded4c8;border-radius:16px;background:#fffdf8}
.cs-footer{max-width:1100px !important}
.cs-search:not(.cs-collection){padding-top:5px}
.cs-search:not(.cs-collection)::before{content:"Add to your Archív";display:block;font:500 clamp(32px,5vw,51px)/1.08 Georgia,"Times New Roman",serif;letter-spacing:-.04em}
.cs-search:not(.cs-collection)::after{content:none;display:none}
@media(max-width:800px){.cs-shelf-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:640px){
 .cs-app{padding:12px 16px 112px !important;gap:18px !important}
 .cs-header{padding-bottom:8px !important}
 .cs-header__row{min-height:62px !important;flex-direction:row !important;align-items:center !important;gap:8px !important}
 .cs-title,.cs-title[data-shelfie-home="true"]{flex:0 1 156px !important;width:156px !important;max-width:156px !important;height:59px !important}
 .cs-title__logo{object-position:left center !important}
 .cs-tabs{position:fixed;bottom:0;left:0;right:0;z-index:30;display:grid !important;grid-template-columns:1fr 1fr;gap:8px !important;margin:0 !important;padding:9px 16px calc(9px + env(safe-area-inset-bottom)) !important;border-top:1px solid #d9cfc2 !important;border-radius:0 !important;background:#fffdf8 !important;box-shadow:0 -4px 20px rgba(8,36,59,.08) !important}
 .cs-tab{min-height:45px !important;border-radius:9px !important}
 .cs-collection{gap:21px}
 .cs-collection__intro{display:block}
 .cs-collection__title{font-size:39px}
 .cs-collection__lead{margin:8px 0 0;max-width:340px;font-size:13px}
 .cs-shelves__heading h2{font-size:22px}
 .cs-shelves__heading p{display:none}
 .cs-shelf-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .cs-shelf__picture{height:116px}
 .cs-shelf__monogram{font-size:25px}
 .cs-shelf__info{padding:9px 10px 10px}
 .cs-category-page__hero{grid-template-columns:1fr;gap:0}.cs-category-page__hero img{height:170px}.cs-category-page__heading{padding:20px}.cs-category-page__heading .cs-collection__title{font-size:39px}
 .cs-toolbar{padding:12px}
 .cs-search__row{flex-direction:row !important;border:1px solid #bcae9d !important;background:#fffdf8 !important;padding:5px !important;box-shadow:none !important}
 .cs-search__row .cs-input{border:0 !important;min-width:0 !important;background:transparent !important}
 .cs-search__row .cs-button{width:auto !important;min-width:83px !important;min-height:48px !important}
}
@media(max-width:360px){.cs-title,.cs-title[data-shelfie-home="true"]{width:130px !important;max-width:130px !important;flex-basis:130px !important}}
/* Navigation tabs sit on the header baseline beside the logo. */
.cs-header{padding-bottom:0 !important}
.cs-header__row{align-items:flex-end !important;justify-content:flex-start !important}
.cs-header__row .cs-title,.cs-header__row .cs-title[data-shelfie-home="true"]{height:94px !important;display:flex !important;flex-direction:column !important;justify-content:flex-end !important}
.cs-header__row .cs-title__logo{height:auto !important;aspect-ratio:2172/780;object-position:left bottom !important;flex:none !important}
.cs-header__row .cs-tabs{position:static !important;inset:auto !important;display:flex !important;grid-template-columns:none !important;align-self:flex-end !important;flex:0 0 auto;width:auto !important;gap:4px !important;margin:0 0 -1px 64px !important;padding:0 !important;border:0 !important;border-radius:0 !important;background:transparent !important;box-shadow:none !important;z-index:auto !important}
.cs-header__row .cs-tab{flex:none !important;min-width:150px !important;min-height:42px !important;padding:8px 22px !important;border:1px solid transparent !important;border-radius:12px 12px 0 0 !important;background:#e5ded5 !important;color:#5e5953 !important;font-size:13px !important;white-space:nowrap}
.cs-header__row .cs-tab[aria-selected="true"]{border-color:#ded4c8 !important;border-bottom:0 !important;background:#f5f0e9 !important;color:#08243b !important}
@media(max-width:640px){
 .cs-app{padding-bottom:28px !important}
 .cs-header__row{gap:4px !important}
 .cs-header__row .cs-title,.cs-header__row .cs-title[data-shelfie-home="true"]{height:74px !important}
 .cs-title,.cs-title[data-shelfie-home="true"]{flex:0 1 clamp(92px,33vw,136px) !important;width:clamp(92px,33vw,136px) !important;max-width:136px !important}
 .cs-header__row .cs-tabs{flex:1 1 auto !important;min-width:0;margin-left:clamp(18px,5vw,34px) !important;gap:1px !important}
 .cs-header__row .cs-tab{flex:1 1 0 !important;min-width:0 !important;min-height:40px !important;padding:7px 5px !important;font-size:11px !important}
}
@media(max-width:360px){
 .cs-title,.cs-title[data-shelfie-home="true"]{flex-basis:92px !important;width:92px !important;max-width:92px !important}
 .cs-header__row .cs-tab{padding:7px 4px !important;font-size:10px !important}
}
@media(prefers-reduced-motion:reduce){.cs-shelf{transition:none}.cs-shelf:hover{transform:none}}
`;
