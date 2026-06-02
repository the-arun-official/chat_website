const fs = require('fs');

let css = fs.readFileSync('src/pages/LandingPage.css', 'utf8');

// Replace Google fonts with iOS font stack
const iosFontStack = 'font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;';
css = css.replace(/font-family:\s*'(Syne|DM Sans)',\s*sans-serif;/g, iosFontStack);

// Reduce bold weights to lighter iOS style
css = css.replace(/font-weight:\s*800/g, 'font-weight: 400');
css = css.replace(/font-weight:\s*700/g, 'font-weight: 400');
css = css.replace(/font-weight:\s*600/g, 'font-weight: 300');
css = css.replace(/font-weight:\s*500/g, 'font-weight: 300');

// Reduce font sizes
css = css.replace(/clamp\(38px,\s*6vw,\s*72px\)/g, 'clamp(28px, 4.5vw, 48px)'); // hero text
css = css.replace(/clamp\(24px,\s*3\.5vw,\s*38px\)/g, 'clamp(20px, 3vw, 28px)'); // h2 text
css = css.replace(/font-size:\s*40px/g, 'font-size: 32px'); // bento stats
css = css.replace(/font-size:\s*17px/g, 'font-size: 15px'); // hero sub
css = css.replace(/font-size:\s*20px/g, 'font-size: 18px'); // nav logo
css = css.replace(/font-size:\s*16px/g, 'font-size: 15px'); // bento title

fs.writeFileSync('src/pages/LandingPage.css', css);
console.log('Update successful');
