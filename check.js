const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/gi);
if (scriptMatches) {
    scriptMatches.forEach((s, i) => {
        const code = s.replace(/<script>/i, '').replace(/<\/script>/i, '');
        fs.writeFileSync(`temp_${i}.js`, code);
        try {
            require('child_process').execSync(`node -c temp_${i}.js`);
            console.log(`Script ${i} OK`);
        } catch(e) {
            console.log(`Script ${i} ERROR:`, e.stderr ? e.stderr.toString() : e.message);
        }
    });
} else {
    console.log("No scripts found");
}