#!/usr/bin/env node
const fs=require('fs'),path=require('path'),crypto=require('crypto');
class ProjectIdManager{constructor(d=process.cwd()){this.projectDir=d;this.claudeDir=path.join(d,'.claude');this.configFile=path.join(this.claudeDir,'project.json');}
getApplicationId(){if(fs.existsSync(this.configFile)){try{const c=JSON.parse(fs.readFileSync(this.configFile,'utf-8'));if(c.applicationId)return c.applicationId;}catch(e){}}
const id=this.generateApplicationId();this.saveApplicationId(id);return id;}
generateApplicationId(){const name=this.getProjectName();const hash=crypto.createHash('sha256').update(`${name}-${this.projectDir}-${Date.now()}`).digest('hex');return`mech-${name.toLowerCase().replace(/[^a-z0-9]/g,'-')}-${hash.substring(0,8)}`;}
getProjectName(){const pkg=path.join(this.projectDir,'package.json');if(fs.existsSync(pkg)){try{const p=JSON.parse(fs.readFileSync(pkg,'utf-8'));if(p.name)return p.name;}catch(e){}}return path.basename(this.projectDir);}
saveApplicationId(id){if(!fs.existsSync(this.claudeDir))fs.mkdirSync(this.claudeDir,{recursive:true});const config={applicationId:id,createdAt:new Date().toISOString()};fs.writeFileSync(this.configFile,JSON.stringify(config,null,2));}}
if(require.main===module){const m=new ProjectIdManager();const cmd=process.argv[2];if(cmd==='get')console.log(m.getApplicationId());else console.log('Usage: project-id-manager.cjs [get]');}
module.exports=ProjectIdManager;
