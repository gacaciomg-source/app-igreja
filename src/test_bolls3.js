const test = async () => {
  let res = await fetch(`https://bolls.life/get-text/NVIPT/1/1/`);
  console.log('NVIPT', res.status, (await res.text()).substring(0, 50));

  res = await fetch(`https://bolls.life/get-text/ACF/1/1/`);
  console.log('ACF', res.status, (await res.text()).substring(0, 50));

  res = await fetch(`https://bolls.life/get-text/NAA/1/1/`);
  console.log('NAA', res.status, (await res.text()).substring(0, 50));
  
  res = await fetch(`https://bolls.life/get-text/ARA/1/1/`);
  console.log('ARA', res.status, (await res.text()).substring(0, 50));
  
  res = await fetch(`https://bolls.life/get-text/ARC/1/1/`);
  console.log('ARC', res.status, (await res.text()).substring(0, 50));
};
test();
