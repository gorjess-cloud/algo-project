// Substitution-method logic: parses a recurrence, builds the induction proof, and simulates T(n).
// Pure functions only (no React, no DOM).
var SUP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
function fmtNum(x){ if(!isFinite(x)) return String(x); if(Math.abs(x-Math.round(x))<1e-9) return String(Math.round(x)); return String(Math.round(x*1000)/1000); }
function fmtUp(x){ return fmtNum(Math.ceil(x*1000-1e-9)/1000); }
function digits(n,map){ return String(n).split('').map(function(d){return map[d]||d;}).join(''); }
function term(k,l,v){
  v=v||'n'; var parts=[];
  if(Math.abs(k)>1e-9){
    if(Math.abs(k-1)<1e-9) parts.push(v);
    else if(Number.isInteger(k)&&k>0&&k<100) parts.push(v+digits(k,SUP));
    else parts.push(v+'^'+fmtNum(k));
  }
  if(l>0) parts.push(l===1?'log '+v:'log'+digits(l,SUP)+' '+v);
  return parts.length?parts.join(' '):'1';
}
function mul(x,t){ if(t==='1') return fmtNum(x); if(Math.abs(x-1)<1e-9) return t; return fmtNum(x)+'·'+t; }
function cterm(x,t,sym){ sym=sym||'c'; var b=Math.abs(x-1)<1e-9?sym:fmtNum(x)+'·'+sym; return t==='1'?b:b+'·'+t; }
function cmp(x,y){ if(Math.abs(x[0]-y[0])>1e-9) return x[0]<y[0]?-1:1; return Math.sign(x[1]-y[1]); }
function fStr(f){ var t=term(f.k,f.l); if(f.cf===1) return t; return t==='1'?fmtNum(f.cf):fmtNum(f.cf)+'·'+t; }
function norm(s){
  return String(s).replace(/\s+/g,'').replace(/[×·⋅*]/g,'').replace(/[−–]/g,'-')
    .replace(/log₂|log2|lg|log/gi,'log').replace(/log\(n\)/g,'logn').replace(/t\(/g,'T(').replace(/²/g,'^2').replace(/³/g,'^3');
}
function classify(raw){
  var s=norm(raw).replace(/^[OΘ]\((.*)\)$/,'$1');
  var m=s.match(/^(\d+(?:\.\d+)?)?(.*)$/); var cf=m[1]!==undefined?parseFloat(m[1]):1; var rest=m[2]; var mm;
  if(rest==='') return {cf:cf,k:0,l:0};
  if((mm=rest.match(/^n(?:\^(\d+))?$/))) return {cf:cf,k:mm[1]?+mm[1]:1,l:0};
  if((mm=rest.match(/^n(?:\^(\d+))?logn$/))) return {cf:cf,k:mm[1]?+mm[1]:1,l:1};
  if(rest==='logn') return {cf:cf,k:0,l:1};
  return null;
}
function parseRec(raw){
  var s=norm(raw).replace(/^T\(n\)=/,''); var m, kind;
  var form='Use the form aT(n/b) + f(n) or aT(n−s) + f(n), for example 2T(n/2) + n.';
  if((m=s.match(/^(\d+)?T\(n\/(\d+)\)\+(.+)$/))) kind='divide';
  else if((m=s.match(/^(\d+)?T\(n-(\d+)\)\+(.+)$/))) kind='sub';
  else return {ok:false,msg:form};
  var a=m[1]?+m[1]:1, p=+m[2], f=classify(m[3]);
  if(!f) return {ok:false,msg:'f(n) must look like 1, n, n^2, n log n or log n. A leading constant is fine, for example 3n.'};
  if(a<1||a>64) return {ok:false,msg:'Keep a between 1 and 64.'};
  if(kind==='divide'){ if(p<2||p>64) return {ok:false,msg:'The shrink factor b must be between 2 and 64.'}; return {ok:true,rec:{type:'divide',a:a,b:p,f:f}}; }
  if(p<1||p>64) return {ok:false,msg:'The step s must be between 1 and 64.'};
  return {ok:true,rec:{type:'sub',a:a,s:p,f:f}};
}
function recText(rec){
  var ap=rec.a>1?rec.a:'';
  return rec.type==='divide' ? 'T(n) = '+ap+'T(n/'+rec.b+') + '+fStr(rec.f) : 'T(n) = '+ap+'T(n−'+rec.s+') + '+fStr(rec.f);
}
function masterTight(a,b,kf,lf){
  var p=Math.log(a)/Math.log(b); if(Math.abs(p-Math.round(p))<1e-9) p=Math.round(p);
  if(kf<p-1e-9) return {p:p,cs:1,k:p,l:0};
  if(Math.abs(kf-p)<1e-9) return {p:p,cs:2,k:p,l:lf+1};
  return {p:p,cs:3,k:kf,l:lf};
}
function proofDivide(rec,g){
  var a=rec.a,b=rec.b,f=rec.f,kg=g.k,lg=g.l;
  var t=masterTight(a,b,f.k,f.l), rel=cmp([kg,lg],[t.k,t.l]);
  var r=a/Math.pow(b,kg), lb=Math.log2(b), rOne=Math.abs(r-1)<1e-9;
  var fs=fStr(f), gS=term(kg,lg), nb='(n/'+b+')', aP=a>1?a+'·':'';
  var mode;
  if(lg===0){
    if(r<1-1e-9&&cmp([f.k,f.l],[kg,0])<=0) mode='slack';
    else if(rOne&&f.l===0&&f.k<kg-1e-9) mode='lower';
    else mode=rel<0?'fail':'open';
  } else {
    if(r<1-1e-9&&cmp([f.k,f.l],[kg,1])<=0) mode='slack';
    else if(rOne&&cmp([f.k,f.l],[kg,0])<=0) mode='logbal';
    else mode=rel<0?'fail':'open';
  }
  var res={tightText:'Θ('+term(t.k,t.l)+')',steps:[],consts:[],cmin:null,verdict:null};
  var hyp=mode==='lower'?'T(m) ≤ c·'+term(kg,0,'m')+' − d·'+term(f.k,0,'m'):'T(m) ≤ c·'+term(kg,lg,'m');
  res.steps.push({title:'Hypothesis',why:'Guess T(n) ∈ O('+gS+') and assume it holds for every smaller input'+(mode==='lower'?', with a lower-order correction so the induction can close.':'.'),lines:[hyp+'   for all m < n']});
  var sub=mode==='lower'
    ? '≤ '+aP+'[c·'+term(kg,0,nb)+' − d·'+term(f.k,0,nb)+'] + '+fs
    : '≤ '+aP+'[c·'+term(kg,lg,nb)+'] + '+fs;
  res.steps.push({title:'Substitute',why:'Replace T(n/'+b+') by the hypothesis.',lines:['T(n) = '+aP+'T'+nb+' + '+fs,'     '+sub]});
  var n0=1;
  if(mode==='slack'){
    var cmin=f.cf/(1-r); res.cmin=cmin; n0=lg?2:1;
    if(lg===0){
      res.steps.push({title:'Simplify',why:'The recursive part shrinks by the factor r = a / b'+digits(kg,SUP)+'.',lines:['r = '+a+' / '+fmtNum(Math.pow(b,kg))+' = '+fmtNum(r),'T(n) ≤ '+cterm(r,gS)+' + '+fs]});
    } else {
      res.steps.push({title:'Simplify',why:'Write log '+nb+' = log n − '+fmtNum(lb)+', then drop the negative term.',lines:['r = '+a+' / '+fmtNum(Math.pow(b,kg))+' = '+fmtNum(r),'T(n) ≤ '+cterm(r,gS)+' − '+cterm(r*lb,term(kg,0))+' + '+fs,'     ≤ '+cterm(r,gS)+' + '+fs]});
    }
    res.steps.push({title:'Close the induction',why:'We need T(n) ≤ c·'+gS+', so the leftover f(n) must fit in the slack.',lines:[fs+' ≤ '+cterm(1-r,gS),'holds for every c ≥ '+fmtUp(cmin)+'   (n ≥ '+n0+')']});
    res.consts=[{k:'c',v:'≥ '+fmtUp(cmin)},{k:'n₀',v:'= '+n0}];
  } else if(mode==='logbal'){
    var cm=f.cf/lb; res.cmin=cm; n0=2;
    res.steps.push({title:'Simplify',why:'Here r = 1, so the recursive part reproduces the hypothesis minus a correction.',lines:['r = '+a+' / '+fmtNum(Math.pow(b,kg))+' = 1','log '+nb+' = log n − '+fmtNum(lb),'T(n) ≤ c·'+gS+' − '+cterm(lb,term(kg,0))+' + '+fs]});
    res.steps.push({title:'Close the induction',why:'The correction must pay for f(n).',lines:[fs+' ≤ '+cterm(lb,term(kg,0)),'holds for every c ≥ '+fmtUp(cm)+'   (n ≥ 2)']});
    res.consts=[{k:'c',v:'≥ '+fmtUp(cm)},{k:'n₀',v:'= 2'}];
  } else if(mode==='lower'){
    var rho=a/Math.pow(b,f.k), dmin=f.cf/(rho-1);
    res.steps.push({title:'Simplify',why:'With r = 1 the plain hypothesis leaves f(n) uncovered, so the correction term d·'+term(f.k,0)+' absorbs it.',lines:['a / b'+digits(f.k,SUP)+' = '+fmtNum(rho),'T(n) ≤ c·'+term(kg,0)+' − '+cterm(rho,term(f.k,0),'d')+' + '+fs]});
    res.steps.push({title:'Close the induction',why:'We need the correction to be at least d·'+term(f.k,0)+'.',lines:[cterm(rho,term(f.k,0),'d')+' − '+fs+' ≥ d·'+term(f.k,0),'holds for every d ≥ '+fmtUp(dmin),'then T(n) ≤ c·'+term(kg,0)+' − d·'+term(f.k,0)+' ≤ c·'+term(kg,0)]});
    res.consts=[{k:'d',v:'≥ '+fmtUp(dmin)},{k:'c',v:'≥ d + T(1)'},{k:'n₀',v:'= 1'}];
  } else if(mode==='fail'){
    if(lg===0) res.steps.push({title:'Simplify',why:'Collect the terms.',lines:['r = '+a+' / '+fmtNum(Math.pow(b,kg))+' = '+fmtNum(r),'T(n) ≤ '+cterm(r,gS)+' + '+fs]});
    else res.steps.push({title:'Simplify',why:'Write log '+nb+' = log n − '+fmtNum(lb)+'.',lines:['r = '+a+' / '+fmtNum(Math.pow(b,kg))+' = '+fmtNum(r),'T(n) ≤ '+cterm(r,gS)+' − '+cterm(r*lb,term(kg,0))+' + '+fs]});
    var lines;
    if(r>1+1e-9) lines=lg===0
      ? ['Need: '+cterm(r-1,gS)+' + '+fs+' ≤ 0','Both terms are positive, so no choice of c works.']
      : ['Need: '+cterm(r-1,gS)+' + '+fs+' ≤ '+cterm(r*lb,term(kg,0)),'The left side carries an extra log n, so no choice of c works.'];
    else if(rOne) lines=lg===0
      ? ['Need: '+fs+' ≤ 0','f(n) is positive, so no choice of c works.']
      : ['Need: '+fs+' ≤ '+cterm(lb,term(kg,0)),'f(n) outgrows '+term(kg,0)+', so no choice of c works.'];
    else lines=['Need: '+fs+' ≤ '+cterm(1-r,gS),'f(n) outgrows '+gS+', so no choice of c works.'];
    res.steps.push({title:'Try to close the induction',why:'The inequality we need cannot be satisfied.',lines:lines});
  } else {
    res.steps.push({title:'Simplify',why:'Plain substitution leaves f(n) = '+fs+' uncovered.',lines:['T(n) ≤ '+cterm(r,gS)+' + '+fs]});
    res.steps.push({title:'Stronger hypothesis needed',why:'The master theorem gives T(n) = '+res.tightText+', so the guess is right. Closing the induction needs a correction term for a logarithmic f(n), which this workbench does not build.',lines:['T(m) ≤ c·'+term(kg,lg,'m')+' − (lower-order term)']});
  }
  if(mode==='slack'||mode==='logbal'||mode==='lower'){
    var base=n0===1
      ? (mode==='lower'?'Base case n = 1'+(b>2?' … '+(b-1):'')+': T(1) ≤ c − d, so take c ≥ d + T(1).':'Base case n = 1'+(b>2?' … '+(b-1):'')+': T(n) is a constant, so a large enough c covers it.')
      : 'Base case: g(1) = 0, so start at n₀ = 2 and take c ≥ max T(n)/g(n) for n = 2 … '+(2*b-1)+'.';
    res.steps.push({title:'Base case',why:base,lines:[]});
  }
  res.verdict=mode==='fail'?'invalid':mode==='open'?'open':(rel===0?'tight':'loose');
  return res;
}
function proofSub(rec,g){
  var a=rec.a,s=rec.s,f=rec.f,kg=g.k,lg=g.l,fs=fStr(f), gS=term(kg,lg), nm='(n−'+s+')', aP=a>1?a+'·':'';
  var res={tightText:'',steps:[],consts:[],cmin:null,verdict:null};
  if(a>=2){
    res.tightText='Θ('+a+'^'+(s===1?'n':'(n/'+s+')')+')';
    res.steps.push({title:'Hypothesis',why:'Guess T(n) ∈ O('+gS+') and assume it holds for every smaller input.',lines:['T(m) ≤ c·'+term(kg,lg,'m')+'   for all m < n']});
    res.steps.push({title:'Substitute',why:'Replace T(n−'+s+') by the hypothesis.',lines:['T(n) = '+aP+'T'+nm+' + '+fs,'     ≤ '+aP+'c·'+term(kg,lg,nm)+' + '+fs]});
    res.steps.push({title:'Try to close the induction',why:'The recursion multiplies the bound by '+a+' at every step of size '+s+'.',lines:['Need: '+a+'·c·'+term(kg,lg,nm)+' + '+fs+' ≤ c·'+gS,'The left side is about '+a+' times the right side for large n, so no choice of c works.']});
    res.verdict='invalid'; return res;
  }
  var tk=f.k+1, tl=f.l; res.tightText='Θ('+term(tk,tl)+')';
  var rel=cmp([kg,lg],[tk,tl]);
  var direct=lg===0&&kg>=1&&cmp([f.k,f.l],[kg-1,0])<=0;
  if(direct){
    var cmin=f.cf*Math.pow(2,kg-1)/(kg*s); res.cmin=cmin;
    res.steps.push({title:'Hypothesis',why:'Guess T(n) ∈ O('+gS+') and assume it holds for every smaller input.',lines:['T(m) ≤ c·'+term(kg,0,'m')+'   for all m < n']});
    res.steps.push({title:'Substitute',why:'Replace T(n−'+s+') by the hypothesis.',lines:['T(n) = T'+nm+' + '+fs,'     ≤ c·'+term(kg,0,nm)+' + '+fs]});
    res.steps.push({title:'Bound the drop',why:'The hypothesis must fall by at least f(n) when n goes down by '+s+'. For n ≥ '+(2*s)+' we have n − '+s+' ≥ n/2.',lines:[term(kg,0)+' − '+term(kg,0,nm)+' ≥ '+mul(kg*s,term(kg-1,0,nm)),'                       ≥ '+mul(kg*s/Math.pow(2,kg-1),term(kg-1,0))]});
    res.steps.push({title:'Close the induction',why:'We need f(n) to fit inside that drop.',lines:[fs+' ≤ c·'+mul(kg*s/Math.pow(2,kg-1),term(kg-1,0)),'holds for every c ≥ '+fmtUp(cmin)+'   (n ≥ '+(2*s)+')']});
    res.steps.push({title:'Base case',why:'Take n₀ = '+(2*s)+' and choose c ≥ max T(n)/'+term(kg,0)+' over n < '+(2*s)+'.',lines:[]});
    res.consts=[{k:'c',v:'≥ '+fmtUp(cmin)},{k:'n₀',v:'= '+(2*s)}];
    res.verdict=rel===0?'tight':rel>0?'loose':'invalid';
    return res;
  }
  if(rel<0){
    var drop=lg===0&&kg===0?'0':(kg>=1?'on the order of '+term(kg-1,lg):'on the order of 1/n');
    res.steps.push({title:'Hypothesis',why:'Guess T(n) ∈ O('+gS+') and assume it holds for every smaller input.',lines:['T(m) ≤ c·'+term(kg,lg,'m')+'   for all m < n']});
    res.steps.push({title:'Substitute',why:'Replace T(n−'+s+') by the hypothesis.',lines:['T(n) = T'+nm+' + '+fs,'     ≤ c·'+term(kg,lg,nm)+' + '+fs]});
    res.steps.push({title:'Try to close the induction',why:'The hypothesis can only drop by g(n) − g(n−'+s+'), which is '+drop+'. That is smaller than f(n) = '+fs+'.',lines:['Need: '+fs+' ≤ c·[g(n) − g(n−'+s+')]','No choice of c works.']});
    res.verdict='invalid'; return res;
  }
  if(f.l===0){
    var inner=proofSub(rec,{k:tk,l:0});
    inner.steps.push({title:'Relax to your guess',why:'O('+term(tk,0)+') is contained in O('+gS+'), because your guess grows at least as fast.',lines:[]});
    inner.verdict='loose'; return inner;
  }
  res.steps.push({title:'Sum the series',why:'Unrolling gives T(n) = Σ f(i), which is '+res.tightText+'. A direct induction for a logarithmic f(n) needs a correction term that this workbench does not build.',lines:['T(n) = T(1) + Σ f(i)   for i = 2 … n']});
  res.verdict='open'; return res;
}
function buildResult(rec,g,cUser){
  var res=rec.type==='divide'?proofDivide(rec,g):proofSub(rec,g);
  res.recText=recText(rec); res.claim='T(n) ∈ O('+term(g.k,g.l)+')';
  res.cCheck=null;
  if(cUser!==null&&isFinite(cUser)&&res.cmin!==null){ res.cCheck={ok:cUser>=res.cmin-1e-9,c:cUser,min:res.cmin}; }
  return res;
}
function simulate(rec,g){
  var f=rec.f;
  function fn(n){ return f.cf*Math.pow(n,f.k)*Math.pow(Math.log2(n),f.l); }
  function gn(n){ return Math.pow(n,g.k)*Math.pow(Math.log2(n),g.l); }
  var pts=[], i, n;
  if(rec.type==='divide'){
    var memo=new Map();
    var T=function(m){ if(m<=1) return 1; if(memo.has(m)) return memo.get(m); var v=rec.a*T(Math.floor(m/rec.b))+fn(m); memo.set(m,v); return v; };
    for(i=1;i<=14;i++){ n=Math.pow(2,i); pts.push({n:n,T:T(n),g:gn(n)}); }
  } else {
    var N=rec.a>=2?64:16384, arr=new Array(N+1);
    for(n=1;n<=N;n++) arr[n]=n<=rec.s?1:rec.a*arr[n-rec.s]+fn(n);
    var top=rec.a>=2?6:14;
    for(i=1;i<=top;i++){ n=Math.pow(2,i); pts.push({n:n,T:arr[n],g:gn(n)}); }
  }
  pts.forEach(function(p){ p.ratio=p.T/p.g; });
  return pts.filter(function(p){ return isFinite(p.ratio); });
}
function trend(pts){
  if(pts.length<4) return 'flat';
  var q=pts[pts.length-1].ratio/pts[pts.length-4].ratio;
  return q>1.15?'rising':q<0.87?'falling':'flat';
}

function trim(v){ return String(Math.round(v*10)/10); }
function fmtCompact(x){
  if(!isFinite(x)) return '∞';
  var ax=Math.abs(x);
  if(ax>=1e15) return x.toExponential(1).replace('+','');
  if(ax>=1e12) return trim(x/1e12)+'T';
  if(ax>=1e9) return trim(x/1e9)+'B';
  if(ax>=1e6) return trim(x/1e6)+'M';
  if(ax>=1e4) return trim(x/1e3)+'K';
  if(ax>=100) return String(Math.round(x));
  if(ax>=10) return trim(Math.round(x*10)/10);
  return trim(Math.round(x*100)/100);
}
function fmtN(n){ return n>=10000?Math.round(n/1000)+'K':String(n); }
function niceMax(v){ var e=Math.pow(10,Math.floor(Math.log10(v))), m=v/e; var nm=m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10; return nm*e; }

export { term, fmtNum, fmtUp, norm, classify, parseRec, fStr, buildResult, simulate, trend, fmtCompact, fmtN, niceMax };
