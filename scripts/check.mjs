import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
function files(directory){return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(directory,entry.name)):entry.name.endsWith('.js')?[join(directory,entry.name)]:[]);}
for(const file of [...files('server'),...files('shared')]){const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
console.log('All backend and shared JavaScript syntax checks passed.');
