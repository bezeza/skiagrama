(function(){
  var deferred=null,ib=document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;ib.hidden=false;});
  ib.addEventListener('click',function(){if(!deferred)return;deferred.prompt();deferred.userChoice.finally(function(){deferred=null;ib.hidden=true;});});
  window.addEventListener('appinstalled',function(){ib.hidden=true;});
  if(!('serviceWorker' in navigator)||!/^https?:/.test(location.protocol))return;
  var waiting=null,ub=document.getElementById('updBanner');
  function show(w){waiting=w;ub.hidden=false;}
  document.getElementById('updBtn').addEventListener('click',function(){if(waiting)waiting.postMessage('skip');});
  navigator.serviceWorker.register('./sw.js').then(function(reg){
    if(reg.waiting&&navigator.serviceWorker.controller)show(reg.waiting);
    reg.addEventListener('updatefound',function(){var w=reg.installing;if(!w)return;w.addEventListener('statechange',function(){if(w.state==='installed'&&navigator.serviceWorker.controller)show(w);});});
    setInterval(function(){reg.update().catch(function(){});},60*60*1000);
  }).catch(function(){});
  var reloaded=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(reloaded)return;reloaded=true;location.reload();});
})();
