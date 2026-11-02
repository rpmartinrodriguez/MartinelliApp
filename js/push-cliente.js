/* Registro Web Push opt-in; requiere VAPID y backend Netlify configurados. */
(() => {
  let publicKey = '';
  const encode = b => Array.from(new Uint8Array(b)).map(v=>v.toString(16).padStart(2,'0')).join('');
  const decode = value => {
    const b64=value.replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(b64.padEnd(Math.ceil(b64.length/4)*4,'='));
    return Uint8Array.from(raw,c=>c.charCodeAt(0));
  };
  window.prepararPush = async () => {
    try {
      const r=await fetch('/.netlify/functions/push-public-key',{cache:'no-store'});
      if(!r.ok) return;
      const data=await r.json();
      publicKey=data.configured ? data.publicKey : '';
      const btn=document.getElementById('btn-activar-push');
      if(btn)btn.title=publicKey?'Activar notificaciones al dispositivo':'Requiere configurar el servicio de push en Netlify';
    } catch(e) { console.warn('Push sin configurar',e); }
  };
  window.activarPush = async () => {
    if(!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)){
      alert('Este dispositivo o navegador no admite Web Push. En iPhone requiere iOS 16.4 o superior y abrir la PWA instalada en Inicio.');
      return;
    }
    if(!window.matchMedia('(display-mode: standalone)').matches && /iPhone|iPad|iPod/.test(navigator.userAgent)){
      alert('En iPhone, instalá la PWA desde Compartir → Agregar a Inicio y abrila desde ese ícono para recibir push.');
      return;
    }
    if (!publicKey) { alert('Todavía falta configurar las claves de envío push en Netlify. El administrador puede habilitarlas.'); return; }
    try {
      // Llamada por interacción directa del usuario, como exige iOS.
      const permission=await Notification.requestPermission();
      if(permission!=='granted'){alert('Las notificaciones no están autorizadas en este dispositivo.');return;}
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(publicKey)});
      const user=window.state?.currentUser;
      if(!user)throw Error('Iniciá sesión para registrar el dispositivo.');
      const hash=encode(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sub.endpoint)));
      const ref=window.doc(window.db,'push_subscriptions',user.id+'_'+hash.slice(0,32));
      const data=sub.toJSON();
      await window.fbSetDoc(ref,{userId:user.id,endpoint:data.endpoint,keys:data.keys,
        activo:true,creadoEn:new Date().toISOString()});
      alert('¡Notificaciones push activadas para este dispositivo!');
    } catch(err){console.error('Error activando push',err);alert('No se pudieron activar las push: '+(err.message||'revisá los permisos.'));}
  };
  document.addEventListener('DOMContentLoaded',()=>window.prepararPush());
})();
