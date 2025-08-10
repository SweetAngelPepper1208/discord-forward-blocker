// env-check.js
console.log('--- ENV VARIABLES ---');
console.log(process.env);
console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? '[FOUND]' : '[NOT FOUND]');
process.exit(0);
