const test = async () => {
  let res = await fetch(`https://bible-api.com/john+1?translation=acf`);
  console.log('acf', res.status, (await res.text()).substring(0, 100));

  res = await fetch(`https://bible-api.com/john+1?translation=kja`);
  console.log('kja', res.status, (await res.text()).substring(0, 100));
};
test();
