export function initScene(){
 const canvas=document.getElementById('system-canvas'),host=canvas?.closest('.hero-scene');
 if(!canvas||!host||canvas.dataset.sceneInitialized)return null;
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,powerPreference:'low-power',premultipliedAlpha:true});
 if(!gl){host.classList.add('scene-fallback');return null;}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width: 680px)');
 let raf=0,visible=true,lost=false,disposed=false,w=1,h=1,dpr=1,time=0,last=0,px=0,py=0,mx=0,my=0;
 let prog,haze,cloud,rings,stars,quad,count,ringCount;const resources=[];
 const vs=`precision highp float;
 attribute vec3 aSeed;uniform float uTime,uAspect,uDpr,uScroll;uniform mediump float uKind;uniform vec2 uPointer;varying mediump vec3 vColor;varying mediump float vAlpha;
 mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
 mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
 mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
 void main(){float u=aSeed.x,v=aSeed.y,seed=aSeed.z;vec3 p;
 if(uKind<.5){float r=1.12+.10*sin(u*3.+uTime*.17)+.04*cos(u*7.-uTime*.11);float m=.34+.08*sin(u*2.-uTime*.2);float ripple=.035*sin(v*5.+u*6.+uTime*.45);p=vec3((r+(m+ripple)*cos(v))*cos(u),(r+(m+ripple)*cos(v))*sin(u),m*sin(v));p.z+=.17*sin(u*3.+uTime*.18);}
 else if(uKind<1.5)p=vec3(cos(u)*v,sin(u)*v,seed);else p=aSeed;
 p=rz(-.38+uScroll*.32)*rx(.70+uPointer.y*.12+uScroll*.23)*ry(.17+uTime*.035+uPointer.x*.16)*p;
 float depth=4.25-p.z;vec2 xy=p.xy*2.18/depth;xy.x/=uAspect;xy+=vec2(.035+uPointer.x*.018,uPointer.y*.018-uScroll*.08);gl_Position=vec4(xy,0.,1.);
 float face=clamp((p.z+1.4)/2.8,0.,1.),hi=pow(max(0.,cos(u-.8-uTime*.06)),14.);
 vColor=mix(vec3(.24,.86,.96),vec3(.57,.44,1.),.5+.5*sin(u+uTime*.035));vColor=mix(vColor,vec3(.88,.97,1.),face*.62+hi*.30);vAlpha=(.16+face*.78)*(.72+seed*.28);gl_PointSize=uDpr*(1.45+seed*.95+hi*.9)*2.6/depth;
 if(uKind>.5&&uKind<1.5){vColor=mix(vec3(.25,.72,.84),vec3(.48,.4,.89),seed*.5+.5);vAlpha=.17;}
 if(uKind>1.5){vColor=vec3(.59,.72,.9);vAlpha=.12+.28*fract(seed*17.3);gl_PointSize=uDpr*(.65+fract(seed*3.3));}}
 `;
 const fs=`precision mediump float;uniform mediump float uKind;varying mediump vec3 vColor;varying mediump float vAlpha;void main(){if(uKind>.5&&uKind<1.5){gl_FragColor=vec4(vColor,vAlpha);return;}float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vColor,pow(max(0.,1.-d),.55)*vAlpha);}`;
 const hv=`attribute vec2 aPosition;varying mediump vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
 const hf=`precision mediump float;
varying mediump vec2 vUv;
uniform float uAspect,uTime;
uniform vec2 uCore;
void main(){
  // Aspect-correct distance makes the core round at every viewport ratio.
  vec2 p=(vUv-uCore)*vec2(uAspect,1.);
  float r=length(p);
  float radius=.019*(1.+.025*sin(uTime*.7));
  float disk=1.-smoothstep(radius*.83,radius,r);
  float sphere=sqrt(max(0.,1.-(r/radius)*(r/radius)));
  vec3 orb=mix(vec3(.72,.85,1.),vec3(1.,.985,1.),sphere)*disk;
  float tight=exp(-r*r*1100.);
  float violetHalo=exp(-r*24.);
  float wide=exp(-r*r*22.);
  float ringDistance=(r-radius*1.13)/.0045;
  float rim=exp(-ringDistance*ringDistance);
  vec3 glow=vec3(.47,.23,.95)*violetHalo*.53+vec3(.46,.68,1.)*tight*.40;
  glow+=vec3(.21,.15,.49)*wide*.10+vec3(.52,.86,1.)*rim*.16;
  // Additive composition preserves dark surroundings and a brilliant white center.
  vec3 color=clamp(orb+glow,0.,1.); float opacity=max(color.r,max(color.g,color.b)); gl_FragColor=vec4(color,opacity);
}`;
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));resources.push(['s',s]);return s;}
 function program(a,b){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,a));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,b));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Scene link failed: '+gl.getProgramInfoLog(p));resources.push(['p',p]);return p;}
 function buffer(a){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.STATIC_DRAW);resources.push(['b',b]);return b;}
 function seed(i){const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);}
 function setup(){prog=program(vs,fs);haze=program(hv,hf);const a=[],b=[],c=[],cols=mobile.matches?110:176,rows=mobile.matches?44:64;
 for(let u=0;u<cols;u++)for(let v=0;v<rows;v++)a.push(u/cols*Math.PI*2,v/rows*Math.PI*2,seed(u*rows+v));count=a.length/3;cloud=buffer(a);
 for(let r=0;r<3;r++)for(let i=0;i<256;i++)b.push(i/256*Math.PI*2,1.46+r*.12,(r-1)*.2,(i+1)/256*Math.PI*2,1.46+r*.12,(r-1)*.2);ringCount=b.length/3;rings=buffer(b);
 for(let i=0;i<300;i++)c.push((seed(i*3)-.5)*6,(seed(i*3+1)-.5)*5,(seed(i*3+2)-.5)*3);stars=buffer(c);quad=buffer([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);host.classList.add('scene-ready');host.classList.remove('scene-fallback');}
 function u(p,n,x){gl.uniform1f(gl.getUniformLocation(p,n),x);}
 function bind(b){gl.bindBuffer(gl.ARRAY_BUFFER,b);const l=gl.getAttribLocation(prog,'aSeed');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,3,gl.FLOAT,false,0,0);}
 function draw(now){raf=0;if(disposed||lost||!visible||document.hidden){last=0;return;}const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(!reduced.matches)time+=dt;mx+=(px-mx)*.035;my+=(py-my)*.035;
 gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(haze);gl.bindBuffer(gl.ARRAY_BUFFER,quad);const l=gl.getAttribLocation(haze,'aPosition');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);u(haze,'uAspect',w/h);u(haze,'uTime',reduced.matches?0:time);const hero=host.closest('.hero');const scroll=hero?Math.max(0,Math.min(1,-hero.getBoundingClientRect().top/Math.max(hero.offsetHeight,1))):0;gl.uniform2f(gl.getUniformLocation(haze,'uCore'),.5175+(reduced.matches?0:mx*.009),.5+(reduced.matches?0:my*.009-scroll*.04));gl.drawArrays(gl.TRIANGLES,0,6);gl.disableVertexAttribArray(l);
 gl.useProgram(prog);u(prog,'uTime',reduced.matches?0:time);u(prog,'uAspect',w/h);u(prog,'uDpr',dpr);u(prog,'uScroll',reduced.matches?0:scroll);gl.uniform2f(gl.getUniformLocation(prog,'uPointer'),reduced.matches?0:mx,reduced.matches?0:my);
 u(prog,'uKind',2);bind(stars);gl.drawArrays(gl.POINTS,0,300);u(prog,'uKind',1);bind(rings);gl.drawArrays(gl.LINES,0,ringCount);u(prog,'uKind',0);bind(cloud);gl.drawArrays(gl.POINTS,0,count);if(!reduced.matches)raf=requestAnimationFrame(draw);}
 function request(){if(!raf&&!disposed&&!lost&&visible&&!document.hidden)raf=requestAnimationFrame(draw);}
 function resize(){const r=host.getBoundingClientRect();w=Math.max(1,r.width);h=Math.max(1,r.height);dpr=Math.min(devicePixelRatio||1,mobile.matches?1.25:1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);request();}
 function pointer(e){if(reduced.matches||e.pointerType==='touch')return;const r=host.getBoundingClientRect();px=Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1));py=Math.max(-1,Math.min(1,1-(e.clientY-r.top)/r.height*2));request();}
 function leave(){px=py=0;}
 function visibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else request();}
 function motion(){time=last=0;cancelAnimationFrame(raf);raf=0;request();}
 function onLost(e){e.preventDefault();lost=true;cancelAnimationFrame(raf);raf=0;host.classList.remove('scene-ready');host.classList.add('scene-fallback');}
 function onRestore(){try{resources.length=0;setup();lost=false;resize();request();}catch{onLost({preventDefault(){}});}}
 let ro,io;
 function dispose(){disposed=true;cancelAnimationFrame(raf);ro?.disconnect();io?.disconnect();window.removeEventListener('pointermove',pointer);window.removeEventListener('pointerout',leave);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motion);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestore);resources.forEach(([t,r])=>t==='s'?gl.deleteShader(r):t==='p'?gl.deleteProgram(r):gl.deleteBuffer(r));delete canvas.dataset.sceneInitialized;}
 try{setup();resize();ro=new ResizeObserver(resize);ro.observe(host);io=new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(!visible){cancelAnimationFrame(raf);raf=0;last=0;}else request();},{rootMargin:'100px'});io.observe(host);window.addEventListener('pointermove',pointer,{passive:true});window.addEventListener('pointerout',leave,{passive:true});document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',motion);canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestore);canvas.dataset.sceneInitialized='true';request();}catch(e){host.classList.add('scene-fallback');host.classList.remove('scene-ready');console.warn('Decorative scene unavailable:',e.message);dispose();return null;}
 return{dispose};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initScene,{once:true});else initScene();

