import {spawn} from 'node:child_process';
const children=[spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','server/index.ts'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1'],{stdio:'inherit'})];
let stopping=false;
function stop(){if(stopping)return;stopping=true;for(const child of children) child.kill('SIGTERM');}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
for(const child of children){child.on('error',()=>{process.exitCode=1;stop();});child.on('exit',code=>{if(!stopping){process.exitCode=code||0;stop();}});}
