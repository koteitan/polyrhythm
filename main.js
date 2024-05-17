var version = "1.4";
var isdebug = false;
//entry point--------------------
window.onload = function(){
  document.getElementById('version').innerHTML=version;
  initbyquery();
  initdraw();
  initgame();
  window.onresize();
  setInterval(procAll, 1000/framerate); //enter gameloop
}
var initbyquery=function(){
  var urlsp = new URLSearchParams(window.location.search);
  if(urlsp.has('ball')){
    nball = parseInt(urlsp.get('ball')); //from query
  }else{
    nball = 2;
  }
  if(urlsp.has('size')){
    maplen = parseInt(urlsp.get('size'))+2; //from query
  }else{
    maplen = 6+2; //default
  }
  if(urlsp.has('isdebug')){
    isdebug = true;
  }
}
//game loop ------------------
var gettime = function(){
  return (new Date()).getTime();
}
var framerate = 24; //[fps]
var t0=0;
var t1=0;
var t2=gettime();
var ela=0;
var el1=0;
var el2=0;
var procAll=function(){
  t1 = gettime();
  t0 = t2;
  procgame();
  procdraw();
  t2 = gettime();

  var d=0.9;
  el1=d*el1+(1-d)*Math.floor((t1-t0));
  el2=d*el2+(1-d)*Math.floor((t2-t1));
  ela=d*ela+(1-d)*Math.floor((t1-t0+t2-t1));
  if(isdebug){
    document.getElementById("debugspan").innerHTML=
      "("+Math.floor(el1)+", "+Math.floor(el2)+")/"+Math.floor(ela);
  }
}
//game -----------------
var map;
var ndim;
var maplen;
var blocklen;
var nball;
var Ball = function(_q, _v, _p){
  this.q = _q;
  this.v = _v;
  this.p = _p;
}
Ball.prototype.toString=function(){
  return "{q="+this.q.toString()+", v="+this.v.toString()+", p="+this.p+"}";
}
//initMap: make a empty map
var initgame=function(){
  //init map
  ndim     = 4;
  blocklen = 1/(maplen/2-1);
  if(ndim!=4) throw("ndim must be 4.");
  var count = [0,0];
  map = new Array(maplen);
  for(var w=0;w<maplen;w++){
    map[w] = new Array(maplen);
    for(var z=0;z<maplen;z++){
      map[w][z] = new Array(maplen);
      for(var y=0;y<maplen;y++){
        map[w][z][y] = new Array(maplen);
        for(var x=0;x<maplen;x++){
          if(x==0 || x==maplen-1 ||
             y==0 || y==maplen-1 ||
             z==0 || z==maplen-1 ||
             w==0 || w==maplen-1){
            //wall
            map[w][z][y][x]=0;
          }else{
            if(false){ //radius
              var r2 =
                ((x-1+1/2)/(maplen-2)*2-1)*((x-1+1/2)/(maplen-2)*2-1)+
                ((y-1+1/2)/(maplen-2)*2-1)*((y-1+1/2)/(maplen-2)*2-1)+
                ((z-1+1/2)/(maplen-2)*2-1)*((z-1+1/2)/(maplen-2)*2-1)+
                ((w-1+1/2)/(maplen-2)*2-1)*((w-1+1/2)/(maplen-2)*2-1);
              var r4 = r2*r2;
              if(r4 < 0.5){ // in circle (tuning for 7x7x7x7)
                map[w][z][y][x]=-1;
                count[0]++;
              }else{
                map[w][z][y][x]=+1;
                count[1]++;
              }
            }else{ //rectangle
              if(z>(maplen-2)/2){
                map[w][z][y][x]=-1;
              }else{
                map[w][z][y][x]=+1;
              }
            }
          }
        }
      }
    }
  }
  
  //init ball
  initv = [0.005, 0.005, 0.05, 0.05];
  ball = new Array(nball);
  for(var b=0;b<nball;b++){
    var p;
    if(b==0){
      p = -1;
    }else if(b==1){
      p = +1;
    }else{
      p = (Math.random() < 0.5)?-1:+1;
    }
    //init q
    var q=new Array(ndim);
    var m;
    do{
      for(var d=0;d<ndim;d++){
        var x = Math.random()*2-1;
        q[d] = x;
      }
      //q=[0,0,0,0];
      //q=[0,0,1/((maplen-2)/2),0];
      m = q2map(q);
    }while(m!=p);
    var iq = q2iq(q);
    //console.log("ball("+b+"):m="+m+", p="+p);
    //console.log("iq="+iq.toString());
    //init v
    var v=new Array(ndim);
    do{
      var v2 = 0;
      for(var d=0;d<ndim;d++){
        v[d] = Math.random()*2-1;
        v2  += v[d]*v[d];
      }
      var av = Math.sqrt(v2);
      var limit = blocklen*framerate/100;
      var isover = false;
      for(var d=0;d<ndim;d++){
        v[d] = v[d] / av * initv[d];
        if(v[d]<limit*initv[d]){
          isover = true;
          break;
        }
      }
    }while(isover);

    //resister
    if(v[2]<v[3]){ // if v_z < v_w
      //swap z and w
      var tmp=v[3];
      v[3]   =v[2];
      v[2]   =tmp;
    }
    ball[b] = new Ball(q, v, p);
  }
}
var q2map=function(q){
  var iq = q2iq(q);
  try{
    if(ndim!=4) throw("ndim must be 4.");
    return map[iq[3]][iq[2]][iq[1]][iq[0]];
  }catch(e){
    throw(e);
  }
}
var q2iq=function(q){
  var ndim=q.length;
  var iq=new Array(ndim);
  for(var d=0;d<ndim;d++){
    iq[d] = Math.floor((q[d]+1)/2*(maplen-2)+1);
  }
  return iq;
}
var procgame=function(){
  //renew q----------------------------
  //check all the collisions of all the ball and all the dimensions
  var lefttime = 1;
  while(lefttime > 0){
    cq1 = new Array(nball);
    ct  = new Array(nball); // collision time of ball b and d-th-dimensional wall
    for(var b=0;b<nball;b++){
      cq1[b] = new Array(ndim);
      ct [b] = new Array(ndim);
      var p = ball[b].p;
      for(var d=0;d<ndim;d++){
        var v  = ball[b].v[d];
        var q0 = ball[b].q.clone();
        var q1 = ball[b].q.clone();
        q1[d] = q0[d] + v*lefttime;
        var rq0_d = (q0[d]+1)/2*(maplen-2);
        var rq1_d = (q1[d]+1)/2*(maplen-2);
        var iq0_d = Math.floor(rq0_d);
        var iq1_d = Math.floor(rq1_d);
        if(iq0_d != iq1_d && q2map(q1)!=p){ /* cross block border && oppo */
          if(v>0){
            ct [b][d]=(iq1_d-rq0_d)/(rq1_d-rq0_d);
          }else{
            ct [b][d]=(iq0_d-rq1_d)/(rq0_d-rq1_d);
          }
          cq1[b][d]=q1;
        }else{
          ct[b][d]=+Infinity; //no collision
        }
      }
    }
    // find the first collision
    var minb=0; // the first ball
    var mind=0; // the first dimension
    var minct=ct[0][0];
    for(var b=0;b<nball;b++){
      for(var d=0;d<ndim;d++){
        if(ct[b][d]<minct){
          minb=b;
          mind=d;
          minct=ct[b][d];
        }
      }
    }
    if(isdebug)if(minct!=Infinity)console.log("minct="+minct);
    if(minct==Infinity){ //there is no collision
      for(var b=0;b<nball;b++){
        for(var d=0;d<ndim;d++){
          ball[b].q[d] += ball[b].v[d]*lefttime; //use left time all
        }
        if(isdebug)console.log("ball["+b+"]="+ball[b].toString());
      }
      lefttime = 0;
      break;
    }else{ // there is a collision
      
      for(var b=0;b<nball;b++){
        for(var d=0;d<ndim;d++){
          var dq = ball[b].v[d]*minct;
          if(b==minb && d==mind) dq *= 0.999; //avoid online
          ball[b].q[d] += dq; //use minct
          if(ball[b].q[d] >= +1){ ball[b].q[d] = +1; }
          if(ball[b].q[d] <= -1){ ball[b].q[d] = -1; }
        }
        if(isdebug)console.log("ball["+b+"]="+ball[b].toString());
      }

      //reflect
      ball[minb].v[mind] *= -1; 

      //change
      var iq1 = q2iq(cq1[minb][mind]);
      if(map[iq1[3]][iq1[2]][iq1[1]][iq1[0]] != 0){
        map[iq1[3]][iq1[2]][iq1[1]][iq1[0]] = ball[minb].p;
      }
      lefttime -= minct;
    }
  }//while(lefttime > 0)

}
// debugout ------------------------
var isdebugout = false; // false for release
var debugout = function(str){
  if(isdebugout){
    console.log(str);
  }
}
var debug;
// graphics ------------------------
var ctx;
var can;
var canlen;
var margin = 10;
var maplen;
var reqdraw = true;
/* map2color(-1 or +1) returns color of map */
var map2color  = function(m){
  return ['#FF6666','#66FF66'][(m+1)/2];
}
/* map2color(-1 or +1) returns color of ball */
var ball2color = function(b){
  return map2color(-ball[b].p);
}
var Conv=function(){
  this.spm        = canlen/(maplen-2);
  this.spm2       = canlen/(maplen-2)/(maplen-2);
  this.invmaplen  =      1/(maplen-2);
};
/* sq[dz][dw][0,1,2] = q2sq(q[d])
 * d = {0,1,2,3} = {x,y,z,w} axis
 * sq[dz][dw][0] = screen position x  
 * sq[dz][dw][1] = screen position y
 * sq[dz][dw][2] = radius weight */
Conv.prototype.q2sq=function(q){
  [x,y,z,w] = q;
  var sw = (w+1)/2*(maplen-2)-0.5;
  var iw = Math.floor(sw);
  var ww0 = Math.sqrt(1-(sw-iw));
  var ww1 = Math.sqrt(1-ww0);
  var sz = (z+1)/2*(maplen-2)-0.5;
  var iz = Math.floor(sz);
  var wz0 = Math.sqrt(1-(sz-iz));
  var wz1 = Math.sqrt(1-wz0);
  var sx0 = Math.floor((iz  +(x+1)/2)*this.spm);
  var sy0 = Math.floor((iw  +(y+1)/2)*this.spm);
  var sx1 = Math.floor((iz+1+(x+1)/2)*this.spm);
  var sy1 = Math.floor((iw+1+(y+1)/2)*this.spm);
  return [
  /*dw\dz:               0 ,                 1 */
  /*0*/[[sx0, sy0, wz0*ww0],[sx1, sy0, wz1*ww0]],
  /*0*/[[sx0, sy1, wz0*ww1],[sx1, sy1, wz1*ww1]],
  ];
}
/* [sx0, sy0, sx1, sy1] = conv.iq2sq(iq[d]) 
 *  iq[d]     = d-th-dimensional index d={0,1,2,3}={x,y,z,w} */
Conv.prototype.iq2sq=function(iq){
  [ix,iy,iz,iw] = iq;
  var sx0 = Math.floor(((iz-1)+(ix-1)*this.invmaplen)*this.spm);
  var sy0 = Math.floor(((iw-1)+(iy-1)*this.invmaplen)*this.spm);
  var sx1 = Math.floor(sx0 + this.spm2);
  var sy1 = Math.floor(sy0 + this.spm2);
  return [sx0,sy0,sx1,sy1];
}
//init
var initdraw=function(){
  can = document.getElementById("outcanvas");
  ctx = can.getContext('2d');
}
//proc
var procdraw = function(){

  //background
  ctx.fillStyle  ="white";
  ctx.fillRect  (0,0,can.width, can.height);

  //block
  var conv=new Conv();
  blocksize0 = Math.ceil(canlen/((maplen-2)*(maplen-2)));
  blocksize1 = Math.ceil(canlen/(maplen-2));
  for(var w=1;w<maplen-1;w++){
    for(var z=1;z<maplen-1;z++){
      for(var y=1;y<maplen-1;y++){
        for(var x=1;x<maplen-1;x++){
          var m  = map[w][z][y][x];
          var sq = conv.iq2sq([x,y,z,w]);
          ctx.fillStyle = map2color(m);
          ctx.fillRect(sq[0],sq[1],blocksize0, blocksize0);
        }
      }
    }
  }
  for(var w=1;w<maplen-1;w++){
    for(var z=1;z<maplen-1;z++){
      ctx.strokeStyle = "#FFFFFF";
      var sq = conv.iq2sq([1,1,z,w]);
      ctx.strokeRect(sq[0],sq[1],blocksize1, blocksize1);
    }
  }
  //ball
  var ball_radius = 16;
  for(var b=0;b<nball;b++){
    var sq = conv.q2sq(ball[b].q);
    //console.log("sq="+sq.toString());
    for(var dw=0;dw<2;dw++){
      for(var dz=0;dz<2;dz++){
        ctx.beginPath();
        ctx.fillStyle = ball2color(b);
        ctx.arc(sq[dw][dz][0], sq[dw][dz][1], ball_radius*sq[dw][dz][2], 0, Math.PI*2, false);
        ctx.fill();
        if(true){
          ctx.beginPath();
          ctx.strokeStyle = "#333333";
          ctx.arc(sq[dw][dz][0], sq[dw][dz][1], ball_radius*sq[dw][dz][2], 0, Math.PI*2, false);
          ctx.stroke();
        }
      }
    }
  }
}
window.onresize = function(){ //browser resize
  var agent = navigator.userAgent;
  var wx = document.documentElement.clientWidth;
  var wy = document.documentElement.clientHeight;
  var cx = [(wx- 10)*0.9, 20].max();
  var cy = [(wy-120)*0.9, 20].max();
  canlen = [cx,cy].min();
  document.getElementById("outcanvas").width = canlen;
  document.getElementById("outcanvas").height= canlen;
};

