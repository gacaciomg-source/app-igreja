const test = async () => {
  let res = await fetch(`https://bolls.life/get-text/KJA/1/1/`);
  console.log('KJA', res.status, (await res.text()).substring(0, 50));
  
  res = await fetch(`https://bolls.life/get-text/ARC/1/1/`);
  console.log('ARC', res.status, (await res.text()).substring(0, 50));
  
  res = await fetch(`https://bolls.life/get-text/JFA/1/1/`);
  console.log('JFA', res.status, (await res.text()).substring(0, 50));
  
  res = await fetch(`https://bolls.life/get-text/TB/1/1/`);
  console.log('TB', res.status, (await res.text()).substring(0, 50));
  
  res = await fetch(`https://bolls.life/get-text/VFL/1/1/`);
  console.log('VFL', res.status, (await res.text()).substring(0, 50));
  
  res = await fetch(`https://bolls.life/get-text/NTLH/1/1/`);
  console.log('NTLH', res.status, (await res.text()).substring(0, 50));
};
test();
