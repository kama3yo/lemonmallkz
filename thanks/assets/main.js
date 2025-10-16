(function(){
  const params = new URLSearchParams(window.location.search);
  const keys = ["utm_source","utm_medium","utm_campaign","utm_content","ref"];
  function setHidden(id,key){
    const v = params.get(key) || localStorage.getItem(key) || "";
    const el = document.getElementById(id);
    if (el) el.value = v;
    if (params.get(key)) localStorage.setItem(key, v);
  }
  keys.forEach(k=>setHidden(k,k));

  const waNumber = "905060533279";
  function buildMsg(){
    const ls = (k)=>localStorage.getItem(k)||"";
    return encodeURIComponent(
`Привет! Хочу стартовать в LemonMall.
Имя: 
Мой реф: ${ls('ref')}
UTM: ${ls('utm_source')}/${ls('utm_medium')}/${ls('utm_campaign')}/${ls('utm_content')}`);
  }
  const waLinks = ["waHero","waFooter","waThanks"].map(id=>document.getElementById(id)).filter(Boolean);
  waLinks.forEach(a=> a.href = `https://wa.me/${waNumber}?text=${buildMsg()}`);

  const form = document.getElementById("leadForm");
  if(form){
    form.addEventListener("submit", (e)=>{
      const tel = form.querySelector('input[name="whatsapp"]').value.trim();
      if(!/^(?:\+?7|8|\+?90)?\s*\d[\d\s-]{8,}$/.test(tel)){
        e.preventDefault();
        alert("Пожалуйста, укажите корректный номер WhatsApp");
      }
    });
  }
})();