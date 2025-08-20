#!/usr/bin/env node
const http=require('http'),https=require('https'),os=require('os'),path=require('path');
const EVOLVE_URL=process.env.MECH_EVOLVE_URL||'http://evolve.mech.is';
const TOOL_NAME=process.env.tool_name||'';
if(!['Edit','Write','MultiEdit','Bash'].includes(TOOL_NAME))process.exit(0);
function getApplicationId(){try{const PM=require('./project-id-manager.cjs');return new PM(process.cwd()).getApplicationId();}catch(e){return`fallback-${path.basename(process.cwd())}-${Date.now()}`;}}
const data=JSON.stringify({applicationId:getApplicationId(),toolName:TOOL_NAME,timestamp:new Date().toISOString(),metadata:{projectScope:'isolated'}});
const url=new URL('/api/evolution/track',EVOLVE_URL);const protocol=url.protocol==='https:'?https:http;
const req=protocol.request({hostname:url.hostname,port:url.port||(url.protocol==='https:'?443:80),path:url.pathname,method:'POST',headers:{'Content-Type':'application/json'}},()=>{});
req.on('error',()=>{});req.write(data);req.end();process.exit(0);
