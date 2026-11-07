document.documentElement.classList.add('js');
try {
  if (!sessionStorage.getItem('aw')) {
    sessionStorage.setItem('aw', '1');
    if (location.pathname === '/') document.documentElement.classList.add('intro');
  }
} catch {}
