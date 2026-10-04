const fs = require('fs');

const svgMap = {
  '⚡': '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-primary)"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
  '❌': '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
  '🎉': '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"></path><path d="M4 3h.01"></path><path d="M22 8h.01"></path><path d="M15 2h.01"></path><path d="M22 20h.01"></path><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"></path><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"></path><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"></path><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"></path></svg>',
  '📢': '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>',
  '⚠️': '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  '⏳': '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"></path><path d="M5 2h14"></path><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path></svg>',
  '🔥': '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>',
  '✅': '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  '📍': '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
  '🎯': '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
  '🚨': '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12c-2.8 0-5 2.2-5 5v3h10v-3c0-2.8-2.2-5-5-5Z"></path><path d="M12 8v4"></path><path d="M12 2v2"></path><path d="M22 17v2"></path><path d="M2 17v2"></path><path d="m20 9-1.7 1.7"></path><path d="m5.7 10.7-1.7-1.7"></path></svg>',
  '💡': '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
};

const files = [
  'src/pages/participant.js',
  'src/lib/utils.js',
  'src/main.js'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  if (f.includes('participant.js')) {
    content = content.replace(/title: "🔥 It's Your Turn!",/g, 'title: "It\'s Your Turn!",');
    content = content.replace(/title: '✅ Evaluation Complete',/g, "title: 'Evaluation Complete',");
    content = content.replace(/title: '📢 Announcement',/g, "title: 'Announcement',");
    content = content.replace(/title: '🔄 New Round',/g, "title: 'New Round',");
    
    for (let [emoji, svg] of Object.entries(svgMap)) {
      const varRegex = new RegExp(`hero(Icon|Position)\\s*=\\s*['"]${emoji}['"]`, 'g');
      content = content.replace(varRegex, `hero$1 = \`${svg}\``);
      
      const htmlRegex = new RegExp(`>\\s*${emoji}\\s*<`, 'g');
      content = content.replace(htmlRegex, `>${svg}<`);
      
      const spanRegex = new RegExp(`<span class="app-header__logo" aria-hidden="true">${emoji}</span>`, 'g');
      content = content.replace(spanRegex, `<span class="app-header__logo" aria-hidden="true">${svg}</span>`);
    }
  } else if (f.includes('utils.js')) {
    for (let [emoji, svg] of Object.entries(svgMap)) {
      const iconRegex = new RegExp(`['"]${emoji}['"]`, 'g');
      content = content.replace(iconRegex, `\`${svg}\``);
    }
  } else if (f.includes('main.js')) {
    content = content.replace(/%c⚡ /g, '%c');
  }

  fs.writeFileSync(f, content);
});

console.log("Replaced emojis in JS files");
